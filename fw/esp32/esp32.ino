// ===== ESP32-CAM SmartParcel - Package Detection with Gemini AI =====
// Hardware: ESP32-CAM AI-Thinker + HC-SR04 + 2x Relay (Solenoid + Buzzer)
// Features:
// - Ultrasonic detection (HC-SR04)
// - Photo capture & upload
// - Gemini AI verification
// - Auto holder release after photo
// - Buzzer notification

#include <WiFi.h>
#include <WiFiManager.h> // https://github.com/tzapu/WiFiManager
#include <PubSubClient.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <limits.h>  // untuk LONG_MIN
#include "esp_wifi.h" // esp_wifi_connect() & reason codes

// ===================== WIFI & MQTT CONFIG =====================
// WiFi credentials will be configured via WiFiManager portal
// Default fallback (optional - will use saved credentials first)
const char* WIFI_SSID = "ether-20-20-20-1";
const char* WIFI_PASS = "asdasdasd";

const char* MQTT_HOST = "3.27.11.106";
const uint16_t MQTT_PORT = 1883;
const char* MQTT_USER = "mcuzaman";
const char* MQTT_PASSW = "SimplePass123";

// Device/Topics
const char* DEV_ID = "box-01";
String T_STATUS   = String("smartparcel/")+DEV_ID+"/status";
String T_DIST     = String("smartparcel/")+DEV_ID+"/sensor/distance";
String T_EVENT    = String("smartparcel/")+DEV_ID+"/event";
String T_PHSTAT   = String("smartparcel/")+DEV_ID+"/photo/status";
String T_CTRL     = String("smartparcel/")+DEV_ID+"/control";
String T_CTRLACK  = String("smartparcel/")+DEV_ID+"/control/ack";
String T_SETSET   = String("smartparcel/")+DEV_ID+"/settings/set";
String T_SETCUR   = String("smartparcel/")+DEV_ID+"/settings/cur";
String T_SETACK   = String("smartparcel/")+DEV_ID+"/settings/ack";

// Baseline photo topics for AI comparison
String T_BASELINE_TRIGGER = String("smartparcel/")+DEV_ID+"/baseline/trigger";
String T_BASELINE_PHOTO   = String("smartparcel/")+DEV_ID+"/baseline/photo";
String T_HOLDER_RELEASE   = String("smartparcel/")+DEV_ID+"/holder/release";

// Backend HTTP (RAW TCP hemat RAM)
const char* SERVER_HOST = "3.27.11.106";
const uint16_t SERVER_PORT = 9090;
const char* SERVER_PATH = "/api/v1/packages";
const char* AI_VERIFY_PATH = "/api/ai/verify-package"; // AI verification endpoint
// DEVICE JWT TOKEN (Valid 1 year - Generated Nov 18, 2025)
const char* API_BEARER  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6ImJveC0wMSIsInR5cGUiOiJkZXZpY2UiLCJpYXQiOjE3NjM0ODAzODUsImV4cCI6MTc5NTAxNjM4NX0.FxB_a-HtRR9ROks0cPVtesRObQqAUDYbOSB3590g4sM";

// ===================== PIN ESP32-CAM (AI-Thinker) =====================
// HC-SR04
#define PIN_TRIG   14
#define PIN_ECHO    2   // WAJIB divider 5V->3V3 ke pin ini
// Relay
#define PIN_REL1   13   // solenoid (holder release)
#define PIN_REL2   15   // buzzer (via relay/MOSFET)
// Flash LED
#define PIN_FLASH   4   // LED flash kamera

// Kamera pins (AI-Thinker default)
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// ===================== GLOBALS & TYPES =====================
WiFiClient tcp;
PubSubClient mqtt(tcp);
const bool RELAY_ACTIVE_LOW = true;

struct Settings {
  float     minCm   = 12.0f;
  float     maxCm   = 25.0f;
  uint32_t  lockMs  = 5000;
  uint32_t  buzzerMs= 60000;
  uint16_t  buzzOn  = 500;
  uint16_t  buzzOff = 300;
} S;

bool busy = false;
volatile bool stopAll = false;
volatile bool stopBuzz = false;
volatile bool stopLock = false;

unsigned long tLastPub = 0;
unsigned long lastPipeline = 0;
unsigned long lastHolderRelease = 0;
const unsigned long PIPELINE_COOLDOWN_MS = 15000;
const unsigned long HOLDER_SAFE_AREA_MS = 15000;
float lastCm = NAN;

// AI Periodic Check Variables
unsigned long lastAICheck = 0;
unsigned long aiCheckInterval = 60000; // Default 60 detik (IDLE mode) - increased for camera stability
bool aiCheckEnabled = true; // Flag untuk enable/disable AI periodic check
String lastAIMode = "IDLE"; // Track current AI mode (IDLE/ACTIVE/COOLDOWN/BOOST)
int consecutiveCameraFailures = 0; // Track consecutive camera failures
const int MAX_CAMERA_FAILURES = 3; // Disable AI after 3 failures

// Detection Mode: "FULL_HCSR" = only ultrasonic, "FULL_GEMINI" = only AI, "BOTH" = both (default)
String detectionMode = "BOTH";

// Timing constants
const uint32_t PHOTO_DELAY_MIN_MS = 2000;
const uint32_t PHOTO_DELAY_MAX_MS = 3000;
const uint32_t LOCK_DELAY_MIN_MS  = 1000;
const uint32_t LOCK_DELAY_MAX_MS  = 2000;

struct UploadResult { bool ok; int http; String body; };

// ===================== WIFI STATE (PATCH) =====================
bool wifiStarted = false;
unsigned long lastReconnectTry = 0;
const unsigned long RECONNECT_COOLDOWN = 10000;

static const char* reasonStr(wifi_err_reason_t r){
  switch(r){
    case WIFI_REASON_NO_AP_FOUND: return "NO_AP_FOUND";
    case WIFI_REASON_AUTH_EXPIRE:
    case WIFI_REASON_AUTH_FAIL:   return "AUTH_FAIL";
    case WIFI_REASON_ASSOC_EXPIRE:return "ASSOC_EXPIRE";
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "HANDSHAKE_TIMEOUT";
    case WIFI_REASON_BEACON_TIMEOUT: return "BEACON_TIMEOUT";
    default: return "OTHER";
  }
}

void WiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info){
  switch(event){
    case ARDUINO_EVENT_WIFI_STA_START:
      Serial.println("[WIFI] STA start");
      break;
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.printf("[WIFI] Connected to SSID '%s'\n", WIFI_SSID);
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      Serial.printf("[WIFI] Got IP: %s\n", WiFi.localIP().toString().c_str());
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED: {
      auto r = static_cast<wifi_err_reason_t>(info.wifi_sta_disconnected.reason);
      Serial.printf("[WIFI] Disconnected: reason=%d (%s)\n", r, reasonStr(r));
      if (millis() - lastReconnectTry > RECONNECT_COOLDOWN){
        lastReconnectTry = millis();
        esp_wifi_connect();
        Serial.println("[WIFI] Reconnect requested");
      }
      break;
    }
    default: break;
  }
}

// Tombol reset WiFi - Tahan GPIO 0 (BOOT button) saat power on untuk reset WiFi
#define WIFI_RESET_PIN 0  // GPIO0 = BOOT button pada ESP32-CAM

bool shouldResetWiFi() {
  pinMode(WIFI_RESET_PIN, INPUT_PULLUP);
  delay(100);
  // Jika tombol BOOT ditekan saat startup (LOW), reset WiFi
  if (digitalRead(WIFI_RESET_PIN) == LOW) {
    Serial.println("[WIFIMGR] BOOT button pressed - Will reset WiFi settings!");
    // Tunggu sampai tombol dilepas
    unsigned long pressStart = millis();
    while (digitalRead(WIFI_RESET_PIN) == LOW && millis() - pressStart < 5000) {
      delay(100);
    }
    return true;
  }
  return false;
}

void startWiFiOnce(){
  if (wifiStarted) return;
  wifiStarted = true;

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.onEvent(WiFiEvent);
  
  // WiFiManager with custom portal name
  WiFiManager wm;
  
  // Cek apakah perlu reset WiFi (tombol BOOT ditekan saat startup)
  if (shouldResetWiFi()) {
    Serial.println("[WIFIMGR] Resetting WiFi settings...");
    wm.resetSettings();
    delay(1000);
  }
  
  // Set custom AP name and password for config portal
  wm.setConfigPortalTimeout(300); // 5 minutes timeout
  wm.setConnectTimeout(30); // 30 detik timeout untuk connect ke WiFi
  
  wm.setAPCallback([](WiFiManager *myWiFiManager) {
    Serial.println("");
    Serial.println("╔══════════════════════════════════════════╗");
    Serial.println("║     WiFi SETUP MODE - Config Portal      ║");
    Serial.println("╠══════════════════════════════════════════╣");
    Serial.print("║  SSID: ");
    Serial.print(myWiFiManager->getConfigPortalSSID());
    Serial.println("          ║");
    Serial.println("║  Password: smartbox123                   ║");
    Serial.println("║  IP: 192.168.4.1                         ║");
    Serial.println("╚══════════════════════════════════════════╝");
    Serial.println("");
    
    // Kedipkan flash LED untuk indikasi mode setup
    for(int i=0; i<5; i++) {
      digitalWrite(PIN_FLASH, HIGH); delay(200);
      digitalWrite(PIN_FLASH, LOW); delay(200);
    }
  });
  
  Serial.println("[WIFIMGR] Attempting to connect to saved WiFi...");
  
  // Auto-connect using saved credentials, or start config portal
  if (!wm.autoConnect("parcelbox-setup-cam", "smartbox123")) {
    Serial.println("[WIFIMGR] Failed to connect after timeout, restarting...");
    delay(3000);
    ESP.restart();
  }
  
  Serial.println("[WIFIMGR] Connected successfully!");
  Serial.printf("[WIFI] IP: %s\n", WiFi.localIP().toString().c_str());
}

// biarkan kosong (hindari begin() berulang)
void ensureWiFi(){}

// ===================== UTIL =====================
inline void relayWrite(uint8_t pin, bool on){
  if (RELAY_ACTIVE_LOW) digitalWrite(pin, on ? LOW : HIGH);
  else                  digitalWrite(pin, on ? HIGH : LOW);
}
inline void flashOn(bool on){ pinMode(PIN_FLASH, OUTPUT); digitalWrite(PIN_FLASH, on ? HIGH : LOW); }

bool breatheDelayCancelable(unsigned long ms){
  unsigned long start = millis();
  while (millis()-start < ms){
    if (stopAll) return false;
    if (mqtt.connected()) mqtt.loop();
    delay(5);
  }
  return true;
}

float ultraOne(uint32_t tout=40000UL){
  // Ensure TRIG starts LOW
  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(10);  // Increased from 5us
  
  // Send 10us HIGH pulse
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  // Wait for response on ECHO pin
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, tout);
  
  if (!dur || dur == 0) {
    // Debug: Check if ECHO pin is working - reduced spam (every 30s instead of 5s)
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 30000) {
      int trigState = digitalRead(PIN_TRIG);
      int echoState = digitalRead(PIN_ECHO);
      Serial.printf("[ULTRA-DEBUG] TRIG=%d ECHO=%d, pulseIn timeout\n", trigState, echoState);
      
      // Additional diagnostic
      if (echoState == HIGH) {
        Serial.println("[ULTRA-WARN] ECHO stuck HIGH! Sensor not connected or wiring error");
      }
      
      lastDebug = millis();
    }
    return NAN;
  }
  return dur * 0.0343f / 2.0f;
}
float ultraCmStable(){
  float a=ultraOne(); delay(25);
  float b=ultraOne(); delay(25);
  float c=ultraOne();
  float v[3]={a,b,c};
  for(int i=0;i<3;i++) for(int j=i+1;j<3;j++) if (v[j]<v[i]){ float t=v[i]; v[i]=v[j]; v[j]=t; }
  int nanCnt=(isnan(a)?1:0)+(isnan(b)?1:0)+(isnan(c)?1:0);
  if (nanCnt>=2) return NAN;
  return v[1];
}

