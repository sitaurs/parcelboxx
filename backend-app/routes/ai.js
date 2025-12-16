// AI Routes - API endpoints untuk Gemini AI integration
import express from 'express';
import multer from 'multer';
import AIDetectionEngine from '../services/gemini/AIDetectionEngine.js';
import DynamicIntervalManager from '../services/gemini/DynamicIntervalManager.js';
import AIMetricsCollector from '../services/gemini/AIMetricsCollector.js';

const router = express.Router();

// Multer configuration untuk image upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize AI Engine and Interval Manager
let aiEngine = null;
let intervalManager = null;
let metricsCollector = null;

// Initialize function
function initializeAI() {
  const geminiKeys = [];
  
  // Load all 9 Gemini API keys from environment
  for (let i = 1; i <= 9; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) {
      geminiKeys.push(key);
    }
  }
  
  if (geminiKeys.length === 0) {
    console.warn('[AI-Routes] No Gemini API keys found in environment');
    return false;
  }
  
  console.log(`[AI-Routes] Initializing AI Engine with ${geminiKeys.length} API keys`);
  
  // Create AI Detection Engine
  aiEngine = new AIDetectionEngine(geminiKeys);
  
  // Create Dynamic Interval Manager
  intervalManager = new DynamicIntervalManager({
    idleInterval: 30,
    activeInterval: 15,
    cooldownInterval: 60,
    boostInterval: 5
  });
  
  // Create Metrics Collector
  metricsCollector = new AIMetricsCollector(aiEngine, intervalManager);
  
  // Load historical metrics
  metricsCollector.loadMetrics().catch(err => {
    console.warn('[AI-Routes] Failed to load historical metrics:', err.message);
  });
  
  console.log('[AI-Routes] AI Engine initialized successfully');
  return true;
}

// Middleware to check if AI is initialized
function requireAI(req, res, next) {
  if (!aiEngine || !intervalManager) {
    return res.status(503).json({
      success: false,
      error: 'AI service not initialized',
      message: 'Gemini API keys not configured'
    });
  }
  next();
}

