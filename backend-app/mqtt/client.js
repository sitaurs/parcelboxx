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
  
  // ESP8266 Door Lock Topics
  LOCK_CONTROL: 'smartparcel/lock/control',
  LOCK_STATUS: 'smartparcel/lock/status',
  LOCK_PIN: 'smartparcel/lock/pin',
  LOCK_ALERT: 'smartparcel/lock/alert',
  LOCK_SETTINGS: 'smartparcel/lock/settings' // NEW: Door lock settings
};

/**
 * Initialize MQTT Client
 */
export function initMQTT() {
  const brokerUrl = process.env.MQTT_BROKER || 'mqtt://3.27.0.139:1884';
  const options = {
    username: process.env.MQTT_USER || 'mcuzaman',
    password: process.env.MQTT_PASS || 'McuZaman#2025Aman!',
    clientId: `backend-app-${Math.random().toString(16).slice(2, 8)}`,
    clean: false, // Persistent session for reliability
    reconnectPeriod: 5000
  };

  mqttClient = mqtt.connect(brokerUrl, options);

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
      console.log('Lock status:', lockStatus);
      
      // If failed attempts >= 3, send security alert
      if (lockStatus.method === 'keypad_lockout' && lockStatus.attempts >= 3) {
        notifyWhatsAppBackend({
          type: 'security_alert',
          attempts: lockStatus.attempts,
          timestamp: new Date().toISOString(),
          deviceId: DEVICE_ID,
          reason: `${lockStatus.attempts} percobaan gagal membuka kunci pintu`
        });
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
        let result;
        
        if (imageUrl) {
          // Send image with caption
          result = await gowa.sendImage(recipient, message, imageUrl, true);
        } else {
          // Send text only
          result = await gowa.sendText(recipient, message);
        }

        if (result.success) {
          console.log(`✅ WhatsApp sent to ${recipient}: ${result.messageId}`);
        } else {
          console.error(`❌ Failed to send WhatsApp to ${recipient}:`, result.error);
        }

        return result;
      } catch (error) {
        console.error(`❌ Error sending to ${recipient}:`, error.message);
        return { success: false, error: error.message };
      }
    });

    await Promise.all(sendPromises);
    
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error.message);
  }
}

export { TOPICS };
