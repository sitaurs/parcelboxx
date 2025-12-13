// Dynamic Interval Manager - Adaptive timing untuk periodic checks
class DynamicIntervalManager {
  constructor(options = {}) {
    // Default intervals (dalam detik)
    this.intervals = {
      IDLE: options.idleInterval || 30,         // Tidak ada aktivitas - 30 detik
      ACTIVE: options.activeInterval || 15,     // Ada aktivitas - 15 detik
      COOLDOWN: options.cooldownInterval || 60, // Setelah pickup - 60 detik
      BOOST: options.boostInterval || 5         // HC-SR04 triggered - 5 detik
    };
    
    // Current state
    this.currentMode = 'IDLE';
    this.currentInterval = this.intervals.IDLE;
    
    // Activity tracking
    this.lastActivity = null;
    this.lastPackageDetected = null;
    this.lastPickup = null;
    
    // Thresholds
    this.thresholds = {
      activityTimeout: options.activityTimeout || 120000,    // 2 menit
      cooldownDuration: options.cooldownDuration || 300000,  // 5 menit
      boostDuration: options.boostDuration || 30000          // 30 detik
    };
    
    // Statistics
    this.stats = {
      modeChanges: 0,
      totalIdleTime: 0,
      totalActiveTime: 0,
      totalCooldownTime: 0,
      totalBoostTime: 0
    };
    
    // Timer
    this.lastModeChange = Date.now();
    
    console.log('[IntervalMgr] Initialized with intervals:', this.intervals);
  }
  
  // Determine optimal interval based on current state
  getOptimalInterval(context = {}) {
    const {
      hasPackage = false,
      recentPickup = false,
      ultrasonicTriggered = false,
      deviceStatus = 'normal'
    } = context;
    
    const now = Date.now();
    let newMode = this.currentMode;
    
    // Priority 1: Boost mode (HC-SR04 triggered)
    if (ultrasonicTriggered) {
      newMode = 'BOOST';
    }
    // Priority 2: Cooldown mode (recent pickup)
    else if (recentPickup || (this.lastPickup && (now - this.lastPickup) < this.thresholds.cooldownDuration)) {
      newMode = 'COOLDOWN';
    }
    // Priority 3: Active mode (package detected)
    else if (hasPackage || (this.lastPackageDetected && (now - this.lastPackageDetected) < this.thresholds.activityTimeout)) {
      newMode = 'ACTIVE';
    }
    // Default: Idle mode
    else {
      newMode = 'IDLE';
    }
    
    // Update mode if changed
    if (newMode !== this.currentMode) {
      this.changeModeInternal(newMode);
    }
    
    return {
      interval: this.currentInterval,
      mode: this.currentMode,
      reason: this.getModeReason(this.currentMode, context)
    };
  }
  
  // Get reason for current mode
  getModeReason(mode, context) {
    switch (mode) {
      case 'BOOST':
        return 'Ultrasonic sensor detected object - increased frequency';
      case 'ACTIVE':
        return context.hasPackage 
          ? 'Package currently present - monitoring closely'
          : 'Recent package activity - staying alert';
      case 'COOLDOWN':
        return 'Recent pickup - reducing frequency';
      case 'IDLE':
      default:
        return 'No recent activity - normal monitoring';
    }
  }
  
  // Internal mode change
  changeModeInternal(newMode) {
    const oldMode = this.currentMode;
    const oldInterval = this.currentInterval;
    
    // Update statistics
    const duration = Date.now() - this.lastModeChange;
    switch (oldMode) {
      case 'IDLE':
        this.stats.totalIdleTime += duration;
        break;
      case 'ACTIVE':
        this.stats.totalActiveTime += duration;
        break;
      case 'COOLDOWN':
        this.stats.totalCooldownTime += duration;
        break;
      case 'BOOST':
        this.stats.totalBoostTime += duration;
        break;
    }
    
    // Change mode
    this.currentMode = newMode;
    this.currentInterval = this.intervals[newMode];
    this.lastModeChange = Date.now();
    this.stats.modeChanges++;
    
    console.log(`[IntervalMgr] Mode change: ${oldMode} (${oldInterval}s) → ${newMode} (${this.currentInterval}s)`);
  }
  
