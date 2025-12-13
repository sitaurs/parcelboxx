// Smart API Key Pool Manager with Health Monitoring & Auto-Recovery
// Manages 9 Gemini API keys with intelligent rotation

class GeminiKeyPool {
  constructor(apiKeys) {
    this.keys = apiKeys.map((key, index) => ({
      id: index + 1,
      key: key,
      tier: this.assignTier(index),
      
      // Usage tracking
      requestsToday: 0,
      requestsThisMinute: 0,
      totalRequests: 0,
      
      // Error tracking
      errorCount: 0,
      consecutiveErrors: 0,
      lastError: null,
      lastErrorTime: 0,
      
      // Performance tracking
      responseTime: [],
      avgResponseTime: 0,
      
      // Health status
      status: 'active', // active, rate_limited, unhealthy, disabled
      lastUsed: 0,
      lastHealthCheck: 0,
      
      // Rate limit tracking
      rateLimitHit: false,
      rateLimitExpiry: 0,
      
      // Quota management
      dailyQuotaLimit: 1500, // RPD
      minuteQuotaLimit: 15,  // RPM
      lastMinuteReset: Date.now(),
      lastDayReset: Date.now()
    }));
    
    this.currentKeyIndex = 0;
    this.stats = {
      totalRequests: 0,
      totalErrors: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };
    
    // Start background tasks
    this.startHealthMonitoring();
    this.startQuotaReset();
  }
  
  // Assign tier based on key index (for load balancing)
  assignTier(index) {
    if (index < 5) return 'primary';    // Keys 1-5: Primary pool
    if (index < 7) return 'backup';     // Keys 6-7: Backup pool
    return 'reserve';                   // Keys 8-9: Reserve pool
  }
  
  // Smart key selection with multi-tier fallback
  selectKey(options = {}) {
    const { priority = false, tier = null } = options;
    
    // 1. Filter healthy keys
    let availableKeys = this.keys.filter(k => 
      k.status === 'active' &&
      k.requestsThisMinute < k.minuteQuotaLimit &&
      k.requestsToday < k.dailyQuotaLimit &&
      k.consecutiveErrors < 3
    );
    
    if (availableKeys.length === 0) {
      console.warn('[KeyPool] No healthy keys available! Attempting recovery...');
      this.attemptEmergencyRecovery();
      availableKeys = this.keys.filter(k => k.status !== 'disabled');
    }
    
    // 2. Filter by tier if specified
    if (tier) {
      const tierKeys = availableKeys.filter(k => k.tier === tier);
      if (tierKeys.length > 0) {
        availableKeys = tierKeys;
      }
    }
    
    // 3. Sort by selection criteria
    availableKeys.sort((a, b) => {
      // Priority: Least used today
      const usageDiff = a.requestsToday - b.requestsToday;
      if (Math.abs(usageDiff) > 10) return usageDiff;
      
      // Secondary: Least errors
      const errorDiff = a.errorCount - b.errorCount;
      if (errorDiff !== 0) return errorDiff;
      
      // Tertiary: Best response time
      return a.avgResponseTime - b.avgResponseTime;
    });
    
    return availableKeys[0] || null;
  }
  
  // Mark successful request
  markSuccess(keyId, responseTime) {
    const key = this.getKey(keyId);
    if (!key) return;
    
    key.requestsToday++;
    key.requestsThisMinute++;
    key.totalRequests++;
    key.lastUsed = Date.now();
    key.consecutiveErrors = 0;
    
    // Track response time
    key.responseTime.push(responseTime);
    if (key.responseTime.length > 100) {
      key.responseTime.shift();
    }
    key.avgResponseTime = key.responseTime.reduce((a, b) => a + b, 0) / key.responseTime.length;
    
    // Global stats
    this.stats.totalRequests++;
    this.stats.totalResponseTime += responseTime;
  }
  
  // Mark error
  markError(keyId, errorType, errorDetails = {}) {
    const key = this.getKey(keyId);
    if (!key) return;
    
    key.errorCount++;
    key.consecutiveErrors++;
    key.lastError = errorType;
    key.lastErrorTime = Date.now();
    
    this.stats.totalErrors++;
    
    // Handle specific error types
    if (errorType === 'RATE_LIMIT' || errorDetails.code === 429) {
      this.handleRateLimit(keyId);
    } else if (key.consecutiveErrors >= 3) {
      this.markAsUnhealthy(keyId, 'consecutive_errors');
    }
    
    console.warn(`[KeyPool] Key ${keyId} error: ${errorType}`, errorDetails);
  }
  
  // Handle rate limit
  handleRateLimit(keyId) {
    const key = this.getKey(keyId);
    if (!key) return;
    
    key.status = 'rate_limited';
    key.rateLimitHit = true;
    key.rateLimitExpiry = Date.now() + 60000; // 60 second cooldown
    
    console.warn(`[KeyPool] Key ${keyId} rate limited, cooling down for 60s`);
    
    // Auto-recovery after cooldown
    setTimeout(() => {
      if (key.status === 'rate_limited') {
        key.status = 'active';
        key.rateLimitHit = false;
        key.consecutiveErrors = 0;
        console.log(`[KeyPool] Key ${keyId} recovered from rate limit`);
      }
    }, 60000);
  }
  
  // Mark key as unhealthy
  markAsUnhealthy(keyId, reason) {
    const key = this.getKey(keyId);
    if (!key) return;
    
    key.status = 'unhealthy';
    console.warn(`[KeyPool] Key ${keyId} marked unhealthy: ${reason}`);
    
    // Auto-recovery attempt after 5 minutes
    setTimeout(() => {
      if (key.status === 'unhealthy') {
        key.status = 'active';
        key.errorCount = Math.floor(key.errorCount / 2);
        key.consecutiveErrors = 0;
        console.log(`[KeyPool] Key ${keyId} auto-recovery attempted`);
      }
    }, 300000);
  }
  
