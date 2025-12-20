// ===== ESP32-CAM SmartParcel - NO HOLDER VERSION =====
// Hardware: ESP32-CAM AI-Thinker + HC-SR04 + Buzzer
// Features:
// - Ultrasonic detection (HC-SR04)
// - Instant photo capture on detection
// - Photo upload with retry (until success)
// - Buzzer notification
// - NO SOLENOID HOLDER

#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <limits.h>
#include "esp_wifi.h"

// ===================== WIFI & MQTT CONFIG =====================
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
String T_BUZZER_CFG = String("smartparcel/")+DEV_ID+"/buzzer/config";

// Backend HTTP
const char* SERVER_HOST = "3.27.11.106";
const uint16_t SERVER_PORT = 9090;
const char* SERVER_PATH = "/api/v1/packages";
// NEW JWT TOKEN - Valid 365 days (Generated Dec 20, 2025)
const char* API_BEARER  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXZpY2VJZCI6ImJveC0wMSIsInR5cGUiOiJkZXZpY2UiLCJpYXQiOjE3NjYxOTc5ODQsImV4cCI6MTc5NzczMzk4NH0.CE84p-AIToylrUVswTd3V_5petXTwwOVe-RJk54uNjg";

// ===================== PIN ESP32-CAM (AI-Thinker) =====================
// HC-SR04
#define PIN_TRIG   14
#define PIN_ECHO    2   // WAJIB divider 5V->3V3
// Buzzer
#define PIN_BUZZER 15   // Relay/MOSFET untuk buzzer
// Flash LED
#define PIN_FLASH   4

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
  float     minCm   = 5.0f;   // Min detection range
  float     maxCm   = 27.0f;  // Max detection range
  uint32_t  buzzerMs= 60000;  // Buzzer duration
  uint16_t  buzzOn  = 500;
  uint16_t  buzzOff = 300;
  bool      buzzerEnabled = true; // Buzzer enable/disable flag
} S;

bool busy = false;
volatile bool stopAll = false;
volatile bool stopBuzz = false;

unsigned long tLastPub = 0;
unsigned long lastDetection = 0;
const unsigned long DETECTION_COOLDOWN_MS = 15000; // 15 detik cooldown antar deteksi
float lastCm = NAN;

struct UploadResult { bool ok; int http; String body; };

// ===================== WIFI STATE =====================
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

#define WIFI_RESET_PIN 0

bool shouldResetWiFi() {
  pinMode(WIFI_RESET_PIN, INPUT_PULLUP);
  delay(100);
  if (digitalRead(WIFI_RESET_PIN) == LOW) {
    Serial.println("[WIFIMGR] BOOT button pressed - Will reset WiFi settings!");
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
  
  WiFiManager wm;
  
  if (shouldResetWiFi()) {
    Serial.println("[WIFIMGR] Resetting WiFi settings...");
    wm.resetSettings();
    delay(1000);
  }
  
  wm.setConfigPortalTimeout(300);
  wm.setConnectTimeout(30);
  
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
    
    for(int i=0; i<5; i++) {
      digitalWrite(PIN_FLASH, HIGH); delay(200);
      digitalWrite(PIN_FLASH, LOW); delay(200);
    }
  });
  
  Serial.println("[WIFIMGR] Attempting to connect to saved WiFi...");
  
  if (!wm.autoConnect("parcelbox-setup-cam", "smartbox123")) {
    Serial.println("[WIFIMGR] Failed to connect after timeout, restarting...");
    delay(3000);
    ESP.restart();
  }
  
  Serial.println("[WIFIMGR] Connected successfully!");
  Serial.printf("[WIFI] IP: %s\n", WiFi.localIP().toString().c_str());
}

void ensureWiFi(){}

// ===================== UTIL =====================
inline void relayWrite(uint8_t pin, bool on){
  if (RELAY_ACTIVE_LOW) digitalWrite(pin, on ? LOW : HIGH);
  else                  digitalWrite(pin, on ? HIGH : LOW);
}
inline void flashOn(bool on){ pinMode(PIN_FLASH, OUTPUT); digitalWrite(PIN_FLASH, on ? HIGH : LOW); }

