import mqtt from 'mqtt';
import { readDB, updateDB, appendDB } from '../utils/db.js';
import GowaService from '../services/gowa.js';

// Initialize GOWA Service
const gowa = new GowaService({
  baseUrl: process.env.GOWA_API_URL,
  username: process.env.GOWA_USERNAME,
  password: process.env.GOWA_PASSWORD
});

let mqttClient = null;
let lastDistance = null;
let deviceOnlineStatus = false;

// AI Engine reference (will be set by initMQTT)
let aiEngineRef = null;

const DEVICE_ID = process.env.DEVICE_ID || 'box-01';

// MQTT Topics
const TOPICS = {
  STATUS: `smartparcel/${DEVICE_ID}/status`,
  DISTANCE: `smartparcel/${DEVICE_ID}/sensor/distance`,
  EVENT: `smartparcel/${DEVICE_ID}/event`,
  PHOTO_STATUS: `smartparcel/${DEVICE_ID}/photo/status`,
  CONTROL: `smartparcel/${DEVICE_ID}/control`,
  CONTROL_ACK: `smartparcel/${DEVICE_ID}/control/ack`,
  SETTINGS_SET: `smartparcel/${DEVICE_ID}/settings/set`,
  SETTINGS_CUR: `smartparcel/${DEVICE_ID}/settings/cur`,
  SETTINGS_ACK: `smartparcel/${DEVICE_ID}/settings/ack`,
  
  // Baseline photo topics
  BASELINE_TRIGGER: `smartparcel/${DEVICE_ID}/baseline/trigger`,  // Backend -> ESP32: request baseline capture
  BASELINE_PHOTO: `smartparcel/${DEVICE_ID}/baseline/photo`,      // ESP32 -> Backend: baseline photo data
  HOLDER_RELEASE: `smartparcel/${DEVICE_ID}/holder/release`,      // ESP32 -> Backend: holder released event
  
  // ESP8266 Door Lock Topics
  LOCK_CONTROL: 'smartparcel/lock/control',
  LOCK_STATUS: 'smartparcel/lock/status',
  LOCK_PIN: 'smartparcel/lock/pin',
  LOCK_ALERT: 'smartparcel/lock/alert',
  LOCK_SETTINGS: 'smartparcel/lock/settings' // NEW: Door lock settings
};

/**
 * Initialize MQTT Client
 * @param {Object} options - Optional parameters
 * @param {Object} options.aiEngine - AI Detection Engine instance for baseline capture
 */
export function initMQTT(options = {}) {
  // Store AI Engine reference for baseline capture
  if (options.aiEngine) {
    aiEngineRef = options.aiEngine;
    console.log('[MQTT] AI Engine linked for baseline capture');
  }
  
  const brokerUrl = process.env.MQTT_BROKER || 'mqtt://3.27.11.106:1884';
  const mqttOptions = {
    username: process.env.MQTT_USER || 'mcuzaman',
    password: process.env.MQTT_PASS || 'McuZaman#2025Aman!',
    clientId: `backend-app-${Math.random().toString(16).slice(2, 8)}`,
    clean: false, // Persistent session for reliability
    reconnectPeriod: 5000
  };

  mqttClient = mqtt.connect(brokerUrl, mqttOptions);

  mqttClient.on('connect', () => {
    console.log('✓ MQTT Connected to broker');
    
    // Subscribe to all topics with QoS 1 for reliability
    Object.values(TOPICS).forEach(topic => {
      mqttClient.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`  → Subscribed to ${topic}`);
        }
      });
    });
  });

  mqttClient.on('message', handleMessage);

  mqttClient.on('error', (error) => {
    console.error('MQTT Error:', error.message);
  });

  mqttClient.on('offline', () => {
    console.log('⚠ MQTT Client offline');
  });

  return mqttClient;
}

/**
 * Handle incoming MQTT messages
 */
