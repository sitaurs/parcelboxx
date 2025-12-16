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
  
  /**
   * Compare two photos: baseline (empty holder) vs realtime
   * This is the core feature for accurate package detection
   * 
   * @param {Buffer} baselineBuffer - Baseline photo (empty holder after package dropped)
   * @param {Buffer} realtimeBuffer - Current/realtime photo to compare
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Comparison result
   */
  async compareWithBaseline(baselineBuffer, realtimeBuffer, options = {}) {
    const {
      reason = 'comparison',
      distance = null,
      priority = false,
      baselineAge = null
    } = options;
    
    const startTime = Date.now();
    const usedKeys = [];
    let lastError = null;
    
    // Retry loop dengan key berbeda
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      let selectedKey = null;
      
      try {
        // 1. Select API key dari pool
        selectedKey = this.keyPool.selectKey({ 
          priority,
          excludeKeys: usedKeys 
        });
        
        if (!selectedKey) {
          throw new Error(`No available API keys (attempt ${attempt}/${this.maxRetries})`);
        }
        
        usedKeys.push(selectedKey.id);
        console.log(`[Gemini] Comparison attempt ${attempt}/${this.maxRetries}: Using key ${selectedKey.id}`);
        
        // 2. Initialize Gemini with selected key
        const genAI = new GoogleGenerativeAI(selectedKey.key);
        const model = genAI.getGenerativeModel({ model: this.model });
        
        // 3. Prepare comparison prompt
        const prompt = this.buildComparisonPrompt(reason, distance, baselineAge);
        
        // 4. Prepare both images
        const baselinePart = {
          inlineData: {
            data: baselineBuffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
        
        const realtimePart = {
          inlineData: {
            data: realtimeBuffer.toString('base64'),
            mimeType: 'image/jpeg'
          }
        };
        
        // 5. Call Gemini API with both images
        const result = await model.generateContent([prompt, baselinePart, realtimePart]);
        const response = await result.response;
        const text = response.text();
        
        // 6. Parse response
        const analysis = this.parseComparisonResponse(text);
        
        // 7. Calculate response time
        const responseTime = Date.now() - startTime;
        
        // 8. Mark success
        this.keyPool.markSuccess(selectedKey.id, responseTime);
        
        // 9. Return result
        console.log(`[Gemini] ✅ Comparison success on attempt ${attempt} with key ${selectedKey.id}`);
        return {
          success: true,
          keyId: selectedKey.id,
          attempts: attempt,
          hasNewPackage: analysis.hasNewPackage,
          confidence: analysis.confidence,
          changeDetected: analysis.changeDetected,
          description: analysis.description,
          reasoning: analysis.reasoning,
          comparisonDetails: analysis.comparisonDetails,
          responseTime: responseTime,
          metadata: {
            model: this.model,
            reason: reason,
            distance: distance,
            mode: 'comparison',
            baselineAge: baselineAge
          }
        };
        
      } catch (error) {
        lastError = error;
        
        if (selectedKey) {
          const errorType = this.categorizeError(error);
          this.keyPool.markError(selectedKey.id, errorType, {
            message: error.message,
            code: error.status
          });
          
          console.error(`[Gemini] ❌ Comparison attempt ${attempt} failed: ${errorType}`);
        }
        
        const shouldRetry = this.shouldRetry(error, attempt);
        
        if (!shouldRetry || attempt >= this.maxRetries) {
          break;
        }
        
        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      errorType: this.categorizeError(lastError),
      attempts: usedKeys.length,
      responseTime: Date.now() - startTime,
      keyId: null
    };
  }
  
  /**
   * Build comparison prompt for 2-photo analysis
   */
  buildComparisonPrompt(reason, distance, baselineAge) {
    const ageInfo = baselineAge 
      ? `- Baseline photo age: ${Math.floor(baselineAge / 1000 / 60)} minutes ago`
      : '';
    
    return `Compare these TWO images from a package delivery box holder system.

IMAGE 1 (BASELINE): Shows the holder plate in EMPTY state after previous package was released.
IMAGE 2 (REALTIME): Shows the current state of the holder plate.

CONTEXT:
- This is a top-down view of a holder plate (penahan paket)
- Baseline was captured when holder was confirmed empty
${ageInfo}
${distance ? `- Ultrasonic sensor currently detects object at ${distance.toFixed(1)} cm` : ''}
- Detection reason: ${reason}

TASK:
Compare the two images and determine if a NEW package has arrived on the holder plate.

ANALYSIS STEPS:
1. Examine Image 1 (baseline) - identify the empty holder state
2. Examine Image 2 (realtime) - identify current state
3. Compare differences between the two images
4. Determine if the difference is a NEW package

IMPORTANT RULES:
1. Answer hasNewPackage=TRUE only if:
   - There is a CLEAR difference between baseline and realtime
   - The difference shows a package/box/parcel (not just lighting change)
   - Package has defined edges, visible volume, packaging material

2. Answer hasNewPackage=FALSE if:
   - Images are essentially the same (no change)
   - Difference is only lighting/shadows
   - Difference is hand/person (not a package)
   - Holder is still empty

3. Confidence scoring:
   - 90-100%: Very clear new package appeared
   - 80-89%: Clear package, minor differences in lighting
   - 70-79%: Likely package but some uncertainty
   - 60-69%: Possible package, needs verification
   - 0-59%: No package or false positive

RESPOND WITH VALID JSON ONLY:
{
  "hasNewPackage": true or false,
  "changeDetected": true or false,
  "confidence": 0-100,
  "description": "brief description of what you see in realtime image",
  "reasoning": "why you determined this result",
  "comparisonDetails": {
    "baselineState": "description of baseline image",
    "realtimeState": "description of realtime image",
    "differences": "what changed between the two"
  }
}`;
  }
  
  /**
   * Parse comparison response from Gemini
   */
  parseComparisonResponse(responseText) {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[Gemini] No JSON found in comparison response');
        return {
          hasNewPackage: false,
          changeDetected: false,
          confidence: 0,
          description: 'Failed to parse response',
          reasoning: 'Invalid response format',
          comparisonDetails: null
        };
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        hasNewPackage: Boolean(parsed.hasNewPackage),
        changeDetected: Boolean(parsed.changeDetected),
        confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 0)),
        description: String(parsed.description || '').slice(0, 200),
        reasoning: String(parsed.reasoning || '').slice(0, 300),
        comparisonDetails: parsed.comparisonDetails || null
      };
      
    } catch (error) {
      console.error('[Gemini] Comparison parse error:', error.message);
      return {
        hasNewPackage: false,
        changeDetected: false,
        confidence: 0,
        description: 'Parse error',
        reasoning: error.message,
        comparisonDetails: null
      };
    }
  }
}

export default GeminiClient;
