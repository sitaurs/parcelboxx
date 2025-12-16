# SmartParcel Backend Deployment Guide v2.1.0

## 📋 Pre-Deployment Checklist

- [x] Code committed to GitHub (v2.1.0 tag)
- [x] All fixes tested locally
- [ ] SSH key setup to VPS
- [ ] Node.js 16+ installed on VPS
- [ ] PM2/systemd service running

## 🔧 VPS Information

**Server:** 3.27.0.139 (AWS/Cloud)
**SSH Port:** 22
**Backend Path:** `/root/smartparcel-backend`
**Node Port:** 9090

## 📦 Deployment Steps

### Option 1: SSH Deploy (Recommended)

```bash
# 1. SSH ke VPS
ssh root@3.27.0.139

# 2. Clone latest code
cd /root
rm -rf smartparcel-backend
git clone https://github.com/sitaurs/parcelboxx.git smartparcel-backend
cd smartparcel-backend/backend-app

# 3. Install dependencies
npm install --production

# 4. Setup environment (jika belum ada)
# Copy .env dari backup atau setup baru
# Pastikan ENV variables sudah benar:
# - JWT_SECRET
# - DEVICE_JWT_SECRET  
# - MQTT_BROKER
# - GEMINI_API_KEY_1 sampai 9

# 5. Stop old service
pm2 stop smartparcel-backend
# or
systemctl stop smartparcel-backend

# 6. Start new service
npm start
# or
pm2 start server.js --name smartparcel-backend

# 7. Verify
curl http://localhost:9090/health
```

### Option 2: Git Pull (If already deployed)

```bash
cd /root/smartparcel-backend/backend-app

# Update code
git pull origin main

# Install any new dependencies
npm install --production

# Restart service
pm2 restart smartparcel-backend
# or
systemctl restart smartparcel-backend
```

### Option 3: SCP Manual Upload

```powershell
# From Windows development machine:

cd d:\projct\cdio2\backend-app

# Copy entire folder
scp -r .\ root@3.27.0.139:/root/smartparcel-backend-v2.1.0/

# Then SSH and:
# - Backup old folder
# - Move new folder
# - npm install
# - Restart service
```

## 🔄 Changes in v2.1.0

### Critical Updates
- **AI Engine Integration:** AIDetectionEngine now properly linked to MQTT
- **MQTT Topics:** New baseline photo capture flow
- **Flash Default:** Changed 150ms → 300ms for better visibility
- **Holder Safety:** Pulse capped to max 10 seconds

### Files Modified
```
backend-app/
├── server.js (AI Engine passing to MQTT)
├── routes/
│   ├── ai.js (getAIEngine export)
│   └── device.js (flash ms, holder cap)
├── mqtt/
│   └── client.js (baseline topics, holder event)
└── services/gemini/
    ├── AIDetectionEngine.js (baseline support)
    ├── GeminiClient.js (comparison methods)
    └── BaselinePhotoManager.js (new file)
```

## 🧪 Verification Steps After Deploy

```bash
# 1. Health check
curl -X GET http://3.27.0.139:9090/health

# 2. API endpoints
curl -X POST http://3.27.0.139:9090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 3. Check MQTT connection
# Monitor /root/smartparcel-backend/logs or pm2 logs

# 4. Device status
curl -X GET http://3.27.0.139:9090/api/device/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Check AI service
curl -X GET http://3.27.0.139:9090/api/ai/health \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 .env Requirements

Make sure these are set in VPS .env:

```env
# Backend
PORT=9090
NODE_ENV=production
BASE_URL=http://3.27.0.139:9090

# JWT
JWT_SECRET=your-secure-secret-key-here
DEVICE_JWT_SECRET=your-device-secret-key-here

# MQTT
MQTT_BROKER=mqtt://3.27.0.139:1884
MQTT_USER=mcuzaman
MQTT_PASS=McuZaman#2025Aman!

# Device
DEVICE_ID=box-01

# GOWA WhatsApp
GOWA_API_URL=http://gowa1.flx.web.id
GOWA_USERNAME=your-username
GOWA_PASSWORD=your-password

# Gemini AI (at least one key required)
GEMINI_API_KEY_1=your-key-1
GEMINI_API_KEY_2=your-key-2
... (up to 9 keys)
```

## 🆘 Troubleshooting

### Service won't start
```bash
# Check logs
pm2 logs smartparcel-backend
# or
journalctl -u smartparcel-backend -f

# Check port conflict
lsof -i :9090

# Check Node version
node --version  # Should be 16+
```

### MQTT connection issues
```bash
# Test MQTT broker
mosquitto_pub -h 3.27.0.139 -p 1884 -u mcuzaman -P "McuZaman#2025Aman!" -t test -m "hello"

# Check broker logs
docker logs mosquitto
```

### Gemini API not working
```bash
# Verify API keys exist in .env
grep GEMINI_API_KEY .env

# Check API key format (should start with ai-)
```

## 📊 Performance Notes

- First deployment: ~5-10 minutes (npm install)
- Subsequent updates: ~1-2 minutes
- Node process uses ~100-200MB RAM idle
- Database: JSON files in `/root/smartparcel-backend/backend-app/db/`

## 🔒 Security Notes

- Store .env securely (use PM2 ecosystem.config.js or systemd secrets)
- Never commit .env to git
- Rotate JWT_SECRET periodically
- Use strong passwords for MQTT
- Monitor access logs for suspicious activity

## 📞 Support

For deployment issues:
1. Check logs first
2. Verify .env configuration
3. Test API endpoints manually
4. Check MQTT broker status
5. Review GitHub issues: https://github.com/sitaurs/parcelboxx

---
**Version:** 2.1.0  
**Last Updated:** December 16, 2025  
**Status:** Ready for deployment