// ===================== HTTP MULTIPART (RAW TCP) =====================
UploadResult httpUploadMultipart(const String& metaJson, const uint8_t* img, size_t len){
  UploadResult r{false, 0, ""};
  String boundary="----parcelboxBoundary7e3f9b";
  String head = "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"meta\"\r\n"
    "Content-Type: application/json\r\n\r\n"+metaJson+"\r\n"
    "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"photo\"; filename=\"capture.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--"+boundary+"--\r\n";
  size_t contentLen = head.length()+len+tail.length();

  if (!tcp.connect(SERVER_HOST, SERVER_PORT)){ r.ok=false; r.http=0; return r; }

  tcp.print(String("POST ")+SERVER_PATH+" HTTP/1.1\r\n");
  tcp.print(String("Host: ")+SERVER_HOST+":"+SERVER_PORT+"\r\n");
  tcp.print("Connection: close\r\n");
  tcp.print(String("Authorization: Bearer ")+API_BEARER+"\r\n");
  tcp.print(String("Content-Type: multipart/form-data; boundary=")+boundary+"\r\n");
  tcp.print(String("Content-Length: ")+contentLen+"\r\n\r\n");

  tcp.print(head);
  tcp.write(img, len);
  tcp.print(tail);

  unsigned long t0=millis(); String statusLine="";
  while (tcp.connected() && millis()-t0<30000){
    if (tcp.available()){ statusLine = tcp.readStringUntil('\n'); break; }
    delay(10);
  }
  if (statusLine.length() < 12){ tcp.stop(); r.ok=false; r.http=0; return r; }
  r.http = statusLine.substring(9,12).toInt();
  r.ok = (r.http>=200 && r.http<300);

  while (tcp.connected()){
    String h = tcp.readStringUntil('\n');
    if (h == "\r" || h.length()==0) break;
  }
  while (tcp.connected() || tcp.available()){
    if (tcp.available()){ r.body += (char)tcp.read(); }
    else delay(1);
  }
  tcp.stop();
  return r;
}

// ===================== AI VERIFICATION (MULTIPART) =====================
UploadResult httpAIVerify(const uint8_t* img, size_t len, const char* reason, float cm, bool ultrasonicTriggered){
  UploadResult r{false, 0, ""};
  String boundary="----aiVerifyBoundary8f4a2c";
  
  // Prepare form fields
  String formFields = "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"deviceId\"\r\n\r\n"+String(DEV_ID)+"\r\n"
    "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"reason\"\r\n\r\n"+String(reason)+"\r\n";
  
  if (!isnan(cm)) {
    formFields += "--"+boundary+"\r\n"
      "Content-Disposition: form-data; name=\"distance\"\r\n\r\n"+String(cm,1)+"\r\n";
  }
  
  formFields += "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"ultrasonicTriggered\"\r\n\r\n"+(ultrasonicTriggered?"true":"false")+"\r\n";
  
  String imageHead = "--"+boundary+"\r\n"
    "Content-Disposition: form-data; name=\"image\"; filename=\"check.jpg\"\r\n"
    "Content-Type: image/jpeg\r\n\r\n";
  
  String tail = "\r\n--"+boundary+"--\r\n";
  
  size_t contentLen = formFields.length() + imageHead.length() + len + tail.length();

  if (!tcp.connect(SERVER_HOST, SERVER_PORT)){ r.ok=false; r.http=0; return r; }

  tcp.print(String("POST ")+AI_VERIFY_PATH+" HTTP/1.1\r\n");
  tcp.print(String("Host: ")+SERVER_HOST+":"+SERVER_PORT+"\r\n");
  tcp.print("Connection: close\r\n");
  tcp.print(String("Authorization: Bearer ")+API_BEARER+"\r\n");
  tcp.print(String("Content-Type: multipart/form-data; boundary=")+boundary+"\r\n");
  tcp.print(String("Content-Length: ")+contentLen+"\r\n\r\n");

  tcp.print(formFields);
  tcp.print(imageHead);
  tcp.write(img, len);
  tcp.print(tail);

  unsigned long t0=millis(); String statusLine="";
  while (tcp.connected() && millis()-t0<30000){
    if (tcp.available()){ statusLine = tcp.readStringUntil('\n'); break; }
    delay(10);
  }
  if (statusLine.length() < 12){ tcp.stop(); r.ok=false; r.http=0; return r; }
  r.http = statusLine.substring(9,12).toInt();
  r.ok = (r.http>=200 && r.http<300);

  while (tcp.connected()){
    String h = tcp.readStringUntil('\n');
    if (h == "\r" || h.length()==0) break;
  }
  while (tcp.connected() || tcp.available()){
    if (tcp.available()){ r.body += (char)tcp.read(); }
    else delay(1);
  }
  tcp.stop();
  
  // Ensure connection fully closed before camera can be used again
  // Increased delay to prevent camera busy issue
  delay(300);
  
  // Force WiFi client cleanup
  tcp.flush();
  
  return r;
}

// ===================== JSON HELPERS =====================
long extractJsonLong(const String& body, const char* key){
  String k = String("\"")+key+"\":";
  int p = body.indexOf(k); if (p<0) return LONG_MIN;
  p += k.length();
  while (p < (int)body.length() && (body[p]==' ')) p++;
  int q=p;
  while (q < (int)body.length() && ( (body[q]>='0'&&body[q]<='9') || body[q]=='-' ) ) q++;
  if (q==p) return LONG_MIN;
  return body.substring(p,q).toInt();
}
String extractJsonString(const String& body, const char* key){
  String k = String("\"")+key+"\":";
  int p = body.indexOf(k); if (p<0) return String("");
  p += k.length();
  while (p < (int)body.length() && (body[p]==' ')) p++;
  if (p >= (int)body.length() || body[p] != '\"') return String("");
  p++; int q=p;
  while (q < (int)body.length() && body[q] != '\"') q++;
  if (q>= (int)body.length()) return String("");
  return body.substring(p,q);
}
bool extractJsonBool(const String& body, const char* key){
  String k = String("\"")+key+"\":";
  int p = body.indexOf(k); if (p<0) return false;
  p += k.length();
  while (p < (int)body.length() && (body[p]==' ')) p++;
  if (p+4 <= (int)body.length() && body.substring(p, p+4) == "true") return true;
  return false;
}

