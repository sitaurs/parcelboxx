# Phase 5B: Security Hardening & Threat Mitigation

**SmartParcel System - Security Audit & Remediation Roadmap**  
*Vulnerability Assessment, Risk Prioritization, Implementation Guidelines*

---

## Table of Contents
1. [Current Security Posture](#current-security-posture)
2. [Threat Model & Attack Vectors](#threat-model--attack-vectors)
3. [Critical Vulnerabilities](#critical-vulnerabilities)
4. [Remediation Roadmap](#remediation-roadmap)
5. [Secure Configuration Guide](#secure-configuration-guide)
6. [Security Testing Checklist](#security-testing-checklist)

---

## 1. Current Security Posture

### 1.1 Security Inventory

| Component | Current Implementation | Risk Level | Compliant? |
|-----------|----------------------|------------|-----------|
| **Authentication** | JWT with static secret | 🔴 High | ❌ No secret rotation |
| **PIN Storage** | Plain text in `pins.json` | 🔴 Critical | ❌ Not hashed |
| **Password Storage** | Plain text in `users.json` | 🔴 Critical | ❌ Not hashed |
| **Token Expiry** | No expiration validation | 🟡 Medium | ❌ Stale token accepted |
| **HTTPS** | Not enforced | 🟡 Medium | ❌ Plain HTTP in prod |
| **CORS** | Not configured | 🟡 Medium | ❌ Wide-open origins |
| **Rate Limiting** | Basic (5 req/15min on /control) | 🟢 Low | ⚠️ Partial coverage |
| **Input Validation** | Frontend only | 🟡 Medium | ❌ Backend trusts client |
| **File Access** | Direct path in URL | 🟡 Medium | ❌ No access control |
| **MQTT Auth** | Username/password (if configured) | 🟢 Low | ⚠️ Depends on broker |

**Overall Rating:** 🔴 **High Risk** - Multiple critical issues requiring immediate remediation.

### 1.2 Compliance Gaps

| Standard/Framework | Requirement | Status |
|-------------------|-------------|--------|
| **OWASP Top 10 (2021)** | A02: Cryptographic Failures | ❌ Plain text credentials |
| | A01: Broken Access Control | ⚠️ No file ownership checks |
| | A07: Identification & Auth Failures | ❌ No password complexity |
| **GDPR** | Data encryption at rest | ❌ JSON files unencrypted |
| | Right to erasure | ⚠️ Manual deletion only |
| **PCI DSS** | Strong cryptography | ❌ Not applicable (no payments) |

---

## 2. Threat Model & Attack Vectors

### 2.1 Trust Boundaries

```
┌──────────────────────────────────────────────────────────┐
│  UNTRUSTED ZONE: Public Internet                         │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Mobile App (Client-Side Code)                     │  │
│  │  - localStorage (token)                            │  │
│  │  - Network requests                                │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │ HTTPS (should be enforced)           │
│                   ▼                                       │
│  ┌────────────────────────────────────────────────────┐  │
│  │  SEMI-TRUSTED: Backend Server                      │  │
│  │  - JWT validation                                  │  │
│  │  - Business logic                                  │  │
│  └────────────────┬───────────────────────────────────┘  │
│                   │                                       │
└───────────────────┼───────────────────────────────────────┘
                    │
    ┌───────────────┴───────────────┐
    ▼                               ▼
┌────────────────┐          ┌────────────────┐
│ TRUSTED ZONE:  │          │ TRUSTED ZONE:  │
│ File System    │          │ MQTT Broker    │
│ (Credentials)  │          │ (IoT Commands) │
└────────────────┘          └────────────────┘
```

### 2.2 Attack Scenarios

#### Scenario 1: Credential Theft via File Access
**Attack Path:**
1. Attacker gains SSH/FTP access to server (e.g., weak root password)
2. Reads `db/users.json` and `db/pins.json`
3. Obtains plain text credentials
4. Logs in as admin → full system control

**Impact:** Complete compromise  
**Likelihood:** High (if server exposed without hardening)  
**Mitigation:** Hash passwords with bcrypt, encrypt PIN storage

---

#### Scenario 2: JWT Token Hijacking
**Attack Path:**
1. User logs in on public Wi-Fi (no HTTPS)
2. Attacker intercepts HTTP request containing JWT
3. Replays token to `/device/control` endpoint
4. Unlocks door remotely

**Impact:** Unauthorized physical access  
**Likelihood:** Medium (depends on network environment)  
**Mitigation:** Enforce HTTPS, add token fingerprinting

---

#### Scenario 3: Brute-Force PIN Attack
**Attack Path:**
1. Attacker obtains valid JWT (e.g., from stolen phone)
2. Automates POST `/auth/verify-pin` with all 10,000 PIN combinations
3. Rate limiter (5 req/15min) slows attack but not blocked
4. After 50 hours, finds correct PIN

**Impact:** Bypass secondary authentication  
**Likelihood:** Low (requires JWT + time)  
**Mitigation:** Lockout after N failed attempts, CAPTCHA

---

#### Scenario 4: Directory Traversal in Photo URLs
**Attack Path:**
1. Gallery loads photos from `/storage/photos/{filename}`
2. Attacker crafts request: `GET /storage/photos/../../db/users.json`
3. If no path validation, reads sensitive file

**Impact:** Information disclosure  
**Likelihood:** Medium (common web vuln)  
**Mitigation:** Validate filename, use UUIDs, serve via controlled endpoint

---

#### Scenario 5: MQTT Command Injection
**Attack Path:**
1. Attacker connects to MQTT broker (if no auth)
2. Publishes malicious payload to `smartparcel/control/unlock`
3. ESP32 processes command without origin validation
4. Unlocks door

**Impact:** Physical security breach  
**Likelihood:** Low (depends on broker exposure)  
**Mitigation:** MQTT TLS + username/password, topic ACLs

---

### 2.3 Risk Matrix

| Threat | Likelihood | Impact | Risk Score | Priority |
|--------|-----------|--------|-----------|----------|
| Plain text password theft | High | Critical | 🔴 9/10 | P0 |
| JWT interception (no HTTPS) | Medium | High | 🟡 6/10 | P1 |
| PIN brute-force | Low | Medium | 🟢 3/10 | P2 |
| Directory traversal | Medium | Medium | 🟡 5/10 | P1 |
| MQTT unauthorized access | Low | High | 🟡 5/10 | P1 |
| Session fixation | Low | Low | 🟢 2/10 | P3 |

---

## 3. Critical Vulnerabilities

### 3.1 VULN-001: Plain Text Password Storage

**Location:** `db/users.json`

**Current Code:**
```json
[
  {
    "username": "admin",
    "password": "Admin123!",
    "role": "admin"
  }
]
```

**Risk:** 🔴 Critical - Violates OWASP A02 (Cryptographic Failures)

**Exploitation:**
```bash
# Attacker with file read access
cat db/users.json | jq '.[0].password'
# Output: "Admin123!"
```

**Remediation:**

**Step 1:** Install bcrypt
```bash
npm install bcrypt
```

**Step 2:** Update user creation logic in `routes/auth.js`
```javascript
const bcrypt = require('bcrypt');

// Hash password on registration
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds
  
  const newUser = {
    username,
    password: hashedPassword,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  db.write('users', users);
  res.json({ success: true });
});
```

**Step 3:** Update login validation
```javascript
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  // Generate JWT...
});
```

**Migration Script:**
```javascript
// scripts/migrate-passwords.js
const bcrypt = require('bcrypt');
const fs = require('fs');

const users = JSON.parse(fs.readFileSync('db/users.json'));

(async () => {
  for (let user of users) {
    if (!user.password.startsWith('$2b$')) { // Not already hashed
      user.password = await bcrypt.hash(user.password, 10);
    }
  }
  fs.writeFileSync('db/users.json', JSON.stringify(users, null, 2));
  console.log('✅ Passwords migrated');
})();
```

---

### 3.2 VULN-002: Plain Text PIN Storage

**Location:** `db/pins.json`

**Current Code:**
```json
[
  {
    "pin": "1234",
    "description": "Default PIN",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

**Risk:** 🔴 Critical - Bypass second-factor authentication

**Remediation:**

**Encrypt with AES-256 (symmetric):**
```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.PIN_ENCRYPTION_KEY; // 32-byte hex string
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Usage in routes/auth.js
router.post('/verify-pin', (req, res) => {
  const { pin } = req.body;
  const validPin = pins.find(p => decrypt(p.pin) === pin);
  // ...
});
```

**Generate Encryption Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Store in environment variable, **never commit to Git**.

---

### 3.3 VULN-003: Hardcoded JWT Secret

**Location:** `middleware/auth.js`

**Current Code:**
```javascript
const jwt = require('jsonwebtoken');
const SECRET = 'your-secret-key-here'; // ❌ Hardcoded
```

**Risk:** 🟡 High - Token forgery if secret leaks

**Remediation:**

**Step 1:** Move to environment variable
```javascript
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable not set');
}
```

**Step 2:** Generate strong secret
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Step 3:** Add to `.env` file (use `dotenv` package)
```bash
npm install dotenv
```

**server.js:**
```javascript
require('dotenv').config();
// Now process.env.JWT_SECRET is available
```

**Step 4:** Add token expiration
```javascript
const token = jwt.sign({ username: user.username }, SECRET, { expiresIn: '24h' });
```

**Step 5:** Validate expiry in middleware
```javascript
try {
  const decoded = jwt.verify(token, SECRET);
  req.user = decoded;
  next();
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }
  return res.status(401).json({ success: false, message: 'Invalid token' });
}
```

---

### 3.4 VULN-004: Missing Input Validation (Backend)

**Location:** `routes/device.js`

**Example Vulnerable Code:**
```javascript
router.put('/settings', authMiddleware, (req, res) => {
  const { buzzerDuration, ledBrightness } = req.body;
  
  // No validation - accepts any value
  settings.buzzerDuration = buzzerDuration;
  settings.ledBrightness = ledBrightness;
  
  db.write('settings', settings);
  res.json({ success: true });
});
```

**Attack:**
```bash
curl -X PUT http://server/device/settings \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"buzzerDuration": 999999, "ledBrightness": -50}'
```

**Remediation:**

**Install validator library:**
```bash
npm install joi
```

**Add validation schema:**
```javascript
const Joi = require('joi');

const settingsSchema = Joi.object({
  buzzerDuration: Joi.number().min(1).max(60).required(),
  ledBrightness: Joi.number().min(0).max(100).required(),
  holderSensitivity: Joi.number().min(0).max(100).optional()
});

router.put('/settings', authMiddleware, (req, res) => {
  const { error, value } = settingsSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: error.details.map(d => d.message)
    });
  }
  
  // Now safe to use validated values
  Object.assign(settings, value);
  db.write('settings', settings);
  res.json({ success: true });
});
```

---

### 3.5 VULN-005: No HTTPS Enforcement

**Current State:** Server listens on HTTP only

**Remediation:**

**Option A: Nginx Reverse Proxy (Recommended for production)**
```nginx
server {
    listen 80;
    server_name smartparcel.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name smartparcel.example.com;
    
    ssl_certificate /etc/letsencrypt/live/smartparcel.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/smartparcel.example.com/privkey.pem;
    
    location /api {
        proxy_pass http://localhost:9090;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Option B: Node.js HTTPS (Dev/testing)**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem')
};

https.createServer(options, app).listen(9443, () => {
  console.log('HTTPS server running on port 9443');
});
```

**Generate self-signed cert (testing only):**
```bash
openssl req -nodes -new -x509 -keyout server-key.pem -out server-cert.pem -days 365
```

---

## 4. Remediation Roadmap

### 4.1 Phase 1: Critical Fixes (Week 1-2)

**Priority 0 - Immediate Action Required:**

| Task | Effort | Files Affected | Validation |
|------|--------|---------------|-----------|
| Hash passwords with bcrypt | 4 hours | `routes/auth.js`, migration script | ✅ Login still works, `users.json` shows hashes |
| Encrypt PIN storage | 3 hours | `routes/auth.js`, `pins.json` | ✅ PIN verification succeeds |
| Move JWT secret to env var | 1 hour | `middleware/auth.js`, `.env` | ✅ Server starts, auth works |
| Add token expiration (24h) | 2 hours | `middleware/auth.js`, frontend logout handler | ✅ Old tokens rejected after 24h |
| Enable HTTPS (Nginx) | 6 hours | Nginx config, Let's Encrypt setup | ✅ HTTP redirects to HTTPS |

**Total Effort:** ~16 hours  
**Acceptance Criteria:**
- [ ] No plain text credentials in any JSON file
- [ ] All API requests use HTTPS
- [ ] JWT includes `exp` claim and is validated
- [ ] Password complexity enforced (min 8 chars, 1 uppercase, 1 number)

---

### 4.2 Phase 2: Access Control (Week 3-4)

**Priority 1 - High Impact:**

| Task | Effort | Benefit |
|------|--------|---------|
| Implement photo access control | 4 hours | Prevent directory traversal |
| Add CORS whitelist | 2 hours | Block unauthorized origins |
| Backend input validation (Joi) | 8 hours | Prevent injection attacks |
| Rate limiting on all auth endpoints | 3 hours | Slow brute-force attacks |
| MQTT broker authentication | 4 hours | Secure IoT channel |

**Implementation: Photo Access Control**

**Before (Vulnerable):**
```javascript
app.use('/storage', express.static('storage'));
```

**After (Secure):**
```javascript
router.get('/photos/:filename', authMiddleware, (req, res) => {
  const { filename } = req.params;
  
  // Validate filename format (UUID or timestamp pattern)
  if (!/^[a-zA-Z0-9_-]+\.(jpg|png)$/.test(filename)) {
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  }
  
  const filepath = path.join(__dirname, '../storage/photos', filename);
  
  // Prevent directory traversal
  if (!filepath.startsWith(path.join(__dirname, '../storage/photos'))) {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }
  
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ success: false, message: 'Photo not found' });
  }
  
  res.sendFile(filepath);
});
```

---

### 4.3 Phase 3: Advanced Security (Week 5-6)

**Priority 2 - Defense in Depth:**

| Task | Effort | Benefit |
|------|--------|---------|
| Implement refresh tokens | 8 hours | Reduce JWT exposure window |
| Add account lockout (5 failed logins) | 4 hours | Block credential stuffing |
| Security headers (Helmet.js) | 2 hours | Prevent XSS, clickjacking |
| Audit logging | 6 hours | Track suspicious activity |
| Dependency vulnerability scan | 2 hours | Identify outdated packages |

**Implementation: Helmet.js Security Headers**
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // TailwindCSS needs inline
      imgSrc: ["'self'", "data:"],
      scriptSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 5. Secure Configuration Guide

### 5.1 Production Environment Variables

**Create `.env.production`:**
```bash
# Server
NODE_ENV=production
PORT=9090

