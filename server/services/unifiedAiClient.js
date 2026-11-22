// Cooldowns are local to the current server instance.
const CLOUDFLARE_AUTH_COOLDOWN_SECONDS = 24 * 60 * 60;
const providerCooldowns = new Map();
// In-Memory 404 / Model Unavailable Circuit Breaker (1 hour)
const modelUnavailableCooldowns = new Map();

/**
 * Cloudflare Workers AI Daily Safety Cap
 * Enforces a strict daily cap of max 8,500 estimated neurons / 45 requests per UTC day,
 * safely below Cloudflare's 10,000 free daily neuron allocation.
 * The last provider is skipped for the rest of the UTC day after the cap is reached.
 */
const CF_SAFETY_CAPS = {
  MAX_DAILY_NEURONS: 8500,
  MAX_DAILY_REQUESTS: 45,
  ESTIMATED_NEURONS_PER_REQUEST: 185 // 45 * 185 = 8325 <= 8500
};

const cloudflareDailyTracker = {
  utcDateString: '',
  requestsCount: 0,
  estimatedNeurons: 0
};

function getUtcDateKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

function checkAndSyncCloudflareDailyTracker() {
  const currentUtcDay = getUtcDateKey();
  if (cloudflareDailyTracker.utcDateString !== currentUtcDay) {
    cloudflareDailyTracker.utcDateString = currentUtcDay;
    cloudflareDailyTracker.requestsCount = 0;
    cloudflareDailyTracker.estimatedNeurons = 0;
  }
}

function isCloudflareDailyCapReached() {
  checkAndSyncCloudflareDailyTracker();
  return (
    cloudflareDailyTracker.requestsCount >= CF_SAFETY_CAPS.MAX_DAILY_REQUESTS ||
    cloudflareDailyTracker.estimatedNeurons >= CF_SAFETY_CAPS.MAX_DAILY_NEURONS
  );
}

function recordCloudflareDailyUsage(estimatedNeurons = CF_SAFETY_CAPS.ESTIMATED_NEURONS_PER_REQUEST) {
  checkAndSyncCloudflareDailyTracker();
  cloudflareDailyTracker.requestsCount += 1;
  cloudflareDailyTracker.estimatedNeurons += estimatedNeurons;
  if (isCloudflareDailyCapReached()) {
    console.warn(`[Unified AI] Cloudflare daily cap reached for ${cloudflareDailyTracker.utcDateString}.`);
  }
}

function isProviderInCooldown(providerKey) {
  const expiresAt = providerCooldowns.get(providerKey);
  if (!expiresAt) return false;
  if (Date.now() >= expiresAt) {
    providerCooldowns.delete(providerKey);
    return false;
  }
  return true;
}

