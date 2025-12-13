// Debug single key
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const key = process.env.GEMINI_API_KEY_1;

console.log('Testing Key:', key ? key.substring(0, 20) + '...' : 'NOT FOUND');
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
  console.log('Full Error:', error);
  console.log('');
  console.log('Error Message:', error.message);
  console.log('');
  if (error.response) {
    console.log('Response Status:', error.response.status);
    console.log('Response Data:', error.response.data);
  }
}