function handleMessage(topic, message) {
  try {
    const payload = message.toString();
    
    // Device Status
    if (topic === TOPICS.STATUS) {
      deviceOnlineStatus = payload === 'online';
      updateDB('deviceStatus', {
        isOnline: deviceOnlineStatus,
        lastSeen: new Date().toISOString()
      });
      console.log(`Device status: ${payload}`);
    }
    
    // Distance Sensor
    else if (topic === TOPICS.DISTANCE) {
      const data = JSON.parse(payload);
      lastDistance = data.cm;
      updateDB('deviceStatus', {
        lastDistance: data.cm,
        lastSeen: new Date().toISOString()
      });
    }
    
    // Event (package detection, pipeline steps)
    else if (topic === TOPICS.EVENT) {
      const event = JSON.parse(payload);
      console.log('Event:', event);
      
      // If package detected, prepare for WhatsApp notification
      if (event.type === 'detect') {
        console.log(`📦 Package detected at ${event.cm} cm`);
      }
    }
    
    // Photo Upload Status
    else if (topic === TOPICS.PHOTO_STATUS) {
      const status = JSON.parse(payload);
      console.log('Photo status:', status);
      
      // If photo uploaded successfully, notify WhatsApp backend
      if (status.ok && status.photoUrl) {
        // Convert relative path to full URL
        const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9090}`;
        const fullPhotoUrl = status.photoUrl.startsWith('http') 
          ? status.photoUrl 
          : `${baseUrl}${status.photoUrl}`;
        
        notifyWhatsAppBackend({
          type: 'package_received',
          photoUrl: fullPhotoUrl,
          thumbUrl: status.thumbUrl ? `${baseUrl}${status.thumbUrl}` : null,
          timestamp: status.ts,
          distance: status.meta?.cm,
          deviceId: DEVICE_ID
        });
      }
    }
    
    // Lock Status (from ESP8266)
    else if (topic === TOPICS.LOCK_STATUS) {
      const lockStatus = JSON.parse(payload);
      console.log('🔐 Lock status:', lockStatus);
      
      // If failed attempts >= 3, send security alert (lockout)
      if (lockStatus.method === 'keypad_lockout' && lockStatus.attempts >= 3) {
        console.log('🚨 LOCKOUT TRIGGERED! Sending WhatsApp alert...');
        notifyWhatsAppBackend({
          type: 'security_alert',
          attempts: lockStatus.attempts,
          timestamp: new Date().toISOString(),
          deviceId: DEVICE_ID,
          reason: `🚨 LOCKOUT: ${lockStatus.attempts} percobaan gagal membuka kunci pintu. Perangkat terkunci selama 30 detik.`
        });
      }
      // Send alert for each failed attempt (not just lockout)
      else if (lockStatus.method === 'keypad_failed') {
        console.log(`⚠️ Failed PIN attempt #${lockStatus.attempts}`);
        // Only notify on 2nd and 3rd failed attempt
        if (lockStatus.attempts >= 2) {
          notifyWhatsAppBackend({
            type: 'security_alert',
            attempts: lockStatus.attempts,
            timestamp: new Date().toISOString(),
            deviceId: DEVICE_ID,
            reason: `⚠️ Percobaan PIN salah ke-${lockStatus.attempts}. ${3 - lockStatus.attempts} kesempatan tersisa sebelum lockout.`
          });
        }
      }
    }
    
    // Lock Alert
    else if (topic === TOPICS.LOCK_ALERT) {
      const alert = JSON.parse(payload);
      console.log('⚠ Security Alert:', alert);
      notifyWhatsAppBackend({
        type: 'security_alert',
        deviceId: DEVICE_ID,
        ...alert
      });
    }
    
    // Control Acknowledgment (ESP32 response to control commands)
    else if (topic === TOPICS.CONTROL_ACK) {
      const ack = JSON.parse(payload);
      console.log('✓ Control ACK:', ack);
      
      // Update device status based on acknowledgment
      updateDB('deviceStatus', {
        lastCommand: ack.action || 'unknown',
        lastCommandStatus: ack.ok ? 'success' : 'failed',
        lastCommandTime: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }
    
    // Settings Acknowledgment (ESP32 response to settings update)
    else if (topic === TOPICS.SETTINGS_ACK) {
      const ack = JSON.parse(payload);
      console.log('✓ Settings ACK:', ack);
      
      // Update device status
      updateDB('deviceStatus', {
        settingsApplied: ack.ok,
        settingsError: ack.err || null,
        lastSettingsUpdate: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      });
    }
    
    // Holder Release Event (ESP32 signals holder has been released)
    else if (topic === TOPICS.HOLDER_RELEASE) {
      const releaseData = JSON.parse(payload);
      console.log('🔓 Holder released:', releaseData);
      
      // Trigger baseline capture on ESP32
      // Wait a short moment for package to fall through (if any)
      setTimeout(() => {
        console.log('[MQTT] Triggering baseline capture after holder release...');
        publishCommand(TOPICS.BASELINE_TRIGGER, {
          action: 'capture',
          reason: 'holder_release',
          timestamp: new Date().toISOString()
        });
      }, 1000); // 1 second delay for package to clear
    }
    
    // Baseline Photo Received (ESP32 sends baseline photo)
    else if (topic === TOPICS.BASELINE_PHOTO) {
      console.log('[MQTT] Baseline photo received');
      
      // Payload should be JSON with base64 image or URL
      const baselineData = JSON.parse(payload);
      
      if (aiEngineRef && baselineData.image) {
        // Convert base64 to buffer if needed
        let imageBuffer;
        if (typeof baselineData.image === 'string') {
          // Assume base64 encoded
          imageBuffer = Buffer.from(baselineData.image, 'base64');
        } else {
          imageBuffer = baselineData.image;
        }
        
        // Store baseline in AI Engine
        aiEngineRef.captureBaseline(DEVICE_ID, imageBuffer, {
          reason: baselineData.reason || 'holder_release',
          distance: baselineData.distance || null,
          verifyEmpty: true // AI will verify holder is empty
        }).then(result => {
          if (result.success) {
            console.log(`[MQTT] ✅ Baseline stored: ${result.baselineId}`);
          } else {
            console.warn(`[MQTT] ⚠️ Baseline rejected: ${result.error}`);
          }
        }).catch(err => {
          console.error('[MQTT] ❌ Baseline capture error:', err.message);
        });
      } else if (!aiEngineRef) {
        console.warn('[MQTT] AI Engine not linked - cannot store baseline');
      }
    }
    
  } catch (error) {
    console.error('Error handling MQTT message:', error.message);
  }
}

/**
 * Publish command to MQTT
 */
export function publishCommand(topic, payload) {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT client not connected');
    return false;
  }
  
  const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
  mqttClient.publish(topic, message);
  return true;
}

