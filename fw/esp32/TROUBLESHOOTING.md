# ESP32-CAM Troubleshooting Guide

## 🔴 Common Issues & Solutions

### Issue 1: "[AI] Failed to capture frame"

**Symptoms:**
```
[AI] Performing periodic AI check...
[AI] Failed to capture frame
```

**Possible Causes:**
1. **Low Power Supply** ⚡
   - ESP32-CAM requires **5V 2A minimum**
   - Camera draws significant current during capture
   - USB power often insufficient

2. **Camera Busy/Locked** 📸
   - Previous capture not released
   - Camera in error state

3. **Camera Not Connected** 🔌
   - Ribbon cable loose
   - Camera module defective

**Solutions:**

✅ **Power Supply Fix:**
```
- Use external 5V 2A adapter (NOT USB)
- Add 470µF capacitor near 5V pin
- Check voltage under load: must stay > 4.8V
```

✅ **Software Fix (v2.1.2):**
- Firmware now has **3 retry attempts**
- Increased delay between captures (100ms)
- Flash LED kept on longer for better lighting

✅ **Hardware Check:**
```
1. Power off ESP32
2. Disconnect camera ribbon cable
3. Reconnect firmly (blue side to camera module)
4. Check camera module LED lights up when powered
5. Power on and check Serial Monitor
```

✅ **Test via MQTT:**
```bash
# Send diagnostic command
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"diagnostic": true}'

# Response will show camera status: "OK" or "FAIL"
```

---

### Issue 2: "[ULTRA] NaN" (HC-SR04 Not Working)

**Symptoms:**
```
[ULTRA] NaN
[ULTRA] NaN
[ULTRA] NaN
```

**Possible Causes:**
1. **Missing Voltage Divider** ⚠️ **CRITICAL**
   - ECHO pin outputs 5V
   - ESP32 GPIO is 3.3V max
   - **Direct connection will damage ESP32!**

2. **Wiring Error** 🔌
   - Wrong GPIO pins
   - Loose connections
   - No power to HC-SR04

3. **Sensor Defective** 💔
   - HC-SR04 module broken
   - Transducers damaged

**Solutions:**

✅ **Correct Wiring (MUST HAVE VOLTAGE DIVIDER):**
```
HC-SR04          ESP32-CAM
─────────────    ──────────────
VCC    ────────► 5V
TRIG   ────────► GPIO 14
                           
ECHO   ────────► [2kΩ] ──┬─► GPIO 2
                  [1kΩ]  │
                    │    │
                   GND ──┘

GND    ────────► GND
```

**Voltage Divider Calculation:**
```
Vout = Vin × R2 / (R1 + R2)
     = 5V × 1kΩ / (2kΩ + 1kΩ)
     = 5V × 0.333
     = 1.67V to 3.3V (safe for ESP32)
```

✅ **Test Hardware:**
```
1. Measure voltage on ECHO pin: should be 5V (no load)
2. Measure voltage after divider: should be ~1.67V to 3.3V
3. Check TRIG signal with oscilloscope/LED
4. Test with known-working HC-SR04 module
```

✅ **Firmware Debug (v2.1.2):**
```
[ULTRA-DEBUG] TRIG=0 ECHO=0, pulseIn timeout
                ↑      ↑
             Should    Should
             pulse     respond
```

If ECHO stays 0:
- Voltage divider missing/broken
- ECHO pin not connected
- HC-SR04 not powered

If TRIG doesn't pulse:
- GPIO 14 not connected
- ESP32 pin damaged

✅ **Test via MQTT:**
```bash
# Run diagnostic
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"diagnostic": true}'

# Response includes:
# "ultrasonic": "OK" or "FAIL"
# "distance": 15.2 or null
```

---

### Issue 3: WiFi Connection Failed

**Symptoms:**
```
[WIFI] Disconnected: reason=NO_AP_FOUND
[WIFI] Reconnect requested
```

**Solutions:**

✅ **Reset WiFi Settings:**
```
1. Hold GPIO 0 (BOOT button) during power-on
2. Wait for LED to blink 5 times
3. Release button
4. ESP32 creates AP: "parcelbox-setup-cam"
5. Connect with password: "smartbox123"
6. Navigate to http://192.168.4.1
7. Enter WiFi credentials
```

✅ **Check WiFi Signal:**
```
- ESP32-CAM must be within 10m of router
- 2.4GHz WiFi only (NOT 5GHz)
- SSID must be visible (not hidden)
```

---

### Issue 4: MQTT Connection Failed

**Symptoms:**
```
[BOOT] Connecting to MQTT...
(stuck here forever)
```

**Solutions:**

✅ **Check MQTT Credentials:**
```cpp
const char* MQTT_HOST = "3.27.11.106";
const uint16_t MQTT_PORT = 1883;  // NOT 1884!
const char* MQTT_USER = "mcuzaman";
const char* MQTT_PASSW = "SimplePass123";
```

✅ **Test MQTT Broker:**
```bash
# From VPS or PC
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t test -m "hello"

# Should succeed without errors
```

✅ **Check Firewall:**
```bash
# On VPS
sudo ufw status
# Port 1883 must be open for MQTT
```

---

