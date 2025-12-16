# 🔧 ESP8266 Relay Always Active - Troubleshooting Guide

**Problem:** Relay aktif terus sejak WiFi connected, tidak bisa OFF

**Date:** December 14, 2025

---

## 🚨 GEJALA MASALAH

1. ❌ Relay **aktif terus** sejak WiFi setup selesai
2. ❌ Begitu WiFi connected → relay langsung ON
3. ❌ Bahkan setelah akses diterima/ditolak → tetap ON
4. ❌ Tidak bisa OFF sama sekali

---

## 🔍 DIAGNOSIS & PENYEBAB

### Kemungkinan 1: **RELAY_ACTIVE_LOW Setting Salah** ⚠️

**Cek di code line 60:**
```cpp
const bool RELAY_ACTIVE_LOW = true;  // Current setting
```

**Ada 2 jenis relay module:**

| Relay Type | Trigger | RELAY_ACTIVE_LOW | OFF State | ON State |
|------------|---------|------------------|-----------|----------|
| **Active LOW** (Most common) | LOW = ON | `true` | HIGH | LOW |
| **Active HIGH** (Rare) | HIGH = ON | `false` | LOW | HIGH |

**Cara Test:**
1. Upload code dengan `RELAY_ACTIVE_LOW = true`
2. Lihat relay saat boot
3. Kalau relay **ON saat boot** → setting **SALAH**
4. Ganti ke `RELAY_ACTIVE_LOW = false`

---

### Kemungkinan 2: **GPIO16 Boot State Issue** ⚠️

**GPIO16 (D0) pada ESP8266 memiliki karakteristik khusus:**
- Digunakan untuk **Deep Sleep Wake**
- Default state saat boot bisa **TIDAK STABIL**
- Kadang muncul **glitch** saat WiFi init

**Solusi yang sudah diterapkan:**
```cpp
pinMode(RELAY_PIN, OUTPUT);
digitalWrite(RELAY_PIN, HIGH); // Force explicit state
delay(100);                     // Wait for settling
relayOff();                     // Call function
```

---

### Kemungkinan 3: **Wiring/Hardware Issue** 🔌

**Cek koneksi fisik:**
```
ESP8266 D0 (GPIO16) → Relay IN
ESP8266 GND         → Relay GND  
ESP8266 VIN/5V      → Relay VCC
```

**Common Problems:**
- ❌ IN dan VCC terbalik
- ❌ GND tidak terhubung
- ❌ Relay module rusak/stuck
- ❌ Optocoupler relay butuh external power

**Test Hardware:**
```cpp
// Temporary test code di setup()
digitalWrite(RELAY_PIN, HIGH);
delay(2000);
digitalWrite(RELAY_PIN, LOW);
delay(2000);
digitalWrite(RELAY_PIN, HIGH);
```
Kalau relay TIDAK ON/OFF → hardware issue!

---

### Kemungkinan 4: **Code Logic Bug** 🐛

**SUDAH DICEK - TIDAK ADA BUG:**
- ✅ setupWiFi() → tidak ada relayOn()
- ✅ WiFiManager callback → tidak ada relayOn()
- ✅ setup() → explicit relayOff()
- ✅ loop() → hanya relayOn() kalau PIN benar

---

## ✅ FIX YANG SUDAH DITERAPKAN

### Fix #1: Explicit Relay Initialization
```cpp
// BEFORE (line 374)
pinMode(RELAY_PIN, OUTPUT);
relayOff();

// AFTER (with explicit HIGH before relayOff)
pinMode(RELAY_PIN, OUTPUT);
digitalWrite(RELAY_PIN, HIGH); // Force HIGH immediately
delay(100);                     // Wait for relay to settle
relayOff();                     // Then call function
```

**Mengapa ini penting:**
- `pinMode(OUTPUT)` bisa menyebabkan **glitch** sesaat
- Explicit `digitalWrite(HIGH)` memastikan state **stabil** sebelum logic
- `delay(100)` memberi waktu relay module untuk **settle**

