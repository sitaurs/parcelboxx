// List available models for this API key
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY_1;

console.log('Fetching list of available models...\n');

const url = `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`;

try {
  const response = await fetch(url);
  const data = await response.json();
  
  if (response.ok && data.models) {
    console.log(`Found ${data.models.length} models:\n`);
    
    data.models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName}`);
      console.log(`   Description: ${model.description}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ')}`);
      console.log('');
    });
    
    // Find models that support generateContent
    const contentModels = data.models.filter(m => 
      m.supportedGenerationMethods?.includes('generateContent')
    );
    
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Models supporting generateContent: ${contentModels.length}`);
    console.log('═══════════════════════════════════════════════════════');
    
    if (contentModels.length > 0) {
      console.log('\nRecommended models for use:\n');
      contentModels.forEach((model, index) => {
        // Extract model name without 'models/' prefix
        const modelName = model.name.replace('models/', '');
        console.log(`${index + 1}. ${modelName}`);
        console.log(`   Use in code: genAI.getGenerativeModel({ model: '${modelName}' })`);
        console.log('');
      });
    }
    
  } else {
    console.log('Error:', data);
  }
  
} catch (error) {
  console.log('Error fetching models:', error.message);
}
