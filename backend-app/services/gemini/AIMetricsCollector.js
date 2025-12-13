// AI Metrics & Monitoring System
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIMetricsCollector {
  constructor(aiEngine, intervalManager) {
    this.aiEngine = aiEngine;
    this.intervalManager = intervalManager;
    
    // Metrics storage
    this.metrics = {
      detections: [],
      keyUsage: {},
      hourlyStats: {},
      dailyStats: {},
      errors: [],
      alerts: []
    };
    
    // Configuration
    this.config = {
      maxDetectionHistory: 1000,
      maxErrorHistory: 500,
      metricsRetentionDays: 7,
      alertThresholds: {
        errorRate: 0.15,          // 15% error rate
        lowConfidenceRate: 0.30,  // 30% low confidence
        slowResponseTime: 5000,   // 5 seconds
        keyFailureRate: 0.20      // 20% failure rate per key
      }
    };
    
    // Stats file path
    this.statsFile = path.join(__dirname, '../../db/ai-stats.json');
    
    // Start background tasks
    this.startBackgroundTasks();
  }
  
  // Start background tasks
  startBackgroundTasks() {
    // Save metrics every 5 minutes
    setInterval(() => {
      this.saveMetrics();
    }, 5 * 60 * 1000);
    
    // Clean old data every hour
    setInterval(() => {
      this.cleanOldData();
    }, 60 * 60 * 1000);
    
    // Generate alerts every 10 minutes
    setInterval(() => {
      this.generateAlerts();
    }, 10 * 60 * 1000);
  }
  
  // Record detection
  recordDetection(detection) {
    this.metrics.detections.unshift({
      timestamp: Date.now(),
      detectionId: detection.detectionId,
      hasPackage: detection.hasPackage,
      confidence: detection.confidence,
      decision: detection.decision,
      responseTime: detection.responseTime,
      keyUsed: detection.keyUsed,
      reason: detection.reason
    });
    
    // Limit history
    if (this.metrics.detections.length > this.config.maxDetectionHistory) {
      this.metrics.detections.pop();
    }
    
    // Update hourly stats
    this.updateHourlyStats(detection);
    
    // Update key usage
    this.updateKeyUsage(detection);
  }
  
  // Record error
  recordError(error, context = {}) {
    this.metrics.errors.unshift({
      timestamp: Date.now(),
      message: error.message,
      type: error.type || 'UNKNOWN',
      context: context
    });
    
    // Limit error history
    if (this.metrics.errors.length > this.config.maxErrorHistory) {
      this.metrics.errors.pop();
    }
  }
  
  // Update hourly stats
  updateHourlyStats(detection) {
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    if (!this.metrics.hourlyStats[hour]) {
      this.metrics.hourlyStats[hour] = {
        totalChecks: 0,
        packagesDetected: 0,
        totalConfidence: 0,
        totalResponseTime: 0,
        errors: 0,
        lowConfidence: 0
      };
    }
    
    const stats = this.metrics.hourlyStats[hour];
    stats.totalChecks++;
    
    if (detection.hasPackage) {
      stats.packagesDetected++;
    }
    
    stats.totalConfidence += detection.confidence;
    stats.totalResponseTime += detection.responseTime;
    
    if (detection.confidence < 70) {
      stats.lowConfidence++;
    }
  }
  
  // Update key usage
  updateKeyUsage(detection) {
    const keyId = detection.keyUsed;
    
    if (!this.metrics.keyUsage[keyId]) {
      this.metrics.keyUsage[keyId] = {
        totalCalls: 0,
        successCalls: 0,
        errorCalls: 0,
        totalResponseTime: 0
      };
    }
    
    const usage = this.metrics.keyUsage[keyId];
    usage.totalCalls++;
    usage.successCalls++;
    usage.totalResponseTime += detection.responseTime;
  }
  
  // Generate alerts
  generateAlerts() {
    const alerts = [];
    const now = Date.now();
    
    // Check last hour stats
    const lastHour = new Date(now - 60 * 60 * 1000).toISOString().slice(0, 13);
    const hourStats = this.metrics.hourlyStats[lastHour];
    
    if (hourStats) {
      // Error rate alert
      const errorRate = hourStats.errors / hourStats.totalChecks;
      if (errorRate > this.config.alertThresholds.errorRate) {
        alerts.push({
          type: 'HIGH_ERROR_RATE',
          severity: 'warning',
          message: `High error rate in last hour: ${(errorRate * 100).toFixed(1)}%`,
          value: errorRate,
          threshold: this.config.alertThresholds.errorRate
        });
      }
      
      // Low confidence rate alert
      const lowConfidenceRate = hourStats.lowConfidence / hourStats.totalChecks;
      if (lowConfidenceRate > this.config.alertThresholds.lowConfidenceRate) {
        alerts.push({
          type: 'LOW_CONFIDENCE_RATE',
          severity: 'info',
          message: `High low-confidence rate in last hour: ${(lowConfidenceRate * 100).toFixed(1)}%`,
          value: lowConfidenceRate,
          threshold: this.config.alertThresholds.lowConfidenceRate
        });
      }
      
      // Average response time alert
      const avgResponseTime = hourStats.totalResponseTime / hourStats.totalChecks;
      if (avgResponseTime > this.config.alertThresholds.slowResponseTime) {
        alerts.push({
          type: 'SLOW_RESPONSE_TIME',
          severity: 'warning',
          message: `Slow average response time: ${avgResponseTime.toFixed(0)}ms`,
          value: avgResponseTime,
          threshold: this.config.alertThresholds.slowResponseTime
        });
      }
    }
    
    // Check key health
    const geminiHealth = this.aiEngine.getHealthReport().gemini;
    const unhealthyKeys = geminiHealth.keys.filter(k => k.status === 'unhealthy');
    
    if (unhealthyKeys.length >= 3) {
      alerts.push({
        type: 'MULTIPLE_UNHEALTHY_KEYS',
        severity: 'critical',
        message: `${unhealthyKeys.length} API keys are unhealthy`,
        value: unhealthyKeys.length,
        keys: unhealthyKeys.map(k => k.id)
      });
    }
    
    // Store alerts
    if (alerts.length > 0) {
      alerts.forEach(alert => {
        alert.timestamp = now;
        this.metrics.alerts.unshift(alert);
      });
      
      // Log alerts
      console.log(`[AI-Metrics] Generated ${alerts.length} alerts`);
      alerts.forEach(alert => {
        console.log(`  [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
      
      // Keep only last 100 alerts
      if (this.metrics.alerts.length > 100) {
        this.metrics.alerts = this.metrics.alerts.slice(0, 100);
      }
    }
  }
  
  // Clean old data
  cleanOldData() {
    const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    const cutoffHour = new Date(cutoff).toISOString().slice(0, 13);
    
    // Clean hourly stats
    Object.keys(this.metrics.hourlyStats).forEach(hour => {
      if (hour < cutoffHour) {
        delete this.metrics.hourlyStats[hour];
      }
    });
    
    // Clean old detections
    this.metrics.detections = this.metrics.detections.filter(d => d.timestamp > cutoff);
    
    // Clean old errors
    this.metrics.errors = this.metrics.errors.filter(e => e.timestamp > cutoff);
    
    console.log('[AI-Metrics] Old data cleaned');
  }
  
  // Save metrics to file
  async saveMetrics() {
    try {
      const data = {
        lastUpdated: new Date().toISOString(),
        metrics: this.metrics,
        summary: this.getSummary()
      };
      
      await fs.writeFile(this.statsFile, JSON.stringify(data, null, 2));
      console.log('[AI-Metrics] Metrics saved to file');
    } catch (error) {
      console.error('[AI-Metrics] Failed to save metrics:', error.message);
    }
  }
  
  // Load metrics from file
  async loadMetrics() {
    try {
      const data = await fs.readFile(this.statsFile, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.metrics) {
        this.metrics = parsed.metrics;
        console.log('[AI-Metrics] Metrics loaded from file');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('[AI-Metrics] Failed to load metrics:', error.message);
      }
    }
  }
  
  // Get summary statistics
  getSummary() {
    const engineStats = this.aiEngine.getStats();
    const intervalStatus = this.intervalManager.getStatus();
    
    // Calculate recent stats (last 24 hours)
    const last24h = Date.now() - (24 * 60 * 60 * 1000);
    const recentDetections = this.metrics.detections.filter(d => d.timestamp > last24h);
    
    const packagesDetected = recentDetections.filter(d => d.hasPackage).length;
    const avgConfidence = recentDetections.length > 0
      ? recentDetections.reduce((sum, d) => sum + d.confidence, 0) / recentDetections.length
      : 0;
    const avgResponseTime = recentDetections.length > 0
      ? recentDetections.reduce((sum, d) => sum + d.responseTime, 0) / recentDetections.length
      : 0;
    
    return {
      last24Hours: {
        totalChecks: recentDetections.length,
        packagesDetected: packagesDetected,
        detectionRate: recentDetections.length > 0 
          ? (packagesDetected / recentDetections.length * 100).toFixed(2) + '%'
          : '0%',
        averageConfidence: avgConfidence.toFixed(2) + '%',
        averageResponseTime: avgResponseTime.toFixed(0) + 'ms'
      },
      lifetime: {
        totalChecks: engineStats.engine.totalChecks,
        packagesDetected: engineStats.engine.packagesDetected,
        falsePositives: engineStats.engine.falsePositives,
        falseNegatives: engineStats.engine.falseNegatives,
        averageConfidence: engineStats.engine.averageConfidence.toFixed(2) + '%'
      },
      geminiKeys: engineStats.gemini,
      currentMode: intervalStatus.currentMode,
      activeAlerts: this.metrics.alerts.filter(a => a.timestamp > last24h).length
    };
  }
  
  // Get dashboard data
  getDashboard() {
    const summary = this.getSummary();
    const recentDetections = this.metrics.detections.slice(0, 20);
    const recentErrors = this.metrics.errors.slice(0, 20);
    const recentAlerts = this.metrics.alerts.slice(0, 10);
    
    // Hourly chart data (last 24 hours)
    const hourlyChartData = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(Date.now() - i * 60 * 60 * 1000).toISOString().slice(0, 13);
      const stats = this.metrics.hourlyStats[hour] || { totalChecks: 0, packagesDetected: 0 };
      
      hourlyChartData.push({
        hour: hour.slice(11, 13) + ':00',
        checks: stats.totalChecks,
        packages: stats.packagesDetected
      });
    }
    
    return {
      summary: summary,
      recentDetections: recentDetections,
      recentErrors: recentErrors,
      recentAlerts: recentAlerts,
      hourlyChart: hourlyChartData,
      keyUsage: this.metrics.keyUsage
    };
  }
}

export default AIMetricsCollector;