// ===================== CAPTURE + UPLOAD =====================
bool captureAndUploadWithRetry(const char* reason, float cm){
  const int MAX_TRY = 5;
  for (int attempt=1; attempt<=MAX_TRY; ++attempt){
    if (stopAll) return false;
    flashOn(true); delay(80);
    camera_fb_t* fb = esp_camera_fb_get();
    flashOn(false);

    if (!fb){
      mqtt.publish(T_PHSTAT.c_str(), "{\"ok\":false,\"err\":\"no_frame\"}", false);
      delay(500 * attempt);
      continue;
    }

    String meta = String("{\"deviceId\":\"")+DEV_ID+
                  "\",\"reason\":\""+String(reason)+
                  "\",\"distanceCm\":"+(isnan(cm)?String("null"):String(cm,1))+
                  ",\"firmware\":\"esp32cam-allinone\",\"try\":"+String(attempt)+"}";

    UploadResult ur = httpUploadMultipart(meta, fb->buf, fb->len);

    long id = extractJsonLong(ur.body, "id");
    String photoUrl = extractJsonString(ur.body, "photoUrl");
    String thumbUrl = extractJsonString(ur.body, "thumbUrl");
    String ts       = extractJsonString(ur.body, "ts");

    String ack = String("{\"ok\":") + (ur.ok?"true":"false") +
      ",\"http\":"+ String(ur.http) +
      ",\"try\":"+ String(attempt) +
      ",\"bytes\":"+ String((int)fb->len) +
      ",\"id\":"+ (id==LONG_MIN ? String("null"):String(id)) +
      ",\"photoUrl\":"+ (photoUrl.length()? String("\"")+photoUrl+"\"":"null") +
      ",\"thumbUrl\":"+ (thumbUrl.length()? String("\"")+thumbUrl+"\"":"null") +
      ",\"ts\":"+ (ts.length()? String("\"")+ts+"\"":"null") +
      ",\"deviceId\":\""+ DEV_ID + "\"" +
      ",\"meta\":{\"cm\":"+ (isnan(cm)?String("null"):String(cm,1)) + "}" +
      "}";

    mqtt.publish(T_PHSTAT.c_str(), ack.c_str(), false);
    esp_camera_fb_return(fb);

    if (ur.ok) {
      Serial.printf("[PHOTO] Upload success on attempt %d (HTTP %d)\n", attempt, ur.http);
      return true;
    }

    Serial.printf("[PHOTO] Upload failed attempt %d (HTTP %d), retrying...\n", attempt, ur.http);
    if (attempt < MAX_TRY) delay(700 * attempt);
  }
  Serial.println("[PHOTO] All upload attempts failed");
  return false;
}

// ===================== AI PERIODIC CHECK =====================
void performAICheck(){
  if (!aiCheckEnabled || busy) {
    return; // Skip jika disabled atau sedang busy
  }
  
  Serial.println("[AI] Performing periodic AI check...");
  
  // Capture image with retry and I2C recovery
  camera_fb_t* fb = NULL;
  for (int retry = 0; retry < 3; retry++) {
    if (retry > 0) {
      // Wait much longer between retries
      Serial.printf("[AI] Capture retry %d/3 (waiting 1s for camera ready)...\n", retry);
      delay(1000);  // Increased to 1 second
      
      // Try I2C recovery before retry
      i2cRecover();
    }
    
    flashOn(true); 
    delay(150);  // Longer flash delay
    fb = esp_camera_fb_get();
    flashOn(false);
    
    if (fb) {
      Serial.printf("[AI] Frame captured: %d bytes (retry %d)\n", fb->len, retry);
      break;
    } else {
      Serial.printf("[AI] Capture failed on retry %d\n", retry);
    }
  }
  
  if (!fb){
    consecutiveCameraFailures++;
    Serial.printf("[AI] Failed to capture frame after 3 retries (failure #%d/%d)\n", 
                  consecutiveCameraFailures, MAX_CAMERA_FAILURES);
    
    // Try I2C recovery and full camera reinit (I2C NACK requires full reset)
    Serial.println("[AI] Attempting I2C recovery and camera reinit...");
    
    // Power cycle camera via PWDN pin
    pinMode(PWDN_GPIO_NUM, OUTPUT);
    digitalWrite(PWDN_GPIO_NUM, HIGH); // Power down
    delay(100);
    digitalWrite(PWDN_GPIO_NUM, LOW);  // Power up
    delay(100);
    
    // Full deinit/reinit with I2C recovery
    esp_camera_deinit();
    delay(300);
    i2cRecover();
    
    if (initCameraSafe()) {
      Serial.println("[AI] Camera reinit successful after I2C recovery");
      mqtt.publish(T_EVENT.c_str(), "{\"type\":\"ai_check\",\"status\":\"recovered\",\"method\":\"i2c_reset\"}", false);
    } else {
      Serial.println("[AI-ERR] Camera reinit FAILED after I2C recovery!");
    }
    
    // Disable AI check after max failures to prevent infinite loop
    if (consecutiveCameraFailures >= MAX_CAMERA_FAILURES) {
      aiCheckEnabled = false;
      Serial.println("[AI-ERR] Too many camera failures, disabling AI periodic check!");
      Serial.println("[AI-ERR] Use MQTT command to re-enable: {\"aiCheck\":{\"enable\":true}}");
      mqtt.publish(T_EVENT.c_str(), "{\"type\":\"ai_check\",\"status\":\"disabled\",\"reason\":\"max_failures\"}", false);
    } else {
      mqtt.publish(T_EVENT.c_str(), 
        String("{\"type\":\"ai_check\",\"status\":\"retry_failed\",\"failures\":" + 
        String(consecutiveCameraFailures) + "}").c_str(), false);
    }
    return;
  }
  
  // Reset failure counter on successful capture
  if (consecutiveCameraFailures > 0) {
    Serial.printf("[AI] Camera recovered after %d failures\n", consecutiveCameraFailures);
    consecutiveCameraFailures = 0;
  }
  
  // Don't print bytes here, already printed in retry loop
  
  // Send to AI API
  bool ultrasonicTriggered = !isnan(lastCm) && lastCm >= S.minCm && lastCm <= S.maxCm;
  UploadResult ur = httpAIVerify(fb->buf, fb->len, "periodic", lastCm, ultrasonicTriggered);
  
  // Explicit buffer cleanup to prevent camera busy
  esp_camera_fb_return(fb);
  fb = NULL;
  
  // Give camera time to fully release buffer
  delay(100);
  
  if (!ur.ok) {
    Serial.printf("[AI] Verification failed (HTTP %d)\n", ur.http);
    mqtt.publish(T_EVENT.c_str(), String("{\"type\":\"ai_check\",\"status\":\"error\",\"http\":"+String(ur.http)+"}").c_str(), false);
    return;
  }
  
  // Parse AI response
  bool hasPackage = extractJsonBool(ur.body, "hasPackage");
  long confidence = extractJsonLong(ur.body, "confidence");
  String decision = extractJsonString(ur.body, "decision");
  String description = extractJsonString(ur.body, "description");
  long nextInterval = extractJsonLong(ur.body, "nextCheckInterval");
  String mode = extractJsonString(ur.body, "mode");
  
  Serial.printf("[AI] Result: %s (confidence: %ld%%, decision: %s)\n", 
                hasPackage ? "PACKAGE" : "NO PACKAGE", confidence, decision.c_str());
  
  // Update interval jika ada dari backend
  if (nextInterval != LONG_MIN && nextInterval > 0) {
    aiCheckInterval = nextInterval * 1000; // Convert to milliseconds
    if (mode.length() > 0 && mode != lastAIMode) {
      Serial.printf("[AI] Mode changed: %s -> %s (interval: %lds)\n", 
                    lastAIMode.c_str(), mode.c_str(), nextInterval);
      lastAIMode = mode;
    }
  }
  
  // Publish AI check event
  String aiEvent = String("{\"type\":\"ai_check\",\"hasPackage\":") + (hasPackage?"true":"false") +
    ",\"confidence\":" + String(confidence) +
    ",\"decision\":\"" + decision + "\"" +
    ",\"description\":\"" + description + "\"" +
    ",\"mode\":\"" + (mode.length() ? mode : "UNKNOWN") + "\"" +
    ",\"nextInterval\":" + String(aiCheckInterval/1000) +
    "}";
  mqtt.publish(T_EVENT.c_str(), aiEvent.c_str(), false);
  
  // Jika AI detect package dengan confidence tinggi, trigger pipeline
  if (hasPackage && confidence >= 70 && !busy) {
    bool safeAreaActive = (millis() - lastHolderRelease) < HOLDER_SAFE_AREA_MS;
    
    if ((millis()-lastPipeline > PIPELINE_COOLDOWN_MS) && !safeAreaActive){
      Serial.println("[AI] High confidence package detected, triggering pipeline!");
      String aiTrigger = String("{\"type\":\"ai_trigger\",\"confidence\":") + String(confidence) + ",\"action\":\"pipeline\"}";
      mqtt.publish(T_EVENT.c_str(), aiTrigger.c_str(), false);
      runPipeline(lastCm);
    } else if (safeAreaActive) {
      Serial.println("[AI] Package detected but safe area active, skipping pipeline");
    } else {
      Serial.println("[AI] Package detected but cooldown active, skipping pipeline");
    }
  }
}

