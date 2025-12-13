# 📦 SmartParcel - IoT Smart Box Monitoring System

> **Sistem monitoring kotak paket pintar berbasis IoT dengan ESP32-CAM, MQTT, dan notifikasi WhatsApp**

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Status](https://img.shields.io/badge/status-production-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## 🌟 Ringkasan Project

SmartParcel adalah sistem IoT lengkap untuk monitoring kotak penyimpanan paket dengan fitur:
- 📸 **Auto-capture foto** saat paket masuk
- 🔒 **Remote control** kunci solenoid
- 📱 **Notifikasi WhatsApp** real-time dengan foto
- 📊 **Dashboard web & mobile** untuk monitoring
- 🌐 **RESTful API** untuk integrasi sistem lain

### 🏗️ Arsitektur Sistem

```
┌─────────────────┐      MQTT      ┌──────────────────┐
│  ESP32-CAM      │◄──────────────►│  Backend Node.js │
│  + ESP8266      │  Port 1883     │  Port 9090       │
│  (Firmware)     │                │  (Main API)      │
└─────────────────┘                └────────┬─────────┘
                                            │
                                            │ HTTP
                                            │
                   ┌────────────────────────┼─────────────────┐
                   │                        │                 │
          ┌────────▼────────┐     ┌─────────▼────────┐  ┌────▼──────┐
          │  Mobile App     │     │  WhatsApp API    │  │  GOWA API │
          │  (React/Vite)   │     │  Port 3000       │  │  External │
          │  Port 5173      │     │  (Baileys)       │  │           │
          └─────────────────┘     └──────────────────┘  └───────────┘
```

## 📚 Dokumentasi Lengkap

Dokumentasi detail tersedia dalam folder `/docs`:

### 1️⃣ [**Fitur & Cara Penggunaan**](docs/01-features-usage.md)
- ✨ Daftar lengkap fitur aplikasi
- 📖 Tutorial penggunaan setiap halaman
- 🎯 Use case dan skenario penggunaan
- 🔧 Konfigurasi dan pengaturan

### 2️⃣ [**Build & Deployment**](docs/02-build-deploy.md)
- 📦 Build APK untuk Android
- 🚀 Deploy ke VPS (Ubuntu/Debian)
- ⚙️ Setup environment dan dependencies
- 🔒 Konfigurasi SSL/HTTPS

### 3️⃣ [**Arsitektur Sistem**](docs/03-system-architecture.md)
- 🏗️ Diagram arsitektur lengkap
- 📡 MQTT protocol flow
- 💾 Database schema
- 🔄 Data flow antar komponen

### 4️⃣ [**API Reference**](docs/04-api-reference.md)
- 🌐 REST API endpoints
- 📝 Request/Response examples
- 🔌 MQTT topics & payloads
- 🤖 GOWA WhatsApp API integration

---

## ⚡ Quick Start

### Prerequisites

- **Node.js** v18+ (backend & frontend)
- **MongoDB** atau JSON file storage
- **MQTT Broker** (Mosquitto recommended)
- **ESP32-CAM** + **ESP8266** boards
- **Arduino IDE** untuk upload firmware

### 🚀 Instalasi Cepat

```bash
# 1. Clone repository
git clone https://github.com/sitaurs/parcelbox.git
cd parcelbox

# 2. Install backend dependencies
cd backend-app
npm install
cp .env.example .env
# Edit .env sesuai konfigurasi

# 3. Install frontend dependencies
cd ../mobile-app
npm install

# 4. Install WhatsApp backend
cd ../backend-whatsapp
npm install
cp .env.example .env
# Edit .env sesuai konfigurasi
```

### ▶️ Menjalankan Aplikasi

```bash
# Terminal 1: Backend utama
cd backend-app
npm start

# Terminal 2: WhatsApp service
cd backend-whatsapp
npm start

# Terminal 3: Frontend development
cd mobile-app
npm run dev
```

Akses aplikasi di: **http://localhost:5173**

---

## 🔧 Konfigurasi Environment

### Backend App (`backend-app/.env`)

```env
PORT=9090
MQTT_BROKER=mqtt://13.213.57.228:1883
MQTT_USERNAME=smartparcel
MQTT_PASSWORD=SmartParcel2025!
GOWA_API_URL=http://gowa1.flx.web.id
GOWA_API_USERNAME=smartparcel
GOWA_API_PASSWORD=SmartParcel2025!
```

### WhatsApp Backend (`backend-whatsapp/.env`)

```env
PORT=3000
WHATSAPP_SESSION_PATH=./auth_info
BACKEND_API_URL=http://localhost:9090
```

### Mobile App (`mobile-app/.env`)

```env
VITE_API_URL=http://localhost:9090/api
```

---

## 📱 Fitur Utama

### 1. Dashboard Real-time
- Status device online/offline
- Statistik paket (hari ini, minggu ini, bulan ini, total)
- Status kunci (locked/unlocked)
- Monitoring jarak sensor ultrasonik

### 2. Device Control
- **Unlock** - Buka kunci solenoid
- **Lock** - Kunci solenoid
- **Capture Photo** - Ambil foto manual
- **Test Buzzer** - Test speaker/buzzer
- **Test Flash** - Test LED flash

### 3. WhatsApp Integration
- Pairing WhatsApp via QR/code
- Pilih grup penerima notifikasi
- Kirim foto + info paket otomatis
- Logout dan reset koneksi

### 4. Gallery & History
- Timeline foto paket
- Lihat detail metadata (timestamp, jarak)
- Download foto
- Filter berdasarkan tanggal

### 5. Settings
- Konfigurasi sensor ultrasonik
- Auto-lock timer
- Buzzer duration
- Flash brightness
- PIN lock protection

---

## 🛠️ Tech Stack

### Backend
- **Node.js** v18+
- **Express.js** v4.18
- **MQTT.js** v5.3
- **Axios** v1.6

### Frontend
- **React** v18.2
- **TypeScript** v5.2
- **Vite** v5.0
- **TailwindCSS** v3.4
- **Lucide Icons**

### Hardware
- **ESP32-CAM** (AI-Thinker)
- **ESP8266** NodeMCU
- **HC-SR04** Ultrasonic sensor
- **Solenoid Lock** 12V
- **Relay Module** 5V

### External Services
- **GOWA API** (go-whatsapp-web-multidevice v7.8.2)
- **MQTT Broker** Mosquitto
- **WhatsApp Business API** (via Baileys)

---

## 📊 Statistik Project

```
Total Files      : 150+
Lines of Code    : ~15,000
Backend Routes   : 25 endpoints
MQTT Topics      : 12 topics
React Components : 20 components
Database Tables  : 7 collections
```

---

## 🤝 Kontributor

- **Backend Developer** - System architecture, MQTT, API
- **Frontend Developer** - React UI/UX, mobile-responsive
- **IoT Engineer** - ESP32/ESP8266 firmware
- **DevOps** - VPS deployment, CI/CD

---

## 📄 License

MIT License - bebas digunakan untuk project pribadi maupun komersial.

---

## 🆘 Support & Contact

- 📧 Email: support@smartparcel.com
- 💬 WhatsApp: +62 878-5346-2867
- 🐛 Issues: [GitHub Issues](https://github.com/sitaurs/parcelbox/issues)
- 📖 Wiki: [Project Wiki](https://github.com/sitaurs/parcelbox/wiki)

---

## 🔄 Update Log

### v2.0.0 (Current)
- ✅ Fixed WhatsApp integration dengan GOWA API
- ✅ Fixed Dashboard polling (429 error)
- ✅ Improved group selection UI
- ✅ Complete documentation overhaul

### v1.0.0
- 🎉 Initial release
- Basic MQTT communication
- Photo capture & storage
- WhatsApp notification

---

**⭐ Jika project ini membantu, berikan star di GitHub!**

[🔝 Back to Top](#-smartparcel---iot-smart-box-monitoring-system)