### Fix #2: Serial Debug Output
```cpp
Serial.begin(115200);
Serial.println("[RELAY] OFF - Door LOCKED");   // Setiap relayOff()
Serial.println("[RELAY] ON - Door UNLOCKED");  // Setiap relayOn()
```

**Cara pakai:**
1. Upload code baru
2. Buka Serial Monitor (115200 baud)
3. Lihat output saat boot & WiFi connect
4. Cari apakah ada `[RELAY] ON` yang tidak seharusnya

---

## 🎯 LANGKAH TROUBLESHOOTING

### Step 1: Upload Code Baru & Monitor Serial

**Upload** `esp8266.ino` yang sudah di-update

**Buka Serial Monitor (115200 baud), perhatikan:**
```
========================================
ESP8266 Smart Door Lock - STARTING
========================================
[SETUP] LCD initialized
WiFi Setup...
WiFi Connected!
[SETUP] WiFi connected
[SETUP] IP: 192.168.1.100
[SETUP] MQTT: 3.27.0.139:1884
[SETUP] Keypad ready
[RELAY] OFF - Door LOCKED              ← HARUS ADA INI
[SETUP] Relay initialized - Door LOCKED
[SETUP] GPIO16 state: HIGH (OFF)       ← HARUS HIGH
========================================
READY - Waiting for input
========================================
```

**Cari tanda bahaya:**
- ❌ Tidak ada `[RELAY] OFF`
- ❌ Ada `[RELAY] ON` sebelum unlock
- ❌ GPIO16 state: LOW (seharusnya HIGH)

---

### Step 2: Cek Relay Fisik

**Saat boot, perhatikan:**
1. Apakah relay **klik** (bunyi)?
2. LED indikator relay **ON** atau **OFF**?
3. Lock solenoid **activated** atau **idle**?

**Expected behavior:**
- Boot → **KLIK** → Relay OFF → Lock terkunci
- Unlock → **KLIK** → Relay ON → Lock terbuka (3 detik)
- Auto lock → **KLIK** → Relay OFF → Lock terkunci lagi

---

### Step 3: Test RELAY_ACTIVE_LOW Setting

**Kalau relay tetap ON setelah boot:**

**Test 1: Ganti setting**
```cpp
// Line 60 - TRY THIS
const bool RELAY_ACTIVE_LOW = false;  // Change to false
```

**Upload & test:**
- Kalau relay jadi OFF → setting asli **salah**, pakai `false`
- Kalau relay tetap ON → bukan masalah setting

**Test 2: Manual control**
```cpp
// Di setup(), setelah pinMode(RELAY_PIN, OUTPUT):
Serial.println("Testing relay...");

digitalWrite(RELAY_PIN, LOW);
Serial.println("Set LOW - Relay should be ???");
delay(2000);

digitalWrite(RELAY_PIN, HIGH);
Serial.println("Set HIGH - Relay should be ???");
delay(2000);
```

Catat mana yang **ON** dan mana yang **OFF**.

---

### Step 4: Check Hardware Wiring

**Lepas kabel IN dari relay, test langsung:**

```cpp
// Upload test code
void setup() {
  Serial.begin(115200);
  pinMode(16, OUTPUT);
}

void loop() {
  Serial.println("HIGH");
  digitalWrite(16, HIGH);
  delay(2000);
  
  Serial.println("LOW");
  digitalWrite(16, LOW);
  delay(2000);
}
```

**Ukur voltase di GPIO16 dengan multimeter:**
- HIGH → should be **~3.3V**
- LOW → should be **~0V**

**Kalau voltase OK tapi relay tidak switch:**
- Relay module rusak
- Optocoupler butuh external power
- Wiring salah

---

### Step 5: Isolate WiFi Code

**Temporary test: Disable WiFi**
```cpp
void setup() {
  Serial.begin(115200);
  
  // COMMENT OUT WiFi
  // setupWiFi();
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  delay(100);
  relayOff();
  
  Serial.println("Relay initialized WITHOUT WiFi");
}

void loop() {
  // Empty - just test relay state
}
```