float ultraOne(uint32_t tout=40000UL){
  pinMode(PIN_TRIG, OUTPUT);
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(10);
  
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  
  unsigned long dur = pulseIn(PIN_ECHO, HIGH, tout);
  
  if (!dur || dur == 0) {
    static unsigned long lastDebug = 0;
    if (millis() - lastDebug > 30000) {
      int trigState = digitalRead(PIN_TRIG);
      int echoState = digitalRead(PIN_ECHO);
      Serial.printf("[ULTRA-DEBUG] TRIG=%d ECHO=%d, pulseIn timeout\n", trigState, echoState);
      
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

// ===================== HTTP MULTIPART =====================
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

// ===================== CAPTURE + UPLOAD (RETRY WITH MAX ATTEMPTS) =====================
bool captureAndUploadUntilSuccess(const char* reason, float cm){
  const int MAX_ATTEMPTS = 10; // Max retry upload
  const int MAX_CAPTURE_FAIL = 5; // Max 5x capture fail, lalu stop (increased)
  int attempt = 0;
  int captureFails = 0;
  
  // CRITICAL: Camera warmup sequence for reliable first capture
  // The OV2640 sensor needs time to stabilize after being idle
  Serial.println("[PHOTO] Camera warmup sequence starting...");
  
  // Step 1: I2C recovery to ensure sensor communication
  i2cRecover();
  delay(50);
  
  // Step 2: Turn on flash briefly to "wake up" the sensor AGC/AEC
  Serial.println("[PHOTO] Flash warmup for sensor AGC/AEC...");
  flashOn(true);
  delay(150);
  
  // Step 3: Do 3 warmup captures WITH flash to stabilize sensor
  // These captures "prime" the sensor's auto-exposure
  Serial.println("[PHOTO] Warmup captures to stabilize sensor...");
  int warmupSuccess = 0;
  for(int i = 0; i < 3; i++) {
    camera_fb_t* warmup = esp_camera_fb_get();
    if (warmup) {
      warmupSuccess++;
      Serial.printf("[PHOTO] Warmup %d OK (%d bytes)\n", i+1, warmup->len);
      esp_camera_fb_return(warmup);
    } else {
      Serial.printf("[PHOTO] Warmup %d - no frame\n", i+1);
    }
    delay(100); // Give sensor time between captures
  }
  flashOn(false);
  
  // Step 4: If warmup failed, do full recovery
  if (warmupSuccess == 0) {
    Serial.println("[PHOTO] Warmup failed - attempting I2C recovery...");
    i2cRecover();
    delay(300);
    
    // Try one more with longer flash
    flashOn(true);
    delay(200);
    camera_fb_t* recovery = esp_camera_fb_get();
    flashOn(false);
    if (recovery) {
      Serial.printf("[PHOTO] Recovery capture OK (%d bytes)\n", recovery->len);
      esp_camera_fb_return(recovery);
    } else {
      Serial.println("[PHOTO] Recovery capture also failed - will try anyway");
    }
  }
  
  // Step 5: Final flush to clear any stale frames
  Serial.println("[PHOTO] Final buffer flush...");
  for(int i = 0; i < 2; i++) {
    camera_fb_t* flush = esp_camera_fb_get();
    if (flush) {
      esp_camera_fb_return(flush);
    }
    delay(30);
  }
  
  Serial.printf("[PHOTO] Warmup complete (%d/3 successful) - ready for capture\n", warmupSuccess);
  
  while (attempt < MAX_ATTEMPTS) {
    if (stopAll) return false;
    
    attempt++;
    Serial.printf("[PHOTO] Attempt %d/%d - Capturing...\n", attempt, MAX_ATTEMPTS);
    
    // Capture dengan flash
    flashOn(true); 
    delay(300); // Flash lebih lama untuk exposure lebih baik (increased from 200)
    camera_fb_t* fb = esp_camera_fb_get();
    flashOn(false);

    if (!fb){
      captureFails++;
      Serial.printf("[PHOTO] ❌ Capture failed (%d/%d fails)\n", captureFails, MAX_CAPTURE_FAIL);
      mqtt.publish(T_PHSTAT.c_str(), "{\"ok\":false,\"err\":\"no_frame\"}", false);
      
      // Try to recover camera by reinitializing I2C and flushing
      if (captureFails == 2) {
        Serial.println("[PHOTO] Attempting camera recovery via I2C reset...");
        i2cRecover();
        delay(200);
      }
      
      // Stop jika capture gagal terus menerus (camera hardware issue)
      if (captureFails >= MAX_CAPTURE_FAIL) {
        Serial.println("[PHOTO] ⚠️ Camera hardware issue - too many capture failures!");
        Serial.println("[PHOTO] Attempting full camera reinit...");
        
        // Try to deinit and reinit camera
        esp_camera_deinit();
        delay(500);
        if (initCameraSafe()) {
          Serial.println("[PHOTO] ✅ Camera reinit SUCCESS - retrying capture");
          captureFails = 0; // Reset counter, try again
          continue;
        }
        
        Serial.println("[PHOTO] ❌ Camera reinit FAILED");
        Serial.println("[PHOTO] Possible causes:");
        Serial.println("  - Camera module not connected properly");
        Serial.println("  - PSRAM full or corrupted");
        Serial.println("  - Power supply insufficient (use 5V 2A)");
        Serial.println("  - Camera sensor damaged");
        return false;
      }
      
      delay(500); // Shorter delay, faster retry
      continue; // Retry capture
    }
    
    // Reset fail counter jika capture berhasil
    captureFails = 0;

    Serial.printf("[PHOTO] ✅ Frame captured: %d bytes\n", fb->len);
    
    String meta = String("{\"deviceId\":\"")+DEV_ID+
                  "\",\"reason\":\""+String(reason)+
                  "\",\"distanceCm\":"+(isnan(cm)?String("null"):String(cm,1))+
                  ",\"firmware\":\"esp32cam-no-holder\",\"try\":"+String(attempt)+"}";

    Serial.printf("[PHOTO] Uploading to backend (attempt %d)...\n", attempt);
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
      Serial.printf("[PHOTO] ✅✅✅ Upload SUCCESS on attempt %d (HTTP %d)\n", attempt, ur.http);
      Serial.println("[PHOTO] Photo saved to backend & will be sent to WhatsApp!");
      Serial.println("[PHOTO] Photo available in mobile app gallery!");
      return true;
    }

    Serial.printf("[PHOTO] ❌ Upload FAILED attempt %d/%d (HTTP %d)\n", attempt, MAX_ATTEMPTS, ur.http);
    
    if (attempt >= MAX_ATTEMPTS) {
      Serial.println("[PHOTO] ⚠️ Max retry attempts reached! Upload aborted.");
      Serial.println("[PHOTO] Possible causes:");
      Serial.println("  - Backend down or unreachable");
      Serial.println("  - Invalid JWT token (check API_BEARER)");
      Serial.println("  - Network connectivity issue");
      return false;
    }
    
    Serial.printf("[PHOTO] Retrying upload in 2 seconds... (%d attempts left)\n", MAX_ATTEMPTS - attempt);
    delay(2000); // Delay sebelum retry
  }
  
  // Jika sampai sini berarti gagal semua attempts
  Serial.println("[PHOTO] ❌ All upload attempts failed!");
  return false;
}

// ===================== BUZZER =====================
void buzzerPatternMs(uint32_t totalMs){
  stopBuzz = false;
  unsigned long start = millis();
  bool buzzState = false;
  unsigned long lastToggle = millis();
  
  Serial.printf("[BUZZER] Starting notification (%d seconds)...\n", totalMs/1000);
  
  while (millis() - start < totalMs){
    if (stopAll || stopBuzz) break;
    
    unsigned long now = millis();
    unsigned long toggleInterval = buzzState ? S.buzzOn : S.buzzOff;
    
    if (now - lastToggle >= toggleInterval) {
      buzzState = !buzzState;
      relayWrite(PIN_BUZZER, buzzState);
      lastToggle = now;
    }
    
    if (mqtt.connected()) mqtt.loop();
    yield();
  }
  relayWrite(PIN_BUZZER, false);
  Serial.println("[BUZZER] ✅ Notification complete!");
}

// ===================== DETECTION PIPELINE (NO HOLDER) =====================
void runDetectionPipeline(float cm){
  busy = true;
  stopAll=false; 
  stopBuzz=false;

  Serial.println("");
  Serial.println("╔════════════════════════════════════════════╗");
  Serial.println("║   📦 PACKAGE DETECTED - NO HOLDER MODE    ║");
  Serial.println("╚════════════════════════════════════════════╝");
  Serial.printf("   Distance: %.1f cm\n", cm);
  Serial.println("");
  
  mqtt.publish(T_EVENT.c_str(), String("{\"type\":\"detection\",\"cm\":"+String(cm,1)+",\"mode\":\"no_holder\"}").c_str(), false);
  
  // DELAY: Wait for package to settle in position before photo
  // This ensures the package is fully inside the box, not mid-drop
  const int SETTLE_DELAY_MS = 1500; // 1.5 seconds to let package settle
  Serial.printf("[WAIT] Waiting %d ms for package to settle...\n", SETTLE_DELAY_MS);
  mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"waiting_settle\",\"ms\":" + String(SETTLE_DELAY_MS) + "}").c_str(), false);
  
  // Keep MQTT alive during wait
  unsigned long waitStart = millis();
  while (millis() - waitStart < SETTLE_DELAY_MS) {
    if (stopAll) { busy = false; return; }
    if (mqtt.connected()) mqtt.loop();
    delay(50);
  }
  Serial.println("[WAIT] Package should be settled now");
  
  // STEP 1: FOTO (after package settled)
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("[STEP 1] 📸 CAPTURING PHOTO...");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  mqtt.publish(T_EVENT.c_str(), "{\"step\":\"capturing_photo\"}", false);
  
  // Retry sampai berhasil upload
  bool uploadSuccess = captureAndUploadUntilSuccess("detect", cm);
  
  if (uploadSuccess) {
    Serial.println("[STEP 1] ✅✅✅ PHOTO CAPTURED & UPLOADED!");
    Serial.println("          → Backend received photo");
    Serial.println("          → WhatsApp notification will be sent");
    Serial.println("          → Photo available in mobile app");
    mqtt.publish(T_EVENT.c_str(), "{\"step\":\"photo_success\"}", false);
  } else {
    Serial.println("[STEP 1] ⚠️ Photo cancelled by user");
    mqtt.publish(T_EVENT.c_str(), "{\"step\":\"photo_cancelled\"}", false);
    busy = false;
    return;
  }
  
  Serial.println("");
  // STEP 2: BUZZER NOTIFICATION (if enabled)
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("[STEP 2] 🔔 BUZZER NOTIFICATION...");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  if (S.buzzerEnabled) {
    Serial.println("[BUZZER] Buzzer is ENABLED - will activate");
    mqtt.publish(T_EVENT.c_str(), String("{\"step\":\"buzzer_notification\",\"ms\":"+String(S.buzzerMs)+",\"enabled\":true}").c_str(), false);
    buzzerPatternMs(S.buzzerMs);
  } else {
    Serial.println("[BUZZER] Buzzer is DISABLED - skipping buzzer (notification only)");
    mqtt.publish(T_EVENT.c_str(), "{\"step\":\"buzzer_skipped\",\"reason\":\"disabled\"}", false);
  }
  
  Serial.println("");
  Serial.println("╔════════════════════════════════════════════╗");
  Serial.println("║     ✅ DETECTION PIPELINE COMPLETE!        ║");
  Serial.println("╚════════════════════════════════════════════╝");
  Serial.println("   ✓ Photo captured & uploaded");
  Serial.println("   ✓ Notification sent to WhatsApp");
  Serial.println("   ✓ Photo saved in gallery");
  if (S.buzzerEnabled) {
    Serial.println("   ✓ Buzzer notification done");
  } else {
    Serial.println("   ⊗ Buzzer skipped (disabled)");
  }
  Serial.println("");
  
  busy = false;
  lastDetection = millis();
}

