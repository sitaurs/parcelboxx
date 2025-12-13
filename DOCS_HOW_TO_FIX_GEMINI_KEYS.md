# 🔑 Panduan Generate Gemini API Keys Baru

## ❌ MASALAH SAAT INI

**Semua 9 API keys TIDAK VALID!**

Error dari Google:
```
API_KEY_INVALID - API key not valid. Please pass a valid API key.
```

**Penyebab:**
- Keys sudah kadaluarsa/expired
- Keys dihapus dari Google AI Studio
- Keys dibuat untuk project yang sudah dihapus
- Free tier quota habis

---

## ✅ SOLUSI: Generate API Keys Baru

### Opsi 1: Generate 1 Key (Quick Test)

**Langkah-langkah:**

1. **Buka Google AI Studio**
   ```
   https://aistudio.google.com/apikey
   ```

2. **Login dengan Google Account**
   - Gunakan Gmail Anda
   - Atau buat Gmail baru jika mau dedicated untuk project ini

3. **Create API Key**
   - Click tombol **"Create API Key"**
   - Pilih **"Create API key in new project"** (atau pilih existing project)
   - Copy API key yang muncul
   - **PENTING:** Simpan API key ini, tidak bisa dilihat lagi!

4. **Test API Key**
   
   Update `.env` file:
   ```env
   GEMINI_API_KEY_1=YOUR_NEW_API_KEY_HERE
   ```
   
   Test:
   ```bash
   cd backend-app
   node test-single-key.js
   ```

5. **Jika berhasil, gunakan untuk semua keys (sementara)**
   ```env
   GEMINI_API_KEY_1=YOUR_NEW_API_KEY
   GEMINI_API_KEY_2=YOUR_NEW_API_KEY
   GEMINI_API_KEY_3=YOUR_NEW_API_KEY
   # ... sampai KEY_9 (semua isi dengan key yang sama)
   ```
   
   **Capacity:** 15 RPM total (1 key × 15 RPM)

---

### Opsi 2: Generate 9 Keys (Production Ready)

**Untuk capacity 135 RPM (9 keys × 15 RPM), ada 2 cara:**

#### **Cara A: 1 Account, Multiple Projects (Google Cloud)**

1. **Buka Google Cloud Console**
   ```
   https://console.cloud.google.com/
   ```

2. **Buat 9 Projects**
   - Click dropdown project di top bar
   - **New Project** → Name: `smartparcel-gemini-1`
   - Ulangi sampai `smartparcel-gemini-9`

3. **Generate API Key untuk setiap project**
   - Pilih project pertama
   - Buka: https://aistudio.google.com/apikey
   - Create API Key in `smartparcel-gemini-1`
   - Copy key → Save sebagai `GEMINI_API_KEY_1`
   - Switch project → Ulangi untuk project 2-9

**Pros:**
- ✅ 1 account saja
- ✅ Centralized management

**Cons:**
- ⚠️ Agak ribet setup 9 projects
- ⚠️ Semua quota di 1 billing account

---

#### **Cara B: 9 Accounts, 1 Project Each (Simple)**

1. **Buat 9 Gmail Accounts**
   ```
   smartparcel.key1@gmail.com
   smartparcel.key2@gmail.com
   ...
   smartparcel.key9@gmail.com
   ```
   
   **Trick:** Gunakan Gmail alias
   ```
   yourname+key1@gmail.com
   yourname+key2@gmail.com
   # Semua email masuk ke yourname@gmail.com
   ```

2. **Generate 1 Key per Account**
   - Login dengan account pertama
   - Buka: https://aistudio.google.com/apikey
   - Create API Key
   - Copy → `GEMINI_API_KEY_1`
   - Logout → Login account kedua → Repeat

**Pros:**
- ✅ Simple - 1 account = 1 key
- ✅ Isolated quota per account
- ✅ Jika 1 key rate-limited, yang lain tetap jalan

**Cons:**
- ⚠️ Harus manage 9 accounts
- ⚠️ Lebih banyak email verification

**RECOMMENDED:** Cara B lebih simple dan reliable!

---

### Opsi 3: Mix Strategy (Balanced)

**Setup 3-5 keys dari accounts berbeda:**

```env
# Main keys (different accounts)
GEMINI_API_KEY_1=account1_key  # Gmail 1
GEMINI_API_KEY_2=account2_key  # Gmail 2
GEMINI_API_KEY_3=account3_key  # Gmail 3

# Backup keys (same as above, for rotation)
GEMINI_API_KEY_4=account1_key
GEMINI_API_KEY_5=account2_key
GEMINI_API_KEY_6=account3_key
GEMINI_API_KEY_7=account1_key
GEMINI_API_KEY_8=account2_key
GEMINI_API_KEY_9=account3_key
```

**Capacity:** 45 RPM (3 unique keys × 15 RPM)

**Pros:**
- ✅ Balanced effort vs capacity
- ✅ Cukup untuk production
- ✅ Hanya perlu 3 Gmail accounts

