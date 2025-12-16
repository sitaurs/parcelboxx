# ESP32-CAM Firmware - VPS Backend Configuration

## ✅ Status: Ready to Flash

**Backend VPS**: `3.27.0.139:9090`  
**MQTT Broker**: `3.27.0.139:1883`  
**Last Updated**: December 16, 2025

---

## 🔧 Fixed Issues

### Compilation Error (v2.1.1)
✅ **Fixed**: `mqtt.publish()` StringSumHelper error
- **Problem**: `mqtt.publish(topic, String() + String(), false)` compilation error
- **Solution**: Convert to `const char*` using `.c_str()`
- **Location**: Line 540 in `performAICheck()`

### MQTT Configuration
✅ **Updated**: MQTT broker credentials
- **Port**: 1884 → **1883** (correct port)
- **Password**: `McuZaman#2025Aman!` → **`SimplePass123`**
- **Reason**: Match VPS backend configuration

---

## 📡 Backend Connection Settings

```cpp
// WiFi (via WiFiManager portal)
const char* WIFI_SSID = "ether-20-20-20-1";  // Fallback
const char* WIFI_PASS = "asdasdasd";          // Fallback

// MQTT Broker
const char* MQTT_HOST = "3.27.0.139";
const uint16_t MQTT_PORT = 1883;              // ✅ Fixed
const char* MQTT_USER = "mcuzaman";
const char* MQTT_PASSW = "SimplePass123";     // ✅ Updated

// HTTP API
const char* SERVER_HOST = "3.27.0.139";
const uint16_t SERVER_PORT = 9090;
const char* SERVER_PATH = "/api/v1/packages";
const char* AI_VERIFY_PATH = "/api/ai/verify-package";

// Device ID
const char* DEV_ID = "box-01";
```

---

## 🚀 Upload Firmware

### 1. Open Arduino IDE
```
File → Open → fw/esp32/esp32.ino
```

### 2. Configure Board
- **Board**: ESP32 Wrover Module (or AI Thinker ESP32-CAM)
- **Upload Speed**: 115200
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Partition Scheme**: Huge APP (3MB No OTA)

### 3. Install Libraries
Required libraries (Arduino Library Manager):
- **WiFiManager** by tzapu
- **PubSubClient** (MQTT client)
- **ESP32** board support (via Board Manager)

### 4. Upload
1. Connect ESP32-CAM via FTDI/USB programmer
2. Press **GPIO 0 (BOOT)** button while powering on (enter flash mode)
3. Click **Upload** in Arduino IDE
4. Wait for "Hard resetting via RTS pin..."
5. Press **RESET** button on ESP32-CAM

---

## 📶 WiFi Setup (First Boot)

### Auto WiFiManager Portal
1. **Power on ESP32-CAM** (without GPIO 0 pressed)
2. ESP32 will try saved WiFi credentials
3. If fails, creates AP: **`parcelbox-setup-cam`**
4. Connect to this AP with password: **`smartbox123`**
5. Open browser: `http://192.168.4.1`
6. Enter your WiFi SSID & password
7. Save & reboot

### Manual WiFi Reset
- **Hold GPIO 0 (BOOT) button** during power-on for 5 seconds
- LED will blink 5 times → WiFi settings cleared
- ESP32 will restart in AP mode

---

## 🔌 Hardware Connections

### ESP32-CAM AI-Thinker Pinout
```
HC-SR04 Ultrasonic:
├─ TRIG  → GPIO 14
└─ ECHO  → GPIO 2  (⚠️ USE 5V→3.3V DIVIDER!)

Relays:
├─ REL1  → GPIO 13  (Solenoid - Holder Release)
└─ REL2  → GPIO 15  (Buzzer)

Flash LED:
└─ FLASH → GPIO 4   (Camera LED)

Camera: AI-Thinker default pins (built-in)
```

**⚠️ CRITICAL**: GPIO 2 (ECHO) MUST use voltage divider!
- HC-SR04 outputs 5V
- ESP32 GPIO is 3.3V max
- Use 2K + 1K resistor divider

---

## 📊 MQTT Topics

### Publish (ESP32 → Backend)
```
smartparcel/box-01/status              # online/offline (LWT)
smartparcel/box-01/sensor/distance     # {"cm": 15.2}
smartparcel/box-01/event               # Various events
smartparcel/box-01/photo/status        # Photo upload status
smartparcel/box-01/control/ack         # Command acknowledgment
smartparcel/box-01/settings/cur        # Current settings
smartparcel/box-01/holder/release      # Holder released event
```

### Subscribe (Backend → ESP32)
```
smartparcel/box-01/control             # Device control commands
smartparcel/box-01/settings/set        # Update settings
smartparcel/box-01/baseline/trigger    # Baseline photo capture
```

---

## 🎛️ Control Commands (MQTT)

Send to topic: `smartparcel/box-01/control`

### Pipeline Control
```json
{"pipeline": {"stop": true}}              // Stop all operations
```

### Photo Capture
```json
{"capture": true}                         // Manual photo capture
```

### AI Periodic Check
```json
{"aiCheck": {"enable": true}}             // Enable AI checks
{"aiCheck": {"disable": true}}            // Disable AI checks
{"aiCheck": {"now": true}}                // Trigger AI check now
```

### Flash LED
```json
{"flash": {"on": true}}                   // Turn on flash
{"flash": {"off": true}}                  // Turn off flash
{"flash": {"pulse": true, "ms": 500}}     // Flash pulse 500ms
```