// ===================== MQTT CALLBACK =====================
void onMqtt(char* topic, byte* payload, unsigned int len){
  String top(topic);
  String s; s.reserve(len+1);
  for (unsigned i=0;i<len;i++) s += (char)payload[i];

  auto ack = [&](const String& j){ mqtt.publish(T_CTRLACK.c_str(), j.c_str(), false); };

  if (top == T_CTRL){
    if (s.indexOf("\"stop\"")>=0){
      stopAll = true; stopBuzz = true;
      ack("{\"ok\":true,\"action\":\"stop\"}");
      return;
    }
    if (s.indexOf("\"capture\"")>=0 && s.indexOf("true")>=0){
      bool ok = captureAndUploadUntilSuccess("manual", lastCm);
      ack(String("{\"ok\":")+(ok?"true":"false")+",\"action\":\"capture\"}");
      return;
    }
    if (s.indexOf("\"flash\"")>=0){
      if (s.indexOf("\"on\"")>=0){ flashOn(true); ack("{\"ok\":true,\"action\":\"flash\",\"state\":\"on\"}"); return; }
      if (s.indexOf("\"off\"")>=0){ flashOn(false); ack("{\"ok\":true,\"action\":\"flash\",\"state\":\"off\"}"); return; }
      int pms = s.indexOf("\"ms\"");
      if (pms>=0){
        uint32_t ms = (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt();
        flashOn(true); delay(ms); flashOn(false);
        ack(String("{\"ok\":true,\"action\":\"flash\",\"state\":\"pulse\",\"ms\":")+ms+"}");
      }
      return;
    }
    if (s.indexOf("\"buzzer\"")>=0){
      // Stop buzzer
      if (s.indexOf("\"stop\"")>=0){ 
        stopBuzz = true; 
        relayWrite(PIN_BUZZER,false); 
        ack("{\"ok\":true,\"action\":\"buzzer_stop\",\"state\":\"stopped\"}"); 
        Serial.println("[BUZZER] Stopped by user command");
        return; 
      }
      // Enable buzzer
      if (s.indexOf("\"enable\"")>=0 || s.indexOf("\"on\"")>=0){ 
        S.buzzerEnabled = true;
        mqtt.publish(T_BUZZER_CFG.c_str(), "{\"enabled\":true}", true);
        ack("{\"ok\":true,\"action\":\"buzzer_enable\",\"enabled\":true}");
        Serial.println("[BUZZER] ENABLED - will sound on detection");
        return; 
      }
      // Disable buzzer
      if (s.indexOf("\"disable\"")>=0 || s.indexOf("\"off\"")>=0){ 
        S.buzzerEnabled = false;
        stopBuzz = true;
        relayWrite(PIN_BUZZER,false);
        mqtt.publish(T_BUZZER_CFG.c_str(), "{\"enabled\":false}", true);
        ack("{\"ok\":true,\"action\":\"buzzer_disable\",\"enabled\":false}");
        Serial.println("[BUZZER] DISABLED - notification only mode");
        return; 
      }
      // Manual test buzzer with ms duration
      int pms = s.indexOf("\"ms\"");
      uint32_t ms = (pms>=0) ? (uint32_t)s.substring(s.indexOf(':',pms)+1).toInt() : S.buzzerMs;
      ack(String("{\"ok\":true,\"action\":\"buzzer\",\"state\":\"start\",\"ms\":")+ms+"}");
      buzzerPatternMs(ms);
      return;
    }
    if (s.indexOf("\"diagnostic\"")>=0 || s.indexOf("\"diag\"")>=0){
      Serial.println("[DIAG] Running diagnostic...");
      
      float testCm = ultraOne();
      String ultraStatus = isnan(testCm) ? "FAIL" : "OK";
      
      flashOn(true); delay(100);
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
        "\"mode\":\"no_holder\"," +
        "\"buzzerEnabled\":" + (S.buzzerEnabled ? "true":"false") + "," +
        "\"freeHeap\":" + String(ESP.getFreeHeap()) + "}";
      
      ack(diagResult);
      Serial.println("[DIAG] Complete");
      return;
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
  // Publish initial buzzer config
  String buzzerCfg = String("{\"enabled\":") + (S.buzzerEnabled ? "true" : "false") + "}";
  mqtt.publish(T_BUZZER_CFG.c_str(), buzzerCfg.c_str(), true);
}

// ===================== CAMERA =====================
void i2cRecover() {
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
  i2cRecover();
  
  camera_config_t c{};
  c.ledc_channel=LEDC_CHANNEL_0; c.ledc_timer=LEDC_TIMER_0;
  c.pin_d0=Y2_GPIO_NUM; c.pin_d1=Y3_GPIO_NUM; c.pin_d2=Y4_GPIO_NUM; c.pin_d3=Y5_GPIO_NUM;
  c.pin_d4=Y6_GPIO_NUM; c.pin_d5=Y7_GPIO_NUM; c.pin_d6=Y8_GPIO_NUM; c.pin_d7=Y9_GPIO_NUM;
  c.pin_xclk=XCLK_GPIO_NUM; c.pin_pclk=PCLK_GPIO_NUM; c.pin_vsync=VSYNC_GPIO_NUM; c.pin_href=HREF_GPIO_NUM;
  c.pin_sccb_sda=SIOD_GPIO_NUM; c.pin_sccb_scl=SIOC_GPIO_NUM;
  c.pin_pwdn=PWDN_GPIO_NUM; c.pin_reset=RESET_GPIO_NUM;
  c.xclk_freq_hz=20000000;  // 20MHz untuk stabilitas
  c.pixel_format=PIXFORMAT_JPEG;
  c.grab_mode=CAMERA_GRAB_WHEN_EMPTY;
  
  // TRY TO INIT PSRAM MANUALLY (for ESP32-S modules that don't auto-detect)
  bool hasPsram = psramFound();
  if (!hasPsram) {
    Serial.println("[CAM] PSRAM not detected, trying manual init...");
    if (psramInit()) {
      hasPsram = true;
      Serial.printf("[CAM] ✅ Manual PSRAM init SUCCESS! Size: %d bytes\n", ESP.getPsramSize());
    } else {
      Serial.println("[CAM] ⚠️ Manual PSRAM init failed - will use DRAM mode");
    }
  }
  
  // ADAPTIVE CONFIG: PSRAM vs DRAM
  if (hasPsram) {
    // PSRAM Mode: High quality
    Serial.println("[CAM] Config: PSRAM mode - High quality (UXGA)");
    c.frame_size=FRAMESIZE_UXGA;  // 1600x1200 - Maximum quality
    c.jpeg_quality=10;  // High quality (lower = better, 10-63 range)
    c.fb_count=2;  // Double buffer for stability
    c.fb_location=CAMERA_FB_IN_PSRAM;
  } else {
    // DRAM Mode: Optimized VGA quality
    Serial.println("[CAM] Config: DRAM mode - VGA quality (640x480)");
    c.frame_size=FRAMESIZE_VGA;  // 640x480 - Good quality, fits in DRAM
    c.jpeg_quality=10;  // High quality JPEG compression
    c.fb_count=1;  // Single buffer to save DRAM
    c.fb_location=CAMERA_FB_IN_DRAM;
  }
  
  esp_err_t err = esp_camera_init(&c);
  if (err != ESP_OK) {
    Serial.printf("[CAM-ERR] Init failed: 0x%x\n", err);
    return false;
  }
  
  // CRITICAL: Delay setelah init untuk stabilisasi sensor
  delay(500);
  
  // Test capture untuk validasi
  camera_fb_t* test = esp_camera_fb_get();
  if (test) {
    Serial.printf("[CAM] ✅ Init OK - Test frame: %d bytes (Mode: %s)\n", 
                  test->len, hasPsram ? "PSRAM" : "DRAM");
    esp_camera_fb_return(test);
    return true;
  } else {
    Serial.println("[CAM-ERR] Init OK but fb_get failed - memory issue?");
    return false;
  }
}

// ===================== SETUP/LOOP =====================
void setup(){
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200); 
  delay(1000);
  
  Serial.println("");
  Serial.println("════════════════════════════════════════════");
  Serial.println("   ESP32-CAM SmartParcel - NO HOLDER MODE   ");
  Serial.println("════════════════════════════════════════════");
  Serial.println("   Firmware: esp32cam-no-holder v1.2        ");
  Serial.println("   Features:                                ");
  Serial.println("   ✓ HC-SR04 Detection                      ");
  Serial.println("   ✓ Instant Photo Capture                  ");
  Serial.println("   ✓ VGA Quality (640x480) - No PSRAM       ");
  Serial.println("   ✓ Optimized for Clone Modules            ");
  Serial.println("   ✓ Retry Upload Until Success             ");
  Serial.println("   ✓ WhatsApp Notification                  ");
  Serial.println("   ✓ Gallery Save                           ");
  Serial.println("   ✓ Buzzer Alert                           ");
  Serial.println("   ✗ NO Solenoid Holder                     ");
  Serial.println("════════════════════════════════════════════");
  Serial.println("");
  Serial.println("[BOOT] Starting initialization...");

  // IO init
  Serial.println("[BOOT] Initializing GPIO...");
  pinMode(PIN_TRIG, OUTPUT); digitalWrite(PIN_TRIG, LOW);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  relayWrite(PIN_BUZZER, false);
  pinMode(PIN_FLASH, OUTPUT); digitalWrite(PIN_FLASH, LOW);
  Serial.println("[BOOT] GPIO OK");

  // Check PSRAM availability (optional for AI-Thinker)
  Serial.println("[BOOT] Checking PSRAM...");
  bool hasPsram = psramFound();
  if (!hasPsram) {
    Serial.println("[BOOT] PSRAM not auto-detected, trying manual init...");
    if (psramInit()) {
      hasPsram = true;
      Serial.printf("[BOOT] ✅ Manual PSRAM init SUCCESS!\n");
      Serial.printf("[BOOT] PSRAM Size: %d bytes\n", ESP.getPsramSize());
      Serial.printf("[BOOT] Free PSRAM: %d bytes\n", ESP.getFreePsram());
    } else {
      Serial.println("[BOOT] ⚠️ Manual PSRAM init failed - will use DRAM mode");
    }
  }
  
  if (hasPsram) {
    Serial.printf("[BOOT] ✅ PSRAM found: %d bytes\n", ESP.getPsramSize());
    Serial.printf("[BOOT] Free PSRAM: %d bytes\n", ESP.getFreePsram());
    Serial.println("[BOOT] 📸 Will use HIGH QUALITY mode (UXGA 1600x1200)");
  } else {
    Serial.println("[BOOT] ⚠️ PSRAM NOT available - using DRAM mode");
    Serial.println("[BOOT] 📸 Will use VGA mode (640x480) - Good quality!");
    Serial.println("[BOOT] ℹ️ Note: Your ESP32-CAM module does not have PSRAM chip");
    Serial.println("[BOOT]    This is normal for some clone modules");
    Serial.println("[BOOT]    VGA resolution is sufficient for package detection");
  }

  Serial.println("[BOOT] Initializing Camera...");
  if (!initCameraSafe()){
    Serial.println("[ERR] Camera init FAILED!"); 
    Serial.println("[ERR] Check camera connection and power");
    Serial.println("[ERR] Restarting in 5 seconds...");
    delay(5000); 
    ESP.restart();
  }
  Serial.println("[BOOT] Camera OK");

  // Test camera
  Serial.println("[BOOT] Testing camera...");
  flashOn(true); delay(100);
  camera_fb_t* testFb = esp_camera_fb_get();
  flashOn(false);
  if (testFb) {
    Serial.printf("[BOOT] Camera test OK (%d bytes)\n", testFb->len);
    esp_camera_fb_return(testFb);
    
    // CRITICAL: Flush buffer after test to prevent first detection failure
    Serial.println("[BOOT] Flushing camera buffer after test...");
    for(int i = 0; i < 5; i++) {
      camera_fb_t* flush = esp_camera_fb_get();
      if (flush) {
        esp_camera_fb_return(flush);
      }
      delay(30);
    }
    Serial.println("[BOOT] Buffer flushed - ready for detection");
  } else {
    Serial.println("[WARN] Camera test failed, but continuing...");
  }

  // Test ultrasonic
  Serial.println("[BOOT] Testing HC-SR04...");
  delay(500);
  float testCm = ultraOne();
  if (!isnan(testCm)) {
    Serial.printf("[BOOT] HC-SR04 test OK (%.1f cm)\n", testCm);
  } else {
    Serial.println("[WARN] HC-SR04 test FAILED - Check connections:");
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
  
  Serial.println("");
  Serial.println("════════════════════════════════════════════");
  Serial.println("   ✅ SYSTEM READY - NO HOLDER MODE         ");
  Serial.println("════════════════════════════════════════════");
  Serial.printf("   Detection Range: %.1f - %.1f cm\n", S.minCm, S.maxCm);
  Serial.printf("   Cooldown: %d seconds\n", DETECTION_COOLDOWN_MS/1000);
  Serial.printf("   Buzzer Duration: %d seconds\n", S.buzzerMs/1000);
  Serial.printf("   Buzzer Status: %s\n", S.buzzerEnabled ? "ENABLED" : "DISABLED");
  Serial.println("════════════════════════════════════════════");
  Serial.println("   MQTT Buzzer Commands:                    ");
  Serial.println("   - {\"buzzer\":{\"enable\":true}}         ");
  Serial.println("   - {\"buzzer\":{\"disable\":true}}        ");
  Serial.println("   - {\"buzzer\":{\"stop\":true}}           ");
  Serial.println("════════════════════════════════════════════");
  Serial.println("");
}

void loop(){
  // Reconnect WiFi
  if (WiFi.status()!=WL_CONNECTED){
    if (millis() - lastReconnectTry > RECONNECT_COOLDOWN){
      lastReconnectTry = millis();
      esp_wifi_connect();
      Serial.println("[WIFI] Reconnect tick");
    }
  }

  if (!mqtt.connected()) ensureMQTT();
  mqtt.loop();

  // Ultrasonic detection & publish
  if (millis()-tLastPub > 1000){
    tLastPub = millis();
    float cm = ultraCmStable();
    lastCm = cm;

    if (!isnan(cm)){
      char js[48]; snprintf(js, sizeof(js), "{\"cm\":%.2f}", cm);
      mqtt.publish(T_DIST.c_str(), js, false);
      Serial.printf("[ULTRA] %.2f cm\n", cm);
    } else {
      char js[128]; 
      snprintf(js, sizeof(js), "{\"cm\":null,\"error\":\"sensor_timeout\"}");
      mqtt.publish(T_DIST.c_str(), js, false);
      Serial.println("[ULTRA] NaN - Sensor timeout");
    }

    // Detection logic
    if (!isnan(cm)){
      bool inWindow = (cm>=S.minCm && cm<=S.maxCm);
      bool cooldownActive = (millis() - lastDetection) < DETECTION_COOLDOWN_MS;

      if (inWindow && !busy && !cooldownActive){
        // TRIGGER DETECTION PIPELINE
        runDetectionPipeline(cm);
      } else if (inWindow && cooldownActive) {
        unsigned long remainingSec = (DETECTION_COOLDOWN_MS - (millis() - lastDetection)) / 1000;
        Serial.printf("[ULTRA] Detection blocked - Cooldown active (%lu seconds remaining)\n", remainingSec);
      }
    }
  }

  delay(5);
}