**Upload & observe:**
- Relay OFF → WiFi code ada masalah
- Relay ON → hardware/setting issue

---

## 🔧 SOLUSI BERDASARKAN HASIL TEST

### Scenario A: Serial Output Shows `[RELAY] ON` During Boot

**Penyebab:** Ada code yang memanggil `relayOn()` saat init

**Fix:** Cari di code mana ada `relayOn()` yang tidak seharusnya
```bash
# Search in code:
grep -n "relayOn()" esp8266.ino
```

Expected calls ONLY:
- Line 145: Remote unlock (dengan validasi PIN)
- Line 301: Keypad unlock (dengan validasi PIN)

---

### Scenario B: GPIO16 State Shows LOW When Should Be HIGH

**Penyebab:** `RELAY_ACTIVE_LOW` setting terbalik

**Fix:**
```cpp
const bool RELAY_ACTIVE_LOW = false;  // Change to false
```

---

### Scenario C: Relay Tidak Respond ke digitalWrite

**Penyebab:** Hardware issue

**Fix Options:**
1. **Ganti pin relay** ke GPIO lain (D1/D2/D5/D6/D7/D8)
   ```cpp
   const int RELAY_PIN = 5;  // D1 instead of D0
   ```

2. **External pull-up resistor** (10kΩ ke VCC)
   ```
   GPIO16 ----+---- Relay IN
              |
             10kΩ
              |
             VCC (3.3V)
   ```

3. **Ganti relay module** dengan yang compatible

---

### Scenario D: Relay OK di Test Code, Issue di Main Code

**Penyebab:** WiFiManager atau MQTT callback

**Fix:** Add more debug output
```cpp
void setupWiFi() {
  Serial.println("[WiFi] Starting setup...");
  WiFiManager wm;
  
  wm.setAPCallback([](WiFiManager *myWiFiManager) {
    Serial.println("[WiFi] Config portal started");
    Serial.print("[RELAY CHECK] State: ");
    Serial.println(digitalRead(RELAY_PIN));
    // ... rest of code
  });
  
  if (!wm.autoConnect("parcelbox-setup-lock", "smartbox123")) {
    Serial.println("[WiFi] Failed!");
    // ...
  }
  
  Serial.println("[WiFi] Connected!");
  Serial.print("[RELAY CHECK] State after WiFi: ");
  Serial.println(digitalRead(RELAY_PIN));
}
```

---

## 📋 CHECKLIST FINAL

Sebelum declare "FIXED", pastikan:

- [ ] Serial output shows `[RELAY] OFF - Door LOCKED` saat boot
- [ ] GPIO16 state = HIGH setelah setup
- [ ] Tidak ada `[RELAY] ON` yang unexpected
- [ ] Relay fisik bunyi "KLIK" saat boot (OFF)
- [ ] LED indikator relay = OFF
- [ ] Lock solenoid = inactive (terkunci)
- [ ] Test unlock dengan PIN → relay ON → auto OFF setelah 3 detik
- [ ] Test unlock via MQTT → relay ON → auto OFF setelah 3 detik

---

## 🆘 EMERGENCY WORKAROUND

**Kalau semua gagal, pakai pin lain:**

```cpp
// Change relay pin from D0 to D1
const int RELAY_PIN = 5;  // D1 (GPIO5) instead of D0 (GPIO16)
```

**GPIO16 memang tricky**, lebih aman pakai:
- D1 (GPIO5)
- D2 (GPIO4)  
- D5 (GPIO14)
- D6 (GPIO12)
- D7 (GPIO13)

---

## 📞 NEED HELP?

**Kirim info ini:**
1. Serial Monitor output (lengkap dari boot)
2. Foto wiring relay module
3. Hasil test manual digitalWrite HIGH/LOW
4. Model relay module yang dipakai

Good luck! 🚀
