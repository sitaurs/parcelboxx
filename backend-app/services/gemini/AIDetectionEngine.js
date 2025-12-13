// AI Detection Engine - Core logic untuk package detection
import GeminiClient from './GeminiClient.js';
import GeminiKeyPool from './GeminiKeyPool.js';

class AIDetectionEngine {
  constructor(geminiApiKeys) {
    // Initialize key pool and client
    this.keyPool = new GeminiKeyPool(geminiApiKeys);
    this.geminiClient = new GeminiClient(this.keyPool);
    
    // Detection settings
    this.config = {
      // Confidence thresholds
      highConfidence: 85,      // >= 85% = very confident
      mediumConfidence: 70,    // 70-84% = moderately confident
      lowConfidence: 60,       // 60-69% = uncertain
      
      // Decision thresholds
      acceptThreshold: 70,     // >= 70% confidence to accept as package
      rejectThreshold: 40,     // < 40% confidence to reject as no package
      
      // Retry settings
      maxRetries: 2,
      retryOnLowConfidence: true,
      
      // Mode settings
      ultrasonicBoost: true,   // Use HC-SR04 as boost trigger
      distanceThreshold: 15.0, // cm - if distance < 15cm, high priority check
    };
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      packagesDetected: 0,
      falsePositives: 0,
      falseNegatives: 0,
      averageConfidence: 0,
      averageResponseTime: 0,
      retries: 0
    };
    
