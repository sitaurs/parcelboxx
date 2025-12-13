// Gemini AI Client - Main interface untuk Gemini API
import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiClient {
  constructor(keyPool) {
    this.keyPool = keyPool;
    this.model = 'gemini-2.5-flash';
    this.maxRetries = 3; // Maximum retry attempts dengan key berbeda
  }
  
  // Main verification method dengan auto-retry
  async verifyPackage(imageBuffer, options = {}) {
    const {
      reason = 'unknown',
      distance = null,
      priority = false
    } = options;
    
  // Main verification method dengan auto-retry
  async verifyPackage(imageBuffer, options = {}) {
    const {
      reason = 'unknown',
      distance = null,
      priority = false
    } = options;
    
    const startTime = Date.now();
    const usedKeys = []; // Track keys yang sudah dicoba
    let lastError = null;
    
    // Retry loop dengan key berbeda
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      let selectedKey = null;
      
      try {
        // 1. Select API key dari pool (skip keys yang sudah dicoba)
        selectedKey = this.keyPool.selectKey({ 
          priority,
          excludeKeys: usedKeys 
        });
        
        if (!selectedKey) {
          throw new Error(`No available API keys (attempt ${attempt}/${this.maxRetries})`);
        }
        
        usedKeys.push(selectedKey.id);
        console.log(`[Gemini] Attempt ${attempt}/${this.maxRetries}: Using key ${selectedKey.id} (${selectedKey.tier})`);
        
        // 2. Initialize Gemini with selected key
        const genAI = new GoogleGenerativeAI(selectedKey.key);
        const model = genAI.getGenerativeModel({ model: this.model });
        
        // 3. Prepare prompt
        const prompt = this.buildPrompt(reason, distance);
        
        // 4. Prepare image
        const imagePart = {
          inlineData: {
            data: imageBuffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
        
        // 5. Call Gemini API
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        
        // 6. Parse response
        const analysis = this.parseResponse(text);
        
        // 7. Calculate response time
        const responseTime = Date.now() - startTime;
        
        // 8. Mark success
        this.keyPool.markSuccess(selectedKey.id, responseTime);
        
        // 9. Return result (SUCCESS - no retry needed)
        console.log(`[Gemini] ✅ Success on attempt ${attempt} with key ${selectedKey.id}`);
        return {
          success: true,
          keyId: selectedKey.id,
          attempts: attempt,
          hasPackage: analysis.hasPackage,
          confidence: analysis.confidence,
          description: analysis.description,
          reasoning: analysis.reasoning,
          responseTime: responseTime,
          metadata: {
            model: this.model,
            reason: reason,
            distance: distance
          }
        };
        
      } catch (error) {
        const attemptTime = Date.now() - startTime;
        lastError = error;
        
        // Mark error in key pool
        if (selectedKey) {
          const errorType = this.categorizeError(error);
          this.keyPool.markError(selectedKey.id, errorType, {
            message: error.message,
            code: error.status
          });
          
          console.error(`[Gemini] ❌ Attempt ${attempt} failed with key ${selectedKey.id}: ${errorType} - ${error.message.substring(0, 100)}`);
        }
        
        // Check if should retry
        const shouldRetry = this.shouldRetry(error, attempt);
        
        if (!shouldRetry || attempt >= this.maxRetries) {
          console.error(`[Gemini] All ${attempt} attempts failed. Giving up.`);
          break;
        }
        
        // Wait before retry (exponential backoff)
        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[Gemini] Waiting ${waitMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
    
    // All retries failed
    const totalTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      errorType: this.categorizeError(lastError),
      attempts: usedKeys.length,
      usedKeys: usedKeys,
      responseTime: totalTime,
      keyId: null
    };
  }
  
  // Build prompt for package detection
  buildPrompt(reason, distance) {
    const basePrompt = `Analyze this image from a package delivery box holder system.

CONTEXT:
- This is a top-down view of a holder plate (penahan paket)
- The holder plate can be in UP position (holding a package) or DOWN position (empty)
${distance ? `- Ultrasonic sensor detected object at ${distance.toFixed(1)} cm` : ''}
- Detection reason: ${reason}

TASK:
Determine if there is a REAL package or parcel on the holder plate.

IMPORTANT RULES:
1. Only answer TRUE if you see a clear package/box/parcel with:
   - Defined edges and shape
   - Visible volume (not flat)
   - Packaging material (cardboard, plastic wrap, envelope, etc.)
   
2. Answer FALSE for:
   - Empty holder plate
   - Shadows or lighting artifacts
   - Dust, dirt, or stains
   - Hands or body parts (delivery person)
   - Holder mechanism itself
   
3. Confidence scoring:
   - 90-100%: Very clear package, no doubt
   - 80-89%: Clear package, minor obstruction
   - 70-79%: Package visible but partially obscured
   - 60-69%: Uncertain, might be package
   - 0-59%: No package or very unclear

RESPOND WITH VALID JSON ONLY:
{
  "hasPackage": true or false,
  "confidence": 0-100,
  "description": "brief description of what you see",
  "reasoning": "why you decided this way"
}`;

    return basePrompt;
  }
  
  // Parse Gemini response
  parseResponse(responseText) {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[Gemini] No JSON found in response, using fallback');
        return {
          hasPackage: false,
          confidence: 0,
          description: 'Failed to parse response',
          reasoning: 'Invalid response format'
        };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize
      return {
        hasPackage: Boolean(parsed.hasPackage),
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
        description: String(parsed.description || '').slice(0, 200),
        reasoning: String(parsed.reasoning || '').slice(0, 300)
      };
      
    } catch (error) {
      console.error('[Gemini] Parse error:', error.message);
      return {
        hasPackage: false,
        confidence: 0,
        description: 'Parse error',
        reasoning: error.message
      };
    }
  }
  
  // Determine if error is retryable
  shouldRetry(error, attempt) {
    // Don't retry on last attempt
    if (attempt >= this.maxRetries) return false;
    
    const errorType = this.categorizeError(error);
    
    // Retry on these error types
    const retryableErrors = [
      'RATE_LIMIT',    // 429 - Try another key
      'SERVER_ERROR',  // 500+ - Server issue, might work with another key
      'TIMEOUT'        // Timeout - Try again
    ];
    
    return retryableErrors.includes(errorType);
  }
  
  // Categorize error type
  categorizeError(error) {
    if (error.status === 429 || error.message.includes('quota') || error.message.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    
    if (error.status >= 500) {
      return 'SERVER_ERROR';
    }
    
    if (error.status === 401 || error.status === 403) {
      return 'AUTH_ERROR';
    }
    
    if (error.message.includes('timeout')) {
      return 'TIMEOUT';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  // Get pool stats
  getStats() {
    return this.keyPool.getStats();
  }
  
  // Get health report
  getHealthReport() {
    return this.keyPool.getHealthReport();
  }
}

export default GeminiClient;
