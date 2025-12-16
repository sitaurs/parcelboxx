// Test key #5 specifically
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const key = process.env.GEMINI_API_KEY_5;

console.log('Testing Key #5:', key ? key.substring(0, 20) + '...' : 'NOT FOUND');
console.log('');

try {
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  console.log('Sending request...');
  const result = await model.generateContent('Say OK');
  const response = await result.response;
  const text = response.text();
  
  console.log('✅ SUCCESS!');
  console.log('Response:', text);
  
} catch (error) {
  console.log('❌ FAILED!');
  console.log('Status:', error.status);
  console.log('Error:', error.message.substring(0, 200));
}
