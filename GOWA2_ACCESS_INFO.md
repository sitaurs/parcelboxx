# 🚀 GOWA2 WhatsApp API - Access Information

## 📋 Overview
**GOWA2** adalah instance kedua dari WhatsApp API Multi-Device berbasis Go (aldinokemal2104/go-whatsapp-web-multidevice) yang di-deploy khusus untuk project teman.

---

## 🌐 Access URLs

### Web Interface (QR Code Login)
```
https://gowa2.flx.web.id
```

### API Base URL
```
https://gowa2.flx.web.id/api
```

### API Documentation
```
https://gowa2.flx.web.id/app/api
```

---

## 🔐 Server Information

| Property | Value |
|----------|-------|
| **Domain** | gowa2.flx.web.id |
| **SSL** | ✅ Active (Let's Encrypt) |
| **Port** | 3003 (internal) |
| **Container** | gowa2_whatsapp_go |
| **Version** | WhatsApp API v7.10.1 |
| **Status** | ✅ Running |

---

## 📱 Setup WhatsApp Connection

### Step 1: Access Web Interface
1. Buka browser ke `https://gowa2.flx.web.id`
2. Klik tab **"Devices"** atau **"Login"**

### Step 2: Scan QR Code
1. Buka WhatsApp di HP
2. Pilih **Settings** → **Linked Devices**
3. Tap **"Link a Device"**
4. Scan QR code yang muncul di web interface

### Step 3: Verify Connection
```bash
curl https://gowa2.flx.web.id/api/device/info
```

Response jika connected:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "device": "WhatsApp",
    "user_name": "Your Name",
    "user_jid": "628xxxxx@s.whatsapp.net"
  }
}
```

---

## 📡 API Examples

### 1. Send Text Message
```bash
curl -X POST https://gowa2.flx.web.id/api/send/message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "628123456789",
    "message": "Hello from GOWA2!"
  }'
```

### 2. Send Image
```bash
curl -X POST https://gowa2.flx.web.id/api/send/image \
  -F "phone=628123456789" \
  -F "caption=Check this image" \
  -F "image=@/path/to/image.jpg"
```

### 3. Get Device Status
```bash
curl https://gowa2.flx.web.id/api/device/info
```

### 4. Logout Device
```bash
curl -X DELETE https://gowa2.flx.web.id/api/device/logout
```

---

## 🔧 Server Management (SSH Access Required)

### View Logs
```bash
sudo docker logs gowa2_whatsapp_go -f
```

### Restart Container
```bash
cd /opt/gowa2
sudo docker-compose restart
```

### Stop Container
```bash
cd /opt/gowa2
sudo docker-compose down
```

### Start Container
```bash
cd /opt/gowa2
sudo docker-compose up -d
```

### Check Status
```bash
sudo docker ps | grep gowa2
```

---

## 📂 File Structure

```
/opt/gowa2/
├── docker-compose.yml       # Container configuration
├── src/
│   └── .env                 # App configuration
└── storages/
    ├── database.db          # SQLite database
    └── sessions/            # WhatsApp session data
```

---

## 🛡️ Security Notes

1. **HTTPS Only**: SSL certificate active, auto-renew setiap 90 hari
2. **Session Storage**: WhatsApp session tersimpan di `/opt/gowa2/storages/`
3. **No Authentication**: API tidak memerlukan API key by default
4. **Firewall**: Port 3003 hanya accessible via nginx reverse proxy

---

## 📊 Performance

- **Uptime**: Auto-restart on failure
- **Max File Size**: 50MB (nginx limit)
- **Concurrent Requests**: Unlimited
- **Response Time**: ~100-500ms average

---

## 🆘 Troubleshooting

### Problem: QR Code tidak muncul
**Solution:**
```bash
sudo docker-compose restart
```

### Problem: Connection lost
**Solution:**
```bash
# Re-scan QR code di web interface
https://gowa2.flx.web.id
```

### Problem: API returns 500 error
**Solution:**
```bash
# Check logs
sudo docker logs gowa2_whatsapp_go --tail 50
```

### Problem: Container not running
**Solution:**
```bash
cd /opt/gowa2
sudo docker-compose up -d
```

---

## 📞 Support

- **VPS Server**: 3.27.11.106 (AWS ap-southeast-2)
- **Deploy Date**: December 17, 2025
- **Container Image**: aldinokemal2104/go-whatsapp-web-multidevice:latest
- **Documentation**: https://github.com/aldinokemal/go-whatsapp-web-multidevice

---

## ✅ Quick Test

Test API availability:
```bash
curl -I https://gowa2.flx.web.id
```

Expected response:
```
HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Content-Type: text/html; charset=utf-8
```

---

**Deployed by**: GitHub Copilot Agent  
**Status**: ✅ Production Ready  
**Last Updated**: December 17, 2025
