// ===== Doorlock dgn RELAY (scanner manual + Remote Control via MQTT): ESP8266 NodeMCU v3 + Keypad 4x4 + LCD I2C =====
// Tidak memakai library Keypad. Kolom RX/TX hanya jadi input (aman).
// Relay diasumsikan AKTIF-LOW (IN=LOW -> menyala/buka). Ubah di RELAY_ACTIVE_LOW jika perlu.
// Fitur tambahan:
// - WiFi + MQTT untuk remote control dari PWA
// - PIN sync dari backend via MQTT
// - Remote unlock dengan validasi PIN

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP8266WiFi.h>
#include <WiFiManager.h> // https://github.com/tzapu/WiFiManager
#include <PubSubClient.h>
#include <ArduinoJson.h>

// ----------------- WiFi & MQTT Config -----------------
// WiFi credentials will be configured via WiFiManager portal
// Default fallback (optional - will use saved credentials first)
const char* ssid = "ether-20-20-20-1";
const char* password = "asdasdasd";
const char* mqtt_server = "3.27.0.139";  // MQTT Broker
const int mqtt_port = 1884;
const char* mqtt_user = "mcuzaman";  // MQTT authentication
const char* mqtt_pass = "McuZaman#2025Aman!";  // MQTT authentication

// MQTT Topics
const char* topic_control = "smartparcel/lock/control";  // Subscribe: receive unlock commands from PWA
const char* topic_status = "smartparcel/lock/status";    // Publish: lock status updates
const char* topic_pin_sync = "smartparcel/lock/pin";     // Subscribe: receive PIN updates from backend
const char* topic_alert = "smartparcel/lock/alert";      // Publish: security alerts (suspicious attempts)
const char* topic_settings = "smartparcel/lock/settings"; // Subscribe: receive settings updates from backend

WiFiClient espClient;
PubSubClient mqttClient(espClient);

unsigned long lastReconnectAttempt = 0;

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ----------------- Konfigurasi I2C / LCD -----------------
#define LCD_ADDR 0x27
LiquidCrystal_I2C lcd(LCD_ADDR, 16, 2);

// ----------------- Mapping Keypad (SAMA spt DIAG) --------
// Rows = D5(14), D6(12), D7(13), D8(15)  -> kita drive LOW satu-per-satu
const int ROWS_PINS[4] = {14, 12, 13, 15};
// Cols = RX(3), TX(1), D3(0), D4(2)      -> dibaca INPUT_PULLUP
const int COLS_PINS[4] = {3, 1, 0, 2};

const char KEYMAP[4][4] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

// ----------------- Relay -----------------
const int RELAY_PIN = 16;        // D0 (GPIO16) -> IN modul relay
const bool RELAY_ACTIVE_LOW = true;  // ganti ke false jika relay aktif-HIGH

inline void relayOff() { // pintu terkunci
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? HIGH : LOW);
  Serial.println("[RELAY] OFF - Door LOCKED");
}
inline void relayOn() {  // pintu terbuka
  digitalWrite(RELAY_PIN, RELAY_ACTIVE_LOW ? LOW : HIGH);
  Serial.println("[RELAY] ON - Door UNLOCKED");
}

// ----------------- Pengaturan Doorlock -------------------
String pinBenar = "432432";       // PIN default
String inputUser = "";          // buffer input
const byte maxLen = 8;          // panjang maksimum input

bool pintuTerbuka = false;
unsigned long tMulaiBuka = 0;
unsigned long durasiBuka = 3000; // 3 detik (can be updated via MQTT)

byte salahCount = 0;
bool lockout = false;
unsigned long tLockoutMulai = 0;
const unsigned long durasiLockout = 30000; // 30 detik - Lockout after failed attempts

// Removed deprecated SUBSTITUSI_1_D - use MQTT settings instead if keypad needs reconfiguration

