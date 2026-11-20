/**
 * Instant Zero-Delay (<1ms In-Memory Switch) 4-Provider Free Auto-Failover AI Engine
 * 
 * Architecture:
 * 1. Tier 1 — Google Gemini (GEMINI_API_KEY): gemini-2.5-flash -> gemini-2.0-flash via v1beta
 * 2. Tier 2 — Groq Cloud (GROQ_API_KEY): llama-3.3-70b-versatile -> llama-3.1-8b-instant -> qwen/qwen3.8-27b -> openai/gpt-oss-120b
 * 3. Tier 3 — Cloudflare Workers AI (CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN): @cf/meta/llama-3.1-8b-instruct -> @cf/meta/llama-3.3-70b-instruct-fp8-fast
 * 4. Tier 4 — OpenRouter Free Models (OPENROUTER_API_KEY): Strictly :free models (meta-llama/llama-3.3-70b-instruct:free -> google/gemma-3-27b-it:free -> google/gemma-4-31b-it:free)
 * 
 * Zero-Delay & High Reliability Guarantee:
 * - 0ms sleep between provider jumps on any error (400, 401, 403, 404, 429, 500, 503, timeout).
 * - In-Memory Cooldown Tracker: Any provider returning 429 rate-limit is marked for 60s cooldown,
 *   bypassing subsequent requests in 0ms without wasting network round-trips.
 * - Strict Zero Billing: OpenRouter strictly enforces :free suffix on models.
 */

// In-Memory Rate Limit Cooldown Circuit Breaker (60s)
const providerCooldowns = new Map();
// In-Memory 404 / Model Unavailable Circuit Breaker (1 hour)
const modelUnavailableCooldowns = new Map();

function isProviderInCooldown(providerKey) {
  const expiresAt = providerCooldowns.get(providerKey);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    providerCooldowns.delete(providerKey);
    return false;
  }
  return true;
}

function markProviderCooldown(providerKey, durationSeconds = 60) {
  providerCooldowns.set(providerKey, Date.now() + durationSeconds * 1000);
  console.warn(`[Unified AI] Provider "${providerKey}" placed in cooldown for ${durationSeconds}s`);
}

function isModelUnavailable(providerKey, modelKey) {
  const compositeKey = `${providerKey}:${modelKey}`;
  const expiresAt = modelUnavailableCooldowns.get(compositeKey);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    modelUnavailableCooldowns.delete(compositeKey);
    return false;
  }
  return true;
}

function markModelUnavailable(providerKey, modelKey, durationSeconds = 3600) {
  const compositeKey = `${providerKey}:${modelKey}`;
  modelUnavailableCooldowns.set(compositeKey, Date.now() + durationSeconds * 1000);
}

function sanitizeEnvValue(val) {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/[\r\n"']/g, '');
}

/**
 * Extracts and parses JSON from AI responses safely.
 * Handles markdown fences, raw JSON arrays, and JSON objects.
 */
function extractJsonFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty text received from AI provider');
  }

  let text = rawText.trim();
  // Strip markdown code fences if present
  if (text.startsWith('```')) {
    text = text.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  try {
    return JSON.parse(text);
  } catch (err) {
    // Try to match JSON array [ ... ]
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (_) {}
    }

    // Try to match JSON object { ... }
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch (_) {}
    }

    throw new Error(`JSON parsing failed: ${text.substring(0, 180)}`);
  }
}

/**
 * Tier 1: Google Gemini API Call
 */
