# SmartParcel Mobile App - Build Notes

## Build Information
- **Build Date**: December 20, 2025
- **App Version**: 1.0.0
- **Build Type**: Debug APK
- **Output File**: `SmartParcel-v1.0.0-debug.apk` (8.3 MB)
- **Location**: Project root `D:\projct\cdio2\`

## Build Process

### 1. Dependencies Installed
```bash
npm install @capacitor/android
```

### 2. Android Platform Added
```bash
npx cap add android
```

### 3. Java Compatibility Issues Resolved
**Problem**: Capacitor 8.0 requires Java 21, but system has Java 17 installed.

**Solution**: Patched Gradle files to use Java 17 compatibility:
- `node_modules/@capacitor/android/capacitor/build.gradle`
- `android/capacitor-cordova-android-plugins/build.gradle`
- `android/app/capacitor.build.gradle`
- `android/app/build.gradle`

Changed all instances from:
```groovy
sourceCompatibility JavaVersion.VERSION_21
targetCompatibility JavaVersion.VERSION_21
```
To:
```groovy
sourceCompatibility JavaVersion.VERSION_17
targetCompatibility JavaVersion.VERSION_17
```

### 4. Production Build
```bash
npm run build  # Build web assets to dist/
cd android
.\gradlew.bat assembleDebug  # Build APK
```

## App Configuration

### Capacitor Config (`capacitor.config.ts`)
- **App ID**: `com.smartparcel.app`
- **App Name**: SmartParcel
- **Web Directory**: `dist`
- **Android Scheme**: HTTPS
- **Splash Screen**: 2s duration, orange background (#F97316)

### Features Included
- Device Settings: Buzzer ON/OFF toggle + Threshold slider (10-50cm)
- Device Test: Camera/Flash test + Buzzer test
- Framer Motion animations (5s splash, page transitions, card animations)
- Full threshold control from mobile app → Backend API → MQTT → ESP32 firmware

## Icon Status
⚠️ **Note**: Current build uses default Capacitor launcher icons. User's logo exists at `public/logo.png` but needs to be resized and copied to Android resource directories.

### To Update Icons (Future):
1. Use a tool like `capacitor-assets` or manually resize logo to:
   - mipmap-mdpi: 48x48
   - mipmap-hdpi: 72x72
   - mipmap-xhdpi: 96x96
   - mipmap-xxhdpi: 144x144
   - mipmap-xxxhdpi: 192x192

2. Copy resized icons to:
   ```
   android/app/src/main/res/mipmap-{dpi}/ic_launcher.png
   ```

3. Rebuild APK:
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```

## Installation
Transfer `SmartParcel-v1.0.0-debug.apk` to Android device and install:
- Enable "Install from Unknown Sources" in device settings
- Tap APK file to install
- Grant necessary permissions when prompted

## Backend Connection
App connects to backend at configured API endpoint. Ensure:
- Backend server is running
- Network connectivity is available
- API URL is correct in app configuration

## Known Issues
- Gradle warnings about flatDir usage (cosmetic, doesn't affect functionality)
- Java 21 patches in node_modules will be lost on `npm install` - need to reapply

## Next Build
For production release APK:
```bash
cd android
.\gradlew.bat assembleRelease
```
Requires signing key configuration in `android/app/build.gradle`.
