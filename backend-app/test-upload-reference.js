// Test upload reference images ke backend VPS
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

const BACKEND_URL = 'http://3.27.11.106:9090/api/ai/verify-package';
const IMAGES = [
  { file: 'reference-images/Gambar_penahan_kosong.jpg', desc: 'Empty holder - door OPEN' },
  { file: 'reference-images/gambar_penahan2.jpg', desc: 'Empty holder - door slightly OPEN' },
  { file: 'reference-images/gambar_penahan_paket.jpg', desc: 'PACKAGE on holder' },
  { file: 'reference-images/gambar_penahan_paket2.jpg', desc: 'PACKAGE on holder (angle 2)' },
  { file: 'reference-images/gambar_paket_jatuh.jpg', desc: 'After DROP - holder tilted' }
];

console.log('🔍 Testing Enhanced Gemini Prompt with Reference Images\n');

for (const { file, desc } of IMAGES) {
  console.log(`\n📸 Testing: ${desc}`);
  console.log(`   File: ${file}`);
  
  try {
    const formData = new FormData();
    formData.append('deviceId', 'box-01');
    formData.append('image', fs.createReadStream(file));
    
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      const icon = result.hasPackage ? '📦 PACKAGE DETECTED' : '❌ NO PACKAGE';
      console.log(`   ${icon}`);
      console.log(`   Confidence: ${result.confidence}%`);
      console.log(`   Description: ${result.description.substring(0, 80)}...`);
      console.log(`   Key Used: ${result.keyId}, Response: ${result.responseTime}ms`);
    } else {
      console.log(`   ❌ ERROR: ${result.error}`);
    }
    
    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.log(`   ❌ Request failed: ${error.message}`);
  }
}

console.log('\n✅ Test complete!\n');