async function callGeminiProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  const apiKey = sanitizeEnvValue(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set or empty');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanModel = model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  const promptParts = [];
  if (systemPrompt && systemPrompt.trim()) {
    promptParts.push({ text: `[SYSTEM INSTRUCTIONS]:\n${systemPrompt.trim()}` });
  }
  if (jsonMode) {
    promptParts.push({ text: `[JSON REQUIREMENT]: Respond ONLY with valid, raw JSON (no markdown formatting, no surrounding backticks).` });
  }
  promptParts.push({ text: userPrompt });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ parts: promptParts }],
        generationConfig: {
          temperature: typeof temperature === 'number' ? temperature : 0.4,
          topP: 0.85
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      const err = new Error(`Gemini ${cleanModel} HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!outputText) {
      throw new Error(`Gemini ${cleanModel} returned empty candidates`);
    }
    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tier 2: Groq Cloud API Call (Sub-second LPU Speed)
 */
async function callGroqProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  const apiKey = sanitizeEnvValue(process.env.GROQ_API_KEY);
  if (!apiKey) throw new Error('GROQ_API_KEY is not set or empty');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [];
  let combinedSystem = (systemPrompt || '').trim();
  if (jsonMode) {
    combinedSystem += '\n\nIMPORTANT: You must output ONLY valid, parsable JSON without markdown ticks.';
  }
  if (combinedSystem) {
    messages.push({ role: 'system', content: combinedSystem });
  }
  messages.push({ role: 'user', content: userPrompt });

  const bodyPayload = {
    model,
    messages,
    temperature: typeof temperature === 'number' ? temperature : 0.4
  };

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      const err = new Error(`Groq ${model} HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const outputText = data?.choices?.[0]?.message?.content || '';
    if (!outputText) {
      throw new Error(`Groq ${model} returned empty content`);
    }
    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tier 3: Cloudflare Workers AI Call
 */
async function callCloudflareProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  const accountId = sanitizeEnvValue(process.env.CLOUDFLARE_ACCOUNT_ID);
  const apiToken = sanitizeEnvValue(process.env.CLOUDFLARE_API_TOKEN);
  if (!accountId || !apiToken) throw new Error('CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [];
  let combinedSystem = (systemPrompt || '').trim();
  if (jsonMode) {
    combinedSystem += '\n\nYou MUST respond strictly in valid JSON format.';
  }
  if (combinedSystem) {
    messages.push({ role: 'system', content: combinedSystem });
  }
  messages.push({ role: 'user', content: userPrompt });

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.4
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      const err = new Error(`Cloudflare AI ${model} HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const outputText = data?.result?.response || (typeof data?.result === 'string' ? data.result : '');
    if (!outputText) {
      throw new Error(`Cloudflare AI ${model} returned empty response`);
    }
    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tier 4: OpenRouter Free Models Call (Strictly :free models only)
 */
async function callOpenRouterProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  // CRITICAL ZERO-COST SECURITY GUARDRAIL: Only allow models with explicit :free suffix
  if (!model.endsWith(':free')) {
    throw new Error(`Security policy blocked non-free OpenRouter model request: "${model}". Only :free models are permitted.`);
  }

  const apiKey = sanitizeEnvValue(process.env.OPENROUTER_API_KEY);
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set or empty');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages = [];
  let combinedSystem = (systemPrompt || '').trim();
  if (jsonMode) {
    combinedSystem += '\n\nOutput only a valid JSON response without commentary or backticks.';
  }
  if (combinedSystem) {
    messages.push({ role: 'system', content: combinedSystem });
  }
  messages.push({ role: 'user', content: userPrompt });

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bjs.kodl.uk',
        'X-Title': 'BJS & Bar Academy'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof temperature === 'number' ? temperature : 0.4
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errTxt = await res.text().catch(() => '');
      const err = new Error(`OpenRouter ${model} HTTP ${res.status}: ${errTxt.slice(0, 150)}`);
      err.status = res.status;
      throw err;
    }

    const data = await res.json();
    const outputText = data?.choices?.[0]?.message?.content || '';
    if (!outputText) {
      throw new Error(`OpenRouter ${model} returned empty content`);
    }
    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Comprehensive 4-Provider Failover Candidates Definition
 */
function getProviderChain() {
  const customGeminiModel = sanitizeEnvValue(process.env.GEMINI_MODEL);

  return [
    // 1. TIER 1: Google Gemini (Fast, native Bangla grounding)
    {
      provider: 'gemini',
      model: customGeminiModel || 'gemini-2.5-flash',
      call: (opts) => callGeminiProvider({ ...opts, model: customGeminiModel || 'gemini-2.5-flash' })
    },
    {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      call: (opts) => callGeminiProvider({ ...opts, model: 'gemini-2.0-flash' })
    },

    // 2. TIER 2: Groq Cloud (Sub-second LPU speed)
    {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      call: (opts) => callGroqProvider({ ...opts, model: 'llama-3.3-70b-versatile' })
    },
    {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      call: (opts) => callGroqProvider({ ...opts, model: 'llama-3.1-8b-instant' })
    },
    {
      provider: 'groq',
      model: 'qwen/qwen3.8-27b',
      call: (opts) => callGroqProvider({ ...opts, model: 'qwen/qwen3.8-27b' })
    },
    {
      provider: 'groq',
      model: 'openai/gpt-oss-120b',
      call: (opts) => callGroqProvider({ ...opts, model: 'openai/gpt-oss-120b' })
    },

    // 3. TIER 3: Cloudflare Workers AI Free Tier
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.1-8b-instruct',
      call: (opts) => callCloudflareProvider({ ...opts, model: '@cf/meta/llama-3.1-8b-instruct' })
    },
    {
      provider: 'cloudflare',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      call: (opts) => callCloudflareProvider({ ...opts, model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' })
    },

    // 4. TIER 4: OpenRouter Free Models (:free only)
    {
      provider: 'openrouter',
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      call: (opts) => callOpenRouterProvider({ ...opts, model: 'meta-llama/llama-3.3-70b-instruct:free' })
    },
    {
      provider: 'openrouter',
      model: 'google/gemma-3-27b-it:free',
      call: (opts) => callOpenRouterProvider({ ...opts, model: 'google/gemma-3-27b-it:free' })
    },
    {
      provider: 'openrouter',
      model: 'google/gemma-4-31b-it:free',
      call: (opts) => callOpenRouterProvider({ ...opts, model: 'google/gemma-4-31b-it:free' })
    },
    {
      provider: 'openrouter',
      model: 'inclusionai/ling-3.2-flash:free',
      call: (opts) => callOpenRouterProvider({ ...opts, model: 'inclusionai/ling-3.2-flash:free' })
    }
  ];
}

/**
 * Instant Zero-Delay (<1ms Switch) Multi-Provider AI Generator
 * 
 * @param {Object} options
 * @param {string} [options.systemPrompt]
 * @param {string} [options.userPrompt]
 * @param {string} [options.query] Fallback for userPrompt
 * @param {boolean} [options.jsonMode] When true, parses output as JSON
 * @param {number} [options.temperature=0.4]
 * @param {number} [options.timeoutMs=11000] Per-provider timeout in ms
 * @returns {Promise<{ ok: boolean, text: string, data?: any, provider: string, model: string, latencyMs: number }>}
 */
async function generateUnifiedAiResponse({
  systemPrompt = '',
  userPrompt = '',
  query = '',
  jsonMode = false,
  temperature = 0.4,
  timeoutMs = 11000
}) {
  const actualPrompt = (userPrompt || query || '').trim();
  if (!actualPrompt) {
    throw new Error('User prompt or query is required for AI generation');
  }

  const chain = getProviderChain();
  const errors = [];
  const overallStart = Date.now();

  for (let i = 0; i < chain.length; i++) {
    const candidate = chain[i];
    const { provider, model, call } = candidate;

    // Check In-Memory Cooldown Tracker
    if (isProviderInCooldown(provider)) {
      continue; // 0ms in-memory bypass
    }

    // Check In-Memory Model 404 / Unavailable Circuit Breaker
    if (isModelUnavailable(provider, model)) {
      continue; // 0ms in-memory bypass
    }

    const callStart = Date.now();
    try {
      const rawText = await call({
        systemPrompt,
        userPrompt: actualPrompt,
        jsonMode,
        temperature,
        timeoutMs
      });

      const callLatency = Date.now() - callStart;
      const totalLatency = Date.now() - overallStart;

      let parsedData = null;
      if (jsonMode) {
        parsedData = extractJsonFromText(rawText);
      }

      console.log(`[Unified AI] Succeeded via ${provider.toUpperCase()} (${model}) in ${callLatency}ms (Total: ${totalLatency}ms)`);

      return {
        ok: true,
        text: rawText,
        data: parsedData,
        provider,
        model,
        latencyMs: callLatency,
        totalLatencyMs: totalLatency
      };
    } catch (err) {
      const callLatency = Date.now() - callStart;
      errors.push({ provider, model, error: err.message, status: err.status, latencyMs: callLatency });

      // If Rate-Limited (429), place provider into in-memory cooldown map for 60s
      if (err.status === 429) {
        markProviderCooldown(provider, 60);
      }

      // If Model not found (404), place model into in-memory circuit breaker for 1h
      if (err.status === 404) {
        markModelUnavailable(provider, model, 3600);
      }

      console.warn(`[Unified AI] ${provider} (${model}) failed in ${callLatency}ms (${err.message.slice(0, 100)}). Zero-delay failover to next provider (<1ms)...`);
      // Zero sleep: immediately continues to the next candidate in <1 millisecond
    }
  }

  // If all providers failed
  const summaryErr = errors.map(e => `[${e.provider}:${e.model}] -> ${e.error}`).join(' | ');
  const failure = new Error(`All 4 AI Providers exhausted: ${summaryErr}`);
  failure.errors = errors;
  throw failure;
}

/**
 * Diagnostic health and status for all 4 AI providers
 */
function getAiProvidersHealthStatus() {
  const geminiKey = sanitizeEnvValue(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  const groqKey = sanitizeEnvValue(process.env.GROQ_API_KEY);
  const cfAccount = sanitizeEnvValue(process.env.CLOUDFLARE_ACCOUNT_ID);
  const cfToken = sanitizeEnvValue(process.env.CLOUDFLARE_API_TOKEN);
  const orKey = sanitizeEnvValue(process.env.OPENROUTER_API_KEY);

  const getCooldownInfo = (provider) => {
    const expiresAt = providerCooldowns.get(provider);
    if (!expiresAt || Date.now() > expiresAt) {
      return { inCooldown: false, cooldownRemainingSeconds: 0 };
    }
    return {
      inCooldown: true,
      cooldownRemainingSeconds: Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
    };
  };

  const maskKey = (k) => {
    if (!k || k.length < 8) return 'not_configured';
    return `${k.substring(0, 4)}...${k.substring(k.length - 4)}`;
  };

  return {
    ok: true,
    engine: 'Unified 4-Provider Auto-Failover AI Engine (<1ms switch)',
    timestamp: new Date().toISOString(),
    circuitBreakers: {
      providerCooldownCount: providerCooldowns.size,
      modelUnavailableCount: modelUnavailableCooldowns.size
    },
    providers: {
      gemini: {
        tier: 1,
        name: 'Google Gemini',
        configured: Boolean(geminiKey),
        keyMask: maskKey(geminiKey),
        models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'],
        ...getCooldownInfo('gemini')
      },
      groq: {
        tier: 2,
        name: 'Groq Cloud High-Speed LPU',
        configured: Boolean(groqKey),
        keyMask: maskKey(groqKey),
        models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b'],
        ...getCooldownInfo('groq')
      },
      cloudflare: {
        tier: 3,
        name: 'Cloudflare Workers AI Free Tier',
        configured: Boolean(cfAccount && cfToken),
        accountConfigured: Boolean(cfAccount),
        tokenMask: maskKey(cfToken),
        models: ['@cf/meta/llama-3.1-8b-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
        ...getCooldownInfo('cloudflare')
      },
      openrouter: {
        tier: 4,
        name: 'OpenRouter Free Tier (Strictly :free)',
        configured: Boolean(orKey),
        keyMask: maskKey(orKey),
        models: [
          'meta-llama/llama-3.3-70b-instruct:free',
          'google/gemma-3-27b-it:free',
          'google/gemma-4-31b-it:free'
        ],
        ...getCooldownInfo('openrouter')
      }
    }
  };
}

module.exports = {
  generateUnifiedAiResponse,
  getAiProvidersHealthStatus,
  isProviderInCooldown,
  markProviderCooldown,
  providerCooldowns,
  extractJsonFromText
};
