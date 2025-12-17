# 📱 SmartParcel Mobile App

Modern React + TypeScript mobile app for SmartParcel IoT system.

## ✅ Status: Connected to VPS Backend

```
Backend: http://3.27.11.106:9090
Status:  ✅ Online & Verified
MQTT:    ✅ Connected (16 topics)
AI:      ✅ Ready (9 Gemini keys)
```

---

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Access: **http://localhost:5173**

---

## 🔐 Default Login

**First Login:**
- Username: `zamn`
- Password: `admin123`

⚠️ **You will be prompted to:**
1. Change password
2. Set PIN for device control

---

## 🧪 Test Backend Connection

```bash
node test-backend-connection.js
```

Expected output:
```
✅ Health Check: 200 OK
✅ AI Health: 200 OK
✅ AI Stats: 200 OK
```

---

## 📚 Documentation

- **[BACKEND_CONNECTION.md](./BACKEND_CONNECTION.md)** - Full VPS connection guide
- **[test-backend-connection.js](./test-backend-connection.js)** - Automated API tests

---

## 🛠 Tech Stack

- **React 19** + **TypeScript**
- **Vite** - Fast build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Router** - Navigation
- **Framer Motion** - Animations
- **Lucide React** - Icons

---

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Route pages (Dashboard, Login, etc.)
├── services/      # API service layer
├── store/         # Zustand state management
├── hooks/         # Custom React hooks
└── utils/         # Helper functions
```

---

## 🔌 API Configuration

Backend API configured in `src/services/api.ts`:

```typescript
export const API_URL = 'http://3.27.11.106:9090/api';
```

### Available Endpoints

**Auth:**
- `POST /auth/login` - User login
- `POST /auth/first-setup` - First-time setup
- `POST /auth/verify-pin` - Verify device PIN
- `POST /auth/change-password` - Change password
- `POST /auth/change-pin` - Change PIN

**Packages:**
- `GET /packages` - Get package history
- `POST /v1/packages` - Create package (ESP32)

**Device:**
- `GET /device/status` - Get device status
- `GET /device/settings` - Get settings
- `PUT /device/settings` - Update settings
- `POST /device/control/open` - Open box
- `POST /device/control/close` - Close box
- `POST /device/control/lock` - Lock door
- `POST /device/control/unlock` - Unlock door

**AI:**
- `GET /ai/health` - AI engine health
- `GET /ai/stats` - AI statistics
- `POST /ai/verify-package` - Verify package

---

## 🧪 Testing

Run connection tests:
```bash
node test-backend-connection.js
```

Manual API test:
```bash
curl http://3.27.11.106:9090/health
```

---

## 🚨 Troubleshooting

**Can't connect to backend?**
1. Check backend health: `curl http://3.27.11.106:9090/health`
2. Verify VPS is running
3. Check PM2 logs: `pm2 logs smartparcel-backend`

**Login fails?**
- Use default credentials: `zamn` / `admin123`
- Complete first-time setup when prompted

**API timeout?**
- Default timeout: 30 seconds
- Check network connection
- Verify backend is not overloaded

---

## 📦 Production Build

```bash
npm run build
npm run preview
```

Build output: `dist/` directory

---

## 🔐 Security Notes

- Auth tokens stored in localStorage
- PIN lock after 2 minutes of inactivity
- JWT-based authentication
- Protected routes with AuthGuard

---

**Version**: 2.1.0  
**Last Updated**: December 16, 2025  
**License**: MIT  
**Author**: SmartParcel Team
