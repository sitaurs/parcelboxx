import express from 'express';
import { readDB, updateDB, writeDB } from '../utils/db.js';
import { generateDeviceToken } from '../middleware/auth.js';
import GowaService from '../services/gowa.js';
import { 
  publishDeviceControl, 
  publishSettings, 
  publishLockControl,
  getDeviceStatus 
} from '../mqtt/client.js';

// Initialize GOWA Service
const gowa = new GowaService({
  baseUrl: process.env.GOWA_API_URL,
  username: process.env.GOWA_USERNAME,
  password: process.env.GOWA_PASSWORD
});

const router = express.Router();

// Door control rate limiting tracker
const doorAttempts = new Map(); // Map<IP, { attempts: number, firstAttempt: timestamp, lockoutUntil: timestamp }>

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of doorAttempts.entries()) {
    if (data.lockoutUntil && now > data.lockoutUntil) {
      doorAttempts.delete(ip);
    } else if (now - data.firstAttempt > 30000) {
      doorAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Notify WhatsApp backend about security alert
 */
async function notifySecurityAlert(ip, attempts) {
  try {
    // Get WhatsApp configuration
    const config = readDB('whatsappConfig');
    
    // Check if WhatsApp is paired and not blocked
    if (!config.isPaired || config.isBlocked) {
      console.log('WhatsApp not configured or blocked. Skipping security alert.');
      return;
    }

    // Get recipients
    const recipients = config.recipients || [];
    if (recipients.length === 0) {
      console.log('No WhatsApp recipients configured.');
      return;
    }

    // Prepare security alert message
    const message = `🚨 *SmartParcel - Peringatan Keamanan*\n\n` +
      `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n` +
      `🌐 IP Address: ${ip}\n` +
      `⚠️ Percobaan Gagal: ${attempts}x\n\n` +
      `Terdeteksi ${attempts} percobaan gagal membuka pintu dari IP ${ip}.\n` +
      `Mohon segera periksa perangkat dan log aktivitas Anda.`;

    // Send to all recipients
    const sendPromises = recipients.map(async (recipient) => {
      try {
        // Support both old string format and new object format
        const phone = typeof recipient === 'string' ? recipient : recipient.phone;
        const name = typeof recipient === 'string' ? phone : recipient.name;
        
        const result = await gowa.sendText(phone, message);
        
        if (result.success) {
          console.log(`✅ Security alert sent to ${name} (${phone}): ${result.messageId}`);
        } else {
          console.error(`❌ Failed to send alert to ${name} (${phone}):`, result.error);
        }
        
        return result;
      } catch (error) {
        console.error(`❌ Error sending alert to ${typeof recipient === 'string' ? recipient : recipient.name}:`, error.message);
        return { success: false, error: error.message };
      }
    });

    await Promise.all(sendPromises);
    
  } catch (error) {
    console.error('❌ Security alert notification error:', error.message);
  }
}

/**
 * GET /api/device/status
 * Get current device status
 */
router.get('/status', (req, res) => {
  try {
    const status = getDeviceStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Get device status error:', error);
    res.status(500).json({ error: 'Failed to get device status' });
  }
});

/**
 * GET /api/device/settings
 * Get current device settings
 */
router.get('/settings', (req, res) => {
  try {
    const settings = readDB('settings');
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * PUT /api/device/settings
 * Update device settings with validation
 */
router.put('/settings', async (req, res) => {
  try {
    const { ultra, lock, buzzer, doorLock, detection } = req.body;
    
    // Validation for ultra sensor settings
    if (ultra) {
      const { min, max } = ultra;
      
      if (min !== undefined && (min < 5 || min > 50)) {
        return res.status(400).json({ 
          error: 'ultra.min harus antara 5-50 cm',
          field: 'ultra.min',
          value: min,
          allowedRange: [5, 50]
        });
      }
      
      if (max !== undefined && (max < 10 || max > 50)) {
        return res.status(400).json({ 
          error: 'ultra.max harus antara 10-50 cm',
          field: 'ultra.max',
          value: max,
          allowedRange: [10, 50]
        });
      }
      
      if (min !== undefined && max !== undefined && min >= max) {
        return res.status(400).json({ 
          error: 'ultra.min harus lebih kecil dari ultra.max',
          field: 'ultra',
          min,
          max
        });
      }
    }
    
    // Validation for detection mode
    if (detection && detection.mode !== undefined) {
      const validModes = ['FULL_HCSR', 'FULL_GEMINI', 'BOTH'];
      if (!validModes.includes(detection.mode)) {
        return res.status(400).json({ 
          error: 'detection.mode harus FULL_HCSR, FULL_GEMINI, atau BOTH',
          field: 'detection.mode',
          value: detection.mode,
          allowedValues: validModes
        });
      }
    }
    
    // Validation for lock (solenoid) settings
    if (lock && lock.ms !== undefined) {
      if (lock.ms < 1000 || lock.ms > 60000) {
        return res.status(400).json({ 
          error: 'lock.ms harus antara 1000-60000 ms (1-60 detik)',
          field: 'lock.ms',
          value: lock.ms,
          allowedRange: [1000, 60000]
        });
      }
    }
    
    // Validation for buzzer settings
    if (buzzer && buzzer.ms !== undefined) {
      if (buzzer.ms < 1000 || buzzer.ms > 300000) {
        return res.status(400).json({ 
          error: 'buzzer.ms harus antara 1000-300000 ms (1-300 detik)',
          field: 'buzzer.ms',
          value: buzzer.ms,
          allowedRange: [1000, 300000]
        });
      }
    }
    
    // Validation for doorLock settings
    if (doorLock && doorLock.ms !== undefined) {
      if (doorLock.ms < 1000 || doorLock.ms > 30000) {
        return res.status(400).json({ 
          error: 'doorLock.ms harus antara 1000-30000 ms (1-30 detik)',
          field: 'doorLock.ms',
          value: doorLock.ms,
          allowedRange: [1000, 30000]
        });
      }
    }
    
    const currentSettings = readDB('settings');
    const newSettings = {
      ...currentSettings,
      ...(ultra && { ultra: { ...currentSettings.ultra, ...ultra } }),
      ...(lock && { lock: { ...currentSettings.lock, ...lock } }),
      ...(buzzer && { buzzer: { ...currentSettings.buzzer, ...buzzer } }),
      ...(doorLock && { doorLock: { ...currentSettings.doorLock, ...doorLock } }),
      ...(detection && { detection: { ...currentSettings.detection, ...detection } })
    };
    
    updateDB('settings', newSettings);
    
    // Publish to ESP32 via MQTT
    const mqttSettings = {
      ...(ultra && { ultra: newSettings.ultra }),
      ...(lock && { lock: newSettings.lock }),
      ...(buzzer && { buzzer: newSettings.buzzer }),
      ...(detection && { detection: newSettings.detection })
    };
    
    if (Object.keys(mqttSettings).length > 0) {
      publishSettings(mqttSettings);
    }
    
    // Publish doorLock settings to ESP8266 via MQTT
    if (doorLock) {
      const { publishDoorLockSettings } = await import('../mqtt/client.js');
      publishDoorLockSettings(newSettings.doorLock);
    }
    
    res.json({
      success: true,
      settings: newSettings,
      message: 'Settings updated successfully'
    });
    
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * POST /api/device/control/capture
 * Trigger manual photo capture
 */
router.post('/control/capture', (req, res) => {
  try {
    const success = publishDeviceControl({ capture: true });
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: 'Capture command sent'
    });
    
  } catch (error) {
    console.error('Capture error:', error);
    res.status(500).json({ error: 'Failed to send capture command' });
  }
});

/**
 * POST /api/device/control/flash
 * Control flash LED
 */
router.post('/control/flash', (req, res) => {
  try {
    const { state, ms } = req.body; // state: 'on', 'off', or 'pulse'
    
    let command;
    if (state === 'on') {
      command = { flash: 'on' };
    } else if (state === 'off') {
      command = { flash: 'off' };
    } else if (state === 'pulse') {
      command = { flash: 'pulse', ms: ms || 300 }; // Default 300ms for better visibility
    } else {
      return res.status(400).json({ error: 'Invalid state' });
    }
    
    const success = publishDeviceControl(command);
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: `Flash ${state} command sent`
    });
    
  } catch (error) {
    console.error('Flash control error:', error);
    res.status(500).json({ error: 'Failed to control flash' });
  }
});

/**
 * POST /api/device/control/buzzer
 * Control buzzer
 */
router.post('/control/buzzer', (req, res) => {
  try {
    const { action, ms } = req.body; // action: 'start', 'stop', 'enable', 'disable'
    
    let command;
    if (action === 'stop') {
      command = { buzzer: { stop: true } };
      // Send stop command
      const success1 = publishDeviceControl(command);
      // Also send general stop command for more reliability
      const success2 = publishDeviceControl({ stop: true });
      
      if (!success1 && !success2) {
        return res.status(503).json({ error: 'Device not connected' });
      }
      
      return res.json({
        success: true,
        message: 'Buzzer stop command sent (dual)'
      });
    } else if (action === 'start') {
      command = { buzzer: { ms: ms || 5000 } };
    } else if (action === 'enable') {
      command = { buzzer: { enable: true } };
    } else if (action === 'disable') {
      command = { buzzer: { disable: true } };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const success = publishDeviceControl(command);
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: `Buzzer ${action} command sent`
    });
    
  } catch (error) {
    console.error('Buzzer control error:', error);
    res.status(500).json({ error: 'Failed to control buzzer' });
  }
});

/**
 * POST /api/device/control/holder
 * Control package holder solenoid
 */
router.post('/control/holder', (req, res) => {
  try {
    const { action, ms } = req.body; // action: 'open', 'closed', or 'pulse'
    
    let command;
    if (action === 'open') {
      command = { lock: 'open' };
    } else if (action === 'closed') {
      command = { lock: 'closed' };
    } else if (action === 'pulse') {
      // Cap ms to 10 seconds for safety (prevent stuck holder)
      const safeMs = Math.min(ms || 5000, 10000);
      command = { lock: 'pulse', ms: safeMs };
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
    const success = publishDeviceControl(command);
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: `Holder ${action} command sent`
    });
    
  } catch (error) {
    console.error('Holder control error:', error);
    res.status(500).json({ error: 'Failed to control holder' });
  }
});

/**
 * POST /api/device/control/door
 * Control door lock (ESP8266) - with REQUIRED PIN verification + RATE LIMITING
 * Body: { pin: string } - PIN is MANDATORY for security
 * Rate Limit: Max 3 failed attempts per IP per 30s
 */
router.post('/control/door', (req, res) => {
  try {
    const { pin } = req.body;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Check rate limiting / lockout
    const attemptData = doorAttempts.get(clientIP);
    const now = Date.now();
    
    if (attemptData && attemptData.lockoutUntil && now < attemptData.lockoutUntil) {
      const remainingSeconds = Math.ceil((attemptData.lockoutUntil - now) / 1000);
      return res.status(429).json({ 
        error: `Terlalu banyak percobaan gagal. Coba lagi dalam ${remainingSeconds} detik`,
        lockoutUntil: new Date(attemptData.lockoutUntil).toISOString(),
        remainingSeconds
      });
    }
    
    // PIN is REQUIRED - not optional!
    if (!pin) {
      return res.status(400).json({ error: 'PIN diperlukan untuk membuka pintu' });
    }
    
    const pins = readDB('pins');
    
    // Verify PIN matches
    if (pin !== pins.doorLockPin) {
      // Track failed attempt
      if (!attemptData) {
        doorAttempts.set(clientIP, {
          attempts: 1,
          firstAttempt: now,
          lockoutUntil: null
        });
      } else {
        attemptData.attempts += 1;
        
        // Trigger lockout after 3 failed attempts
        if (attemptData.attempts >= 3) {
          attemptData.lockoutUntil = now + 30000; // 30 seconds lockout
          
          // Trigger security alert via MQTT
          console.warn(`🚨 Security Alert: IP ${clientIP} locked out after ${attemptData.attempts} failed door unlock attempts`);
          
          // Notify WhatsApp backend about security alert
          notifySecurityAlert(clientIP, attemptData.attempts);
          
          return res.status(429).json({ 
            error: 'Terlalu banyak percobaan gagal. Akun Anda diblokir selama 30 detik',
            lockoutUntil: new Date(attemptData.lockoutUntil).toISOString()
          });
        }
      }
      
      return res.status(401).json({ 
        error: 'PIN salah',
        remainingAttempts: 3 - (attemptData?.attempts || 1)
      });
    }
    
    // PIN correct - reset attempts and unlock
    doorAttempts.delete(clientIP);
    
    // Send unlock command with validated PIN
    const success = publishLockControl('unlock', pin);
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: 'Door unlock command sent'
    });
    
  } catch (error) {
    console.error('Door control error:', error);
    res.status(500).json({ error: 'Failed to control door' });
  }
});

