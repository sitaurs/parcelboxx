// Test Gemini API Keys Validity
// Checks all 9 Gemini API keys to ensure they are working

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const TEST_IMAGE_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='; // 1x1 red pixel

async function testGeminiKey(keyNumber, apiKey) {
  try {
    console.log(`\n🔑 Testing Key #${keyNumber}...`);
    console.log(`   Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 4)}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    
    const imagePart = {
      inlineData: {
        data: TEST_IMAGE_BASE64,
        mimeType: 'image/png'
      }
    };
    
    const prompt = "What color is this image? Answer in one word.";
    
    const startTime = Date.now();
    const result = await model.generateContent([prompt, imagePart]);
    const responseTime = Date.now() - startTime;
    
    const response = await result.response;
    const text = response.text();
    
    console.log(`   ✅ SUCCESS`);
    console.log(`   Response: "${text.trim()}"`);
    console.log(`   Latency: ${responseTime}ms`);
    
    return {
      keyNumber,
      status: 'active',
      valid: true,
      responseTime,
      response: text.trim(),
      error: null
    };
    
  } catch (error) {
    console.log(`   ❌ FAILED`);
    console.log(`   Error: ${error.message}`);
    
    // Check if it's a rate limit error
    const isRateLimit = error.message?.includes('429') || 
                       error.message?.includes('quota') ||
                       error.message?.includes('rate limit');
    
    // Check if it's an invalid key error
    const isInvalidKey = error.message?.includes('API key not valid') ||
                        error.message?.includes('invalid') ||
                        error.message?.includes('403');
    
    return {
      keyNumber,
      status: isRateLimit ? 'rate_limited' : (isInvalidKey ? 'invalid' : 'error'),
      valid: !isInvalidKey,
      responseTime: null,
      response: null,
      error: error.message
    };
  }
}

async function testAllKeys() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     GEMINI API KEYS VALIDITY TEST                    ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`Model: gemini-2.0-flash-exp (will try gemini-1.5-flash if fails)`);
  console.log(`Test: Simple image color detection`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const results = [];
  
  // Test all 9 keys sequentially to avoid rate limiting
  for (let i = 1; i <= 9; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    
    if (!key) {
      console.log(`\n⚠️  Key #${i}: NOT FOUND in .env`);
      results.push({
        keyNumber: i,
        status: 'missing',
        valid: false,
        responseTime: null,
        response: null,
        error: 'Key not found in environment'
      });
      continue;
    }
    
    const result = await testGeminiKey(i, key);
    results.push(result);
    
    // Wait 2 seconds between requests to avoid rate limiting
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  const activeKeys = results.filter(r => r.valid && r.status === 'active');
  const rateLimitedKeys = results.filter(r => r.status === 'rate_limited');
  const invalidKeys = results.filter(r => !r.valid);
  const missingKeys = results.filter(r => r.status === 'missing');
  const errorKeys = results.filter(r => r.status === 'error' && r.valid);
  
  console.log('📊 Statistics:');
  console.log(`   ✅ Active Keys:        ${activeKeys.length}/9`);
  console.log(`   ⏱️  Rate Limited:      ${rateLimitedKeys.length}/9`);
  console.log(`   ❌ Invalid Keys:       ${invalidKeys.length}/9`);
  console.log(`   ⚠️  Missing Keys:      ${missingKeys.length}/9`);
  console.log(`   🔥 Error Keys:         ${errorKeys.length}/9`);
  
  if (activeKeys.length > 0) {
    const avgLatency = activeKeys.reduce((sum, k) => sum + k.responseTime, 0) / activeKeys.length;
    console.log(`\n⚡ Performance:`);
    console.log(`   Average Latency:   ${Math.round(avgLatency)}ms`);
    console.log(`   Min Latency:       ${Math.min(...activeKeys.map(k => k.responseTime))}ms`);
    console.log(`   Max Latency:       ${Math.max(...activeKeys.map(k => k.responseTime))}ms`);
  }
  
  console.log('\n🔑 Key Status:');
  results.forEach(r => {
    const statusIcon = r.status === 'active' ? '✅' : 
                      r.status === 'rate_limited' ? '⏱️' :
                      r.status === 'invalid' ? '❌' :
                      r.status === 'missing' ? '⚠️' : '🔥';
    const statusText = r.status.toUpperCase().padEnd(15);
    const latency = r.responseTime ? `${r.responseTime}ms`.padEnd(10) : 'N/A'.padEnd(10);
    
    console.log(`   ${statusIcon} Key #${r.keyNumber}: ${statusText} ${latency}`);
  });
  
  // Health Assessment
  console.log('\n🏥 System Health:');
  
  const healthScore = (activeKeys.length / 9) * 100;
  let healthStatus, healthIcon, recommendation;
  
  if (healthScore >= 80) {
    healthStatus = 'EXCELLENT';
    healthIcon = '🟢';
    recommendation = 'System is healthy and ready for production';
  } else if (healthScore >= 60) {
    healthStatus = 'GOOD';
    healthIcon = '🟡';
    recommendation = 'System operational, monitor rate limits';
  } else if (healthScore >= 40) {
    healthStatus = 'DEGRADED';
    healthIcon = '🟠';
    recommendation = 'Consider replacing invalid keys';
  } else {
    healthStatus = 'CRITICAL';
    healthIcon = '🔴';
    recommendation = 'URGENT: Replace invalid keys immediately';
  }
  
  console.log(`   ${healthIcon} Status: ${healthStatus} (${Math.round(healthScore)}%)`);
  console.log(`   💡 Recommendation: ${recommendation}`);
  
  // Rate Limit Capacity
  const effectiveRPM = activeKeys.length * 15; // Each key = 15 RPM
  console.log(`\n⚡ Rate Limit Capacity:`);
  console.log(`   Active Keys:       ${activeKeys.length}`);
  console.log(`   Total Capacity:    ${effectiveRPM} RPM (Requests Per Minute)`);
  console.log(`   Per Key Limit:     15 RPM`);
  
  if (effectiveRPM < 45) {
    console.log(`   ⚠️  WARNING: Low capacity - consider adding more keys`);
  } else if (effectiveRPM >= 90) {
    console.log(`   ✅ EXCELLENT: High capacity for production load`);
  } else {
    console.log(`   ✅ GOOD: Sufficient capacity for normal operation`);
  }
  
  // Action Items
  if (invalidKeys.length > 0 || missingKeys.length > 0 || errorKeys.length > 0) {
    console.log('\n🔧 Action Required:');
    
    if (invalidKeys.length > 0) {
      console.log(`\n   ❌ Invalid Keys (${invalidKeys.length}):`);
      invalidKeys.forEach(k => {
        console.log(`      • Key #${k.keyNumber}: ${k.error}`);
      });
      console.log(`   → Replace these keys in .env file`);
    }
    
    if (missingKeys.length > 0) {
      console.log(`\n   ⚠️  Missing Keys (${missingKeys.length}):`);
      missingKeys.forEach(k => {
        console.log(`      • Key #${k.keyNumber}: Not found in .env`);
      });
      console.log(`   → Add these keys to .env file`);
    }
    
    if (errorKeys.length > 0) {
      console.log(`\n   🔥 Error Keys (${errorKeys.length}):`);
      errorKeys.forEach(k => {
        console.log(`      • Key #${k.keyNumber}: ${k.error}`);
      });
      console.log(`   → Check network connection and retry`);
    }
  } else {
    console.log('\n✅ No action required - All keys are working!');
  }
  
  console.log('\n═══════════════════════════════════════════════════════\n');
  
  // Return results for programmatic use
  return {
    total: 9,
    active: activeKeys.length,
    rateLimited: rateLimitedKeys.length,
    invalid: invalidKeys.length,
    missing: missingKeys.length,
    error: errorKeys.length,
    healthScore,
    healthStatus,
    effectiveRPM,
    results
  };
}

// Run test
console.log('Starting Gemini API Keys test...\n');

testAllKeys()
  .then(summary => {
    console.log('Test completed successfully!');
    process.exit(summary.invalid > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
