// Test LCD I2C ESP8266 - Scan I2C Address & Test Display
// Upload sketch ini dulu untuk cek alamat I2C LCD

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Coba alamat yang umum: 0x27 atau 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\n========================================");
  Serial.println("ESP8266 LCD I2C Test");
  Serial.println("========================================");
  
  // I2C: SDA=D2(GPIO4), SCL=D1(GPIO5)
  Wire.begin(4, 5);
  Serial.println("[I2C] Initialized - SDA=D2(GPIO4), SCL=D1(GPIO5)");
  
  // Scan I2C bus untuk cari alamat device
  Serial.println("\n[I2C SCAN] Scanning...");
  byte error, address;
  int nDevices = 0;
  
  for (address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("[I2C SCAN] Device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println(" !");
      nDevices++;
    }
    else if (error == 4) {
      Serial.print("[I2C SCAN] Unknown error at address 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
    }
  }
  
  if (nDevices == 0) {
    Serial.println("[I2C SCAN] ERROR: No I2C devices found!");
    Serial.println("Cek koneksi:");
    Serial.println("  - SDA = D2 (GPIO4)");
    Serial.println("  - SCL = D1 (GPIO5)");
    Serial.println("  - VCC = 5V (atau 3.3V tergantung modul)");
    Serial.println("  - GND = GND");
  } else {
    Serial.println("[I2C SCAN] Scan complete\n");
  }
  
  // Test LCD dengan alamat 0x27
  Serial.println("[LCD] Testing 0x27...");
  lcd.init();
  lcd.backlight();
  delay(100);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Test LCD 0x27");
  lcd.setCursor(0, 1);
  lcd.print("Bisa kelihatan?");
  
  Serial.println("[LCD] Test message sent");
  Serial.println("========================================");
  Serial.println("Cek LCD sekarang:");
  Serial.println("1. Apakah backlight menyala?");
  Serial.println("2. Apakah ada teks di LCD?");
  Serial.println("3. Kalau gelap semua -> puter potensio (baut kecil di PCB LCD)");
  Serial.println("4. Kalau backlight nyala tapi no teks -> cek alamat I2C di atas");
  Serial.println("========================================\n");
}

void loop() {
  static unsigned long lastUpdate = 0;
  static int counter = 0;
  
  // Update counter tiap 1 detik
  if (millis() - lastUpdate > 1000) {
    lastUpdate = millis();
    counter++;
    
    lcd.setCursor(0, 1);
    lcd.print("Counter: ");
    lcd.print(counter);
    lcd.print("   "); // Clear trailing chars
    
    Serial.print("[LOOP] Counter: ");
    Serial.println(counter);
  }
  
  delay(10);
}