  // Update activity status
  updateActivity(eventType, data = {}) {
    const now = Date.now();
    
    switch (eventType) {
      case 'package_detected':
        this.lastActivity = now;
        this.lastPackageDetected = now;
        console.log('[IntervalMgr] Package detected event recorded');
        break;
        
      case 'package_removed':
      case 'pickup_completed':
        this.lastActivity = now;
        this.lastPickup = now;
        this.lastPackageDetected = null;
        console.log('[IntervalMgr] Pickup event recorded');
        break;
        
      case 'ultrasonic_triggered':
        this.lastActivity = now;
        console.log('[IntervalMgr] Ultrasonic trigger recorded');
        break;
        
      default:
        this.lastActivity = now;
    }
  }
  
  // Force mode change
  forceMode(mode) {
    if (this.intervals[mode]) {
      this.changeModeInternal(mode);
      return true;
    }
    return false;
  }
  
  // Get current status
  getStatus() {
    const now = Date.now();
    
    return {
      currentMode: this.currentMode,
      currentInterval: this.currentInterval,
      lastActivity: this.lastActivity 
        ? Math.floor((now - this.lastActivity) / 1000) + 's ago'
        : 'never',
      lastPackageDetected: this.lastPackageDetected
        ? Math.floor((now - this.lastPackageDetected) / 1000) + 's ago'
        : 'never',
      lastPickup: this.lastPickup
        ? Math.floor((now - this.lastPickup) / 1000) + 's ago'
        : 'never',
      timeInCurrentMode: Math.floor((now - this.lastModeChange) / 1000) + 's',
      stats: {
        ...this.stats,
        totalIdleTime: Math.floor(this.stats.totalIdleTime / 1000) + 's',
        totalActiveTime: Math.floor(this.stats.totalActiveTime / 1000) + 's',
        totalCooldownTime: Math.floor(this.stats.totalCooldownTime / 1000) + 's',
        totalBoostTime: Math.floor(this.stats.totalBoostTime / 1000) + 's'
      }
    };
  }
  
  // Update interval configuration
  updateIntervals(newIntervals) {
    this.intervals = { ...this.intervals, ...newIntervals };
    
    // Update current interval if in that mode
    this.currentInterval = this.intervals[this.currentMode];
    
    console.log('[IntervalMgr] Intervals updated:', this.intervals);
  }
  
  // Update thresholds
  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('[IntervalMgr] Thresholds updated:', this.thresholds);
  }
  
  // Reset statistics
  resetStats() {
    this.stats = {
      modeChanges: 0,
      totalIdleTime: 0,
      totalActiveTime: 0,
      totalCooldownTime: 0,
      totalBoostTime: 0
    };
    console.log('[IntervalMgr] Statistics reset');
  }
  
  // Calculate next check time
  getNextCheckTime() {
    return new Date(Date.now() + this.currentInterval * 1000).toISOString();
  }
  
  // Get recommendations
  getRecommendations() {
    const recommendations = [];
    
    // Check if intervals are optimal
    if (this.intervals.IDLE > 60) {
      recommendations.push({
        type: 'warning',
        message: 'IDLE interval is quite long (>60s). Consider reducing for better responsiveness.'
      });
    }
    
    if (this.intervals.ACTIVE < 10) {
      recommendations.push({
        type: 'warning',
        message: 'ACTIVE interval is very short (<10s). May cause high API usage.'
      });
    }
    
    // Check activity patterns
    const totalTime = this.stats.totalIdleTime + this.stats.totalActiveTime + 
                      this.stats.totalCooldownTime + this.stats.totalBoostTime;
    
    if (totalTime > 0) {
      const idlePercent = (this.stats.totalIdleTime / totalTime) * 100;
      const activePercent = (this.stats.totalActiveTime / totalTime) * 100;
      
      if (idlePercent < 50) {
        recommendations.push({
          type: 'info',
          message: `High activity detected (${activePercent.toFixed(1)}% active time). System is working hard.`
        });
      }
      
      if (this.stats.modeChanges > 100) {
        recommendations.push({
          type: 'info',
          message: `Many mode changes (${this.stats.modeChanges}). This indicates dynamic activity.`
        });
      }
    }
    
    return recommendations;
  }
}

export default DynamicIntervalManager;
