# 🔴 CRITICAL: HC-SR04 ECHO Stuck HIGH - Wiring Diagnostic

## 📊 Your Issue Analysis

### Log Output:
```
[ULTRA-DEBUG] TRIG=0 ECHO=1, pulseIn timeout
                 ↑      ↑
              STUCK   STUCK
               LOW    HIGH
```

**This indicates a HARDWARE WIRING ERROR!**

---

## ⚠️ What ECHO=1 (Stuck HIGH) Means

**Normal Behavior:**
- ECHO should be LOW when idle
- ECHO goes HIGH only when ultrasonic pulse is detected
- ECHO returns to LOW after pulse ends

**Your Behavior:**
- ECHO is permanently HIGH (stuck at 3.3V or 5V)
- This prevents `pulseIn()` from detecting any pulse
- Sensor cannot function

---

## 🔍 Root Cause Analysis

### Scenario 1: **VCC Wire Connected to ECHO Pin** (Most Likely)

**Correct Wiring:**
```
HC-SR04          ESP32-CAM
─────────        ──────────
VCC   ──────►    5V pin
TRIG  ──────►    GPIO 14
ECHO  ──────►    [Voltage Divider] ──► GPIO 2
GND   ──────►    GND
```

**Your Possible Mistake:**
```
HC-SR04          ESP32-CAM
─────────        ──────────
VCC   ──────►    GPIO 2  ❌ (Should be 5V!)
TRIG  ──────►    GPIO 14
ECHO  ──────►    5V      ❌ (Should be voltage divider!)
GND   ──────►    GND
```

**Why This Happens:**
- HC-SR04 pins are often in this order: **VCC, TRIG, ECHO, GND**
- ESP32 GPIO pins are close together
- Easy to connect VCC to wrong pin

---

### Scenario 2: **Short Circuit in Breadboard**

**Problem:**
- Voltage divider resistors touching
- Breadboard rails connected incorrectly
- Jumper wire under breadboard causing short

**Check:**
```
ECHO pin ──► [2kΩ resistor] ──┬──► GPIO 2
                [1kΩ resistor] │
                      ↓        │
                     GND ──────┘

Make sure:
- 2kΩ and 1kΩ are NOT touching each other
- Junction point goes to GPIO 2
- 1kΩ goes to GND (not 5V!)
```

---

### Scenario 3: **Damaged HC-SR04 Module**

**Symptoms:**
- ECHO pin internally shorted to VCC
- Module physically damaged
- Static electricity damage

**Test:**
1. Disconnect ALL wires from HC-SR04
2. Use multimeter on ECHO pin
3. Should read: **0V or floating** (not 5V!)
4. If reads 5V without power → **Module is damaged**

---

## 🛠️ Step-by-Step Diagnostic

### Step 1: Power OFF Everything
```bash
1. Disconnect ESP32 from power
2. Remove all HC-SR04 wires
3. Visual inspection of pins
```

### Step 2: Identify HC-SR04 Pin Order
```
Front view of HC-SR04:
┌─────────────────┐
│   HC-SR04       │
│  ┌───┐   ┌───┐  │
│  │ T │   │ R │  │  ← Transmitter & Receiver
│  └───┘   └───┘  │
└─┬──┬──┬──┬──┬──┘
  │  │  │  │
  1  2  3  4

Pin 1: VCC  (Usually marked, or leftmost)
Pin 2: TRIG
Pin 3: ECHO
Pin 4: GND  (Usually marked, or rightmost)
```

**⚠️ CRITICAL:** Some modules have different orders!
- Check marking on PCB
- VCC is usually 5V or VIN
- GND is usually G or GND

### Step 3: Multimeter Test (Power OFF)
```
1. Set multimeter to continuity mode
2. Touch ECHO pin
3. Touch VCC pin
4. Should: NO CONTINUITY (beep)
5. If BEEPS → Short circuit detected!

Also test:
- ECHO to GND: Should be open
- ECHO to TRIG: Should be open
- VCC to GND: Should be open (good module)
```

### Step 4: Correct Wiring (Use This!)
```
HC-SR04 Pin    →  Connection
─────────────────────────────────────────
VCC            →  ESP32 5V pin

TRIG           →  ESP32 GPIO 14 (direct)

ECHO           →  2kΩ resistor
                  ↓
                  Junction ──► ESP32 GPIO 2
                  ↓
                  1kΩ resistor
                  ↓
                  GND

GND            →  ESP32 GND
```

