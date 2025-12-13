# Phase 5A: Architecture Integration & System Overview

**SmartParcel System - Final Integration Documentation**  
*Cross-Layer Analysis & Architectural Synthesis*

---

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Data Flow Patterns](#data-flow-patterns)
3. [Component Interaction Map](#component-interaction-map)
4. [Technology Stack Integration](#technology-stack-integration)
5. [API-to-UI Workflow Mapping](#api-to-ui-workflow-mapping)
6. [State Management Architecture](#state-management-architecture)

---

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  UI Layer    │  │ State (Zustand)│ │  API Service Layer  │  │
│  │ Components   │←→│  - Auth State  │←→│  - authAPI          │  │
│  │ & Pages      │  │  - Device Data │  │  - deviceAPI        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │ HTTP REST (JWT Bearer)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js/Express)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Auth Middle- │  │   Routes     │  │   Services Layer     │  │
│  │  ware (JWT)  │→ │ 34 Endpoints │→ │  - GOWA (WhatsApp)  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                           │                      │               │
│                           ▼                      ▼               │
│                    ┌──────────────┐      ┌─────────────┐        │
│                    │ JSON Files DB│      │ MQTT Client │        │
│                    │ (7 stores)   │      │ 12 Topics   │        │
│                    └──────────────┘      └─────────────┘        │
└────────────────────────────────┬─────────────────┬──────────────┘
                                 │                 │
                                 ▼                 ▼
                          ┌─────────────┐   ┌──────────────┐
                          │ File System │   │ MQTT Broker  │
                          │  Storage    │   │ (IoT Devices)│
                          └─────────────┘   └──────────────┘
                                                     │
                                                     ▼
                                            ┌─────────────────┐
                                            │ ESP32/ESP8266   │
                                            │ Hardware Control│
                                            └─────────────────┘
```

### 1.2 Layer Responsibilities

| Layer | Technology | Responsibilities | Phase Documented |
|-------|-----------|------------------|------------------|
| **Presentation** | React + TypeScript | UI rendering, user interaction, client validation | Phase 4 |
| **State Management** | Zustand | Global state (auth, device status, UI flags) | Phase 3 |
| **API Abstraction** | Axios + Custom wrapper | HTTP requests, token injection, 401 handling | Phase 3 |
| **Backend Routing** | Express.js | Endpoint definition, request validation, response formatting | Phase 2 |
| **Business Logic** | Node.js services | WhatsApp integration, device control orchestration | Phase 2 |
| **Data Persistence** | JSON files | User accounts, settings, packages, sessions | Phase 2 |
| **IoT Communication** | MQTT | Real-time device status updates, command publishing | Phase 2 |
| **Hardware Layer** | ESP32/ESP8266 (C++) | Sensor reading, actuator control, MQTT pub/sub | Phase 1 |

---

## 2. Data Flow Patterns

### 2.1 Authentication Flow

```
┌─────────────┐
│ Login.tsx   │ User enters username + password
└──────┬──────┘
       │ authAPI.login(username, password)
       ▼
┌─────────────────┐
│ POST /auth/login│ Server validates credentials
└──────┬──────────┘
       │ Returns { token, user }
       ▼
┌──────────────────┐
│ useStore.setState│ Store token in state + localStorage
└──────┬───────────┘
       │ setAuthToken(token) in api.ts
       ▼
┌──────────────────┐
│ Protected Routes │ App.tsx renders authenticated layout
└──────────────────┘
```

**Key Integration Points:**
- `routes/auth.js` (Backend) ↔ `services/api.ts::authAPI.login` (Frontend)
- `middleware/auth.js` injects `req.user` for all protected endpoints
- `App.tsx` manages inactivity timer → PIN lock after 5 min idle

### 2.2 Device Status Polling Flow

```
┌──────────────────┐
│ Dashboard.tsx    │ useEffect polls every 10s when visible + online
└────────┬─────────┘
         │ deviceAPI.getStatus()
         ▼
┌──────────────────────┐
│ GET /device/status   │ Backend reads deviceStatus.json
└────────┬─────────────┘
         │ Returns { online, temperature, humidity, holder, ... }
         ▼
┌──────────────────────┐
│ useStore.setDeviceStatus│ Update global state
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│ MetricTile, StatusChip, etc. │ UI re-renders with fresh data
└──────────────────────────────┘
```

**Optimization Gap Identified:**
- Each page (`Dashboard`, `DeviceControl`, `TestDevice`) polls **independently** → waste bandwidth
- **Recommendation:** Centralize polling in `App.tsx` or custom hook; broadcast via Zustand

### 2.3 Door Unlock Flow (Rate-Limited Critical Action)

```
┌─────────────────┐
│ Dashboard.tsx   │ User clicks "Buka Pintu" quick action
└────────┬────────┘
         │ Checks deviceStatus.online
         ▼
┌──────────────────────┐
│ PIN Bottom Sheet     │ User enters 4-digit PIN
└────────┬─────────────┘
         │ deviceAPI.controlDevice({ unlock: true, pin })
         ▼
┌──────────────────────────┐
│ POST /device/control     │ Validates PIN against pins.json
└────────┬─────────────────┘
         │ Rate limiter: max 5 requests/15min
         ▼
┌──────────────────────────┐
│ MQTT publish to topic    │ smartparcel/control/unlock
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ ESP32 unlocks solenoid   │ Publishes confirmation
└────────┬─────────────────┘
         │ MQTT callback updates deviceStatus.json
         ▼
┌──────────────────────────┐
│ Next poll reflects state │ Dashboard shows updated holder status
└──────────────────────────┘
```

**Security Concerns:**
- PIN stored in **plain text** in `pins.json` → **Phase 5B** addresses hashing requirement
- Rate limit bypassed if attacker has multiple tokens → recommend IP-based throttling

### 2.4 WhatsApp Notification Flow

```
┌─────────────────────┐
│ Package arrives     │ Sensor detects object in holder
└──────┬──────────────┘
       │ MQTT publish: smartparcel/status/holder
       ▼
┌──────────────────────┐
│ mqtt/client.js       │ Listener on 'holder' topic
└──────┬───────────────┘
       │ Checks settings.json → notifications.whatsapp enabled?
       ▼
┌──────────────────────────┐
│ services/gowa.js         │ sendMessage(recipients, template)
└──────┬───────────────────┘
       │ POST to GOWA API /send/message
       ▼
┌──────────────────────────┐
│ WhatsApp delivers message│ Recipient receives "Paket telah tiba"
└──────────────────────────┘
```

**Integration Points:**
- `settings.json` stores enabled notification channels & recipients
- `whatsappConfig.json` holds GOWA API credentials (base URL, device ID)
- `WhatsAppSettings.tsx` provides UI to add/remove recipients & groups

---

## 3. Component Interaction Map

### 3.1 Critical User Journeys

#### Journey 1: First-Time Setup
```
Login.tsx → Dashboard.tsx → WhatsAppSettings.tsx
                               ↓
                      1. Pair WhatsApp device (get QR code)
                      2. Add recipient phone numbers
                      3. (Optional) Add WhatsApp groups
                               ↓
                      Settings.tsx → Enable notifications
```

**Backend Endpoints Used:**
- `POST /auth/login`
- `GET /whatsapp/pair` (returns pairing code)
- `POST /whatsapp/recipients/add`
- `GET /whatsapp/groups`
- `PATCH /settings`

#### Journey 2: Daily Package Monitoring
```
Dashboard.tsx (auto-refresh every 10s)
      ↓
View stats: total packages, today's count, avg delivery time
      ↓
Click "Lihat Semua" → Gallery.tsx
      ↓
Filter by date range / status
      ↓
Click photo thumbnail → Lightbox.tsx (zoom, download)
```

**Data Sources:**
- `GET /packages` with query params `?startDate=...&endDate=...&status=...`
- Photos served from `/storage/photos/{filename}`
- Cached in `packages.json` until manual deletion

#### Journey 3: Remote Device Control
```
DeviceControl.tsx
      ↓
Adjust settings (buzzer duration, LED brightness, holder sensitivity)
      ↓
StickyApplyBar appears (dirty state detected)
      ↓
Click "Terapkan Perubahan" → POST /device/settings
      ↓
MQTT publishes updated config to smartparcel/config/*
      ↓
ESP32 applies new settings, confirms via MQTT
```

**Validation & Feedback:**
- Frontend validates ranges (e.g., buzzer 1-60s, brightness 0-100%)
- Backend echoes success → toast "Pengaturan berhasil disimpan"
- Offline handling: disabled submit button if `deviceStatus.online === false`

### 3.2 Component Dependency Graph

```
App.tsx (Router + PIN lock)
  ├─ Layout.tsx (header + nav + offline banner)
  │   ├─ PageHeader.tsx
  │   └─ OfflineBanner.tsx
  │
  ├─ Dashboard.tsx
  │   ├─ MetricTile.tsx (x4 for stats)
  │   ├─ QuickActionButton.tsx (x3 for device controls)
  │   ├─ BottomSheet.tsx (PIN entry)
  │   └─ ConfirmDialog.tsx (stop buzzer confirmation)
  │
  ├─ DeviceControl.tsx
  │   ├─ SectionCard.tsx (logical groupings)
  │   ├─ Field.tsx (simple text inputs)
  │   ├─ DurationField.tsx (time picker with slider)
  │   ├─ RangeField.Premium.tsx (dual-handle slider)
  │   └─ StickyApplyBar.tsx (save button)
  │
  ├─ Gallery.tsx
  │   ├─ Field.tsx (date inputs)
  │   ├─ PhotoItem.tsx (thumbnail grid)
  │   ├─ Lightbox.tsx (fullscreen viewer)
  │   ├─ EmptyState.tsx (no packages found)
  │   └─ SkeletonCard.tsx (loading state)
  │
  ├─ WhatsAppSettings.tsx
  │   ├─ StatusChip.tsx (connection status)
  │   ├─ RecipientChip.tsx (editable contact list)
  │   ├─ ConfirmDialog.tsx (logout confirmation)
  │   └─ BottomSheet.tsx (add recipient/group)
  │
  ├─ Settings.tsx
  │   ├─ PremiumButton.tsx (account tier indicator)
  │   ├─ DangerZone.tsx (destructive actions)
  │   └─ BottomSheet.tsx (change password/PIN dialogs)
  │
  └─ TestDevice.tsx
      ├─ QuickPulseChips.tsx (test duration presets)
      └─ Field.tsx (manual time entry)
```

---

## 4. Technology Stack Integration

### 4.1 Frontend Stack

| Technology | Version | Usage | Configuration File |
|-----------|---------|-------|-------------------|
| React | 18.x | UI framework | `package.json` |
| TypeScript | 5.x | Type safety | `tsconfig.json` |
| Vite | 5.x | Build tool & dev server | `vite.config.ts` |
| React Router | 6.x | Client-side routing | `App.tsx` |
| Zustand | 4.x | Global state management | `store/useStore.ts` |
| Axios | 1.x | HTTP client | `services/api.ts` |
| TailwindCSS | 3.x | Utility-first styling | `tailwind.config.js` |
| Capacitor | 6.x | Native mobile wrapper | `capacitor.config.json` |

**Build Pipeline:**
```bash
npm run build        # Vite builds to dist/
npx cap sync android # Copies to android/app/src/main/assets/
./gradlew assembleRelease # APK output
```

### 4.2 Backend Stack

| Technology | Version | Usage | Configuration File |
|-----------|---------|-------|-------------------|
| Node.js | 18+ | Runtime | - |
| Express.js | 4.x | Web framework | `server.js` |
| JWT | jsonwebtoken | Auth tokens | `middleware/auth.js` |
| MQTT.js | 5.x | IoT messaging | `mqtt/client.js` |
| Axios | 1.x | GOWA API client | `services/gowa.js` |
| Nodemon | 3.x | Dev auto-restart | `nodemon.json` |

**Startup Command:**
```bash
cd backend-app
npm install
node server.js  # Production
# OR
npm run dev     # Development with nodemon
```

### 4.3 Data Persistence Strategy

**Current Implementation: File-Based JSON**
```
db/
├── users.json          # [{ username, password, role }]
├── pins.json           # [{ pin, description, createdAt }]
├── settings.json       # { notifications, security, device }
├── packages.json       # [{ id, timestamp, photo, status, ... }]
├── sessions.json       # [{ jid, deviceId, timestamp }]
├── deviceStatus.json   # { online, temperature, holder, ... }
└── whatsappConfig.json # { baseURL, deviceID }
```

**Limitations Identified:**
1. **No ACID guarantees** → concurrent writes can corrupt JSON
2. **No query optimization** → full file read for every lookup
3. **No indexing** → O(n) search for filtering packages
4. **No schema validation** → malformed data can crash server

**Migration Path (Phase 5C):**
- Short-term: Add file locking via `proper-lockfile`
- Medium-term: Move to SQLite (local, zero-config)
- Long-term: PostgreSQL + Redis cache for production scale

---

## 5. API-to-UI Workflow Mapping

### 5.1 Complete API Endpoint Inventory

| Frontend Method | Backend Endpoint | HTTP Method | Auth Required | Usage |
|----------------|-----------------|-------------|---------------|-------|
| `authAPI.login` | `/auth/login` | POST | ❌ | Initial login |
| `authAPI.changePassword` | `/auth/change-password` | POST | ✅ | Settings page |
| `authAPI.verifyPin` | `/auth/verify-pin` | POST | ✅ | Unlock actions |
| `authAPI.changePin` | `/auth/change-pin` | POST | ✅ | Settings page |
| `packageAPI.getPackages` | `/packages` | GET | ✅ | Gallery + Dashboard |
| `packageAPI.deletePackage` | `/packages/:id` | DELETE | ✅ | Gallery context menu |
| `deviceAPI.getStatus` | `/device/status` | GET | ✅ | Dashboard, DeviceControl, TestDevice |
| `deviceAPI.getSettings` | `/device/settings` | GET | ✅ | DeviceControl initial load |
| `deviceAPI.updateSettings` | `/device/settings` | PUT | ✅ | DeviceControl save |
| `deviceAPI.controlDevice` | `/device/control` | POST | ✅ | Quick actions (unlock, buzzer, holder) |
| `deviceAPI.testDevice` | `/device/test` | POST | ✅ | TestDevice page |
| `whatsappAPI.getConfig` | `/whatsapp/config` | GET | ✅ | WhatsAppSettings mount |
| `whatsappAPI.pair` | `/whatsapp/pair` | GET | ✅ | Pairing code retrieval |
| `whatsappAPI.addRecipient` | `/whatsapp/recipients/add` | POST | ✅ | Add contact |
| `whatsappAPI.removeRecipient` | `/whatsapp/recipients/remove` | POST | ✅ | Remove contact |
| `whatsappAPI.getGroups` | `/whatsapp/groups` | GET | ✅ | Group list dialog |
| `whatsappAPI.addGroup` | `/whatsapp/groups/add` | POST | ✅ | Select group from list |
| `whatsappAPI.reconnect` | `/whatsapp/reconnect` | POST | ✅ | Retry connection |
| `whatsappAPI.logout` | `/whatsapp/logout` | POST | ✅ | Unpair device |

**Coverage:** 100% of backend endpoints have corresponding frontend methods.

### 5.2 Error Handling Integration

**Backend Error Response Format:**
```json
{
  "success": false,
  "message": "PIN tidak valid"
}
```

**Frontend Error Handling Chain:**
```
api.ts::request() catches error
    ↓
401 → Clear token + redirect to /login
    ↓
429 → Toast: "Terlalu banyak percobaan"
    ↓
Other → Toast: error.response?.data?.message || "Terjadi kesalahan"
```

**Gap:** No structured error codes → frontend can't distinguish between "invalid PIN" vs "PIN expired" vs "rate limited"

**Recommendation:** Introduce error code system:
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_PIN",
    "message": "PIN tidak valid",
    "details": { "attemptsRemaining": 2 }
  }
}
```

---

## 6. State Management Architecture

### 6.1 Zustand Store Structure

**File:** `store/useStore.ts`

```typescript
interface AppState {
  // Auth State
  isAuthenticated: boolean;
  user: { username: string; role: string } | null;
  setAuth: (user, isAuth) => void;
  logout: () => void;

  // Device State
  deviceStatus: {
    online: boolean;
    temperature: number;
    humidity: number;
    holder: 'empty' | 'occupied';
    buzzer: boolean;
    // ... more fields
  };
  setDeviceStatus: (status) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading) => void;
}
```

**State Synchronization Points:**
1. **Login:** `authAPI.login()` → `setAuth()` → `localStorage.setItem('token')`
2. **Logout:** `logout()` → `localStorage.removeItem()` → `navigate('/login')`
3. **Device Polling:** `deviceAPI.getStatus()` → `setDeviceStatus()` → Component re-render
4. **Inactivity:** `App.tsx` timer → 5 min idle → `navigate('/pin-lock')`

### 6.2 State Persistence Strategy

| State Slice | Persistence | Rehydration Point | TTL/Expiry |
|------------|-------------|-------------------|------------|
| `isAuthenticated` | ❌ (Derived from token presence) | `App.tsx` mount | - |
| `user` | ❌ (Re-fetched on login) | - | Session lifetime |
| `deviceStatus` | ❌ (Real-time polling) | First Dashboard visit | 10s stale |
| `token` | ✅ localStorage | `api.ts` init | No expiry check |

**Improvement Needed:**
- Add JWT expiry validation before requests (decode token, check `exp` claim)
- Implement refresh token flow to avoid abrupt logouts

### 6.3 Side Effect Management

**Current Pattern: Inline `useEffect` in components**

Example from `Dashboard.tsx`:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    if (navigator.onLine && document.visibilityState === 'visible') {
      fetchStatus();
    }
  }, 10000);
  return () => clearInterval(interval);
}, []);
```

**Issues:**
- Duplicate polling logic across 3 pages
- No request deduplication if user navigates quickly
- Stale data risk if interval phase differs between components

**Recommended Pattern: Custom Hook**
```typescript
// hooks/useDeviceStatus.ts
export const useDeviceStatus = () => {
  const { deviceStatus, setDeviceStatus } = useStore();
  
  useEffect(() => {
    const poll = async () => {
      const data = await deviceAPI.getStatus();
      setDeviceStatus(data);
    };
    
    poll(); // Initial fetch
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, []);
  
  return deviceStatus;
};
```

Then all pages use: `const status = useDeviceStatus();`

---

## Summary: Architecture Strengths & Weaknesses

### ✅ Strengths
1. **Clear Separation of Concerns:** Layers are well-defined (UI, State, API, Backend, IoT)
2. **Type Safety:** TypeScript enforces contracts between frontend layers
3. **Modular Backend:** Routes, middleware, services cleanly separated
4. **Real-Time Capability:** MQTT enables instant device state updates
5. **Progressive Enhancement:** Offline detection, loading states, error boundaries

### ⚠️ Weaknesses
1. **JSON File Persistence:** Not suitable for concurrent access or scale
2. **Polling Overhead:** Multiple independent timers waste bandwidth
3. **No Caching Layer:** Every navigation re-fetches identical data
4. **Hardcoded Secrets:** JWT secret, GOWA credentials in source code
5. **Limited Error Semantics:** Generic error messages hinder debugging

### 🔄 Integration Gaps Requiring Phase 5B-D
- Security hardening (token rotation, PIN hashing)
- Performance optimization (SWR, request deduplication, virtual scrolling)
- Scalability roadmap (DB migration, multi-user support, horizontal scaling)
- Testing strategy (unit, integration, E2E scenarios)
- Deployment automation (CI/CD, environment configs, monitoring)

---

**Next Document:** `DOCS_PHASE_5B_SECURITY_HARDENING.md` will address authentication, authorization, data protection, and threat mitigation strategies.
