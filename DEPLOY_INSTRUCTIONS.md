# 🚀 DEPLOYMENT INSTRUCTIONS - Backend v2.1.0

## Quick Summary

Code sudah di-commit dan pushed ke GitHub. Ada 3 cara untuk deploy ke VPS:

---

## **OPSI 1: Automated Deployment (Recommended)**

### Requirement:
- SSH key setup ke VPS (one-time setup)
- SSH access ke VPS

### Setup SSH Key (One-time only)

```powershell
# Dari Windows:
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519
```

Lalu add public key ke VPS:
```bash
# Di VPS:
mkdir -p ~/.ssh
cat >> ~/.ssh/authorized_keys << 'EOF'
your-public-key-content
EOF
chmod 600 ~/.ssh/authorized_keys
```

### Deploy Command

**Linux/VPS:**
```bash
ssh root@3.27.0.139 "bash -s" < backend-app/deploy.sh
```

**Windows:**
```powershell
cd backend-app
.\deploy.bat
```

---

## **OPSI 2: Manual Git Pull (Fastest if already deployed)**

```bash
# SSH ke VPS
ssh root@3.27.0.139

# Pull latest code
cd /root/smartparcel-backend/backend-app
git pull origin main

# Install dependencies
npm install --production

# Restart service
pm2 restart smartparcel-backend
# atau
systemctl restart smartparcel-backend
```

---

## **OPSI 3: Manual Step by Step**

```bash
# 1. SSH ke VPS
ssh root@3.27.0.139

# 2. Clone or update repo
cd /root
rm -rf smartparcel-backend  # jika perlu fresh install
git clone https://github.com/sitaurs/parcelboxx.git smartparcel-backend
cd smartparcel-backend/backend-app

# 3. Install
npm install --production

# 4. Setup .env (copy dari backup atau create baru)
# Edit .env dengan nilai yang benar

# 5. Stop old service
pm2 stop smartparcel-backend

# 6. Start new service
pm2 start server.js --name smartparcel-backend

# 7. Verify
curl http://localhost:9090/health
```

---

## ✅ Verification Checklist

Setelah deploy, cek:

```bash
# 1. API Health
curl http://3.27.0.139:9090/health

# 2. Login endpoint
curl -X POST http://3.27.0.139:9090/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 3. MQTT connection (check logs)
pm2 logs smartparcel-backend | grep -i mqtt

# 4. Device status
# Gunakan token dari login untuk cek:
curl http://3.27.0.139:9090/api/device/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. AI service
curl http://3.27.0.139:9090/api/ai/health
```

---

## 📋 Important Notes

### v2.1.0 Changes Deployed:
- ✅ AI Baseline Photo Comparison
- ✅ ESP32 Holder Release Event  
- ✅ Improved MQTT Integration
- ✅ Flash default 300ms (was 150ms)
- ✅ Holder safety cap 10s max

### Environment Variables Needed:
```env
PORT=9090
NODE_ENV=production
BASE_URL=http://3.27.0.139:9090
JWT_SECRET=your-secret
DEVICE_JWT_SECRET=your-device-secret
MQTT_BROKER=mqtt://3.27.0.139:1884
MQTT_USER=mcuzaman
MQTT_PASS=McuZaman#2025Aman!
DEVICE_ID=box-01
GOWA_API_URL=http://gowa1.flx.web.id
GOWA_USERNAME=gowa-user
GOWA_PASSWORD=gowa-pass
GEMINI_API_KEY_1=key1
GEMINI_API_KEY_2=key2
# ... up to GEMINI_API_KEY_9
```

### Service Management:

```bash
# Check status
pm2 status

# View logs
pm2 logs smartparcel-backend

# Restart
pm2 restart smartparcel-backend

# Monitor
pm2 monit

# Save for auto-start
pm2 save
pm2 startup
```

---

## 🆘 Troubleshooting

### Service tidak mau start:
```bash
# Check logs
pm2 logs smartparcel-backend

# Check port conflict
lsof -i :9090

# Check Node version
node --version  # harus 16+
```

### MQTT tidak connect:
```bash
# Test MQTT
mosquitto_pub -h 3.27.0.139 -p 1884 -u mcuzaman -P "McuZaman#2025Aman!" -t test -m "hello"

# Check mosquitto
systemctl status mosquitto
docker logs mosquitto
```

### Database error:
```bash
# Check DB files
ls -la /root/smartparcel-backend/backend-app/db/

# Check permissions
chmod 777 /root/smartparcel-backend/backend-app/db/
```

---

## 📊 Current Status

**Repo:** https://github.com/sitaurs/parcelboxx  
**Latest Tag:** v2.1.0  
**Deploy Date:** December 16, 2025  
**Status:** ✅ Ready to Deploy

---

## Next Steps

1. **Setup SSH key** (jika belum)
2. **Run deployment script** (Opsi 1) atau manual pull (Opsi 2)
3. **Verify** dengan checklist di atas
4. **Monitor** logs untuk memastikan semuanya berjalan
5. **Test** API endpoints dan MQTT connectivity

---

**Questions?** Check DEPLOYMENT_GUIDE_v2.1.0.md untuk detail lebih lengkap.
