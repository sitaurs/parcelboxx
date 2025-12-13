// Simple Gemini API Key Test
// Test dengan model gemini-1.5-flash (stable)

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

async function testKey(keyNumber, apiKey) {
  try {
    console.log(`\n🔑 Testing Key #${keyNumber}...`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = "Say 'OK' if you can read this";
    
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const responseTime = Date.now() - startTime;
    
    const response = await result.response;
    const text = response.text();
    
    console.log(`   ✅ VALID - Response: "${text.trim()}" (${responseTime}ms)`);
    return { valid: true, responseTime, response: text.trim() };
    
  } catch (error) {
    console.log(`   ❌ INVALID - ${error.message.substring(0, 100)}`);
    return { valid: false, error: error.message };
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('         GEMINI API KEYS VALIDATION TEST              ');
console.log('═══════════════════════════════════════════════════════');
console.log('Model: gemini-2.5-flash (stable)\n');

const results = [];

for (let i = 1; i <= 9; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  
  if (!key) {
    console.log(`\n⚠️  Key #${i}: MISSING in .env`);
    results.push({ keyNumber: i, valid: false, missing: true });
    continue;
  }
  
  const result = await testKey(i, key);
  results.push({ keyNumber: i, ...result });
  
  // Wait 1 second between tests
  if (i < 9) await new Promise(r => setTimeout(r, 1000));
}

console.log('\n═══════════════════════════════════════════════════════');
console.log('                    SUMMARY                            ');
console.log('═══════════════════════════════════════════════════════\n');

const validKeys = results.filter(r => r.valid);
const invalidKeys = results.filter(r => !r.valid && !r.missing);
const missingKeys = results.filter(r => r.missing);

console.log(`✅ Valid Keys:    ${validKeys.length}/9`);
console.log(`❌ Invalid Keys:  ${invalidKeys.length}/9`);
console.log(`⚠️  Missing Keys:  ${missingKeys.length}/9`);

if (validKeys.length > 0) {
  const avgLatency = validKeys.reduce((s, k) => s + k.responseTime, 0) / validKeys.length;
  console.log(`\n⚡ Avg Latency: ${Math.round(avgLatency)}ms`);
  console.log(`📊 Total RPM Capacity: ${validKeys.length * 15} RPM\n`);
}

if (validKeys.length >= 6) {
  console.log('🟢 Status: HEALTHY - Sufficient keys for production');
} else if (validKeys.length >= 3) {
  console.log('🟡 Status: DEGRADED - Consider adding more keys');
} else {
  console.log('🔴 Status: CRITICAL - Need valid API keys!');
}

console.log('\n═══════════════════════════════════════════════════════\n');

process.exit(validKeys.length === 0 ? 1 : 0);
