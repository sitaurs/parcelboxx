# SmartParcel App Build Directory

This directory contains all Capacitor Android builds for the SmartParcel mobile app.

## Build Files

### Latest Build (WITH CUSTOM LOGO)
- **APK**: `SmartParcel-v1.0.0-debug-20251220-with-logo.apk`
- **Size**: 9.59 MB
- **Build Date**: December 20, 2025
- **Type**: Debug APK (unsigned)
- **Features**: Custom logo + splash screens (light/dark mode)

### Previous Build (Default Icons)
- **APK**: `SmartParcel-v1.0.0-debug-20251220.apk`
- **Size**: 7.89 MB
- **Note**: Default Capacitor icons

### App Icon
- **File**: `smartparcel-icon.ico`
- **Status**: Ready for Android icon generation

## How to Build

### Prerequisites
- Node.js and npm installed
- Java 17 installed (OpenJDK Temurin recommended)
- Android SDK installed

### Build Steps

1. **Navigate to mobile app directory**:
   ```bash
   cd D:\projct\cdio2\mobile-app-new
   ```

2. **Install dependencies** (if needed):
   ```bash
   npm install
   npm install @capacitor/android
   ```

3. **Build web assets**:
   ```bash
   npm run build
   ```

4. **Sync Capacitor**:
   ```bash
   npx cap sync android
   ```

5. **Apply Java 17 compatibility patches** (required due to Java 17 environment):
   
   Edit these files and change `VERSION_21` to `VERSION_17`:
   - `node_modules/@capacitor/android/capacitor/build.gradle`
   - `android/capacitor-cordova-android-plugins/build.gradle`
   - `android/app/capacitor.build.gradle`
   - `android/app/build.gradle`

6. **Build APK**:
   ```bash
   cd android
   .\gradlew.bat assembleDebug
   ```

7. **Copy APK to app_build** (with date):
   ```powershell
   $date = Get-Date -Format "yyyyMMdd"
   $apkName = "SmartParcel-v1.0.0-debug-$date.apk"
   Copy-Item "app\build\outputs\apk\debug\app-debug.apk" "..\..\app_build\$apkName"
   ```

## Icon Integration

To use the custom icon (`smartparcel-icon.ico`) in the Android app:

1. **Convert .ico to PNG** (if needed):
   - Use online tool or ImageMagick
   - Extract largest size (usually 256x256)

2. **Generate Android icons**:
   - Use a tool like Android Asset Studio or manually resize to:
     - mipmap-mdpi: 48x48
     - mipmap-hdpi: 72x72
     - mipmap-xhdpi: 96x96
     - mipmap-xxhdpi: 144x144
     - mipmap-xxxhdpi: 192x192

3. **Copy to Android resources**:
   ```
   mobile-app-new/android/app/src/main/res/mipmap-{dpi}/ic_launcher.png
   ```

4. **Rebuild APK**

## Installation

Transfer APK to Android device:
1. Enable "Install from Unknown Sources" in device settings
2. Transfer APK via USB/cloud/email
3. Tap to install
4. Grant necessary permissions

## Build History

| Date       | Version | Filename                              | Size   | Notes                           |
|------------|---------|---------------------------------------|--------|---------------------------------|
| 2025-12-20 | 1.0.0   | SmartParcel-v1.0.0-debug-20251220-with-logo.apk | 9.59 MB | With custom logo & splash screens |
| 2025-12-20 | 1.0.0   | SmartParcel-v1.0.0-debug-20251220.apk | 7.89 MB | Initial build (default icons)   |

## App Configuration

- **App ID**: `com.smartparcel.app`
- **App Name**: SmartParcel
- **Minimum SDK**: 24 (Android 7.0)
- **Target SDK**: 36 (Android 14)
- **Compile SDK**: 36

## Features

- Device Settings: Buzzer ON/OFF + Threshold Slider (10-50cm)
- Device Test: Camera/Flash test + Buzzer test
- Framer Motion animations
- Full MQTT integration with ESP32 devices
- Real-time device status monitoring
- History tracking with gallery view
