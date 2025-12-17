// Test 6 Gemini API keys dari VPS
import 'dotenv/config';

const keys = [
  { id: 1, key: process.env.GEMINI_API_KEY_1 },
  { id: 2, key: process.env.GEMINI_API_KEY_2 },
  { id: 3, key: process.env.GEMINI_API_KEY_3 },
  { id: 4, key: process.env.GEMINI_API_KEY_4 },
  { id: 5, key: process.env.GEMINI_API_KEY_5 },
  { id: 6, key: process.env.GEMINI_API_KEY_6 },
  { id: 7, key: process.env.GEMINI_API_KEY_7 },
  { id: 8, key: process.env.GEMINI_API_KEY_8 },
  { id: 9, key: process.env.GEMINI_API_KEY_9 }
];

console.log('\n🔑 Testing 9 Gemini API Keys...\n');

async function testKey(id, apiKey) {
  if (!apiKey || apiKey.length < 20) {
    return { id, status: '❌ EMPTY/INVALID', error: 'Missing or invalid key' };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: 'Say hello' }]
        }]
      })
    });

    const data = await response.json();

    if (response.ok && data.candidates) {
      const text = data.candidates[0]?.content?.parts[0]?.text || 'No text';
      return { 
        id, 
        status: '✅ VALID', 
        response: text.substring(0, 50) + '...',
        key: apiKey.substring(0, 20) + '...'
      };
    } else if (response.status === 403) {
      return { id, status: '🔒 LEAKED', error: 'API key reported as leaked', key: apiKey.substring(0, 20) + '...' };
    } else if (response.status === 400) {
      return { id, status: '⚠️ EXPIRED/INVALID', error: data.error?.message || 'Bad request', key: apiKey.substring(0, 20) + '...' };
    } else if (response.status === 429) {
      return { id, status: '📊 QUOTA_EXCEEDED', error: 'Rate limit or quota exceeded', key: apiKey.substring(0, 20) + '...' };
    } else {
      return { id, status: '❌ ERROR', error: data.error?.message || 'Unknown error', key: apiKey.substring(0, 20) + '...' };
    }
  } catch (error) {
    return { id, status: '❌ NETWORK_ERROR', error: error.message };
  }
}

// Test all keys sequentially
for (const { id, key } of keys) {
  const result = await testKey(id, key);
  
  console.log(`KEY_${result.id}: ${result.status}`);
  if (result.key) console.log(`  → ${result.key}`);
  if (result.response) console.log(`  → Response: ${result.response}`);
  if (result.error) console.log(`  → Error: ${result.error}`);
  console.log('');
  
  // Small delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 500));
}

console.log('✅ Test complete!\n');