  // Emergency recovery - try to revive any key
  attemptEmergencyRecovery() {
    console.log('[KeyPool] EMERGENCY: Attempting to recover keys...');
    
    this.keys.forEach(key => {
      if (key.status === 'rate_limited' && Date.now() > key.rateLimitExpiry) {
        key.status = 'active';
        key.rateLimitHit = false;
        key.consecutiveErrors = 0;
        console.log(`[KeyPool] Emergency recovered key ${key.id}`);
      } else if (key.status === 'unhealthy') {
        key.status = 'active';
        key.consecutiveErrors = 0;
        console.log(`[KeyPool] Emergency recovered key ${key.id} (was unhealthy)`);
      }
    });
  }
  
  // Background health monitoring
  startHealthMonitoring() {
    setInterval(() => {
      this.keys.forEach(key => {
        // Auto-recover from rate limit after expiry
        if (key.status === 'rate_limited' && Date.now() > key.rateLimitExpiry) {
          key.status = 'active';
          key.rateLimitHit = false;
          key.consecutiveErrors = 0;
        }
        
        // Reset consecutive errors if key hasn't been used (prevent permanent lockout)
        if (Date.now() - key.lastUsed > 600000 && key.consecutiveErrors > 0) {
          key.consecutiveErrors = Math.max(0, key.consecutiveErrors - 1);
        }
      });
    }, 30000); // Every 30 seconds
  }
  
  // Background quota reset
  startQuotaReset() {
    // Reset per-minute quotas
    setInterval(() => {
      this.keys.forEach(key => {
        key.requestsThisMinute = 0;
        key.lastMinuteReset = Date.now();
      });
    }, 60000); // Every minute
    
    // Reset daily quotas
    setInterval(() => {
      this.keys.forEach(key => {
        key.requestsToday = 0;
        key.lastDayReset = Date.now();
      });
      console.log('[KeyPool] Daily quotas reset');
    }, 86400000); // Every 24 hours
  }
  
  // Get key by ID
  getKey(keyId) {
    return this.keys.find(k => k.id === keyId);
  }
  
  // Get statistics
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const avgResponseTime = this.stats.totalRequests > 0 
      ? this.stats.totalResponseTime / this.stats.totalRequests 
      : 0;
    
    return {
      overall: {
        uptime: uptime,
        totalKeys: this.keys.length,
        activeKeys: this.keys.filter(k => k.status === 'active').length,
        totalRequests: this.stats.totalRequests,
        totalErrors: this.stats.totalErrors,
        errorRate: this.stats.totalRequests > 0 ? this.stats.totalErrors / this.stats.totalRequests : 0,
        avgResponseTime: avgResponseTime
      },
      
      keys: this.keys.map(k => ({
        id: k.id,
        tier: k.tier,
        status: k.status,
        requestsToday: k.requestsToday,
        requestsThisMinute: k.requestsThisMinute,
        totalRequests: k.totalRequests,
        errorCount: k.errorCount,
        consecutiveErrors: k.consecutiveErrors,
        avgResponseTime: k.avgResponseTime,
        quotaRemaining: {
          daily: k.dailyQuotaLimit - k.requestsToday,
          minute: k.minuteQuotaLimit - k.requestsThisMinute
        },
        lastUsed: k.lastUsed
      })),
      
      tiers: {
        primary: this.keys.filter(k => k.tier === 'primary' && k.status === 'active').length,
        backup: this.keys.filter(k => k.tier === 'backup' && k.status === 'active').length,
        reserve: this.keys.filter(k => k.tier === 'reserve' && k.status === 'active').length
      }
    };
  }
  
  // Get health report
  getHealthReport() {
    const stats = this.getStats();
    const healthStatus = stats.overall.activeKeys >= 6 ? 'healthy' : 
                        stats.overall.activeKeys >= 3 ? 'degraded' : 'critical';
    
    return {
      status: healthStatus,
      message: this.getHealthMessage(healthStatus),
      stats: stats,
      alerts: this.getAlerts()
    };
  }
  
  getHealthMessage(status) {
    switch(status) {
      case 'healthy': return 'All systems operational';
      case 'degraded': return 'Running with reduced capacity';
      case 'critical': return 'Critical: Low key availability';
      default: return 'Unknown status';
    }
  }
  
  getAlerts() {
    const alerts = [];
    
    // Check for keys near daily limit
    const keysNearLimit = this.keys.filter(k => 
      k.requestsToday > k.dailyQuotaLimit * 0.9
    );
    if (keysNearLimit.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${keysNearLimit.length} keys near daily limit`,
        keys: keysNearLimit.map(k => k.id)
      });
    }
    
    // Check for unhealthy keys
    const unhealthyKeys = this.keys.filter(k => 
      k.status !== 'active'
    );
    if (unhealthyKeys.length > 3) {
      alerts.push({
        level: 'critical',
        message: `${unhealthyKeys.length} keys unavailable`,
        keys: unhealthyKeys.map(k => ({ id: k.id, status: k.status }))
      });
    }
    
    // Check error rate
    if (this.stats.totalRequests > 100 && this.stats.totalErrors / this.stats.totalRequests > 0.2) {
      alerts.push({
        level: 'warning',
        message: 'High error rate detected',
        errorRate: (this.stats.totalErrors / this.stats.totalRequests * 100).toFixed(2) + '%'
      });
    }
    
    return alerts;
  }
}

export default GeminiKeyPool;