/**
 * POST /api/device/control/stop-pipeline
 * Stop current pipeline execution
 */
router.post('/control/stop-pipeline', (req, res) => {
  try {
    const success = publishDeviceControl({ pipeline: 'stop' });
    
    if (!success) {
      return res.status(503).json({ error: 'Device not connected' });
    }
    
    res.json({
      success: true,
      message: 'Pipeline stop command sent'
    });
    
  } catch (error) {
    console.error('Stop pipeline error:', error);
    res.status(500).json({ error: 'Failed to stop pipeline' });
  }
});

/**
 * POST /device/generate-token
 * Generate JWT token for device authentication
 * Requires user authentication
 */
router.post('/generate-token', async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId || typeof deviceId !== 'string' || deviceId.trim() === '') {
      return res.status(400).json({ error: 'Valid deviceId is required' });
    }
    
    // Generate JWT token for the device
    const token = generateDeviceToken(deviceId.trim());
    
    console.log(`Generated device token for: ${deviceId}`);
    
    res.json({
      success: true,
      deviceId: deviceId.trim(),
      token,
      expiresIn: '365 days',
      instructions: 'Use this token in Authorization header as: Bearer <token>'
    });
    
  } catch (error) {
    console.error('Generate device token error:', error);
    res.status(500).json({ error: 'Failed to generate device token' });
  }
});

export default router;
