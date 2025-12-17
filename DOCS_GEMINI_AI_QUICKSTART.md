# 🚀 Gemini AI Integration - Quick Start Guide

## ⚡ Quick Deployment (5 Minutes)

### Step 1: Start Backend (1 minute)
```powershell
cd d:\projct\cdio2\backend-app
npm start
```

**Wait for:**
```
✓ AI service initialized successfully
→ Server running on port 9090
```

### Step 2: Test AI Service (30 seconds)
```powershell
# Open new terminal
curl http://3.27.11.106:9090/api/ai/status
```

**Expected:**
```json
{
  "success": true,
  "initialized": true,
  "message": "AI service operational"
}
```

### Step 3: Check Health (30 seconds)
```powershell
curl http://3.27.11.106:9090/api/ai/health
```

**Verify:** All 9 keys showing `"status": "healthy"`

### Step 4: Upload ESP32 Firmware (2 minutes)
1. Open Arduino IDE
2. File → Open → `d:\projct\cdio2\fw\esp32\esp32.ino`
3. Tools → Board → "AI Thinker ESP32-CAM"
4. Tools → Port → (select your COM port)
5. Upload button ➡️

### Step 5: Monitor ESP32 (1 minute)
Open Serial Monitor (115200 baud):

```
[BOOT] System Ready!
[AI] Performing periodic AI check...
[AI] Result: NO PACKAGE (confidence: 12%, decision: UNCERTAIN)
```

---

## ✅ Verification Tests (2 Minutes)

### Test 1: AI Detection Works
Place package on holder → Watch serial monitor:

```
[ULTRA] 14.50 cm
[ULTRA] Boost trigger - performing immediate AI check
[AI] Performing periodic AI check...
[AI] Result: PACKAGE (confidence: 89%, decision: HIGH)
[AI] High confidence package detected, triggering pipeline!
```

✅ **Success:** AI detected package and triggered pipeline

### Test 2: Dashboard Access
```powershell
curl http://3.27.11.106:9090/api/ai/dashboard
```

✅ **Success:** Returns dashboard data with stats

### Test 3: MQTT Control
```powershell
# Trigger immediate AI check
mosquitto_pub -h 3.27.11.106 -p 1884 -u mcuzaman -P 'McuZaman#2025Aman!' -t smartparcel/box-01/control -m '{"aiCheck":"now"}'
```

✅ **Success:** ESP32 performs immediate check

---

## 📊 Monitor in Real-Time

### MQTT Events
```powershell
mosquitto_sub -h 3.27.11.106 -p 1884 -u mcuzaman -P 'McuZaman#2025Aman!' -t smartparcel/box-01/event
```

**You'll see:**
```json
{"type":"ai_check","hasPackage":false,"confidence":15,"decision":"UNCERTAIN","mode":"IDLE","nextInterval":30}
{"type":"ultrasonic_boost","cm":14.2}
{"type":"ai_check","hasPackage":true,"confidence":92,"decision":"HIGH","mode":"ACTIVE","nextInterval":15}
{"type":"ai_trigger","confidence":92,"action":"pipeline"}
```

### Backend Logs
Watch terminal where backend is running:

```
[AI-Engine] Starting detection for box-01 (periodic)
[Gemini] Using key 1 (primary) for verification
[AI-Engine] Detection complete: PACKAGE (92% confidence)
[IntervalMgr] Mode change: IDLE (30s) → ACTIVE (15s)
```

---

## 🎯 Common Use Cases

### Disable AI (use only ultrasonic)
```powershell
mosquitto_pub -h 3.27.11.106 -p 1884 -u mcuzaman -P 'McuZaman#2025Aman!' -t smartparcel/box-01/control -m '{"aiCheck":"disable"}'
```

### Enable AI again
```powershell
mosquitto_pub -h 3.27.11.106 -p 1884 -u mcuzaman -P 'McuZaman#2025Aman!' -t smartparcel/box-01/control -m '{"aiCheck":"enable"}'
```

### Force immediate check
```powershell
mosquitto_pub -h 3.27.11.106 -p 1884 -u mcuzaman -P 'McuZaman#2025Aman!' -t smartparcel/box-01/control -m '{"aiCheck":"now"}'
```

### Adjust intervals
```powershell
curl -X PUT http://3.27.11.106:9090/api/ai/settings -H "Content-Type: application/json" -d '{
  "intervals": {
    "IDLE": 60,
    "ACTIVE": 10,
    "COOLDOWN": 120,
    "BOOST": 3
  }
}'
```

---

## 🔧 Troubleshooting (30 seconds each)

### ❌ "AI service not initialized"
**Fix:** Check `.env` file has all 9 `GEMINI_API_KEY_X` variables
```powershell
cd d:\projct\cdio2\backend-app
notepad .env
```

### ❌ ESP32 not calling AI
**Fix:** Check WiFi connection and backend URL
```cpp
// In esp32.ino, verify:
const char* SERVER_HOST = "3.27.11.106";
const uint16_t SERVER_PORT = 9090;
```

### ❌ "No available API keys"
**Fix:** All keys rate limited, wait 60 seconds
```powershell
# Check key health
curl http://3.27.11.106:9090/api/ai/health
```

### ❌ Low confidence results
**Fix:** Check camera focus and lighting
```powershell
# Adjust confidence threshold
curl -X PUT http://3.27.11.106:9090/api/ai/settings -d '{"detection":{"acceptThreshold":60}}'
```

---

## 📈 Performance Expectations

### Normal Operation
- **Check Interval:** 30 seconds (IDLE mode)
- **Response Time:** 2-3 seconds per check
- **Confidence:** 10-20% when empty, 85-95% with package
- **API Usage:** ~2,880 checks/day (1 per 30s)

### Active Detection
- **Check Interval:** 15 seconds (ACTIVE mode)
- **Response Time:** 2-3 seconds
- **Confidence:** 85-95% with package present
- **API Usage:** ~5,760 checks/day (1 per 15s)

### Boost Mode (Ultrasonic Triggered)
- **Check Interval:** 5 seconds (BOOST mode)
- **Response Time:** 2-3 seconds (priority key)
- **Duration:** ~30 seconds after trigger
- **Confidence:** 90-98% (high priority detection)

---

## 🎉 Success Indicators

✅ Backend logs show: `✓ AI service initialized successfully`  
✅ Health check shows: 9/9 keys healthy  
✅ ESP32 serial shows: `[AI] Performing periodic AI check...`  
✅ Dashboard returns data without errors  
✅ Package detection triggers pipeline automatically  
✅ Intervals change dynamically (IDLE→ACTIVE→COOLDOWN)  
✅ MQTT events publishing AI check results  

---

## 📚 Full Documentation

- **Implementation Summary:** `DOCS_GEMINI_AI_SUMMARY.md`
- **Testing Guide:** `DOCS_GEMINI_AI_TESTING.md`
- **API Reference:** See endpoint comments in `routes/ai.js`

---

## 🆘 Need Help?

1. Check serial monitor for ESP32 errors
2. Check backend terminal for API errors
3. Review `/api/ai/health` for key status
4. Check `/api/ai/alerts` for system warnings
5. Review logs in `backend-app/db/ai-stats.json`

---

**Ready to deploy! 🚀**

Total setup time: **~5-7 minutes**  
First AI detection: **Within 30 seconds**  
System fully operational: **Immediately**