### Buzzer
```json
{"buzzer": {"stop": true}}                // Stop buzzer
{"buzzer": {"pulse": true, "ms": 3000}}   // Buzzer 3 seconds
```

### Holder Lock (Solenoid)
```json
{"lock": {"open": true}}                  // Release holder
{"lock": {"closed": true}}                // Lock holder
{"lock": {"pulse": true, "ms": 5000}}     // Pulse 5 seconds
```

---

## ⚙️ Settings Configuration

Send to topic: `smartparcel/box-01/settings/set`

```json
{
  "ultra": {
    "min": 12.0,        // Minimum detection distance (cm)
    "max": 25.0         // Maximum detection distance (cm)
  },
  "lock": {
    "ms": 5000          // Solenoid hold time (ms)
  },
  "buzzer": {
    "ms": 60000         // Buzzer duration (ms)
  }
}
```

**Limits**:
- Ultra: 5-50 cm (min), 10-50 cm (max)
- Lock: 0-60000 ms (0-60 seconds)
- Buzzer: 0-300000 ms (0-5 minutes)

---

## 🤖 AI Features

### Periodic AI Check
- **Default Interval**: 30 seconds (IDLE mode)
- **Adaptive**: Backend adjusts interval based on activity
- **Modes**: IDLE (30s), ACTIVE (15s), COOLDOWN (60s), BOOST (5s)
- **Trigger**: Ultrasonic acts as BOOST priority trigger

### Detection Pipeline
1. **HC-SR04 Detection** (12-25cm) → Boost AI check
2. **AI Verification** → Package confidence check
3. **High Confidence (≥70%)** → Trigger pipeline:
   - Wait 2-3s (random)
   - Capture photo
   - Upload to backend
   - Wait 1-2s (random)
   - Release holder (solenoid 5s)
   - Buzzer notification (60s)

### Baseline Capture
- Backend requests baseline via MQTT
- ESP32 captures current state
- Sends to AI for comparison learning
- Triggered after holder release

---

## 🔍 Troubleshooting

### ESP32 Won't Connect to WiFi
1. Check SSID/password in WiFiManager portal
2. Reset WiFi settings (hold GPIO 0 during boot)
3. Check WiFi signal strength
4. Monitor Serial: `115200 baud`

### MQTT Connection Failed
```
[WIFI] Got IP: 192.168.1.xxx  ✅
[MQTT] Connecting...           ✅
[MQTT] Connected               ✅ (Success)
```

If stuck at "Connecting...":
- Verify broker IP: `3.27.0.139`
- Verify port: `1883` (not 1884!)
- Check credentials: `mcuzaman` / `SimplePass123`
- Test manually: `mosquitto_pub -h 3.27.0.139 -p 1883 -u mcuzaman -P SimplePass123 -t test -m hi`

### Camera Init Failed
```
[ERR] Camera init FAILED!
```
**Solutions**:
1. Check camera ribbon cable connection
2. Ensure camera is AI-Thinker ESP32-CAM model
3. Power supply must be 5V 2A minimum
4. Brownout may occur with weak power

### Photo Upload Failed
```
[PHOTO] Upload failed attempt 1 (HTTP 401)
```
**Check**:
- Backend running: `curl http://3.27.0.139:9090/health`
- JWT token valid (expires Nov 2026)
- Network connectivity

### HC-SR04 Shows NaN
```
[ULTRA] NaN
```
**Check**:
- TRIG connected to GPIO 14
- ECHO connected to GPIO 2 **with voltage divider**
- 5V power to HC-SR04
- GND connected

---

## 📈 Serial Monitor Output

Expected output (115200 baud):
```
========================================
=== ESP32-CAM SmartParcel AIO ===
========================================
[BOOT] Starting initialization...
[BOOT] Initializing GPIO...
[BOOT] GPIO OK
[BOOT] Initializing Camera...
[BOOT] Camera OK
[BOOT] Starting WiFi...
[WIFIMGR] Attempting to connect to saved WiFi...
[WIFIMGR] Connected successfully!
[WIFI] IP: 192.168.1.123
[BOOT] WiFi OK
[BOOT] Connecting to MQTT...
[MQTT] Connected to broker
[MQTT] Subscribed to control topics
[BOOT] MQTT OK
========================================
[BOOT] System Ready!
========================================

[ULTRA] 23.45 cm
[ULTRA] 22.10 cm
[AI] Performing periodic AI check...
[AI] Result: NO PACKAGE (confidence: 85%, decision: no_package)
[AI] Mode: IDLE (interval: 30s)
```

---

## 🔐 Security Notes

- **JWT Token**: Valid until Nov 18, 2026
- **Device ID**: `box-01` (hardcoded)
- **MQTT User**: `mcuzaman` (authenticated)
- **WiFi Password**: Stored in ESP32 flash (encrypted by WiFiManager)

---

## 📦 Next Steps

1. **Flash Firmware** to ESP32-CAM
2. **Connect Hardware** (HC-SR04, relays)
3. **Configure WiFi** via WiFiManager portal
4. **Test MQTT** connection (check Serial Monitor)
5. **Verify Backend** receives distance data
6. **Test Pipeline** by placing object in detection range

---

**Version**: 2.1.1  
**Last Updated**: December 16, 2025  
**Git Commit**: `08cabbb`  
**Status**: ✅ **Ready for Production**
