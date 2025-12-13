// List available Gemini models
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const key = process.env.GEMINI_API_KEY_1;

console.log('Fetching available models...\n');

try {
  const genAI = new GoogleGenerativeAI(key);
  
  // Try to list models (if API supports it)
  console.log('Testing different model names:\n');
  
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-vision',
    'gemini-2.0-flash-exp',
    'models/gemini-1.5-flash',
    'models/gemini-pro'
  ];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say OK');
      const response = await result.response;
      const text = response.text();
      
      console.log(`  ✅ SUCCESS! Response: "${text.trim()}"\n`);
      break; // Stop on first success
      
    } catch (error) {
      if (error.status === 404) {
        console.log(`  ❌ Model not found\n`);
      } else {
        console.log(`  ❌ Error: ${error.message.substring(0, 80)}\n`);
      }
    }
  }
  
} catch (error) {
  console.log('Error:', error.message);
}