/**
 * Publish device control command
 */
export function publishDeviceControl(action, params = {}) {
  return publishCommand(TOPICS.CONTROL, { ...params, ...action });
}

/**
 * Publish settings update
 */
export function publishSettings(settings) {
  return publishCommand(TOPICS.SETTINGS_SET, settings);
}

/**
 * Publish door lock control
 */
export function publishLockControl(action, pin) {
  return publishCommand(TOPICS.LOCK_CONTROL, { action, pin });
}

/**
 * Publish PIN update to ESP8266
 */
export function publishPinUpdate(pin) {
  return publishCommand(TOPICS.LOCK_PIN, { pin });
}

/**
 * Publish door lock settings update to ESP8266
 */
export function publishDoorLockSettings(settings) {
  return publishCommand(TOPICS.LOCK_SETTINGS, settings);
}

/**
 * Trigger baseline capture on ESP32
 * @param {string} reason - Reason for capture (e.g., 'holder_release', 'manual', 'package_pickup')
 */
export function triggerBaselineCapture(reason = 'manual') {
  console.log(`[MQTT] Triggering baseline capture: ${reason}`);
  return publishCommand(TOPICS.BASELINE_TRIGGER, {
    action: 'capture',
    reason: reason,
    timestamp: new Date().toISOString()
  });
}