// ----------------- WiFi & MQTT Functions -----------------
void setupWiFi() {
  delay(10);
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("WiFi Setup...");
  lcd.setCursor(0,1); lcd.print("Starting...");
  
  WiFiManager wm;
  
  // Reset settings for testing - comment out after first setup
  // wm.resetSettings();
  
  // Set custom AP name and password for config portal
  wm.setConfigPortalTimeout(180); // 3 minutes timeout
  wm.setAPCallback([](WiFiManager *myWiFiManager) {
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("Config Portal");
    lcd.setCursor(0,1); lcd.print(myWiFiManager->getConfigPortalSSID());
    delay(2000);
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("Connect to WiFi");
    lcd.setCursor(0,1); lcd.print("192.168.4.1");
  });
  
  // Auto-connect using saved credentials, or start config portal
  if (!wm.autoConnect("parcelbox-setup-lock", "smartbox123")) {
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("WiFi Failed!");
    lcd.setCursor(0,1); lcd.print("Restarting...");
    delay(3000);
    ESP.restart();
  }
  
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("WiFi Connected!");
  lcd.setCursor(0,1); lcd.print(WiFi.localIP());
  delay(1500);
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  // Parse JSON payload
  StaticJsonDocument<256> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  
  if (error) {
    return; // Invalid JSON, ignore
  }
  
  // Handle lock control command
  if (strcmp(topic, topic_control) == 0) {
    const char* action = doc["action"];
    const char* pin = doc["pin"];
    
    if (strcmp(action, "unlock") == 0 && pin != nullptr) {
      // Validate PIN before unlocking
      if (String(pin) == pinBenar) {
        // PIN correct, unlock door
        salahCount = 0;
        pintuTerbuka = true;
        tMulaiBuka = millis();
        relayOn();
        
        lcd.clear();
        lcd.setCursor(0,0); lcd.print("Remote Unlock");
        lcd.setCursor(0,1); lcd.print("Via PWA App");
        
        // Publish status
        publishLockStatus("unlocked", "remote");
      } else {
        // PIN incorrect, reject
        lcd.clear();
        lcd.setCursor(0,0); lcd.print("Remote Access");
        lcd.setCursor(0,1); lcd.print("DENIED - Bad PIN");
        delay(1500);
        tampilSiap();
        
        // Publish status
        publishLockStatus("locked", "remote_denied");
      }
    }
  }
  
  // Handle PIN sync from backend
  if (strcmp(topic, topic_pin_sync) == 0) {
    const char* newPin = doc["pin"];
    
    if (newPin != nullptr && strlen(newPin) >= 4 && strlen(newPin) <= 8) {
      // Update PIN
      pinBenar = String(newPin);
      
      lcd.clear();
      lcd.setCursor(0,0); lcd.print("PIN Updated!");
      lcd.setCursor(0,1); lcd.print("From Backend");
      delay(1500);
      tampilSiap();
      
      // Publish acknowledgment
      publishLockStatus("locked", "pin_updated");
    }
  }
  
  // Handle settings sync from backend
  if (strcmp(topic, topic_settings) == 0) {
    int ms = doc["ms"];
    
    if (ms >= 1000 && ms <= 30000) {
      // Update door open duration
      durasiBuka = ms;
      
      lcd.clear();
      lcd.setCursor(0,0); lcd.print("Settings Updated");
      lcd.setCursor(0,1); lcd.print("Duration: ");
      lcd.print(ms/1000);
      lcd.print("s");
      delay(1500);
      tampilSiap();
      
      // Publish acknowledgment
      publishLockStatus("locked", "settings_updated");
    }
  }
}

void publishLockStatus(const char* status, const char* method) {
  if (mqttClient.connected()) {
    StaticJsonDocument<128> doc;
    doc["status"] = status;
    doc["method"] = method;
    doc["timestamp"] = millis();
    
    char buffer[128];
    serializeJson(doc, buffer);
    mqttClient.publish(topic_status, buffer);
  }
}