// ===================== BUZZER & LOCK =====================
void buzzerPatternMs(uint32_t totalMs){
  stopBuzz = false;
  unsigned long start = millis();
  while (millis() - start < totalMs){
    if (stopAll || stopBuzz) break;
    relayWrite(PIN_REL2, true);  if (!breatheDelayCancelable(S.buzzOn)) break;
    relayWrite(PIN_REL2, false); if (!breatheDelayCancelable(S.buzzOff)) break;
  }
  relayWrite(PIN_REL2, false);
}
void lockPulseMs(uint32_t ms){
  stopLock = false;
  relayWrite(PIN_REL1, true);
  if (!breatheDelayCancelable(ms) || stopAll || stopLock){
    relayWrite(PIN_REL1, false);
    return;
  }
  relayWrite(PIN_REL1, false);
  
  // Publish holder release event for backend baseline capture
  String holderEvent = String("{\"released\":true,\"ms\":") + ms + 
    ",\"timestamp\":\"" + String(millis()) + "\"}";
  mqtt.publish(T_HOLDER_RELEASE.c_str(), holderEvent.c_str(), false);
  Serial.println("[HOLDER] Release event published for baseline capture");
}

// ===================== PIPELINE =====================
void runPipeline(float cm){
  // Jangan guard di sini—pemanggil sudah memastikan !busy
  busy = true;
  stopAll=false; 
  stopBuzz=false; 
  stopLock=false;

  // 1) Tunggu acak 2–3s
  uint32_t d1 = PHOTO_DELAY_MIN_MS + (esp_random() % (PHOTO_DELAY_MAX_MS - PHOTO_DELAY_MIN_MS + 1));
  mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"wait_before_photo\",\"ms\":"+String(d1)+"}").c_str(), false);
  if (!breatheDelayCancelable(d1)){ busy=false; return; }

  // 2) Foto + upload
  bool sent = captureAndUploadWithRetry("detect", cm);
  mqtt.publish(T_EVENT.c_str(), sent? "{\"step\":\"photo_ok\"}" : "{\"step\":\"photo_failed\"}", false);

  if (!sent){
    Serial.println("[PIPELINE] Photo upload failed, but continuing to unlock holder");
    mqtt.publish(T_EVENT.c_str(), "{\"step\":\"photo_failed_continue\",\"reason\":\"prevent_package_stuck\"}", false);
  }

  // 3) Tunggu acak 1–2s
  uint32_t d2 = LOCK_DELAY_MIN_MS + (esp_random() % (LOCK_DELAY_MAX_MS - LOCK_DELAY_MIN_MS + 1));
  mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"wait_before_lock\",\"ms\":"+String(d2)+"}").c_str(), false);
  if (!breatheDelayCancelable(d2)){ busy=false; return; }

  // 4) Solenoid ON (lockMs) -> release holder
  mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"lock_on_ms\",\"ms\":"+String(S.lockMs)+"}").c_str(), false);
  lockPulseMs(S.lockMs);
  lastHolderRelease = millis();
  mqtt.publish(T_EVENT.c_str(), "{\"step\":\"lock_off\"}", false);

  // 5) Buzzer
  mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"buzzer_ms\",\"ms\":"+String(S.buzzerMs)+"}").c_str(), false);
  buzzerPatternMs(S.buzzerMs);

  busy = false;
  lastPipeline = millis();
}

// ===================== SETTINGS =====================
void publishSettingsCur(){
  String js = String("{\"ultra\":{\"min\":")+S.minCm+",\"max\":"+S.maxCm+"},"
               "\"lock\":{\"ms\":"+S.lockMs+"},"
               "\"buzzer\":{\"ms\":"+S.buzzerMs+"}}";
  mqtt.publish(T_SETCUR.c_str(), js.c_str(), true);
}

