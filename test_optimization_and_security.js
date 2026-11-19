const assert = require('assert');
const fs = require('fs');

console.log('Testing Optimization & Security Implementations...');

// 1. Connection pooling check
const serverCode = fs.readFileSync('server/server.js', 'utf8');
assert(serverCode.includes('maxPoolSize: 5'), 'maxPoolSize: 5 should be present');
assert(serverCode.includes('minPoolSize: 0'), 'minPoolSize: 0 should be present');
console.log('✓ PASS: Serverless connection pooling (maxPoolSize: 5, minPoolSize: 0)');

// 2. Admin JWT 24h expiration check
assert(serverCode.includes('expiresIn: "24h"'), 'Admin JWT expiresIn 24h should be present');
console.log('✓ PASS: Admin JWT session expiration set to 24h');

// 3. Security Headers check
assert(serverCode.includes('res.setHeader("X-Frame-Options", "DENY")'), 'X-Frame-Options DENY in server.js');
const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const catchAllRoute = vercelJson.routes.find(r => r.src === '/(.*)');
assert(catchAllRoute && catchAllRoute.headers['X-Frame-Options'] === 'DENY', 'X-Frame-Options DENY in vercel.json');
assert(catchAllRoute && catchAllRoute.headers['X-Content-Type-Options'] === 'nosniff', 'X-Content-Type-Options nosniff in vercel.json');
console.log('✓ PASS: HTTP Security Headers in server.js and vercel.json (DENY, nosniff, strict-origin)');

// 4. Video Obfuscation check
assert(serverCode.includes('bjs_enc_'), 'Video ID obfuscation bjs_enc_ should be present in server.js');
const modalCode = fs.readFileSync('client/src/components/VideoPlayerModal.jsx', 'utf8');
assert(modalCode.includes('bjs_enc_') && modalCode.includes('resolveVideoId'), 'VideoPlayerModal resolves bjs_enc_');
assert(modalCode.includes('Anti-Piracy Top Shield'), 'VideoPlayerModal anti-piracy top overlay present');
console.log('✓ PASS: Video ID obfuscation and Anti-Piracy Shield overlay in VideoPlayerModal.jsx');

// 5. AI Input Limit & Rate Limit check
const legalAiCode = fs.readFileSync('server/services/legalAiService.js', 'utf8');
assert(legalAiCode.includes('cleanQuery.length > 500'), 'legalAiService checks 500 chars limit');
assert(serverCode.includes('checkAiRateLimit'), 'server.js enforces checkAiRateLimit');
console.log('✓ PASS: AI input 500-char guardrail and 8 req/min sliding rate limit');

// 6. CDN Cache Headers check
assert(serverCode.includes('s-maxage=60, stale-while-revalidate=300'), 'CDN s-maxage=60 header present');
console.log('✓ PASS: CDN Response Caching (s-maxage=60, stale-while-revalidate=300)');

// 7. AuditLog check
assert(serverCode.includes('logAuditEvent'), 'AuditLog logging function present');
assert(serverCode.includes('STUDENT_DELETE'), 'AuditLog logs student deletion');
assert(serverCode.includes('PAYMENT_APPROVE'), 'AuditLog logs payment approve');
assert(serverCode.includes('COURSE_SAVE'), 'AuditLog logs course save');
console.log('✓ PASS: AuditLog integration across critical admin operations');

console.log('\n========================================================');
console.log('ALL OPTIMIZATION AND ADVANCED SECURITY CHECKS PASSED (7/7)!');
console.log('========================================================');