bool reconnectMQTT() {
  if (mqttClient.connect("ESP8266_Lock", mqtt_user, mqtt_pass)) {
    // Subscribe to topics
    mqttClient.subscribe(topic_control);
    mqttClient.subscribe(topic_pin_sync);
    mqttClient.subscribe(topic_settings);  // NEW: Subscribe to settings
    
    // Publish online status
    publishLockStatus("locked", "online");
    
    return true;
  }
  return false;
}

// ----------------- UI helpers ----------------------------
void tampilSiap() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Masukkan Kode:");
  lcd.setCursor(0,1); lcd.print("#=OK  *=Clear  A=<-");
}
void info(const char* s, unsigned int tms=800) {
  lcd.clear(); lcd.setCursor(0,0); lcd.print(s); delay(tms);
}
void tampilInputMasked() {
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Kode: ");
  for (size_t i=0; i<inputUser.length(); i++) lcd.print('*');
  lcd.setCursor(0,1); lcd.print("#=OK  *=Clear  A=<-");
}
void tampilCountdownLockout() {
  unsigned long sisa = 0;
  if (millis() - tLockoutMulai < durasiLockout) {
    sisa = (durasiLockout - (millis() - tLockoutMulai) + 999) / 1000;
  }
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Terlalu banyak");
  lcd.setCursor(0,1); lcd.print("salah. Tunggu ");
  lcd.print(sisa); lcd.print("s");
}

// ----------------- Scanner Keypad Manual -----------------
bool anyKeyStillPressed() {
  for (int r=0; r<4; r++) {
    for (int rr=0; rr<4; rr++) pinMode(ROWS_PINS[rr], INPUT);
    pinMode(ROWS_PINS[r], OUTPUT);
    digitalWrite(ROWS_PINS[r], LOW);
    delayMicroseconds(200);
    for (int c=0; c<4; c++) {
      if (digitalRead(COLS_PINS[c]) == LOW) return true;
    }
  }
  return false;
}

char scanKeypadOnce() {
  for (int r=0; r<4; r++) {
    for (int rr=0; rr<4; rr++) pinMode(ROWS_PINS[rr], INPUT);
    pinMode(ROWS_PINS[r], OUTPUT);
    digitalWrite(ROWS_PINS[r], LOW);
    delayMicroseconds(250); // settle

    for (int c=0; c<4; c++) {
      pinMode(COLS_PINS[c], INPUT_PULLUP);
      if (digitalRead(COLS_PINS[c]) == LOW) {
        // tunggu release (debounce)
        while (anyKeyStillPressed()) { delay(15); }
        return KEYMAP[r][c];
      }
    }
  }
  return 0; // tidak ada tombol
}

// ----------------- Logika utama --------------------------
void cekPIN() {
  if (inputUser == pinBenar) {
    salahCount = 0;
    pintuTerbuka = true;
    tMulaiBuka = millis();
    relayOn();  // buka kunci
    lcd.clear();
    lcd.setCursor(0,0); lcd.print("Akses Diterima");
    lcd.setCursor(0,1); lcd.print("Pintu Terbuka");
    
    // Publish success status
    publishLockStatus("unlocked", "keypad_success");
  } else {
    salahCount++;
    info("Akses Ditolak!", 900);
    
    // Publish failed attempt
    if (mqttClient.connected()) {
      StaticJsonDocument<128> doc;
      doc["status"] = "locked";
      doc["method"] = "keypad_failed";
      doc["attempts"] = salahCount;
      doc["timestamp"] = millis();
      
      char buffer[128];
      serializeJson(doc, buffer);
      mqttClient.publish(topic_status, buffer);
    }
    
    if (salahCount >= 3) {
      lockout = true;
      tLockoutMulai = millis();
      
      // Publish lockout alert
      if (mqttClient.connected()) {
        StaticJsonDocument<128> doc;
        doc["status"] = "locked";
        doc["method"] = "keypad_lockout";
        doc["attempts"] = salahCount;
        doc["lockout_duration"] = durasiLockout / 1000;
        doc["timestamp"] = millis();
        
        char buffer[128];
        serializeJson(doc, buffer);
        mqttClient.publish(topic_status, buffer);
      }
    }
  }
  inputUser = "";
  if (!pintuTerbuka && !lockout) tampilSiap();
}