    // State
    this.lastDetection = null;
    this.detectionHistory = []; // Last 20 detections
    this.maxHistory = 20;
  }
  
  // Main detection method
  async detectPackage(imageBuffer, options = {}) {
    const {
      reason = 'periodic',
      distance = null,
      deviceId = 'unknown'
    } = options;
    
    console.log(`[AI-Engine] Starting detection for ${deviceId} (${reason})`);
    
    const detectionId = this.generateDetectionId();
    const startTime = Date.now();
    
    try {
      // 1. Determine priority
      const priority = this.shouldUsePriority(reason, distance);
      
      // 2. Initial verification
      let result = await this.geminiClient.verifyPackage(imageBuffer, {
        reason: reason,
        distance: distance,
        priority: priority
      });
      
      if (!result.success) {
        throw new Error(`Gemini API failed: ${result.error}`);
      }
      
      // 3. Check if need retry (low confidence)
      let retryCount = 0;
      const needsRetry = this.config.retryOnLowConfidence && 
                         result.confidence < this.config.acceptThreshold &&
                         result.confidence > this.config.rejectThreshold;
      
      if (needsRetry && retryCount < this.config.maxRetries) {
        console.log(`[AI-Engine] Low confidence (${result.confidence}%), retrying...`);
        
        const retryResult = await this.geminiClient.verifyPackage(imageBuffer, {
          reason: 'low_confidence_retry',
          distance: distance,
          priority: true // Use priority for retries
        });
        
        if (retryResult.success && retryResult.confidence > result.confidence) {
          result = retryResult;
          retryCount++;
          this.stats.retries++;
        }
      }
      
      // 4. Make final decision
      const decision = this.makeDecision(result, distance);
      
      // 5. Calculate total time
      const totalTime = Date.now() - startTime;
      
      // 6. Build response
      const response = {
        detectionId: detectionId,
        timestamp: new Date().toISOString(),
        deviceId: deviceId,
        
        // Detection result
        hasPackage: decision.hasPackage,
        confidence: result.confidence,
        decision: decision.level, // 'HIGH', 'MEDIUM', 'LOW', 'UNCERTAIN'
        
        // Analysis
        description: result.description,
        reasoning: result.reasoning,
        
        // Metadata
        reason: reason,
        distance: distance,
        priority: priority,
        retries: retryCount,
        
        // Performance
        responseTime: totalTime,
        geminiTime: result.responseTime,
        keyUsed: result.keyId,
        
        // Context
        ultrasonicBoost: distance !== null,
        model: result.metadata?.model || 'gemini-2.5-flash'
      };
      
      // 7. Update statistics
      this.updateStats(response);
      
      // 8. Store in history
      this.addToHistory(response);
      
      // 9. Update last detection
      this.lastDetection = response;
      
      console.log(`[AI-Engine] Detection complete: ${decision.hasPackage ? 'PACKAGE' : 'NO PACKAGE'} (${result.confidence}% confidence)`);
      
      return response;
      
    } catch (error) {
      console.error('[AI-Engine] Detection error:', error.message);
      
      const errorResponse = {
        detectionId: detectionId,
        timestamp: new Date().toISOString(),
        deviceId: deviceId,
        hasPackage: false,
        confidence: 0,
        decision: 'ERROR',
        error: error.message,
        reason: reason,
        distance: distance,
        responseTime: Date.now() - startTime
      };
      
      this.addToHistory(errorResponse);
      
      return errorResponse;
    }
  }
  
  // Determine if should use priority key selection
  shouldUsePriority(reason, distance) {
    // High priority cases:
    // 1. Ultrasonic sensor detected close object
    if (this.config.ultrasonicBoost && distance !== null && distance < this.config.distanceThreshold) {
      return true;
    }
    
    // 2. Manual verification request
    if (reason === 'manual' || reason === 'user_request') {
      return true;
    }
    
    // 3. Retry after low confidence
    if (reason === 'low_confidence_retry') {
      return true;
    }
    
    return false;
  }
  
  // Make final decision based on confidence and distance
  makeDecision(result, distance) {
    const confidence = result.confidence;
    const hasPackage = result.hasPackage;
    
    // High confidence decision
    if (confidence >= this.config.highConfidence) {
      return {
        hasPackage: hasPackage,
        level: 'HIGH',
        reason: 'High confidence from AI'
      };
    }
    
    // Medium confidence decision
    if (confidence >= this.config.mediumConfidence) {
      // If ultrasonic confirms, increase confidence
      if (distance !== null && distance < this.config.distanceThreshold && hasPackage) {
        return {
          hasPackage: true,
          level: 'MEDIUM',
          reason: 'AI + ultrasonic confirmation'
        };
      }
      
      return {
        hasPackage: hasPackage,
        level: 'MEDIUM',
        reason: 'Medium confidence from AI'
      };
    }
    
    // Low confidence decision
    if (confidence >= this.config.lowConfidence) {
      return {
        hasPackage: hasPackage,
        level: 'LOW',
        reason: 'Low confidence - may need manual check'
      };
    }
    
    // Uncertain - fallback to ultrasonic if available
    if (distance !== null && distance < this.config.distanceThreshold) {
      return {
        hasPackage: true,
        level: 'UNCERTAIN',
        reason: 'Very low AI confidence, but ultrasonic detected object'
      };
    }
    
    return {
      hasPackage: false,
      level: 'UNCERTAIN',
      reason: 'Very low confidence - likely no package'
    };
  }
  
  // Update statistics
  updateStats(detection) {
    this.stats.totalChecks++;
    
    if (detection.hasPackage) {
      this.stats.packagesDetected++;
    }
    
    // Update running averages
    const n = this.stats.totalChecks;
    this.stats.averageConfidence = 
      ((this.stats.averageConfidence * (n - 1)) + detection.confidence) / n;
    
    this.stats.averageResponseTime = 
      ((this.stats.averageResponseTime * (n - 1)) + detection.responseTime) / n;
  }
  
  // Add detection to history
  addToHistory(detection) {
    this.detectionHistory.unshift(detection);
    
    if (this.detectionHistory.length > this.maxHistory) {
      this.detectionHistory.pop();
    }
  }
  
  // Generate unique detection ID
  generateDetectionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `det_${timestamp}_${random}`;
  }
  
  // Get current statistics
  getStats() {
    return {
      engine: { ...this.stats },
      gemini: this.geminiClient.getStats(),
      config: { ...this.config },
      lastDetection: this.lastDetection
    };
  }
  
  // Get detection history
  getHistory(limit = 10) {
    return this.detectionHistory.slice(0, limit);
  }
  
  // Get health report
  getHealthReport() {
    const geminiHealth = this.geminiClient.getHealthReport();
    
    return {
      timestamp: new Date().toISOString(),
      engine: {
        status: this.stats.totalChecks > 0 ? 'operational' : 'idle',
        totalChecks: this.stats.totalChecks,
        successRate: this.stats.totalChecks > 0 
          ? ((this.stats.totalChecks - this.stats.falsePositives - this.stats.falseNegatives) / this.stats.totalChecks * 100).toFixed(2) 
          : 0,
        averageConfidence: this.stats.averageConfidence.toFixed(2),
        averageResponseTime: this.stats.averageResponseTime.toFixed(0)
      },
      gemini: geminiHealth,
      lastDetection: this.lastDetection
    };
  }
  
  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[AI-Engine] Configuration updated:', this.config);
  }
  
  // Reset statistics
  resetStats() {
    this.stats = {
      totalChecks: 0,
      packagesDetected: 0,
      falsePositives: 0,
      falseNegatives: 0,
      averageConfidence: 0,
      averageResponseTime: 0,
      retries: 0
    };
    
    this.detectionHistory = [];
    console.log('[AI-Engine] Statistics reset');
  }
  
  // Mark detection as false positive
  markFalsePositive(detectionId) {
    const detection = this.detectionHistory.find(d => d.detectionId === detectionId);
    if (detection) {
      detection.corrected = true;
      detection.correctionType = 'false_positive';
      this.stats.falsePositives++;
      console.log(`[AI-Engine] Marked ${detectionId} as false positive`);
    }
  }
  
  // Mark detection as false negative
  markFalseNegative(detectionId) {
    const detection = this.detectionHistory.find(d => d.detectionId === detectionId);
    if (detection) {
      detection.corrected = true;
      detection.correctionType = 'false_negative';
      this.stats.falseNegatives++;
      console.log(`[AI-Engine] Marked ${detectionId} as false negative`);
    }
  }
}

export default AIDetectionEngine;
