# 📱 DOCS PHASE 4: UI COMPONENTS & VISUAL HIERARCHY

> **SmartParcel IoT - Frontend UI Layer Documentation**  
> Dokumentasi lengkap komponen UI, halaman, design system, dan visual hierarchy  
> Generated: November 22, 2025

---

## 📋 TABLE OF CONTENTS

1. [Component Inventory & Hierarchy](#1-component-inventory--hierarchy)
2. [Atomic Design Breakdown](#2-atomic-design-breakdown)
3. [Component API Reference](#3-component-api-reference)
4. [Page-Level Components](#4-page-level-components)
5. [Design System Implementation](#5-design-system-implementation)
6. [Animation & Interaction Patterns](#6-animation--interaction-patterns)
7. [Accessibility & UX Features](#7-accessibility--ux-features)
8. [Component Composition Patterns](#8-component-composition-patterns)
9. [Visual Hierarchy Analysis](#9-visual-hierarchy-analysis)
10. [Performance & Optimization](#10-performance--optimization)

---

## 1. COMPONENT INVENTORY & HIERARCHY

### 1.1 Component Tree Structure

```
src/
├── components/ (24 reusable UI components)
│   ├── Layout Components
│   │   ├── Layout.tsx ................... Bottom navigation wrapper
│   │   ├── PageHeader.tsx ............... Gradient header with icon
│   │   └── SectionCard.tsx .............. Content section container
│   │
│   ├── Overlay Components
│   │   ├── BottomSheet.tsx .............. Modal sheet from bottom
│   │   ├── ConfirmDialog.tsx ............ Confirmation popup
│   │   ├── Lightbox.tsx ................. Full-screen image viewer
│   │   └── ToastProvider.tsx ............ Toast notification manager
│   │
│   ├── Form Components
│   │   ├── Field.tsx .................... Form field wrapper
│   │   ├── DurationField.tsx ............ Duration picker (slider + input)
│   │   ├── RangeField.tsx ............... Basic dual-slider range
│   │   └── RangeField.Premium.tsx ....... Premium dual-slider range
│   │
│   ├── Data Display
│   │   ├── MetricTile.tsx ............... Dashboard metric card
│   │   ├── PhotoItem.tsx ................ Gallery photo thumbnail
│   │   ├── StatusChip.tsx ............... Status badge (online/offline)
│   │   ├── EmptyState.tsx ............... No data placeholder
│   │   └── SkeletonCard.tsx ............. Loading skeleton
│   │
│   ├── Interactive Elements
│   │   ├── PremiumButton.tsx ............ Icon + label action button
│   │   ├── QuickActionButton.tsx ........ Dashboard quick action
│   │   ├── QuickPulseChips.tsx .......... Duration quick select chips
│   │   ├── RecipientChip.tsx ............ WhatsApp recipient chip
│   │   ├── StickyApplyBar.tsx ........... Sticky save/cancel bar
│   │   └── Toast.tsx .................... Single toast notification
│   │
│   └── Special Purpose
│       ├── DangerZone.tsx ............... Warning container
│       └── OfflineBanner.tsx ............ Device offline warning
│
└── pages/ (8 page-level components)
    ├── Dashboard.tsx .................... Main dashboard with metrics
    ├── DeviceControl.tsx ................ ESP32 settings control
    ├── Gallery.tsx ...................... Photo gallery with filters
    ├── Login.tsx ........................ Login form
    ├── PinLock.tsx ...................... PIN verification screen
    ├── Settings.tsx ..................... User account settings
    ├── TestDevice.tsx ................... Hardware test controls
    └── WhatsAppSettings.tsx ............. WhatsApp integration setup
```

### 1.2 Component Statistics

| Category | Count | Total Lines | Avg Complexity |
|----------|-------|-------------|----------------|
| **Layout Components** | 3 | ~150 | Low |
| **Overlay Components** | 4 | ~450 | Medium |
| **Form Components** | 4 | ~550 | High |
| **Data Display** | 5 | ~350 | Low-Medium |
| **Interactive Elements** | 6 | ~400 | Medium |
| **Special Purpose** | 2 | ~100 | Low |
| **Pages** | 8 | ~3,500 | High |
| **TOTAL** | **32** | **~5,500** | **Medium** |

---

## 2. ATOMIC DESIGN BREAKDOWN

### 2.1 Atoms (Smallest Building Blocks)

#### **StatusChip** (34 lines)
**Purpose:** Status indicator badge  
**Variants:** `online`, `offline`, `pending`  
**Features:**
- Icon + label combination
- Color-coded by status (success green, gray, warning yellow)
- Pulse animation on `online` and `pending`
- Breathe animation on `pending`

```tsx
<StatusChip status="online" />
// Output: Green badge with Wifi icon "Online" + pulse
```

#### **Toast** (48 lines)
**Purpose:** Temporary notification message  
**Variants:** `success`, `error`, `warning`, `info`  
**Features:**
- Auto-dismiss after duration (default 3s)
- Icon mapping per type (CheckCircle, XCircle, AlertCircle)
- Manual close button
- Slide-down animation

```tsx
<Toast type="success" message="Saved!" onClose={hide} duration={3000} />
```

#### **RecipientChip** (45 lines)
**Purpose:** WhatsApp recipient badge  
**Features:**
- Avatar with initials or User icon
- Name + phone display
- Delete button with hover effect
- Truncated text overflow

---

### 2.2 Molecules (Simple Combinations)

#### **MetricTile** (72 lines)
**Purpose:** Dashboard metric display card  
**Props:**
- `icon` - ReactNode for icon
- `label` - Metric name
- `value` - Number or string
- `change` - Percentage change (optional)
- `trend` - `up`, `down`, `neutral` (optional)

**Visual Structure:**
```
┌─────────────────────┐
│ [Icon]              │
│ Label               │
│ 42 (large value)    │
│ ▲ +12% (trend)      │
└─────────────────────┘
```

#### **PhotoItem** (85 lines)
**Purpose:** Gallery photo thumbnail with metadata  
**Features:**
- Lazy image loading with shimmer skeleton
- Error state with AlertCircle
- Timestamp badge (top-left)
- Status indicator (bottom-right)
- Hover overlay effect

#### **QuickActionButton** (55 lines)
**Purpose:** Icon button with label for dashboard actions  
**Props:**
- `icon` - Lucide icon component
- `label` - Button text
- `color` - `warning`, `danger`, `success`, `info`
- `onClick` - Handler function

**Visual:**
```
┌───────────┐
│  [Icon]   │ ← 12x12 colored circle
│   Label   │ ← Text below
└───────────┘
```

---

### 2.3 Organisms (Complex Components)

#### **BottomSheet** (90 lines)
**Purpose:** Modal sheet sliding from bottom  
**Features:**
- Backdrop with blur (bg-black/60 backdrop-blur-sm)
- Rounded top corners (rounded-t-3xl)
- Handle bar at top (12px wide, 1.5px tall)
- Header with title + close button
- Scrollable content (max-h-70vh)
- Body scroll lock when open
- Escape key to close
- Safe area handling (safe-bottom class)

**Lifecycle:**
1. isOpen=true → slide-up animation
2. Body overflow hidden
3. Backdrop click → onClose()
4. Escape key → onClose()
5. isOpen=false → unmount

#### **Lightbox** (248 lines)
**Purpose:** Full-screen photo viewer with navigation  
**Features:**
- Black background overlay
- Zoom controls (1x to 3x, step 0.5)
- Keyboard navigation (←/→ arrows, Escape)
- Thumbnail strip at bottom
- Download button with loading state
- Share button (navigator.share API)
- Swipe navigation support
- Image counter (1/10)

**Controls:**
- Top bar: Counter, timestamp, zoom, download, share, close
- Bottom bar: Thumbnail strip with current indicator
- Side buttons: Previous/Next (if applicable)

#### **DurationField** (183 lines)
**Purpose:** Complex duration input with multiple interfaces  
**Interfaces:**
1. **Display Card** - Shows duration in seconds + milliseconds
2. **Number Input** - Direct ms input with +/- buttons
3. **Slider** - Visual range selector (0-300s)
4. **Quick Labels** - Min/Max labels below slider

**State Management:**
- `value` (ms) synced across all interfaces
- `isDragging` for slider visual feedback
- Validation: min/max bounds enforced
- Real-time percentage calculation for slider position

#### **RangeField.Premium** (223 lines)
**Purpose:** Dual-slider range selector (PREMIUM version)  
**Advanced Features:**
- **Dual thumbs** - Min and max values independently draggable
- **Active range highlight** - Gradient fill between thumbs
- **Pulse indicators** - Animated thumb circles
- **Value labels** - Follow thumb positions
- **Validation** - Min < Max enforcement with error state
- **Number inputs** - Premium styled cards for direct input
- **Responsive** - Touch + mouse support

**Visual Layers:**
```
Track BG (gray)
  └─ Active Range (brand gradient)
       └─ Dual Sliders (invisible, z-20)
            └─ Thumb Indicators (visual only, pointer-events-none)
                 └─ Value Labels (positioned dynamically)
```

---

### 2.4 Templates (Page Layouts)

#### **Layout.tsx** (60 lines)
**Purpose:** App-wide bottom navigation wrapper  
**Structure:**
```tsx
<div className="flex flex-col h-screen">
  <main className="flex-1 overflow-y-auto pb-20">
    <Outlet /> {/* React Router content */}
  </main>
  <nav className="fixed bottom-0 h-16 safe-bottom">
    {/* 6 nav items */}
  </nav>
</div>
```

**Navigation Items:**
1. Home (Dashboard) - Home icon
2. Gallery - Package icon
3. Control - Settings icon
4. Test - TestTube icon
5. WhatsApp - MessageCircle icon
6. Settings - Zap icon

**Features:**
- Active state with brand color + bounce-in animation
- Hover scale (1.1x)
- Active press scale (0.95x)
- Aria-current for accessibility

---

## 3. COMPONENT API REFERENCE

### 3.1 Form Components

#### **Field**
```typescript
interface FieldProps {
  label: string;           // Required label text
  children: ReactNode;     // Input element(s)
  help?: string;           // Help text (HelpCircle icon)
  error?: string;          // Error message (AlertCircle icon)
  required?: boolean;      // Show red asterisk
  className?: string;      // Additional classes
}
```

**Usage:**
```tsx
<Field label="Password" help="Min 6 chars" error={err} required>
  <input type="password" />
</Field>
```

#### **DurationField**
```typescript
interface DurationFieldProps {
  label: string;
  value: number;           // Milliseconds
  onChange: (value: number) => void;
  min?: number;            // Default: 0
  max?: number;            // Default: 300000 (5min)
  step?: number;           // Default: 100
  help?: string;
  error?: string;
  required?: boolean;
}
```

**Internal State:**
- `inputValue` - String for controlled input
- `isDragging` - Boolean for slider interaction
- `seconds` - Computed display value (ms / 1000)
- `percentage` - Slider position (0-100%)

---

### 3.2 Overlay Components

#### **ConfirmDialog**
```typescript
interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;    // Default: "Konfirmasi"
  cancelText?: string;     // Default: "Batal"
  type?: 'danger' | 'warning' | 'info'; // Default: 'warning'
}
```

**Render Layers:**
1. Backdrop (z-9999, fade-in)
2. Card (scale-in, max-w-sm)
3. Icon + Title
4. Message text
5. Action buttons (Cancel + Confirm)

**Type Styles:**
- `danger` - Red button, red icon bg
- `warning` - Yellow button, yellow icon bg
- `info` - Blue button, blue icon bg

---

### 3.3 Data Display

#### **EmptyState**
```typescript
interface EmptyStateProps {
  icon: ReactNode;         // Large icon (20x20 container)
  title: string;           // Bold heading
  subtitle?: string;       // Muted description
  action?: {               // Optional CTA button
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

**Layout:**
```
     [Icon Circle]
        Title
      Subtitle
    [Action Button]
```

#### **SkeletonCard**
```typescript
interface SkeletonCardProps {
  lines?: number;          // Number of content lines (default: 3)
  className?: string;
}
```

**Animation:**
- Pulse animation on title bar
- Staggered animation delay per line (100ms × index)
- Decreasing width per line (100% - 15% × index)

---

### 3.4 Special Components

#### **DangerZone**
```typescript
interface DangerZoneProps {
  title?: string;          // Default: "Danger Zone"
  description?: string;    // Optional subtitle
  children: ReactNode;     // Content (usually delete buttons)
  className?: string;
}
```

**Visual:**
- Red border (border-danger/20)
- Red background tint (bg-danger/5)
- AlertTriangle icon in red circle
- Indented content area (pl-13)

**Use Cases:**
- Delete account
- Reset device
- Force stop operations

---

## 4. PAGE-LEVEL COMPONENTS

### 4.1 Dashboard.tsx (520 lines)

**Purpose:** Main monitoring dashboard with real-time metrics

**Page Structure:**
```tsx
1. Gradient Header Card
   - Title: "SmartParcel"
   - User greeting
   - Online/offline status chip
   - Last update timestamp

2. Offline Banner (conditional)
   - Warning message
   - Retry button

3. Package Stats Grid (3 MetricTiles)
   - Total packages
   - Today's packages (+trend)
   - This week's packages (+trend)

4. Sensor Status Card
   - Distance reading (large font)
   - Visual indicator (green if 12-25cm)

5. Quick Actions Card
   - Release Holder button (warning)
   - Stop Buzzer button (danger)
   - Unlock Door button (success) → Opens BottomSheet

6. Last Photo Card
   - Latest photo thumbnail
   - Timestamp
   - Empty state with "Test Camera" action

7. Modals
   - PIN entry BottomSheet (for door unlock)
   - Holder confirmation dialog
```

**State Management:**
```typescript
const [stats, setStats] = useState({total: 0, today: 0, thisWeek: 0});
const [deviceStatus, setDeviceStatus] = useState<any>(null);
const [showPinModal, setShowPinModal] = useState(false);
const [doorPin, setDoorPin] = useState('');
const [pinError, setPinError] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [lastPhoto, setLastPhoto] = useState<any>(null);
const [lastUpdate, setLastUpdate] = useState(new Date());
```

**Data Flow:**
1. `loadData()` on mount + every 10s (polling)
2. Fetch stats + device status + packages in parallel
3. Update state → trigger re-render
4. User actions → API calls → toast feedback

**Validation Logic:**
- PIN must be 4-8 digits
- Numeric only (`/^\d+$/` regex)
- Error shown below input with shake animation

---

### 4.2 DeviceControl.tsx (450 lines)

**Purpose:** ESP32 configuration and settings management

**Form Fields:**
1. **Ultrasonic Sensor** (RangeField)
   - Min distance (default: 12cm)
   - Max distance (default: 25cm)
   - Recommendation card below

2. **Solenoid Holder** (DurationField)
   - Open duration (default: 5000ms)

3. **Buzzer** (DurationField)
   - Sound duration (default: 60000ms)

4. **Door Lock** (DurationField)
   - Unlock duration (default: 3000ms)

**Features:**
- **Dirty Detection** - Compare settings with originalSettings
- **Validation** - Min < Max for range
- **StickyApplyBar** - Shows when dirty, hides when saved
- **Success Feedback** - Green banner after save
- **Refresh Button** - Reload settings from API

**State:**
```typescript
const [settings, setSettings] = useState({
  ultra: { min: 12, max: 25 },
  lock: { ms: 5000 },
  buzzer: { ms: 60000 },
  doorLock: { ms: 3000 }
});
const [originalSettings, setOriginalSettings] = useState<any>(null);
const [isDirty, setIsDirty] = useState(false);
const [lastApplied, setLastApplied] = useState<Date | null>(null);
```

---

### 4.3 Gallery.tsx (340 lines)

**Purpose:** Photo gallery with filtering and lightbox viewer

**Features:**
- **Filter Chips** - Today / 7 Days / All
- **Grid Layout** - Responsive 2-4 columns
- **Lightbox** - Full-screen viewer with navigation
- **Empty State** - "Take Photo Now" CTA
- **Loading** - Skeleton cards during fetch

**Filter Logic:**
```typescript
useEffect(() => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  if (filter === 'today') {
    filtered = packages.filter(p => new Date(p.timestamp) >= today);
  } else if (filter === '7days') {
    filtered = packages.filter(p => new Date(p.timestamp) >= sevenDaysAgo);
  }
  
  setFilteredPackages(filtered);
}, [packages, filter]);
```

**Lightbox Integration:**
```tsx
{lightboxIndex !== null && (
  <Lightbox
    photos={filteredPackages.map(p => ({
      id: p.id,
      src: getPhotoURL(p.photoUrl),
      timestamp: formatDate(p.timestamp)
    }))}
    currentIndex={lightboxIndex}
    isOpen={true}
    onClose={() => setLightboxIndex(null)}
    onShare={handleShare}
  />
)}
```

**Share Feature:**
- Uses `navigator.share()` API if available (mobile)
- Fallback to clipboard copy (desktop)

---

### 4.4 Login.tsx (100 lines)

**Purpose:** User authentication form

**Design:**
- Gradient background with shimmer effect
- Centered card with shadow-2xl
- SmartParcel logo with breathe animation
- Username + password fields
- Error banner with shake animation
- Loading state on submit

**Form Flow:**
```typescript
const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const response = await authAPI.login(username, password);
    setAuthToken(response.token);
    setUser(response.user);
    localStorage.setItem('pinLockTime', Date.now().toString());
    navigate('/');
  } catch (err) {
    setError(err.message);
  }
};
```

**Styling:**
- Gradient brand background
- White card with border
- Hover-lift on submit button
- Shimmer overlay on button

---

### 4.5 PinLock.tsx (85 lines)

**Purpose:** PIN verification screen (app lock)

**Features:**
- Numeric input only (inputMode="numeric")
- Password type (hidden dots)
- Large monospaced font (text-2xl)
- Letter-spacing (tracking-[0.5em])
- Max 8 digits
- Error state with shake animation

**Unlock Flow:**
```typescript
const handlePinSubmit = async (e) => {
  e.preventDefault();
  try {
    await authAPI.verifyPin(pin);
    localStorage.setItem('pinLockTime', Date.now().toString());
    navigate('/');
  } catch (err) {
    setError('PIN salah');
    setPin(''); // Clear on error
  }
};
```

**Triggered When:**
- App inactive for 5 minutes (see App.tsx)
- User navigates while locked
- Redirect from ProtectedRoute

---

### 4.6 Settings.tsx (450 lines)

**Purpose:** User account and security settings

**Sections:**

1. **Account Info Card**
   - User avatar (brand-colored circle)
   - Username
   - "Administrator" role badge

2. **Security Settings**
   - Change Password → BottomSheet
   - Change PIN (app lock) → BottomSheet
   - Change Door PIN → BottomSheet

3. **About Section**
   - App version: 2.0.0
   - Platform: Web
   - Copy diagnostics button

4. **Logout Button**
   - Red danger zone style
   - Confirmation dialog

**Modal Forms:**

**Change Password:**
```tsx
<form onSubmit={handleChangePassword}>
  <Field label="Current Password">
    <input type="password" required />
  </Field>
  <Field label="New Password" help="Min 6 chars">
    <input type="password" required minLength={6} />
  </Field>
  <button type="submit">Save</button>
</form>
```

**Change PIN:**
```tsx
<form onSubmit={handleChangePin}>
  <Field label="Current PIN" help="4-8 digits">
    <input 
      type="password" 
      inputMode="numeric"
      maxLength={8}
      className="text-center text-2xl tracking-[0.5em]"
    />
  </Field>
  <Field label="New PIN">
    <input type="password" inputMode="numeric" minLength={4} maxLength={8} />
  </Field>
  <button>Save</button>
</form>
```

**Diagnostics Copy:**
```typescript
const copyDiagnostics = () => {
  const info = `SmartParcel Diagnostics
App Version: 2.0.0
User: ${user?.username || 'zamn'}
Browser: ${navigator.userAgent}
Platform: ${navigator.platform}`;
  
  navigator.clipboard.writeText(info);
  toast.success('📋 Info disalin!');
};
```

---

### 4.7 TestDevice.tsx (250 lines)

**Purpose:** Hardware testing interface for ESP32

**Test Actions:**

1. **Camera Test**
   - Capture photo manually
   - Calls `deviceAPI.capture()`

2. **Flash LED Test**
   - Quick duration selector (500ms, 1s, 2s)
   - QuickPulseChips component
   - Calls `deviceAPI.controlFlash('pulse', duration)`

3. **Buzzer Test**
   - Start buzzer (3 seconds)
   - Force stop in DangerZone

4. **Solenoid Test**
   - Release holder (2 seconds)

**Action Handler Pattern:**
```typescript
const testAction = async (action: string, handler: () => Promise<any>) => {
  if (!deviceStatus?.isOnline) {
    toast.error('Device offline');
    return;
  }
  
  try {
    setIsLoading(true);
    await handler();
    toast.success(`✅ ${action} berhasil!`);
  } catch (error: any) {
    toast.error(`❌ ${action} gagal: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};
```

**Safety Features:**
- All buttons disabled when offline
- Visual offline banner at top
- Loading state during API call
- Success/error toast feedback

---

### 4.8 WhatsAppSettings.tsx (730 lines)

**Purpose:** WhatsApp integration and recipient management

**Complex Features:**

1. **Connection Status**
   - Shows sender phone number
   - Online/offline status chip
   - Test message button

2. **Pairing Flow**
   - Input sender phone (628xxx format)
   - Request pairing code
   - Auto-copy to clipboard
   - Step-by-step instructions

3. **Recipient Management**
   - Add individual (phone + name)
   - Add from group list
   - Remove recipients
   - Display as chips

4. **Group Picker**
   - Load groups from GOWA API
   - BottomSheet with scrollable list
   - Show participant count
   - Filter already added groups

**TypeScript Interfaces:**
```typescript
interface WhatsAppGroup {
  JID: string;
  Name?: string;
  Participants?: any[];
  ParticipantsCount?: number;
  OwnerJID?: string;
  [key: string]: any; // Allow additional properties
}

interface Recipient {
  phone: string;
  name: string;
  type: 'individual' | 'group';
}
```

**Group Loading:**
```typescript
const handleLoadGroups = async () => {
  const response = await whatsappAPI.getGroups();
  if (response.success && Array.isArray(response.groups)) {
    setGroups(response.groups);
    setShowGroupPicker(true);
  }
};
```

**Add Group:**
```typescript
const handleAddGroup = async (groupJid: string, groupName: string) => {
  await whatsappAPI.addRecipient(groupJid); // JID format: 123456@g.us
  setRecipients([...recipients, {
    phone: groupJid,
    name: groupName,
    type: 'group'
  }]);
};
```

**Connection Management:**
- Reconnect button → Refresh connection
- Logout button → Clear session, require re-pairing

---

## 5. DESIGN SYSTEM IMPLEMENTATION

### 5.1 CSS Variables (from index.css)

**Color System:**
```css
:root {
  /* Brand Colors */
  --brand-50: #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #3b82f6;  /* Primary brand */
  --brand-600: #2563eb;  /* Main interactive */
  --brand-700: #1d4ed8;
  --brand-800: #1e40af;
  --brand-900: #1e3a8a;
  
  /* Semantic Colors */
  --success: #10b981;
  --success-light: #d1fae5;
  --danger: #ef4444;
  --danger-light: #fee2e2;
  --warning: #f59e0b;
  --warning-light: #fef3c7;
  --info: #3b82f6;
  --info-light: #dbeafe;
  
  /* Neutrals */
  --ink: #111827;        /* Primary text */
  --ink-light: #4b5563; /* Secondary text */
  --muted: #6b7280;     /* Tertiary text */
  --bg: #f9fafb;        /* Body background */
  --surface: #ffffff;   /* Card background */
  --card: #ffffff;
  --border: #e5e7eb;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
  --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
}

/* Dark Mode */
.dark {
  --ink: #f9fafb;
  --ink-light: #d1d5db;
  --muted: #9ca3af;
  --bg: #111827;
  --surface: #1f2937;
  --card: #1f2937;
  --border: #374151;
  /* ... more dark overrides ... */
}
```

**Gradients:**
```css
.gradient-brand {
  background: linear-gradient(135deg, 
    var(--brand-500) 0%, 
    var(--brand-700) 100%
  );
}
```

---

### 5.2 Utility Classes

**Animation Classes:**
```css
/* Entrance Animations */
.fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

.slide-up {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.scale-in {
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bounce-in {
  animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.page-enter {
  animation: pageEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Interaction Animations */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-lift:hover {
  transform: translateY(-2px);
}

.active-press:active {
  transform: scale(0.98);
}

/* Loading Animations */
.shimmer {
  background: linear-gradient(
    90deg,
    var(--gray-200) 0%,
    var(--gray-300) 50%,
    var(--gray-200) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.pulse-soft {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.breathe {
  animation: breathe 3s ease-in-out infinite;
}

.rotate-smooth {
  animation: spin 1s linear infinite;
}

/* Error State */
.shake {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
```

**Keyframes:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

### 5.3 Typography Scale

```css
/* Font Sizes */
text-xs    → 0.75rem (12px)
text-sm    → 0.875rem (14px)
text-base  → 1rem (16px)
text-lg    → 1.125rem (18px)
text-xl    → 1.25rem (20px)
text-2xl   → 1.5rem (24px)
text-3xl   → 1.875rem (30px)
text-4xl   → 2.25rem (36px)

/* Font Weights */
font-medium   → 500
font-semibold → 600
font-bold     → 700

/* Line Heights */
leading-tight    → 1.25
leading-snug     → 1.375
leading-normal   → 1.5
leading-relaxed  → 1.625
```

**Usage Examples:**
```tsx
// Page title
<h1 className="text-2xl font-bold tracking-tight">
  
// Section heading
<h3 className="text-lg font-bold text-[var(--ink)]">

// Body text
<p className="text-sm text-[var(--muted)] leading-relaxed">

// Large metric value
<p className="text-4xl font-bold text-[var(--ink)] tracking-tight">
```

---

### 5.4 Spacing System

**Tailwind Scale:**
```
p-1  → 0.25rem (4px)
p-2  → 0.5rem (8px)
p-3  → 0.75rem (12px)
p-4  → 1rem (16px)
p-5  → 1.25rem (20px)
p-6  → 1.5rem (24px)
p-8  → 2rem (32px)
```

**Common Patterns:**
```tsx
// Card padding
className="p-5"              // 20px all sides

// Section spacing
className="space-y-4"        // 16px vertical gap

// Button padding
className="px-4 py-3"        // 16px horizontal, 12px vertical

// Grid gap
className="gap-3"            // 12px gap
```

---

### 5.5 Border Radius

```css
rounded-lg    → 0.5rem (8px)   // Small elements
rounded-xl    → 0.75rem (12px) // Medium cards
rounded-2xl   → 1rem (16px)    // Large cards
rounded-3xl   → 1.5rem (24px)  // BottomSheet top
rounded-full  → 9999px         // Circles
```

**Usage:**
- Buttons: `rounded-xl` (12px)
- Cards: `rounded-2xl` (16px)
- Modals: `rounded-2xl` (16px)
- Chips/Badges: `rounded-full` or `rounded-lg`
- Icons containers: `rounded-xl` (12px)

---

## 6. ANIMATION & INTERACTION PATTERNS

### 6.1 Page Transitions

**Route Enter:**
```tsx
<div className="page-enter">
  {/* Content */}
</div>
```
- Slide up + fade in
- Duration: 0.5s
- Easing: cubic-bezier(0.16, 1, 0.3, 1)

---

### 6.2 Button Interactions

**Standard Pattern:**
```tsx
className="
  transition-smooth 
  hover-lift 
  active-press
"
```

**Breakdown:**
1. **transition-smooth** - All transitions 0.2s ease
2. **hover-lift** - translateY(-2px) + shadow increase
3. **active-press** - scale(0.98)

**Example:**
```tsx
<button className="bg-brand hover-lift active-press shadow-md hover:shadow-lg">
  Click Me
</button>
```

---

### 6.3 Loading States

**Skeleton Pattern:**
```tsx
{isLoading ? (
  <SkeletonCard lines={3} />
) : (
  <ActualContent />
)}
```

**Shimmer Effect:**
```tsx
<div className="shimmer" />
```
- Gradient animation left-to-right
- 1.5s duration, infinite loop

**Spinner:**
```tsx
<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
```

---

### 6.4 Feedback Animations

**Success:**
```tsx
toast.success('✅ Saved!');
// → Green banner slides down from top
// → Auto-dismiss after 3s
// → Fade out animation
```

**Error:**
```tsx
<div className="shake">
  <p className="text-danger">{error}</p>
</div>
```
- Horizontal shake animation
- 0.5s duration
- Applied to error messages, invalid forms

**Pulse (Status Indicators):**
```tsx
<div className="pulse-soft">
  <WifiIcon className="w-5 h-5 text-success" />
</div>
```

---

### 6.5 Micro-interactions

**Icon Hover:**
```tsx
<div className="group">
  <Icon className="w-5 h-5 group-hover:scale-110 transition-smooth" />
</div>
```

**Card Hover:**
```tsx
<div className="hover:shadow-lg hover:border-brand-300 transition-smooth">
```

**Active State:**
```tsx
<div className="active:scale-95 transition-smooth">
```

---

## 7. ACCESSIBILITY & UX FEATURES

### 7.1 Keyboard Navigation

**Escape Key:**
- BottomSheet: Close
- Lightbox: Close
- Modals: Close

**Arrow Keys:**
- Lightbox: Previous/Next photo

**Tab Order:**
- All interactive elements focusable
- Focus visible ring: `focus:ring-2 focus:ring-brand-600`

---

### 7.2 ARIA Labels

**Navigation:**
```tsx
<Link aria-label={item.label} aria-current={isActive ? 'page' : undefined}>
```

**Buttons:**
```tsx
<button aria-label="Close">
  <X className="w-5 h-5" />
</button>
```

**Status:**
```tsx
<div role="status" aria-live="polite">
  {deviceStatus?.isOnline ? 'Online' : 'Offline'}
</div>
```

---

### 7.3 Touch Optimization

**Minimum Tap Target:**
```css
.min-tap {
  min-width: 44px;
  min-height: 44px;
}
```

**Safe Areas:**
```css
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-top {
  padding-top: env(safe-area-inset-top);
}
```

**Prevent Zoom:**
```tsx
<input type="password" style={{ fontSize: '16px' }} />
// iOS won't zoom if font-size >= 16px
```

---

### 7.4 Loading States

**Progressive Enhancement:**
1. Show skeleton immediately
2. Fetch data
3. Fade in real content

**Error Recovery:**
```tsx
{!deviceStatus?.isOnline && (
  <OfflineBanner onRetry={loadData} />
)}
```

---

### 7.5 Form Validation

**Real-time Validation:**
```tsx
const [pinError, setPinError] = useState('');

const validatePin = (pin: string) => {
  if (!/^\d+$/.test(pin)) {
    setPinError('PIN harus angka saja');
  } else if (pin.length < 4 || pin.length > 8) {
    setPinError('PIN harus 4-8 digit');
  } else {
    setPinError('');
  }
};
```

**Visual Feedback:**
```tsx
<input className={`${pinError ? 'border-danger shake' : 'border-gray-300'}`} />
{pinError && (
  <div className="flex items-center gap-2 text-danger shake">
    <AlertCircle className="w-4 h-4" />
    <span>{pinError}</span>
  </div>
)}
```

---

## 8. COMPONENT COMPOSITION PATTERNS

### 8.1 Compound Components

**Field + Input:**
```tsx
<Field label="Duration" help="1-300 seconds" error={errors.duration}>
  <DurationField value={ms} onChange={setMs} min={1000} max={300000} />
</Field>
```

**SectionCard + Content:**
```tsx
<SectionCard 
  title="Settings" 
  subtitle="Configure device"
  actions={<button>Save</button>}
>
  <form>{/* fields */}</form>
</SectionCard>
```

---

### 8.2 Render Props Pattern

**EmptyState with Action:**
```tsx
<EmptyState
  icon={<Camera className="w-10 h-10" />}
  title="No photos"
  subtitle="Take your first photo"
  action={{
    label: 'Take Photo',
    onClick: handleCapture
  }}
/>
```

---

### 8.3 Higher-Order Components

**Protected Routes:**
```tsx
// App.tsx
<Route element={<ProtectedRoute />}>
  <Route path="/" element={<Dashboard />} />
  <Route path="/settings" element={<Settings />} />
</Route>
```

---

### 8.4 Context Providers

**Toast Context:**
```tsx
// main.tsx
<ToastProvider>
  <App />
</ToastProvider>

// Any component
import { toast } from '../hooks/useToast';
toast.success('Saved!');
```

---

## 9. VISUAL HIERARCHY ANALYSIS

### 9.1 Dashboard Page Hierarchy

**Level 1: Primary Focus**
- Gradient header (largest, brand gradient, top position)
- Package stats (3 large metric tiles)

**Level 2: Secondary Information**
- Sensor status card
- Last photo preview

**Level 3: Actions**
- Quick action buttons (smaller, icon-focused)

**Level 4: Utility**
- Status chips
- Timestamps

---

### 9.2 Typography Hierarchy

```
Page Title (text-2xl bold)
  └─ Section Heading (text-lg bold)
       └─ Card Title (text-base semibold)
            └─ Body Text (text-sm medium)
                 └─ Help Text (text-xs muted)
```

**Example:**
```tsx
<h1 className="text-2xl font-bold">SmartParcel</h1>        // Level 1
  <h2 className="text-lg font-semibold">Quick Actions</h2> // Level 2
    <h3 className="text-base font-medium">Release Holder</h3> // Level 3
      <p className="text-sm text-muted">Opens solenoid</p>    // Level 4
```

---

### 9.3 Color Hierarchy

**Primary Actions:**
- Brand blue (`--brand-600`)
- Gradient backgrounds
- High contrast

**Secondary Actions:**
- Gray backgrounds
- Medium contrast

**Danger Actions:**
- Red (`--danger`)
- High contrast
- Border emphasis

**Status Indicators:**
- Green for success/online
- Yellow for warning/pending
- Red for error/offline

---

### 9.4 Spacing Hierarchy

```
Between sections: space-y-4 (16px)
Between cards: gap-3 (12px)
Inside card: p-5 (20px)
Between form fields: space-y-3 (12px)
Between lines of text: space-y-1 (4px)
```

---

## 10. PERFORMANCE & OPTIMIZATION

### 10.1 Code Splitting

**Pages:** Already lazy-loaded by React Router

**Heavy Components:**
- Lightbox only mounts when opened
- BottomSheet only mounts when isOpen=true
- Modals conditional render

---

### 10.2 Image Optimization

**PhotoItem:**
- Lazy loading (browser native)
- Shimmer placeholder during load
- Error fallback (AlertCircle icon)
- Thumb URL for gallery (smaller files)
- Full URL for lightbox

**Example:**
```tsx
<img
  src={thumbSrc || src}
  loading="lazy"
  onLoad={() => setImageLoaded(true)}
  onError={() => setImageError(true)}
/>
```

---

### 10.3 Animation Performance

**CSS Animations (GPU-accelerated):**
- `transform` instead of `top/left`
- `opacity` instead of `visibility`
- `will-change` on hover elements

**Example:**
```css
.hover-lift:hover {
  transform: translateY(-2px); /* GPU */
  /* NOT: top: -2px; (CPU) */
}
```

---

### 10.4 Event Optimization

**Debounced Search:**
```tsx
const [searchTerm, setSearchTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    fetchResults(searchTerm);
  }, 300); // Debounce 300ms
  
  return () => clearTimeout(timer);
}, [searchTerm]);
```

**Polling Optimization:**
```tsx
useEffect(() => {
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible' && deviceStatus?.isOnline) {
      loadData();
    }
  }, 10000);
  
  return () => clearInterval(interval);
}, []);
```

---

### 10.5 Bundle Size

**Component Size Estimates:**
- Small (< 50 lines): StatusChip, Toast, RecipientChip
- Medium (50-150 lines): MetricTile, PhotoItem, Field, EmptyState
- Large (150-250 lines): BottomSheet, Lightbox, DurationField, RangeField.Premium
- Extra Large (> 500 lines): Dashboard, DeviceControl, WhatsAppSettings

**Optimization Recommendations:**
1. Use dynamic imports for Lightbox (only load when needed)
2. Extract RangeField.Premium styles to CSS module
3. Consider virtualizing Gallery grid (react-window) if > 100 photos

---

## 📊 SUMMARY & STATISTICS

### Component Breakdown
- **Total Components:** 32 (24 reusable + 8 pages)
- **Total Lines of Code:** ~5,500 lines
- **Average Component Size:** ~170 lines
- **Largest Component:** WhatsAppSettings.tsx (730 lines)
- **Smallest Component:** ToastProvider.tsx (10 lines)

### Design System
- **Color Variables:** 40+ CSS custom properties
- **Animation Classes:** 12 utility classes
- **Keyframe Animations:** 8 defined animations
- **Shadow Levels:** 6 shadow utilities
- **Border Radius Options:** 5 radius scales

### Accessibility
- **ARIA Labels:** Used in all interactive elements
- **Keyboard Navigation:** Full support (Tab, Escape, Arrows)
- **Touch Targets:** Minimum 44x44px (min-tap class)
- **Safe Areas:** iOS/Android notch support
- **Focus Indicators:** 2px ring on all focusable elements

### Performance Features
- **Lazy Loading:** Images + route-based code splitting
- **Skeleton States:** All pages have loading skeletons
- **Debouncing:** Search inputs debounced 300ms
- **Polling Optimization:** Only poll when page visible + device online
- **Animation:** GPU-accelerated (transform/opacity only)

---

## ✅ FASE 4 COMPLETION CHECKLIST

- [x] 24 reusable components documented
- [x] 8 page components analyzed
- [x] Design system extracted (colors, typography, spacing)
- [x] Animation patterns documented
- [x] Accessibility features cataloged
- [x] Performance optimizations identified
- [x] Component composition patterns explained
- [x] Visual hierarchy analyzed
- [x] API reference for all components
- [x] Code examples provided

**STATUS:** ✅ **FASE 4 COMPLETE**

---

**Next Steps:** FASE 5 (Final Integration & Recommendations) - Cross-reference all phases, create unified architecture diagram, provide production recommendations.

**Waiting for user confirmation:** "lanjut" to proceed to FASE 5.

---

*End of DOCS_PHASE_4_UI_COMPONENTS.md*