**Visual Diagram:**
```
HC-SR04                    ESP32-CAM
┌───────┐                  ┌────────┐
│  VCC  │─────────────────►│   5V   │
│       │                  │        │
│ TRIG  │─────────────────►│ GPIO14 │
│       │                  │        │
│ ECHO  │──►[2kΩ]──┬──────►│ GPIO2  │
│       │    [1kΩ] │       │        │
│       │      ↓   │       │        │
│  GND  │─────┴────┴──────►│  GND   │
└───────┘                  └────────┘
```

### Step 5: Verify Voltage Divider
```
With ESP32 powered ON:
1. Measure voltage at ECHO pin: ~5V (when triggered)
2. Measure voltage at GPIO 2: ~1.67V to 3.3V (safe!)
3. If GPIO 2 reads 5V → Voltage divider MISSING or WRONG

Calculation:
Vout = 5V × 1kΩ / (2kΩ + 1kΩ)
     = 5V × 0.333
     = 1.67V ✓ (Safe for ESP32)
```

### Step 6: Upload Firmware v2.1.3
```
1. Upload latest firmware
2. Open Serial Monitor (115200 baud)
3. Watch boot sequence
4. Look for diagnostic messages
```

**Expected if working:**
```
[BOOT] Testing HC-SR04...
[BOOT] HC-SR04 OK (23.4 cm)
```

**Expected if ECHO stuck:**
```
[ULTRA-DEBUG] TRIG=0 ECHO=1, pulseIn timeout
[ULTRA-WARN] ECHO stuck HIGH! Check wiring:
  - Possible: VCC connected to ECHO instead of VCC pin
  - Possible: Short circuit or damaged sensor
```

---

## 🎯 Quick Fix Checklist

- [ ] **1. Disconnect all HC-SR04 wires**
- [ ] **2. Identify pin order** (VCC, TRIG, ECHO, GND)
- [ ] **3. Check with multimeter** (ECHO should be floating/0V)
- [ ] **4. If module OK, rewire correctly:**
  - [ ] VCC → ESP32 5V (NOT GPIO!)
  - [ ] TRIG → ESP32 GPIO 14
  - [ ] ECHO → 2kΩ → Junction → GPIO 2
  - [ ] ECHO → Junction → 1kΩ → GND
  - [ ] GND → ESP32 GND
- [ ] **5. Double-check voltage divider** (2kΩ + 1kΩ)
- [ ] **6. Upload firmware v2.1.3**
- [ ] **7. Test with Serial Monitor**
- [ ] **8. If still fails, replace HC-SR04 module**

---

## 🔧 Camera Issue (Secondary)

**Problem:** Second capture fails after first success

**Root Cause:** TCP connection not fully closed

**Fix in v2.1.3:**
- Added 100ms delay after `tcp.stop()`
- Increased retry delay to 500ms
- Camera should work after HC-SR04 is fixed

**Temporary Workaround:**
```bash
# Disable AI periodic check via MQTT
mosquitto_pub -h 3.27.0.139 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"aiCheck": {"disable": true}}'

# Manual capture only when needed
mosquitto_pub -h 3.27.0.139 -p 1883 \
  -u mcuzaman -P SimplePass123 \
  -t smartparcel/box-01/control \
  -m '{"capture": true}'
```

---

## 📞 Still Not Working?

### Option 1: Test Without Voltage Divider (⚠️ TEMPORARY ONLY)
```
**WARNING: This may damage ESP32 if ECHO outputs 5V!**

Only if you're SURE ECHO is 3.3V:
1. Connect ECHO directly to GPIO 2 (no resistors)
2. Test if sensor works
3. If works → Your voltage divider was wrong
4. IMMEDIATELY add proper divider back!
```

### Option 2: Use Different GPIO Pins
```cpp
// In esp32.ino, try different pins:
#define PIN_TRIG   12  // Changed from 14
#define PIN_ECHO   13  // Changed from 2

Note: May conflict with other peripherals
```

### Option 3: Replace HC-SR04
```
Buy a new HC-SR04 module
Some modules are 3.3V compatible (rare)
Test with multimeter first
```

---

## 📊 Success Indicators

**When properly fixed, you should see:**
```
[BOOT] Testing HC-SR04...
[BOOT] HC-SR04 OK (15.2 cm)
[ULTRA] 15.23 cm
[ULTRA] 15.19 cm
[ULTRA] 15.21 cm
[AI] Performing periodic AI check...
[AI] Frame captured: 13221 bytes
[AI] Result: NO PACKAGE (confidence: 85%, decision: no_package)
```

**NOT this:**
```
[ULTRA-DEBUG] TRIG=0 ECHO=1, pulseIn timeout  ❌
[ULTRA] NaN  ❌
```

---

**Version:** 2.1.3  
**Last Updated:** December 16, 2025  
**Status:** 🔴 **CRITICAL WIRING ERROR - MUST FIX HARDWARE**