---

## 🔧 SETELAH DAPAT API KEYS BARU

### 1. Update `.env` File

```bash
cd backend-app
nano .env  # atau notepad .env
```

Ganti semua `GEMINI_API_KEY_*`:

```env
# SEBELUM (INVALID)
GEMINI_API_KEY_1=AIzaSyCfcOL6OV9LQ-YSjvGHdNqGGEVqBqyZiFY

# SESUDAH (VALID)
GEMINI_API_KEY_1=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 2. Test Keys

```bash
cd backend-app
node test-keys-simple.js
```

**Expected output:**
```
✅ Valid Keys:    9/9
🟢 Status: HEALTHY - Sufficient keys for production
📊 Total RPM Capacity: 135 RPM
```

### 3. Update System

Jika semua keys valid, commit changes:

```bash
cd ..
git add backend-app/.env
git commit -m "fix: update Gemini API keys with valid keys"
git push
```

⚠️ **WARNING:** `.env` seharusnya di `.gitignore`! Jangan commit API keys ke public repo!

---

## 📊 TESTING CHECKLIST

Setelah update keys, test:

- [ ] **Backend startup**
  ```bash
  cd backend-app
  npm start
  ```
  Check logs: `[AI-Routes] Initializing AI Engine with 9 API keys`

- [ ] **AI Detection Test**
  ```bash
  curl -X POST http://localhost:9090/api/ai/health
  ```
  Expected: `{ "status": "healthy" }`

- [ ] **ESP32 AI Check**
  - Upload foto dari ESP32
  - Check serial monitor untuk AI response
  - Verify `hasPackage` dan `confidence` values

- [ ] **Mobile App**
  - Open AI dashboard di mobile app
  - Check stats dan metrics
  - Verify keys rotation working

---

## 🚨 TROUBLESHOOTING

### "API key not valid" masih muncul

**Cek:**
1. API key di-copy dengan benar (tidak ada spasi/newline)
2. File `.env` sudah di-save
3. Restart backend server setelah update `.env`
4. Key belum kena quota limit

**Test manual:**
```bash
export GEMINI_API_KEY_1="YOUR_NEW_KEY"
node test-single-key.js
```

### "Quota exceeded"

**Solusi:**
- Tunggu 1 menit (rate limit reset)
- Atau gunakan key lain
- Atau tunggu besok (daily quota reset)

### "Model not found"

**Ganti model:**

Edit `backend-app/services/gemini/GeminiClient.js`:

```javascript
// SEBELUM
this.model = 'gemini-2.5-flash';

// SESUDAH (jika 2.5 tidak ada)
this.model = 'gemini-1.5-flash';  // Stable version
```

---

## 💡 TIPS & BEST PRACTICES

### 1. **Simpan API Keys dengan Aman**

```bash
# .env file HARUS di .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: add .env to gitignore"
```

### 2. **Environment Variables di VPS**

Saat deploy ke VPS, jangan pakai `.env` file. Gunakan environment variables:

```bash
# Di VPS
export GEMINI_API_KEY_1="your_key_1"
export GEMINI_API_KEY_2="your_key_2"
# ... sampai KEY_9

# Atau pakai PM2 ecosystem file
pm2 start ecosystem.config.js
```

### 3. **Monitor Usage**

Check dashboard Google AI Studio untuk monitor quota usage:
```
https://aistudio.google.com/app/apikey
```

### 4. **Backup Keys**

Simpan keys di password manager (1Password, Bitwarden, etc.) atau file encrypted:

```bash
# Encrypt .env
gpg -c backend-app/.env
# Creates: backend-app/.env.gpg

# Decrypt when needed
gpg backend-app/.env.gpg
```

---

## 📞 NEED HELP?

Jika masih ada masalah:

1. **Share screenshot** dari:
   - Google AI Studio API Keys page
   - Test output: `node test-single-key.js`
   - `.env` file (HIDE the actual keys!)

2. **Check Google AI Studio Status:**
   ```
   https://status.cloud.google.com/
   ```

3. **Verify account billing:**
   - Free tier: 15 RPM per key
   - Paid tier: Bisa request higher quota

---

## ✅ SUMMARY

**Untuk quick fix:**
1. Buka: https://aistudio.google.com/apikey
2. Create 1 API key
3. Update `GEMINI_API_KEY_1` di `.env`
4. Test dengan `node test-single-key.js`
5. Jika OK, copy ke semua KEY_2 sampai KEY_9

**Untuk production:**
1. Buat 3-9 Gmail accounts (gunakan +alias trick)
2. Generate 1 key per account
3. Update `.env` dengan 9 keys berbeda
4. Test dengan `node test-keys-simple.js`
5. Deploy ke VPS dengan environment variables

---

**Status:** 🔴 **ACTION REQUIRED**  
**Priority:** 🔥 **CRITICAL**  
**ETA:** ~15-30 menit untuk generate dan test keys baru