function markProviderCooldown(providerKey, durationSeconds = 60) {
  const expiresAt = Date.now() + durationSeconds * 1000;
  if ((providerCooldowns.get(providerKey) || 0) >= expiresAt) return;
  providerCooldowns.set(providerKey, expiresAt);
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

function getGeminiModels() {
  const models = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
  const configured = sanitizeEnvValue(process.env.GEMINI_MODEL).replace(/^models\//, '');
  return models.includes(configured)
    ? [configured, ...models.filter(model => model !== configured)]
    : models;
}

function assertProviderResponse(response, provider, model) {
  if (response.ok) return;
  const error = new Error(`${provider} ${model} HTTP ${response.status}`);
  error.status = response.status;
  throw error;
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

    throw new Error('Provider returned invalid JSON');
  }
}

/**
 * Google Gemini v1beta API call
 */
async function callGeminiProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  const apiKey = sanitizeEnvValue(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY);
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set or empty');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const cleanModel = model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent`;

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

    assertProviderResponse(res, 'Gemini', cleanModel);

    const data = await res.json();
    const outputText = (data?.candidates?.[0]?.content?.parts || [])
      .filter(part => !part.thought).map(part => part.text || '').join('');
    if (!outputText) {
      throw new Error(`Gemini ${cleanModel} returned empty candidates`);
    }
    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Groq Cloud API call
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

    assertProviderResponse(res, 'Groq', model);

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
 * Cloudflare Workers AI call
 */
async function callCloudflareProvider({ model, systemPrompt, userPrompt, jsonMode, temperature, timeoutMs }) {
  if (isCloudflareDailyCapReached()) {
    throw new Error(`Cloudflare daily safety cap reached (max ${CF_SAFETY_CAPS.MAX_DAILY_NEURONS} neurons / ${CF_SAFETY_CAPS.MAX_DAILY_REQUESTS} reqs per UTC day). Bypassed in 0ms.`);
  }

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

    if (res.status === 401 || res.status === 403) {
      markProviderCooldown('cloudflare', CLOUDFLARE_AUTH_COOLDOWN_SECONDS);
    }
    assertProviderResponse(res, 'Cloudflare', model);

    const data = await res.json();
    const outputText = data?.result?.response || (typeof data?.result === 'string' ? data.result : '');
    if (!outputText) {
      throw new Error(`Cloudflare AI ${model} returned empty response`);
    }

    // Safely track neuron usage against daily 8,500 neuron safety cap
    recordCloudflareDailyUsage(CF_SAFETY_CAPS.ESTIMATED_NEURONS_PER_REQUEST);

    return outputText;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * OpenRouter API call for explicit :free models
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

    assertProviderResponse(res, 'OpenRouter', model);

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

const aiProviders = [
  {
    key: 'groq',
    name: 'Groq Cloud',
    getModels: () => ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'],
    isConfigured: () => Boolean(sanitizeEnvValue(process.env.GROQ_API_KEY)),
    call: callGroqProvider
  },
  {
    key: 'openrouter',
    name: 'OpenRouter Free Tier',
    getModels: () => [
      'google/gemma-4-31b-it:free',
      'inclusionai/ling-3.2-flash:free',
      'google/gemma-4-26b-a4b-it:free'
    ],
    isConfigured: () => Boolean(sanitizeEnvValue(process.env.OPENROUTER_API_KEY)),
    call: callOpenRouterProvider
  },
  {
    key: 'gemini',
    name: 'Google Gemini',
    getModels: getGeminiModels,
    isConfigured: () => Boolean(sanitizeEnvValue(process.env.GEMINI_API_KEY || process.env.REMOTE_GEMINI_API_KEY)),
    call: callGeminiProvider
  },
  {
    key: 'cloudflare',
    name: 'Cloudflare Workers AI',
    getModels: () => ['@cf/meta/llama-3.1-8b-instruct-fp8', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'],
    isConfigured: () => Boolean(sanitizeEnvValue(process.env.CLOUDFLARE_ACCOUNT_ID) && sanitizeEnvValue(process.env.CLOUDFLARE_API_TOKEN)),
    call: callCloudflareProvider
  }
];

function getProviderChain() {
  return aiProviders.filter(provider => provider.isConfigured())
    .flatMap(({ key, getModels, call }) => getModels().map(model => ({ provider: key, model, call })));
}

/**
 * Try configured providers in priority order without waiting between attempts.
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

  for (const { provider, model, call } of chain) {
    if (isProviderInCooldown(provider)) {
      continue;
    }

    if (provider === 'cloudflare' && isCloudflareDailyCapReached()) {
      continue;
    }

    if (isModelUnavailable(provider, model)) {
      continue;
    }

    const callStart = Date.now();
    try {
      const rawText = await call({
        model,
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
      const reason = err.status ? `HTTP ${err.status}` : err.name === 'AbortError' ? 'timeout' : 'request or response failed';
      errors.push({ provider, model, error: reason, status: err.status, latencyMs: callLatency });

      // If Rate-Limited (429), place provider into in-memory cooldown map for 60s
      if (err.status === 429) {
        markProviderCooldown(provider, 60);
      }

      // If Model not found (404), place model into in-memory circuit breaker for 1h
      if (err.status === 404) {
        markModelUnavailable(provider, model, 3600);
      }

      console.warn(`[Unified AI] ${provider} (${model}) failed in ${callLatency}ms (${reason}).`);
    }
  }

  const summary = errors.map(e => `${e.provider}/${e.model}: ${e.error}`).join(' | ');
  const failure = new Error(summary ? `AI providers failed: ${summary}` : 'No AI provider is currently available.');
  failure.code = 'AI_PROVIDERS_UNAVAILABLE';
  failure.errors = errors;
  throw failure;
}

/**
 * Diagnostic health and status for all 4 AI providers
 */
function getAiProvidersHealthStatus() {
  const isCapReached = isCloudflareDailyCapReached();
  const now = Date.now();
  const providers = Object.fromEntries(aiProviders.map((provider, index) => {
    const inCooldown = isProviderInCooldown(provider.key);
    const cooldownRemainingSeconds = inCooldown
      ? Math.max(0, Math.ceil((providerCooldowns.get(provider.key) - now) / 1000))
      : 0;
    return [provider.key, {
      tier: index + 1,
      name: provider.name,
      configured: provider.isConfigured(),
      models: provider.getModels(),
      inCooldown,
      cooldownRemainingSeconds
    }];
  }));

  providers.cloudflare.accountConfigured = Boolean(sanitizeEnvValue(process.env.CLOUDFLARE_ACCOUNT_ID));
  providers.cloudflare.dailyCap = {
    utcDate: cloudflareDailyTracker.utcDateString,
    requestsToday: cloudflareDailyTracker.requestsCount,
    maxDailyRequests: CF_SAFETY_CAPS.MAX_DAILY_REQUESTS,
    estimatedNeuronsToday: cloudflareDailyTracker.estimatedNeurons,
    maxDailyNeurons: CF_SAFETY_CAPS.MAX_DAILY_NEURONS,
    isCapReached,
    bypassActive: isCapReached
  };

  return {
    ok: true,
    engine: 'Unified 4-Provider AI Failover',
    timestamp: new Date(now).toISOString(),
    circuitBreakers: {
      providerCooldownCount: providerCooldowns.size,
      modelUnavailableCount: modelUnavailableCooldowns.size
    },
    providers
  };
}

module.exports = {
  generateUnifiedAiResponse,
  getGeminiModels,
  getAiProvidersHealthStatus,
  isProviderInCooldown,
  markProviderCooldown,
  providerCooldowns,
  extractJsonFromText,
  isCloudflareDailyCapReached,
  recordCloudflareDailyUsage,
  cloudflareDailyTracker,
  CF_SAFETY_CAPS
};
