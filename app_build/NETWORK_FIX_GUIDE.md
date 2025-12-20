# Network Configuration Fix for VPS Backend Connection

## Problem
Mobile app tidak bisa connect ke backend VPS (http://3.27.11.106:9090) setelah diinstall di Android.

## Root Cause
1. **Android Security Policy**: Android 9+ (API 28+) default memblokir cleartext HTTP traffic
2. **Capacitor Config**: `androidScheme: 'https'` conflict dengan HTTP API
3. **Missing Network Security Config**: Tidak ada izin eksplisit untuk HTTP traffic ke IP VPS

## Solution Applied

### 1. Updated `capacitor.config.ts`
```typescript
server: {
  androidScheme: 'http',        // Changed from 'https'
  cleartext: true,              // Allow cleartext traffic
  hostname: 'localhost'
}
```

### 2. Created `network_security_config.xml`
```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">3.27.11.106</domain>
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
    </domain-config>
</network-security-config>
```

### 3. Updated `AndroidManifest.xml`
```xml
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## Testing Checklist

- [ ] Install APK: `SmartParcel-v1.0.0-debug-20251220-2314-network-fixed.apk`
- [ ] Grant all permissions (Internet, Storage, etc.)
- [ ] Check if app shows "online" status
- [ ] Test Device Settings (Buzzer toggle, Threshold slider)
- [ ] Test Device Test (Camera, Buzzer)
- [ ] Check History page loads data

## VPS Backend Requirements

Pastikan backend di VPS berjalan:
```bash
# Cek apakah backend running
curl http://3.27.11.106:9090/api/health
# atau
curl http://3.27.11.106:9090/api/device/status

# Cek port open
telnet 3.27.11.106 9090
```

## Firewall & Security

Jika masih tidak konek, cek:
1. **VPS Firewall**: Port 9090 harus terbuka untuk incoming connections
2. **Security Group (AWS)**: Inbound rules untuk port 9090 dari any IP (0.0.0.0/0)
3. **Backend CORS**: Pastikan API accept requests dari mobile app

## Build Info

- **APK**: `SmartParcel-v1.0.0-debug-20251220-2314-network-fixed.apk`
- **Size**: 9.59 MB
- **Build Time**: December 20, 2025 - 23:14
- **Changes**: Network security config + cleartext HTTP support

## Alternative: HTTPS Setup

Untuk production, sebaiknya gunakan HTTPS:
1. Setup reverse proxy (nginx) di VPS
2. Install SSL certificate (Let's Encrypt)
3. Update API_URL ke `https://yourdomain.com/api`
4. Remove cleartext traffic config
