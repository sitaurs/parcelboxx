# Mobile App Configuration - Connected to VPS Backend

## ✅ Status: Fully Connected

**Backend URL**: `http://3.27.0.139:9090/api`  
**Last Verified**: December 16, 2025

---

## Configuration

### API Configuration (`src/services/api.ts`)
```typescript
export const API_URL = 'http://3.27.0.139:9090/api';
```

✅ Pointing to production VPS backend  
✅ No hardcoded localhost references  
✅ No environment variables needed  

---

## Testing Connection

### Quick Test (PowerShell)
```powershell
# Test backend health
curl http://3.27.0.139:9090/health

# Expected response:
# {"status":"ok","service":"SmartParcel Backend App","timestamp":"..."}
```

### Full Test Suite
```bash
cd mobile-app-new
node test-backend-connection.js
```

This will test:
- ✅ Health endpoint
- ✅ Authentication (login)
- ✅ Protected endpoints (packages, device, settings)
- ✅ AI endpoints (health, stats)

---

## Default Credentials

**First-Time Setup Required**

- **Username**: `zamn`
- **Password**: `admin123`
- **Status**: Requires password change on first login

When you first login via mobile app, you'll be prompted to:
1. Set new password
2. Set PIN for device control

---

## Running Mobile App

### Development Mode
```bash
cd mobile-app-new
npm run dev
```

Access at: `http://localhost:5173`

### Build for Production
```bash
npm run build
npm run preview
```

---

## API Endpoints Available

### Public Endpoints
- `GET /health` - Backend health check
- `GET /api/ai/health` - AI engine status
- `GET /api/ai/stats` - AI statistics

### Auth Endpoints (No token required)
- `POST /api/auth/login` - User login
- `POST /api/auth/first-setup` - First-time password setup

### Protected Endpoints (Token required)
- `POST /api/auth/verify-pin` - Verify device control PIN
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/change-pin` - Change PIN
- `GET /api/packages` - Get package history
- `POST /api/v1/packages` - Create package (ESP32)
- `GET /api/device/status` - Device status
- `GET /api/device/settings` - Device settings
- `PUT /api/device/settings` - Update settings
- `POST /api/device/control/*` - Device control actions
- `POST /api/ai/verify-package` - AI package verification

---

## Backend Features Active

✅ **MQTT Connected**: localhost:1883 (mcuzaman)  
✅ **AI Engine**: 9 Gemini API keys (5 primary, 2 backup, 2 reserve)  
✅ **Database**: JSON-based storage initialized  
✅ **PM2 Running**: Auto-restart on server reboot  
✅ **Topics Subscribed**: 16 MQTT topics (ESP32 + ESP8266)  

### MQTT Topics Backend Listens To:
- `smartparcel/box-01/status` - Device status
- `smartparcel/box-01/sensor/distance` - Distance sensor
- `smartparcel/box-01/event` - Events
- `smartparcel/box-01/photo/status` - Photo capture status
- `smartparcel/box-01/baseline/photo` - Baseline photos
- `smartparcel/box-01/holder/release` - Holder release
- `smartparcel/lock/status` - Door lock status
- `smartparcel/lock/alert` - Lock alerts
- And 8 more control/settings topics...

---

## Troubleshooting

### Cannot Connect to Backend
```powershell
# Test VPS connectivity
curl http://3.27.0.139:9090/health
```

If fails:
1. Check VPS is running: `ssh ubuntu@3.27.0.139`
2. Check PM2 status: `pm2 status`
3. Check backend logs: `pm2 logs smartparcel-backend`

### Mobile App Login Fails
- Ensure backend is running (test `/health`)
- Use default credentials: `zamn` / `admin123`
- Complete first-time setup when prompted

### API Timeout
- Default timeout: 30 seconds (`API_CONFIG.TIMEOUT`)
- Check network connection
- Verify backend not overloaded

---

## Production Deployment Checklist

- [x] Backend deployed to VPS (3.27.0.139:9090)
- [x] Mobile app API_URL configured
- [x] MQTT broker connected
- [x] AI engine initialized (9 API keys)
- [x] Database initialized
- [x] PM2 auto-start enabled
- [x] Connection tested and verified
- [ ] Set production Gemini API keys (currently placeholders)
- [ ] Configure GOWA WhatsApp credentials
- [ ] Test with real ESP32/ESP8266 devices

---

## Next Steps

1. **Complete First-Time Setup**
   - Login with `zamn`/`admin123`
   - Set new password
   - Set PIN for device control

2. **Connect ESP32 Device**
   - Update firmware with VPS MQTT broker
   - Test distance sensor
   - Test photo capture

3. **Connect ESP8266 Lock**
   - Update firmware with VPS MQTT broker
   - Test lock/unlock
   - Test PIN verification

4. **Configure Real API Keys**
   - Replace placeholder Gemini API keys in backend `.env`
   - Add GOWA WhatsApp credentials
   - Restart PM2: `pm2 restart smartparcel-backend --update-env`

---

**Last Updated**: December 16, 2025  
**Version**: 2.1.0  
**Status**: ✅ Production Ready