/**
 * Set AI Engine reference for baseline capture
 * Can be called after initMQTT if AI Engine wasn't ready at init time
 */
export function setAIEngine(aiEngine) {
  aiEngineRef = aiEngine;
  console.log('[MQTT] AI Engine linked for baseline capture');
}

/**
 * Get current device status
 */
export function getDeviceStatus() {
  return {
    isOnline: deviceOnlineStatus,
    lastDistance: lastDistance,
    ...readDB('deviceStatus')
  };
}

/**
 * Notify WhatsApp backend about events
 */
async function notifyWhatsAppBackend(data) {
  try {
    // Get WhatsApp configuration
    const config = readDB('whatsappConfig');
    
    // Check if WhatsApp is paired and not blocked
    if (!config.isPaired || config.isBlocked) {
      console.log('WhatsApp not configured or blocked. Skipping notification.');
      return;
    }

    // Get recipients from config
    const recipients = config.recipients || [];
    if (recipients.length === 0) {
      console.log('No WhatsApp recipients configured.');
      return;
    }

    // Prepare message based on event type
    let message = '';
    let imageUrl = null;

    if (data.type === 'package_received') {
      message = `📦 *SmartParcel - Paket Diterima*\n\n`;
      message += `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n`;
      message += `📍 Device: ${data.deviceId || 'box-01'}\n\n`;
      message += `Paket baru telah diterima dan tersimpan dengan aman.`;
      
      // If photo available
      if (data.photoUrl) {
        imageUrl = data.photoUrl;
      }
    } else if (data.type === 'security_alert') {
      message = `🚨 *SmartParcel - Peringatan Keamanan*\n\n`;
      message += `⏰ Waktu: ${new Date().toLocaleString('id-ID')}\n`;
      message += `📍 Device: ${data.deviceId || 'box-01'}\n`;
      message += `⚠️ Alasan: ${data.reason || 'Aktivitas mencurigakan terdeteksi'}\n\n`;
      message += `Mohon segera periksa perangkat Anda.`;
      
      if (data.photoUrl) {
        imageUrl = data.photoUrl;
      }
    } else {
      message = `ℹ️ *SmartParcel Notification*\n\n`;
      message += `Event: ${data.type}\n`;
      message += `Time: ${new Date().toLocaleString('id-ID')}\n`;
      message += `Data: ${JSON.stringify(data, null, 2)}`;
    }

    // Send to all recipients
    const sendPromises = recipients.map(async (recipient) => {
      try {
        // Handle both old string format and new object format {phone, name}
        let phone = typeof recipient === 'string' ? recipient : recipient.phone;
        const name = typeof recipient === 'string' ? phone : (recipient.name || phone);
        
        if (!phone) {
          console.warn(`⚠️ Skipping invalid recipient:`, recipient);
          return { success: false, error: 'Invalid recipient' };
        }
        
        // Auto-detect group format and add @g.us suffix if needed
        // Group IDs start with 120363... or contain '-' (old format like 628xxx-timestamp)
        if (!phone.includes('@')) {
          if (phone.startsWith('120363') || phone.includes('-')) {
            phone = `${phone}@g.us`;
            console.log(`📱 Detected group recipient: ${phone}`);
          }
        }
        
        let result;
        
        if (imageUrl) {
          // Send image with caption
          result = await gowa.sendImage(phone, message, imageUrl, true);
        } else {
          // Send text only
          result = await gowa.sendText(phone, message);
        }

        if (result.success) {
          console.log(`✅ WhatsApp sent to ${name} (${phone}): ${result.messageId}`);
        } else {
          console.error(`❌ Failed to send WhatsApp to ${name} (${phone}):`, result.error);
        }

        return result;
      } catch (error) {
        const phone = typeof recipient === 'string' ? recipient : recipient.phone;
        console.error(`❌ Error sending to ${phone}:`, error.message);
        return { success: false, error: error.message };
      }
    });

    await Promise.all(sendPromises);
    
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error.message);
  }
}

export { TOPICS };