# Security
JWT_SECRET=<64-char-hex-from-crypto.randomBytes(32)>
PIN_ENCRYPTION_KEY=<64-char-hex-from-crypto.randomBytes(32)>
BCRYPT_ROUNDS=12

# MQTT
MQTT_BROKER=mqtts://broker.example.com:8883
MQTT_USERNAME=smartparcel_prod
MQTT_PASSWORD=<strong-random-password>

# GOWA API
GOWA_BASE_URL=https://gowa-api.example.com
GOWA_DEVICE_ID=<device-id-from-gowa>
GOWA_API_KEY=<api-key-from-gowa>

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=5
```

**Load in `server.js`:**
```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
```

---

### 5.2 File System Permissions

**Linux/Ubuntu:**
```bash
# Backend directory
chmod 750 backend-app/
chown node:node backend-app/

# Database files (read/write by server only)
chmod 600 backend-app/db/*.json
chown node:node backend-app/db/*.json

# Environment file (never commit!)
chmod 600 .env.production
echo ".env*" >> .gitignore
```

---

### 5.3 MQTT Broker Hardening

**Mosquitto Configuration (`mosquitto.conf`):**
```conf
# Require authentication
allow_anonymous false
password_file /etc/mosquitto/passwd

# Enable TLS
listener 8883
cafile /etc/mosquitto/ca_certificates/ca.crt
certfile /etc/mosquitto/certs/server.crt
keyfile /etc/mosquitto/certs/server.key

# Topic ACLs
acl_file /etc/mosquitto/acl.conf
```

**ACL Example:**
```conf
# Only smartparcel_backend can publish to control topics
user smartparcel_backend
topic write smartparcel/control/#
topic read smartparcel/status/#

# ESP32 devices can only publish status
user esp32_device_01
topic read smartparcel/control/#
topic write smartparcel/status/#
```

---

## 6. Security Testing Checklist

### 6.1 Authentication & Authorization Tests

- [ ] **Test 1:** Login with correct credentials → 200 OK + JWT
- [ ] **Test 2:** Login with wrong password → 401 Unauthorized
- [ ] **Test 3:** Login with non-existent user → 401 Unauthorized
- [ ] **Test 4:** Access protected endpoint without token → 401
- [ ] **Test 5:** Access protected endpoint with expired token → 401
- [ ] **Test 6:** Access protected endpoint with tampered token → 401
- [ ] **Test 7:** Change password with weak password → 400 validation error
- [ ] **Test 8:** Verify PIN with incorrect PIN → 401 + increment fail counter
- [ ] **Test 9:** Verify PIN 5 times wrong → Account lockout
- [ ] **Test 10:** Admin accesses user-only endpoint → Should succeed (role check)

### 6.2 Input Validation Tests

- [ ] **Test 11:** Send negative buzzer duration → 400 validation error
- [ ] **Test 12:** Send buzzer duration > 60 → 400 validation error
- [ ] **Test 13:** Send non-numeric LED brightness → 400 validation error
- [ ] **Test 14:** Omit required field in POST /device/settings → 400
- [ ] **Test 15:** Send SQL injection in username field → Rejected (though using JSON, not SQL)
- [ ] **Test 16:** Send XSS payload in package description → Sanitized in response

### 6.3 File Access Tests

- [ ] **Test 17:** Request `/storage/photos/../../db/users.json` → 403 Forbidden
- [ ] **Test 18:** Request `/storage/photos/validphoto.jpg` → 200 OK + image
- [ ] **Test 19:** Request non-existent photo → 404 Not Found
- [ ] **Test 20:** Request photo without auth token → 401 Unauthorized

### 6.4 Rate Limiting Tests

- [ ] **Test 21:** Send 6 POST /device/control in 15 min → 6th request gets 429
- [ ] **Test 22:** Wait 15 minutes after rate limit → Request succeeds again
- [ ] **Test 23:** Verify rate limit is per-IP, not per-user

### 6.5 Network Security Tests

- [ ] **Test 24:** Access API via HTTP → Redirects to HTTPS (or rejects)
- [ ] **Test 25:** HTTPS certificate is valid (not expired, correct domain)
- [ ] **Test 26:** Security headers present (CSP, HSTS, X-Frame-Options)
- [ ] **Test 27:** CORS blocks requests from unauthorized origin

### 6.6 Automated Security Scan

**Tools to use:**

**1. OWASP ZAP (Web vulnerability scanner):**
```bash
docker run -t owasp/zap2docker-stable zap-baseline.py -t https://smartparcel.example.com/api
```

**2. npm audit (Dependency vulnerabilities):**
```bash
cd backend-app
npm audit
npm audit fix  # Auto-fix if available
```

**3. Snyk (Third-party service):**
```bash
npm install -g snyk
snyk test
snyk monitor  # Continuous monitoring
```

---

## Summary: Security Transformation

### Before Hardening
```
❌ Plain text passwords & PINs
❌ Static JWT secret in code
❌ No HTTPS
❌ No input validation (backend)
❌ No rate limiting
❌ Directory traversal vulnerable
❌ No audit logging
```

### After Hardening
```
✅ Bcrypt-hashed passwords (cost 12)
✅ AES-256 encrypted PINs
✅ JWT secret from environment (64-byte)
✅ HTTPS enforced via Nginx + Let's Encrypt
✅ Joi validation on all inputs
✅ Rate limiting (5 req/15min on auth)
✅ Path validation prevents traversal
✅ Audit log tracks failed logins
✅ Security headers via Helmet.js
✅ MQTT TLS + topic ACLs
```

**Estimated Total Effort:** ~60 hours (1.5 weeks with 2 developers)  
**Risk Reduction:** 🔴 High Risk → 🟢 Low Risk

---

**Next Document:** `DOCS_PHASE_5C_PERFORMANCE_SCALABILITY.md` will cover optimization strategies, caching, database migration, and horizontal scaling.
