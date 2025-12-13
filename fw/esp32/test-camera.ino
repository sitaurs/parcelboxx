// Test Camera ESP32-CAM AI-Thinker
// Simple test untuk cek apakah kamera berfungsi atau tidak

#include "esp_camera.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Kamera pins (AI-Thinker)
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

// Flash LED
#define PIN_FLASH 4

void setup() {
  // Disable brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║     ESP32-CAM Camera Test             ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println("");
  
  // Flash LED setup
  pinMode(PIN_FLASH, OUTPUT);
  digitalWrite(PIN_FLASH, LOW);
  
  Serial.println("[TEST] Step 1: Initializing Camera...");
  
  // Camera configuration
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size & quality
  config.frame_size = FRAMESIZE_VGA; // 640x480
  config.jpeg_quality = 12; // 0-63, lower = better quality
  config.fb_count = 1;
  config.fb_location = CAMERA_FB_IN_DRAM;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  
  if (err != ESP_OK) {
    Serial.println("");
    Serial.println("╔════════════════════════════════════════╗");
    Serial.println("║          ❌ CAMERA FAILED!             ║");
    Serial.println("╚════════════════════════════════════════╝");
    Serial.printf("[ERR] Camera init failed with error 0x%x\n", err);
    Serial.println("");
    Serial.println("Possible causes:");
    Serial.println("  1. Camera module not connected properly");
    Serial.println("  2. Loose FFC cable connection");
    Serial.println("  3. Wrong camera module (not OV2640)");
    Serial.println("  4. Insufficient power supply");
    Serial.println("  5. Damaged camera module");
    Serial.println("");
    Serial.println("Restarting in 10 seconds...");
    delay(10000);
    ESP.restart();
    return;
  }
  
  Serial.println("[TEST] ✓ Camera initialized successfully!");
  Serial.println("");
  
  // Get camera sensor info
  sensor_t * s = esp_camera_sensor_get();
  if (s) {
    Serial.println("[INFO] Camera Sensor Details:");
    Serial.printf("  - Model: OV%04X\n", s->id.PID);
    Serial.printf("  - Frame Size: %d x %d\n", 
                  s->status.framesize == FRAMESIZE_VGA ? 640 : 0,
                  s->status.framesize == FRAMESIZE_VGA ? 480 : 0);
    Serial.printf("  - Quality: %d\n", s->status.quality);
  }
  Serial.println("");
  
  Serial.println("[TEST] Step 2: Testing Photo Capture...");
  Serial.println("        Flash LED will blink during capture");
  Serial.println("");
  
  // Test capture 3 kali
  for (int i = 1; i <= 3; i++) {
    Serial.printf("[TEST] Attempt %d/3: ", i);
    
    // Flash ON
    digitalWrite(PIN_FLASH, HIGH);
    delay(100);
    
    // Capture
    camera_fb_t * fb = esp_camera_fb_get();
    
    // Flash OFF
    digitalWrite(PIN_FLASH, LOW);
    
    if (!fb) {
      Serial.println("❌ FAILED - No frame buffer");
      delay(1000);
      continue;
    }
    
    // Success
    Serial.printf("✓ SUCCESS - Captured %d bytes (", fb->len);
    Serial.print(fb->width);
    Serial.print("x");
    Serial.print(fb->height);
    Serial.println(")");
    
    // Return frame buffer
    esp_camera_fb_return(fb);
    delay(1000);
  }
  
  Serial.println("");
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║      ✓ CAMERA TEST COMPLETED!         ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println("");
  Serial.println("Camera is working properly!");
  Serial.println("You can now upload the main firmware.");
  Serial.println("");
}

void loop() {
  // Blink LED setiap 2 detik untuk indikasi board masih hidup
  static unsigned long lastBlink = 0;
  
  if (millis() - lastBlink > 2000) {
    lastBlink = millis();
    digitalWrite(PIN_FLASH, HIGH);
    delay(50);
    digitalWrite(PIN_FLASH, LOW);
  }
  
  delay(100);
}
