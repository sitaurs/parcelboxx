// Baseline Photo Manager
// Manages baseline photos (empty holder state) for comparison with realtime photos
// Used by Gemini AI to detect if new package has arrived

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BaselinePhotoManager {
  constructor() {
    // Storage paths
    this.storagePath = path.join(__dirname, '../../storage/baselines');
    this.metadataPath = path.join(__dirname, '../../db/baselines.json');
    
    // In-memory cache for quick access
    this.baselines = new Map(); // deviceId -> { buffer, timestamp, metadata }
    
    // Configuration
    this.config = {
      maxAge: 24 * 60 * 60 * 1000,  // 24 hours max age for baseline
      maxBaselinesPerDevice: 3,     // Keep last 3 baselines per device
      minConfidenceForBaseline: 30, // Min AI confidence that holder is empty
    };
    
    // Initialize storage
    this.initialize();
  }
  
  async initialize() {
    try {
      // Ensure storage directory exists
      await fs.mkdir(this.storagePath, { recursive: true });
      
      // Load existing baselines metadata
      await this.loadMetadata();
      
      console.log('[BaselineMgr] Initialized with', this.baselines.size, 'cached baselines');
    } catch (error) {
      console.error('[BaselineMgr] Initialization error:', error.message);
    }
  }
  
  /**
   * Load baselines metadata from disk
   */
  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataPath, 'utf-8');
      const metadata = JSON.parse(data);
      
      // Load each baseline into memory
      for (const [deviceId, info] of Object.entries(metadata)) {
        if (info.filePath && await this.fileExists(info.filePath)) {
          const buffer = await fs.readFile(info.filePath);
          this.baselines.set(deviceId, {
            buffer,
            timestamp: new Date(info.timestamp),
            filePath: info.filePath,
            metadata: info.metadata || {}
          });
        }
      }
    } catch (error) {
      // File doesn't exist yet, that's OK
      if (error.code !== 'ENOENT') {
        console.error('[BaselineMgr] Load metadata error:', error.message);
      }
    }
  }
  
  /**
   * Save baselines metadata to disk
   */
  async saveMetadata() {
    try {
      const metadata = {};
      
      for (const [deviceId, info] of this.baselines.entries()) {
        metadata[deviceId] = {
          filePath: info.filePath,
          timestamp: info.timestamp.toISOString(),
          metadata: info.metadata
        };
      }
      
      await fs.writeFile(this.metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      console.error('[BaselineMgr] Save metadata error:', error.message);
    }
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Store a new baseline photo
   * Called after holder release when the holder is confirmed empty
   * 
   * @param {string} deviceId - Device identifier (e.g., 'box-01')
   * @param {Buffer} imageBuffer - JPEG image buffer
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<{success: boolean, baselineId?: string, error?: string}>}
   */
  async storeBaseline(deviceId, imageBuffer, metadata = {}) {
    try {
      const timestamp = new Date();
      const baselineId = `baseline_${deviceId}_${timestamp.getTime()}`;
      const fileName = `${baselineId}.jpg`;
      const filePath = path.join(this.storagePath, fileName);
      
      // Save image to disk
      await fs.writeFile(filePath, imageBuffer);
      
      // Update in-memory cache
      this.baselines.set(deviceId, {
        buffer: imageBuffer,
        timestamp,
        filePath,
        metadata: {
          ...metadata,
          baselineId,
          capturedAt: timestamp.toISOString()
        }
      });
      
      // Persist metadata
      await this.saveMetadata();
      
      // Cleanup old baselines for this device
      await this.cleanupOldBaselines(deviceId);
      
      console.log(`[BaselineMgr] Stored baseline for ${deviceId}: ${baselineId}`);
      
      return {
        success: true,
        baselineId,
        timestamp: timestamp.toISOString()
      };
      
    } catch (error) {
      console.error('[BaselineMgr] Store baseline error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get the current baseline for a device
   * 
   * @param {string} deviceId - Device identifier
   * @returns {Promise<{hasBaseline: boolean, buffer?: Buffer, metadata?: Object, age?: number}>}
   */
  async getBaseline(deviceId) {
    const baseline = this.baselines.get(deviceId);
    
    if (!baseline) {
      return { hasBaseline: false };
    }
    
    const age = Date.now() - baseline.timestamp.getTime();
    
    // Check if baseline is too old
    if (age > this.config.maxAge) {
      console.log(`[BaselineMgr] Baseline for ${deviceId} is stale (${Math.floor(age / 1000 / 60)} minutes old)`);
      return { 
        hasBaseline: false,
        reason: 'stale',
        age
      };
    }
    
    return {
      hasBaseline: true,
      buffer: baseline.buffer,
      metadata: baseline.metadata,
      timestamp: baseline.timestamp.toISOString(),
      age
    };
  }
  
  /**
   * Check if we have a valid (non-stale) baseline for a device
   * 
   * @param {string} deviceId - Device identifier
   * @returns {boolean}
   */
  hasValidBaseline(deviceId) {
    const baseline = this.baselines.get(deviceId);
    
    if (!baseline) return false;
    
    const age = Date.now() - baseline.timestamp.getTime();
    return age <= this.config.maxAge;
  }
  
  /**
   * Invalidate (delete) baseline for a device
   * Called when we know the holder state has changed
   * 
   * @param {string} deviceId - Device identifier
   */
  async invalidateBaseline(deviceId) {
    const baseline = this.baselines.get(deviceId);
    
    if (baseline) {
      // Delete file
      try {
        await fs.unlink(baseline.filePath);
      } catch (error) {
        // Ignore if file doesn't exist
      }
      
      // Remove from cache
      this.baselines.delete(deviceId);
      
      // Update metadata
      await this.saveMetadata();
      
      console.log(`[BaselineMgr] Invalidated baseline for ${deviceId}`);
    }
  }
  
  /**
   * Cleanup old baseline files for a device
   */
  async cleanupOldBaselines(deviceId) {
    try {
      const files = await fs.readdir(this.storagePath);
      const deviceFiles = files
        .filter(f => f.startsWith(`baseline_${deviceId}_`))
        .map(f => ({
          name: f,
          path: path.join(this.storagePath, f),
          timestamp: parseInt(f.split('_')[2]) || 0
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only the latest N baselines
      const toDelete = deviceFiles.slice(this.config.maxBaselinesPerDevice);
      
      for (const file of toDelete) {
        await fs.unlink(file.path);
        console.log(`[BaselineMgr] Cleaned up old baseline: ${file.name}`);
      }
      
    } catch (error) {
      console.error('[BaselineMgr] Cleanup error:', error.message);
    }
  }
  
  /**
   * Get statistics about baselines
   */
  getStats() {
    const stats = {
      totalDevices: this.baselines.size,
      baselines: []
    };
    
    for (const [deviceId, info] of this.baselines.entries()) {
      const age = Date.now() - info.timestamp.getTime();
      stats.baselines.push({
        deviceId,
        timestamp: info.timestamp.toISOString(),
        ageMinutes: Math.floor(age / 1000 / 60),
        isValid: age <= this.config.maxAge,
        sizeKB: Math.floor(info.buffer.length / 1024)
      });
    }
    
    return stats;
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[BaselineMgr] Config updated:', this.config);
  }
}

// Singleton instance
const baselineManager = new BaselinePhotoManager();

export default baselineManager;
export { BaselinePhotoManager };
