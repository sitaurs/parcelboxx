@echo off
echo ========================================
echo  SmartParcel APK Build Script
echo ========================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Building React app...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo [3/4] Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Capacitor sync failed
    pause
    exit /b 1
)

echo.
echo [4/4] Opening Android Studio...
call npx cap open android

echo.
echo ========================================
echo  Build process completed!
echo  Android Studio should now be open.
echo  Build APK from Android Studio:
echo  Build > Generate Signed Bundle/APK
echo ========================================
pause