void setup() {
  // Serial untuk debugging
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println("ESP8266 Smart Door Lock - STARTING");
  Serial.println("========================================");
  
  // I2C: SDA=D2(GPIO4), SCL=D1(GPIO5)
  Wire.begin(4, 5);

  // LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0,0); lcd.print("Doorlock ESP8266");
  lcd.setCursor(0,1); lcd.print("WiFi + MQTT");
  delay(900);
  
  Serial.println("[SETUP] LCD initialized");
  
  // Setup WiFi
  setupWiFi();
  
  Serial.println("[SETUP] WiFi connected");
  Serial.print("[SETUP] IP: ");
  Serial.println(WiFi.localIP());
  
  // Setup MQTT
  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(mqttCallback);
  
  Serial.print("[SETUP] MQTT: ");
  Serial.print(mqtt_server);
  Serial.print(":");
  Serial.println(mqtt_port);
  
  tampilSiap();

  // Keypad default state
  for (int c=0; c<4; c++) pinMode(COLS_PINS[c], INPUT_PULLUP);
  for (int r=0; r<4; r++) pinMode(ROWS_PINS[r], INPUT);
  
  Serial.println("[SETUP] Keypad ready");

  // Relay - EXPLICIT INITIALIZATION
  pinMode(RELAY_PIN, OUTPUT);
  
  // CRITICAL FIX: Ensure relay is OFF immediately after pinMode
  digitalWrite(RELAY_PIN, HIGH); // Force HIGH (relay OFF if ACTIVE_LOW)
  delay(100); // Give relay module time to settle
  
  relayOff(); // pastikan terkunci saat start
  
  Serial.println("[SETUP] Relay initialized - Door LOCKED");
  Serial.print("[SETUP] GPIO16 state: ");
  Serial.println(digitalRead(RELAY_PIN) == HIGH ? "HIGH (OFF)" : "LOW (ON)");

  // (opsional) kecilkan durasiBuka kalau solenoid panas
  // durasiBuka = 1500;
  
  Serial.println("========================================");
  Serial.println("READY - Waiting for input");
  Serial.println("========================================\n");
}

void loop() {
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnectMQTT()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    mqttClient.loop();
  }
  
  // Lockout
  if (lockout) {
    if (millis() - tLockoutMulai < durasiLockout) {
      static unsigned long lastUpdate = 0;
      if (millis() - lastUpdate > 300) { lastUpdate = millis(); tampilCountdownLockout(); }
      return;
    } else {
      lockout = false; salahCount = 0; tampilSiap();
    }
  }

  // Pintu terbuka -> auto-tutup setelah durasi
  if (pintuTerbuka) {
    if (millis() - tMulaiBuka >= durasiBuka) {
      pintuTerbuka = false;
      relayOff(); // kunci lagi
      info("Pintu Terkunci", 700);
      
      // Publish status
      publishLockStatus("locked", "auto");
      
      tampilSiap();
    }
    return;
  }

  // Baca keypad
  char k = scanKeypadOnce();
  if (k) {
    #ifdef SUBSTITUSI_1_D
      if (k == 'D') k = '1';
    #endif

    if (k == '*') {                 // Clear semua
      inputUser = ""; info("Kode dihapus", 350); tampilSiap();
    }
    else if (k == 'A') {            // Backspace
      if (inputUser.length() > 0) inputUser.remove(inputUser.length()-1);
      tampilInputMasked();
    }
    else if (k == '#') {            // Cek PIN
      cekPIN();
      
      // Publish status
      if (pintuTerbuka) {
        publishLockStatus("unlocked", "keypad");
      } else {
        publishLockStatus("locked", "keypad_denied");
      }
    }
    else if (k >= '0' && k <= '9') {
      if (inputUser.length() < maxLen) inputUser += k;
      tampilInputMasked();
    }
    // B,C,D diabaikan (kecuali SUBSTITUSI_1_D aktif)
  }
}