// ===================== MQTT CALLBACK =====================
void onMqtt(char* topic, byte* payload, unsigned int len){
  String top(topic);
  String s; s.reserve(len+1);
  for (unsigned i=0;i<len;i++) s += (char)payload[i];

  auto ack = [&](const String& j){ mqtt.publish(T_CTRLACK.c_str(), j.c_str(), false); };

  if (top == T_CTRL){
    if (s.indexOf("\"pipeline\"")>=0 && s.indexOf("\"stop\"")>=0){
      stopAll = true; stopBuzz = true; stopLock = true;
      ack("{\"ok\":true,\"action\":\"pipeline\",\"state\":\"stopping\"}");
      return;
    }
    if (s.indexOf("\"capture\"")>=0 && s.indexOf("true")>=0){
      bool ok = captureAndUploadWithRetry("manual", lastCm);
      ack(String("{\"ok\":")+(ok?"true":"false")+",\"action\":\"capture\"}");
      return;
    }
    if (s.indexOf("\"aiCheck\"")>=0){
      if (s.indexOf("\"enable\"")>=0){ 
        aiCheckEnabled = true;
        consecutiveCameraFailures = 0; // Reset failure counter
        Serial.println("[CMD] AI check re-enabled, failure counter reset");
        ack("{\"ok\":true,\"action\":\"aiCheck\",\"state\":\"enabled\"}"); 
        return; 
      }
      if (s.indexOf("\"disable\"")>=0){ 
        aiCheckEnabled = false; 
        ack("{\"ok\":true,\"action\":\"aiCheck\",\"state\":\"disabled\"}"); 
        return; 
      }
      if (s.indexOf("\"now\"")>=0){ 
        ack("{\"ok\":true,\"action\":\"aiCheck\",\"state\":\"starting\"}");
        performAICheck(); 
        return; 
      }
    }
    if (s.indexOf("\"flash\"")>=0){
      if (s.indexOf("\"on\"")>=0){ flashOn(true);  ack("{\"ok\":true,\"action\":\"flash\",\"state\":\"on\"}"); return; }
      if (s.indexOf("\"off\"")>=0){ flashOn(false); ack("{\"ok\":true,\"action\":\"flash\",\"state\":\"off\"}"); return; }
      int pms = s.indexOf("\"ms\"");
      int ms = 150; if (pms>=0) ms = s.substring(s.indexOf(':',pms)+1).toInt();
      flashOn(true); delay(ms); flashOn(false);
      ack(String("{\"ok\":true,\"action\":\"flash\",\"detail\":\"pulse_")+ms+"ms\"}");
      return;
    }
    if (s.indexOf("\"buzzer\"")>=0){
      if (s.indexOf("\"stop\"")>=0){ stopBuzz = true; relayWrite(PIN_REL2,false); ack("{\"ok\":true,\"action\":\"buzzer\",\"state\":\"stopping\"}"); return; }
      int pms = s.indexOf("\"ms\"");
      uint32_t ms = (pms>=0) ? (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt() : S.buzzerMs;
      ack(String("{\"ok\":true,\"action\":\"buzzer\",\"state\":\"start\",\"ms\":")+ms+"}");
      buzzerPatternMs(ms);
      return;
    }
    if (s.indexOf("\"lock\"")>=0){
      if (s.indexOf("\"open\"")>=0){
        stopLock=true;
        relayWrite(PIN_REL1,false);
        lastHolderRelease = millis();
        ack("{\"ok\":true,\"action\":\"lock\",\"state\":\"open\"}");
        return;
      }
      if (s.indexOf("\"closed\"")>=0){ relayWrite(PIN_REL1,true); ack("{\"ok\":true,\"action\":\"lock\",\"state\":\"closed\"}"); return; }
      if (s.indexOf("\"pulse\"")>=0){
        int pms = s.indexOf("\"ms\"");
        uint32_t ms = (pms>=0) ? (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt() : S.lockMs;
        lastHolderRelease = millis();
        ack(String("{\"ok\":true,\"action\":\"lock\",\"state\":\"pulse\",\"ms\":")+ms+"}");
        lockPulseMs(ms);
        return;
      }
    }
    if (s.indexOf("\"diagnostic\"")>=0 || s.indexOf("\"diag\"")>=0){
      // Diagnostic command - check hardware status
      Serial.println("[DIAG] Running diagnostic...");
      
      // Test ultrasonic
      float testCm = ultraOne();
      String ultraStatus = isnan(testCm) ? "FAIL" : "OK";
      
      // Test camera
      flashOn(true); delay(50);
      camera_fb_t* testFb = esp_camera_fb_get();
      flashOn(false);
      String camStatus = testFb ? "OK" : "FAIL";
      if (testFb) esp_camera_fb_return(testFb);
      
      String diagResult = String("{\"ok\":true,\"action\":\"diagnostic\",") +
        "\"camera\":\"" + camStatus + "\"," +
        "\"ultrasonic\":\"" + ultraStatus + "\"," +
        "\"distance\":" + (isnan(testCm) ? "null" : String(testCm,1)) + "," +
        "\"wifi\":\"" + (WiFi.status()==WL_CONNECTED ? "OK":"FAIL") + "\"," +
        "\"mqtt\":\"" + (mqtt.connected() ? "OK":"FAIL") + "\"," +
        "\"freeHeap\":" + String(ESP.getFreeHeap()) + "}";
      
      ack(diagResult);
      Serial.println("[DIAG] Complete");
      return;
    }
    if (s.indexOf("\"cameraReset\"")>=0){
      Serial.println("[CMD] Camera reset requested...");
      
      // Try sensor reset first (lighter)
      sensor_t* sens = esp_camera_sensor_get();
      if (sens && sens->reset) {
        sens->reset(sens);
        delay(200);
        consecutiveCameraFailures = 0;
        Serial.println("[CMD] Camera sensor reset OK");
        ack("{\"ok\":true,\"action\":\"cameraReset\",\"method\":\"sensor\"}");
      } else {
        // Fallback: full deinit/reinit
        esp_camera_deinit();
        delay(500);
        bool ok = initCameraSafe();
        if (ok) consecutiveCameraFailures = 0;
        ack(String("{\"ok\":")+(ok?"true":"false")+",\"action\":\"cameraReset\",\"method\":\"full\"}");
        Serial.println(ok ? "[CMD] Camera full reset OK" : "[CMD] Camera full reset FAILED");
      }
      return;
    }
    return;
  }

  // Handle baseline trigger from backend
  if (top == T_BASELINE_TRIGGER){
    Serial.println("[BASELINE] Trigger received from backend");
    ack("{\"ok\":true,\"action\":\"baseline\",\"state\":\"capturing\"}");
    
    // Capture baseline photo
    flashOn(true); delay(100);
    camera_fb_t* fb = esp_camera_fb_get();
    flashOn(false);
    
    if (!fb){
      mqtt.publish(T_EVENT.c_str(), "{\"type\":\"baseline\",\"status\":\"failed\",\"reason\":\"no_frame\"}", false);
      return;
    }
    
    // For MQTT we send small thumbnail or trigger HTTP upload
    // Due to MQTT size limits, we'll send metadata and trigger HTTP capture
    String baselineEvent = String("{\"type\":\"baseline_captured\",\"bytes\":") + 
      String((int)fb->len) + ",\"reason\":\"" + 
      extractJsonString(s, "reason") + "\"}";
    mqtt.publish(T_EVENT.c_str(), baselineEvent.c_str(), false);
    
    // Send baseline to AI endpoint via HTTP
    UploadResult ur = httpAIVerify(fb->buf, fb->len, "baseline", lastCm, false);
    esp_camera_fb_return(fb);
    
    if (ur.ok) {
      Serial.println("[BASELINE] Uploaded successfully");
      mqtt.publish(T_EVENT.c_str(), "{\"type\":\"baseline\",\"status\":\"success\"}", false);
    } else {
      Serial.printf("[BASELINE] Upload failed (HTTP %d)\n", ur.http);
      mqtt.publish(T_EVENT.c_str(), String("{\"type\":\"baseline\",\"status\":\"error\",\"http\":"+String(ur.http)+"}").c_str(), false);
    }
    return;
  }

  if (top == T_SETSET){
    int p;
    p = s.indexOf("\"ultra\"");
    if (p>=0){
      int pmin = s.indexOf("\"min\"", p), pmax = s.indexOf("\"max\"", p);
      if (pmin>=0) S.minCm = s.substring(s.indexOf(':',pmin)+1).toFloat();
      if (pmax>=0) S.maxCm = s.substring(s.indexOf(':',pmax)+1).toFloat();
    }
    p = s.indexOf("\"lock\"");
    if (p>=0){
      int pms = s.indexOf("\"ms\"", p);
      if (pms>=0) S.lockMs = (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt();
    }
    p = s.indexOf("\"buzzer\"");
    if (p>=0){
      int pms = s.indexOf("\"ms\"", p);
      if (pms>=0) S.buzzerMs = (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt();
    }
    
    // Parse detection mode: FULL_HCSR, FULL_GEMINI, or BOTH
    p = s.indexOf("\"detection\"");
    if (p>=0){
      int pmode = s.indexOf("\"mode\"", p);
      if (pmode>=0){
        int colonPos = s.indexOf(':', pmode);
        int quoteStart = s.indexOf('"', colonPos + 1);
        int quoteEnd = s.indexOf('"', quoteStart + 1);
        if (quoteStart>=0 && quoteEnd>=0){
          String newMode = s.substring(quoteStart+1, quoteEnd);
          if (newMode == "FULL_HCSR" || newMode == "FULL_GEMINI" || newMode == "BOTH"){
            detectionMode = newMode;
            Serial.printf("[SETTINGS] Detection mode changed to: %s\n", detectionMode.c_str());
            
            // Publish event for mode change
            String evMsg = "{\"type\":\"mode_change\",\"detection\":\"" + detectionMode + "\"}";
            mqtt.publish(T_EVENT.c_str(), evMsg.c_str(), false);
          }
        }
      }
    }

    if (S.minCm<5 || S.minCm>50 || S.maxCm<10 || S.maxCm>50 || S.minCm>=S.maxCm ||
        S.lockMs>60000UL || S.buzzerMs>300000UL){
      mqtt.publish(T_SETACK.c_str(), "{\"ok\":false,\"err\":\"bad_range\"}", false);
    } else {
      publishSettingsCur();
      mqtt.publish(T_SETACK.c_str(), "{\"ok\":true,\"reason\":\"applied\"}", false);
    }
    return;
  }
}

// ===================== MQTT =====================
void ensureMQTT(){
  if (mqtt.connected()) return;
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMqtt);
  while (!mqtt.connected()){
    mqtt.connect(DEV_ID, MQTT_USER, MQTT_PASSW, T_STATUS.c_str(), 0, true, "offline");
    if (!mqtt.connected()) delay(500);
  }
  mqtt.publish(T_STATUS.c_str(), "online", true);
  mqtt.subscribe(T_CTRL.c_str());
  mqtt.subscribe(T_SETSET.c_str());
  mqtt.subscribe(T_BASELINE_TRIGGER.c_str()); // Subscribe to baseline trigger from backend
}

// ===================== CAMERA =====================
// I2C recovery for camera
void i2cRecover() {
  // Release I2C bus by toggling SCL
  pinMode(SIOC_GPIO_NUM, OUTPUT);
  for(int i = 0; i < 10; i++) {
    digitalWrite(SIOC_GPIO_NUM, HIGH);
    delayMicroseconds(5);
    digitalWrite(SIOC_GPIO_NUM, LOW);
    delayMicroseconds(5);
  }
  digitalWrite(SIOC_GPIO_NUM, HIGH);
  delay(10);
}

bool initCameraSafe(){
  // Try I2C recovery first
  i2cRecover();
  
  camera_config_t c{};
  c.ledc_channel=LEDC_CHANNEL_0; c.ledc_timer=LEDC_TIMER_0;
  c.pin_d0=Y2_GPIO_NUM; c.pin_d1=Y3_GPIO_NUM; c.pin_d2=Y4_GPIO_NUM; c.pin_d3=Y5_GPIO_NUM;
  c.pin_d4=Y6_GPIO_NUM; c.pin_d5=Y7_GPIO_NUM; c.pin_d6=Y8_GPIO_NUM; c.pin_d7=Y9_GPIO_NUM;
  c.pin_xclk=XCLK_GPIO_NUM; c.pin_pclk=PCLK_GPIO_NUM; c.pin_vsync=VSYNC_GPIO_NUM; c.pin_href=HREF_GPIO_NUM;
  c.pin_sccb_sda=SIOD_GPIO_NUM; c.pin_sccb_scl=SIOC_GPIO_NUM;
  c.pin_pwdn=PWDN_GPIO_NUM; c.pin_reset=RESET_GPIO_NUM;
  c.xclk_freq_hz=10000000;
  c.pixel_format=PIXFORMAT_JPEG;
  c.frame_size=FRAMESIZE_VGA;
  c.jpeg_quality=12;
  c.fb_count=1;
  c.fb_location=CAMERA_FB_IN_DRAM;
  c.grab_mode=CAMERA_GRAB_WHEN_EMPTY;
  return (esp_camera_init(&c) == ESP_OK);
}

// ===================== SETUP/LOOP =====================
void setup(){
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200); 
  delay(1000);  // Tambah delay untuk stabilisasi serial
  
  Serial.println("");
  Serial.println("========================================");
  Serial.println("=== ESP32-CAM SmartParcel AIO ===");
  Serial.println("========================================");
  Serial.println("[BOOT] Starting initialization...");

  // IO init
  Serial.println("[BOOT] Initializing GPIO...");
  pinMode(PIN_TRIG, OUTPUT); digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT); // via divider!
  pinMode(PIN_REL1, OUTPUT); pinMode(PIN_REL2, OUTPUT);
  relayWrite(PIN_REL1, false); relayWrite(PIN_REL2, false);
  pinMode(PIN_FLASH, OUTPUT); digitalWrite(PIN_FLASH, LOW);
  Serial.println("[BOOT] GPIO OK");

  Serial.println("[BOOT] Initializing Camera...");
  if (!initCameraSafe()){
    Serial.println("[ERR] Camera init FAILED!"); 
    Serial.println("[ERR] Check camera connection and power");
    Serial.println("[ERR] Restarting in 5 seconds...");
    delay(5000); 
    ESP.restart();
  }
  Serial.println("[BOOT] Camera OK");

  // Test camera with single capture
  Serial.println("[BOOT] Testing camera...");
  flashOn(true); delay(100);
  camera_fb_t* testFb = esp_camera_fb_get();
  flashOn(false);
  if (testFb) {
    Serial.printf("[BOOT] Camera test OK (%d bytes)\n", testFb->len);
    esp_camera_fb_return(testFb);
  } else {
    Serial.println("[WARN] Camera test failed, but continuing...");
  }

  // Test ultrasonic sensor
  Serial.println("[BOOT] Testing HC-SR04...");
  delay(500);
  float testCm = ultraOne();
  if (!isnan(testCm)) {
    Serial.printf("[BOOT] HC-SR04 OK (%.1f cm)\n", testCm);
  } else {
    Serial.println("[WARN] HC-SR04 not responding!");
    Serial.println("[WARN] Check connections:");
    Serial.println("  - TRIG -> GPIO 14");
    Serial.println("  - ECHO -> GPIO 2 (via 5V->3.3V divider!)");
    Serial.println("  - VCC  -> 5V");
    Serial.println("  - GND  -> GND");
  }

  Serial.println("[BOOT] Starting WiFi...");
  startWiFiOnce();
  Serial.println("[BOOT] WiFi OK");
  
  Serial.println("[BOOT] Connecting to MQTT...");
  mqtt.setClient(tcp);
  ensureMQTT();
  Serial.println("[BOOT] MQTT OK");
  
  publishSettingsCur();
  Serial.println("");
  Serial.println("========================================");
  Serial.println("[BOOT] System Ready!");
  Serial.println("========================================");
  Serial.println("");
}

void loop(){
  // Reconnect WiFi ditangani event + throttle
  if (WiFi.status()!=WL_CONNECTED){
    if (millis() - lastReconnectTry > RECONNECT_COOLDOWN){
      lastReconnectTry = millis();
      esp_wifi_connect();
      Serial.println("[WIFI] Reconnect tick");
    }
  }

  if (!mqtt.connected()) ensureMQTT();
  mqtt.loop();

  // AI Periodic Check - only run if mode is FULL_GEMINI or BOTH
  bool aiEnabled = (detectionMode == "FULL_GEMINI" || detectionMode == "BOTH");
  if (aiEnabled && aiCheckEnabled && (millis() - lastAICheck >= aiCheckInterval)) {
    lastAICheck = millis();
    performAICheck();
  }

  // Publish jarak & trigger pipeline (HC-SR04 as boost)
  // Only run ultrasonic if mode is FULL_HCSR or BOTH
  bool ultraEnabled = (detectionMode == "FULL_HCSR" || detectionMode == "BOTH");
  
  if (millis()-tLastPub > 1000){
    tLastPub = millis();
    float cm = ultraCmStable();
    lastCm = cm;

    if (!isnan(cm)){
      char js[48]; snprintf(js, sizeof(js), "{\"cm\":%.2f}", cm);
      mqtt.publish(T_DIST.c_str(), js, false);
      Serial.printf("[ULTRA] %.2f cm\n", cm);

      bool inWindow = (cm>=S.minCm && cm<=S.maxCm);
      bool safeAreaActive = (millis() - lastHolderRelease) < HOLDER_SAFE_AREA_MS;

      // HC-SR04 detection logic
      if (ultraEnabled && inWindow && !busy && (millis()-lastPipeline>PIPELINE_COOLDOWN_MS) && !safeAreaActive){
        
        if (detectionMode == "FULL_HCSR") {
          // FULL_HCSR mode: langsung trigger package pipeline tanpa AI
          char ev[80]; snprintf(ev, sizeof(ev), "{\"type\":\"ultrasonic_detected\",\"cm\":%.1f,\"mode\":\"FULL_HCSR\"}", cm);
          mqtt.publish(T_EVENT.c_str(), ev, false);
          Serial.println("[ULTRA] FULL_HCSR mode - Package detected by ultrasonic only");
          
          // Trigger pipeline directly (take photo + upload without AI verification)
          lastPipeline = millis();
          busy = true;
          
          // Capture and upload photo (no AI verification)
          camera_fb_t* fb = NULL;
          flashOn(true); delay(100);
          fb = esp_camera_fb_get();
          flashOn(false);
          
          if (fb) {
            String meta = "{\"deviceId\":\"" + String(DEV_ID) + "\",\"distance\":" + String(cm,1) + 
                         ",\"mode\":\"FULL_HCSR\",\"aiVerified\":false}";
            UploadResult ur = httpUploadMultipart(meta, fb->buf, fb->len);
            esp_camera_fb_return(fb);
            
            if (ur.ok) {
              Serial.println("[ULTRA] Photo uploaded successfully (no AI)");
              mqtt.publish(T_PHSTAT.c_str(), "{\"status\":\"uploaded\",\"mode\":\"FULL_HCSR\"}", false);
              
              // Release holder and buzzer
              lockPulseMs(S.lockMs);
              lastHolderRelease = millis();
              mqtt.publish(T_HOLDER_RELEASE.c_str(), "{\"status\":\"released\",\"trigger\":\"ultrasonic\"}", false);
              buzzerPatternMs(S.buzzerMs);
            } else {
              Serial.printf("[ULTRA] Photo upload failed: HTTP %d\n", ur.http);
            }
          }
          
          busy = false;
          
        } else {
          // BOTH mode: ultrasonic sebagai boost untuk AI check
          char ev[80]; snprintf(ev, sizeof(ev), "{\"type\":\"ultrasonic_boost\",\"cm\":%.1f}", cm);
          mqtt.publish(T_EVENT.c_str(), ev, false);
          
          Serial.println("[ULTRA] Boost trigger - performing immediate AI check");
          lastAICheck = millis();
          performAICheck();
        }
        
      } else if (inWindow && safeAreaActive) {
        Serial.println("[ULTRA] Detection blocked - Safe area active after holder release");
      }
    } else {
      Serial.println("[ULTRA] NaN");
    }
  }

  delay(5);
}