// POST /api/ai/verify-package
// Main endpoint untuk ESP32 kirim foto dan dapat verification result
router.post('/verify-package', upload.single('image'), requireAI, async (req, res) => {
  try {
    const { deviceId, reason, distance, ultrasonicTriggered } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please upload an image file'
      });
    }
    
    console.log(`[AI-API] Package verification request from ${deviceId || 'unknown'}`);
    
    // Run detection
    const result = await aiEngine.detectPackage(req.file.buffer, {
      deviceId: deviceId || 'unknown',
      reason: reason || 'api_request',
      distance: distance ? parseFloat(distance) : null
    });
    
    // Get optimal interval for next check
    const intervalInfo = intervalManager.getOptimalInterval({
      hasPackage: result.hasPackage,
      recentPickup: false,
      ultrasonicTriggered: ultrasonicTriggered === 'true',
      deviceStatus: 'normal'
    });
    
    // Update activity
    if (result.hasPackage) {
      intervalManager.updateActivity('package_detected');
    }
    if (ultrasonicTriggered === 'true') {
      intervalManager.updateActivity('ultrasonic_triggered');
    }
    
    // Record metrics
    if (metricsCollector) {
      metricsCollector.recordDetection(result);
    }
    
    // Build response
    return res.json({
      success: true,
      hasPackage: result.hasPackage,
      confidence: result.confidence,
      decision: result.decision,
      description: result.description,
      nextCheckInterval: intervalInfo.interval,
      mode: intervalInfo.mode,
      reason: intervalInfo.reason,
      nextCheckTime: intervalManager.getNextCheckTime(),
      metadata: {
        detectionId: result.detectionId,
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Verification error:', error);
    
    // Record error metrics
    if (metricsCollector) {
      metricsCollector.recordError(error, {
        endpoint: '/verify-package',
        deviceId: req.body.deviceId
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: error.message
    });
  }
});

// GET /api/ai/settings
// Get current AI configuration
router.get('/settings', requireAI, (req, res) => {
  try {
    const stats = aiEngine.getStats();
    const intervalStatus = intervalManager.getStatus();
    
    return res.json({
      success: true,
      settings: {
        detection: stats.config,
        intervals: {
          IDLE: intervalManager.intervals.IDLE,
          ACTIVE: intervalManager.intervals.ACTIVE,
          COOLDOWN: intervalManager.intervals.COOLDOWN,
          BOOST: intervalManager.intervals.BOOST
        },
        thresholds: intervalManager.thresholds
      },
      currentState: {
        intervalMode: intervalStatus.currentMode,
        currentInterval: intervalStatus.currentInterval,
        lastActivity: intervalStatus.lastActivity,
        timeInCurrentMode: intervalStatus.timeInCurrentMode
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Get settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get settings',
      message: error.message
    });
  }
});

// PUT /api/ai/settings
// Update AI configuration
router.put('/settings', requireAI, (req, res) => {
  try {
    const { detection, intervals, thresholds } = req.body;
    
    // Update detection config
    if (detection) {
      aiEngine.updateConfig(detection);
    }
    
    // Update intervals
    if (intervals) {
      intervalManager.updateIntervals(intervals);
    }
    
    // Update thresholds
    if (thresholds) {
      intervalManager.updateThresholds(thresholds);
    }
    
    return res.json({
      success: true,
      message: 'Settings updated successfully',
      updatedFields: {
        detection: !!detection,
        intervals: !!intervals,
        thresholds: !!thresholds
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Update settings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// GET /api/ai/stats
// Get AI statistics
router.get('/stats', requireAI, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const stats = aiEngine.getStats();
    const history = aiEngine.getHistory(limit);
    const intervalStatus = intervalManager.getStatus();
    
    return res.json({
      success: true,
      statistics: {
        engine: stats.engine,
        gemini: stats.gemini,
        intervals: intervalStatus.stats
      },
      recentDetections: history,
      currentState: {
        lastDetection: stats.lastDetection,
        intervalMode: intervalStatus.currentMode,
        currentInterval: intervalStatus.currentInterval
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Get stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

// GET /api/ai/health
// Get comprehensive health report
router.get('/health', requireAI, (req, res) => {
  try {
    const healthReport = aiEngine.getHealthReport();
    const intervalStatus = intervalManager.getStatus();
    const recommendations = intervalManager.getRecommendations();
    
    return res.json({
      success: true,
      health: healthReport,
      intervals: intervalStatus,
      recommendations: recommendations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Get health error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get health report',
      message: error.message
    });
  }
});

// POST /api/ai/feedback
// Submit feedback untuk false positive/negative
router.post('/feedback', requireAI, (req, res) => {
  try {
    const { detectionId, feedbackType } = req.body;
    
    if (!detectionId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'detectionId and feedbackType are required'
      });
    }
    
    if (feedbackType === 'false_positive') {
      aiEngine.markFalsePositive(detectionId);
    } else if (feedbackType === 'false_negative') {
      aiEngine.markFalseNegative(detectionId);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid feedback type',
        message: 'feedbackType must be "false_positive" or "false_negative"'
      });
    }
    
    return res.json({
      success: true,
      message: `Feedback recorded: ${feedbackType}`,
      detectionId: detectionId
    });
    
  } catch (error) {
    console.error('[AI-API] Feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record feedback',
      message: error.message
    });
  }
});

// POST /api/ai/activity
// Update activity status (called by other endpoints)
router.post('/activity', requireAI, (req, res) => {
  try {
    const { eventType, data } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing event type',
        message: 'eventType is required'
      });
    }
    
    intervalManager.updateActivity(eventType, data || {});
    
    // Get updated interval
    const intervalInfo = intervalManager.getOptimalInterval({
      hasPackage: data?.hasPackage || false,
      recentPickup: eventType === 'pickup_completed',
      ultrasonicTriggered: data?.ultrasonicTriggered || false
    });
    
    return res.json({
      success: true,
      message: 'Activity recorded',
      timing: {
        nextCheckInterval: intervalInfo.interval,
        mode: intervalInfo.mode,
        reason: intervalInfo.reason
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Activity update error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update activity',
      message: error.message
    });
  }
});

// GET /api/ai/status
// Quick status check (lightweight)
router.get('/status', (req, res) => {
  const initialized = aiEngine !== null && intervalManager !== null;
  
  return res.json({
    success: true,
    initialized: initialized,
    message: initialized 
      ? 'AI service operational'
      : 'AI service not initialized - check Gemini API keys',
    timestamp: new Date().toISOString()
  });
});

// GET /api/ai/dashboard
// Comprehensive dashboard with metrics and charts
router.get('/dashboard', requireAI, (req, res) => {
  try {
    if (!metricsCollector) {
      return res.status(503).json({
        success: false,
        error: 'Metrics collector not initialized'
      });
    }
    
    const dashboard = metricsCollector.getDashboard();
    
    return res.json({
      success: true,
      dashboard: dashboard,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get dashboard',
      message: error.message
    });
  }
});

// GET /api/ai/alerts
// Get recent alerts
router.get('/alerts', requireAI, (req, res) => {
  try {
    if (!metricsCollector) {
      return res.status(503).json({
        success: false,
        error: 'Metrics collector not initialized'
      });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const alerts = metricsCollector.metrics.alerts.slice(0, limit);
    
    return res.json({
      success: true,
      alerts: alerts,
      total: metricsCollector.metrics.alerts.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Alerts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get alerts',
      message: error.message
    });
  }
});

// ==================== BASELINE MANAGEMENT ENDPOINTS ====================

// POST /api/ai/baseline
// Store baseline photo (called by ESP32 after holder release)
router.post('/baseline', upload.single('image'), requireAI, async (req, res) => {
  try {
    const { deviceId, reason, distance } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please upload an image file for baseline'
      });
    }
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID required',
        message: 'Please provide deviceId in request body'
      });
    }
    
    console.log(`[AI-API] Baseline capture request from ${deviceId}`);
    
    // Capture and store baseline (with optional AI verification)
    const result = await aiEngine.captureBaseline(deviceId, req.file.buffer, {
      reason: reason || 'holder_release',
      distance: distance ? parseFloat(distance) : null,
      verifyEmpty: true  // AI will verify holder is empty
    });
    
    if (result.success) {
      return res.json({
        success: true,
        message: 'Baseline stored successfully',
        baselineId: result.baselineId,
        deviceId: deviceId,
        timestamp: result.metadata?.timestamp
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Baseline rejected',
        message: result.error,
        confidence: result.confidence
      });
    }
    
  } catch (error) {
    console.error('[AI-API] Baseline capture error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to capture baseline',
      message: error.message
    });
  }
});