### Issue 5: Photo Upload Failed (HTTP Error)

**Symptoms:**
```
[PHOTO] Upload failed attempt 1 (HTTP 401)
[PHOTO] Upload failed attempt 2 (HTTP 401)
```

**Solutions:**

✅ **Check Backend:**
```bash
curl http://3.27.11.106:9090/health
# Should return: {"status":"ok"...}
```

✅ **Check JWT Token:**
```cpp
// In esp32.ino - valid until Nov 18, 2026
const char* API_BEARER = "eyJhbGci...";
```

✅ **Check Network:**
```
- ESP32 can ping gateway
- Gateway can route to 3.27.11.106
- No firewall blocking port 9090
```

---

## 🛠 Diagnostic Commands (via MQTT)

### Run Full Diagnostic
```bash
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"diagnostic": true}'
```

**Response:**
```json
{
  "ok": true,
  "action": "diagnostic",
  "camera": "OK",
  "ultrasonic": "OK",
  "distance": 15.2,
  "wifi": "OK",
  "mqtt": "OK",
  "freeHeap": 156234
}
```

### Manual Photo Capture
```bash
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"capture": true}'
```

### Flash LED Test
```bash
# Turn on
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"flash": {"on": true}}'

# Turn off
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"flash": {"off": true}}'
```

### Buzzer Test
```bash
mosquitto_pub -h 3.27.11.106 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"buzzer": {"pulse": true, "ms": 2000}}'
```

---

## 📊 Serial Monitor Debug Output

### Expected Boot Sequence
```
========================================
=== ESP32-CAM SmartParcel AIO ===
========================================
[BOOT] Starting initialization...
[BOOT] Initializing GPIO...
[BOOT] GPIO OK
[BOOT] Initializing Camera...
[BOOT] Camera OK
[BOOT] Testing camera...
[BOOT] Camera test OK (12345 bytes)    ← Should see this!
[BOOT] Testing HC-SR04...
[BOOT] HC-SR04 OK (23.4 cm)            ← Should see this!
[BOOT] Starting WiFi...
[WIFIMGR] Attempting to connect...
[WIFIMGR] Connected successfully!
[WIFI] IP: 192.168.1.123
[BOOT] WiFi OK
[BOOT] Connecting to MQTT...
[MQTT] Connected to broker
[BOOT] MQTT OK
========================================
[BOOT] System Ready!
========================================
```

### Camera Test Failed
```
[BOOT] Testing camera...
[WARN] Camera test failed, but continuing...
                ↑
         Check power supply!
         Check camera connection!
```

### HC-SR04 Test Failed
```
[BOOT] Testing HC-SR04...
[WARN] HC-SR04 not responding!
[WARN] Check connections:
  - TRIG -> GPIO 14
  - ECHO -> GPIO 2 (via 5V->3.3V divider!)
  - VCC  -> 5V
  - GND  -> GND
           ↑
    CRITICAL: Must have voltage divider!
```

### Runtime Debugging (Every 5 seconds if failing)
```
[ULTRA-DEBUG] TRIG=0 ECHO=0, pulseIn timeout
              ↑         ↑
          GPIO 14    GPIO 2
         (should    (should
          pulse)     respond)
```

---

## 🔧 Hardware Checklist

### Power Supply
- [ ] **5V 2A** external adapter (NOT USB)
- [ ] Voltage under load: **> 4.8V**
- [ ] 470µF capacitor near 5V pin (optional but recommended)

### Camera Module
- [ ] Ribbon cable connected firmly
- [ ] Blue side facing camera module
- [ ] Camera LED lights up when powered
- [ ] Test capture successful in setup()

### HC-SR04 Connections
- [ ] **VCC** → 5V pin
- [ ] **TRIG** → GPIO 14
- [ ] **ECHO** → **VOLTAGE DIVIDER** → GPIO 2
  - [ ] 2kΩ resistor from ECHO to GPIO 2
  - [ ] 1kΩ resistor from GPIO 2 to GND
- [ ] **GND** → GND
- [ ] Test reading successful in setup()

### Relays
- [ ] REL1 (Solenoid) → GPIO 13
- [ ] REL2 (Buzzer) → GPIO 15
- [ ] Relay VCC → 5V
- [ ] Relay GND → GND

### WiFi
- [ ] 2.4GHz network (NOT 5GHz)
- [ ] SSID visible (not hidden)
- [ ] Within 10m of router
- [ ] Password correct

### MQTT
- [ ] Broker IP: **3.27.11.106**
- [ ] Port: **1883** (NOT 1884)
- [ ] User: **mcuzaman**
- [ ] Password: **SimplePass123**

---

## 📞 Quick Fixes Summary

| Symptom | Quick Fix |
|---------|-----------|
| Camera fails | Check **5V 2A** power, add capacitor |
| HC-SR04 NaN | Check **voltage divider** (2kΩ + 1kΩ) |
| WiFi failed | Reset with **GPIO 0 button** during boot |
| MQTT failed | Verify port **1883**, password **SimplePass123** |
| Upload failed | Check backend: `curl http://3.27.11.106:9090/health` |

---

**Version**: 2.1.2  
**Last Updated**: December 16, 2025  
**Status**: Enhanced debugging & diagnostics
