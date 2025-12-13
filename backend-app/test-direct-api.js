// Test with direct fetch API
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY_1;

async function testWithFetch() {
  console.log('Testing with direct API call...\n');
  
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',  
    'gemini-pro',
    'gemini-2.0-flash-exp'
  ];
  
  for (const model of modelsToTry) {
    try {
      console.log(`Testing model: ${model}`);
      
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${API_KEY}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say OK'
            }]
          }]
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`  ✅ SUCCESS! Response: "${text}"`);
        console.log(`  Model: ${model} works!\n`);
        return model; // Return working model
      } else {
        console.log(`  ❌ FAILED: ${response.status} - ${data.error?.message || 'Unknown error'}\n`);
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}\n`);
    }
  }
  
  return null;
}

const workingModel = await testWithFetch();

if (workingModel) {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Working model found: ${workingModel}`);
  console.log(`✅ API Key is VALID`);
  console.log('═══════════════════════════════════════════════════════');
} else {
  console.log('❌ No working model found. Check API key or model names.');
}