// GET /api/ai/baseline/:deviceId
// Get baseline status for a device
router.get('/baseline/:deviceId', requireAI, (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const hasBaseline = aiEngine.hasValidBaseline(deviceId);
    const baselineStats = aiEngine.getBaselineStats();
    
    return res.json({
      success: true,
      deviceId: deviceId,
      hasValidBaseline: hasBaseline,
      stats: baselineStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Baseline status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get baseline status',
      message: error.message
    });
  }
});

// DELETE /api/ai/baseline/:deviceId
// Invalidate baseline for a device (manual override or after pickup)
router.delete('/baseline/:deviceId', requireAI, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    await aiEngine.invalidateBaseline(deviceId);
    
    return res.json({
      success: true,
      message: 'Baseline invalidated successfully',
      deviceId: deviceId,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Baseline invalidate error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to invalidate baseline',
      message: error.message
    });
  }
});

// POST /api/ai/compare
// Compare realtime photo with baseline (explicit comparison request)
router.post('/compare', upload.single('image'), requireAI, async (req, res) => {
  try {
    const { deviceId, distance, reason } = req.body;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please upload a realtime image to compare'
      });
    }
    
    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device ID required',
        message: 'Please provide deviceId in request body'
      });
    }
    
    // Check if baseline exists
    if (!aiEngine.hasValidBaseline(deviceId)) {
      return res.status(400).json({
        success: false,
        error: 'No valid baseline',
        message: 'No baseline photo available for comparison. Capture baseline first.',
        suggestion: 'POST /api/ai/baseline with empty holder photo'
      });
    }
    
    console.log(`[AI-API] Comparison request from ${deviceId}`);
    
    // Run detection with comparison
    const result = await aiEngine.detectPackage(req.file.buffer, {
      deviceId: deviceId,
      reason: reason || 'comparison_request',
      distance: distance ? parseFloat(distance) : null,
      forceComparison: true  // Ensure comparison is used
    });
    
    // Record metrics
    if (metricsCollector) {
      metricsCollector.recordDetection(result);
    }
    
    return res.json({
      success: true,
      hasPackage: result.hasPackage,
      confidence: result.confidence,
      decision: result.decision,
      description: result.description,
      comparison: {
        usedBaseline: result.usedBaseline || false,
        baselineDeviceId: deviceId
      },
      metadata: {
        detectionId: result.detectionId,
        timestamp: result.timestamp,
        responseTime: result.responseTime
      }
    });
    
  } catch (error) {
    console.error('[AI-API] Comparison error:', error);
    
    if (metricsCollector) {
      metricsCollector.recordError(error, {
        endpoint: '/compare',
        deviceId: req.body.deviceId
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Comparison failed',
      message: error.message
    });
  }
});

// GET /api/ai/baseline-stats
// Get baseline statistics across all devices
router.get('/baseline-stats', requireAI, (req, res) => {
  try {
    const stats = aiEngine.getBaselineStats();
    
    return res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[AI-API] Baseline stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get baseline stats',
      message: error.message
    });
  }
});

// Get AI Engine reference (for MQTT integration)
function getAIEngine() {
  return aiEngine;
}

// Export router and initialization function
export { router as aiRoutes, initializeAI, getAIEngine };
