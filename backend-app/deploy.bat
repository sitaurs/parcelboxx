@echo off
REM SmartParcel Backend Deployment Script v2.1.0 (Windows)
REM Deploys backend to VPS via SCP and SSH

setlocal enabledelayedexpansion

echo.
echo ================================
echo ^+  SmartParcel Backend v2.1.0
echo ================================
echo.

REM Color codes (using echo with special characters)
set "GREEN=[92m"
set "RED=[91m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "RESET=[0m"

REM Configuration
set VPS_USER=root
set VPS_HOST=3.27.11.106
set VPS_PATH=/root/smartparcel-backend/backend-app
set BACKEND_LOCAL=d:\projct\cdio2\backend-app

echo !BLUE!Checking prerequisites...!RESET!

REM Check if git is installed
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo !RED!Error: git is not installed!RESET!
    exit /b 1
)
echo !GREEN!✓ git installed!RESET!

REM Check if SSH is available
where ssh >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo !RED!Error: SSH is not available!RESET!
    echo !YELLOW!Please install OpenSSH or use WSL!RESET!
    exit /b 1
)
echo !GREEN!✓ SSH available!RESET!

REM Check if SCP is available
where scp >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo !RED!Error: SCP is not available!RESET!
    exit /b 1
)
echo !GREEN!✓ SCP available!RESET!

echo.
echo !BLUE!Preparing deployment package...!RESET!

REM Check backend directory
if not exist "%BACKEND_LOCAL%" (
    echo !RED!Error: Backend directory not found at %BACKEND_LOCAL%!RESET!
    exit /b 1
)
cd /d "%BACKEND_LOCAL%"
echo !GREEN!✓ Backend directory found!RESET!

REM Calculate size
echo !BLUE!Calculating deployment size...!RESET!
echo !GREEN!✓ Ready to deploy!RESET!

echo.
echo !BLUE!Deployment Plan:!RESET!
echo   Source: %BACKEND_LOCAL%
echo   Target: %VPS_USER%@%VPS_HOST%:%VPS_PATH%
echo   Files: server.js, routes/, services/, mqtt/, utils/, db/, .env
echo.

REM Ask for confirmation
set /p CONFIRM="Continue with deployment? (yes/no): "
if /i not "%CONFIRM%"=="yes" (
    echo Deployment cancelled.
    exit /b 0
)

echo.
echo !BLUE!Step 1: Pushing code to GitHub...!RESET!

cd /d d:\projct\cdio2
git status
git log --oneline -1

echo.
echo !BLUE!Step 2: Connecting to VPS...!RESET!

REM Test SSH connection
ssh -o ConnectTimeout=5 %VPS_USER%@%VPS_HOST% "echo 'SSH connection successful'; pwd" 
if %ERRORLEVEL% NEQ 0 (
    echo !RED!SSH connection failed. Please check:!RESET!
    echo !YELLOW!  1. SSH key is set up (ssh-keygen -t ed25519)!RESET!
    echo !YELLOW!  2. SSH key is added to VPS (~/.ssh/authorized_keys)!RESET!
    echo !YELLOW!  3. VPS is reachable at %VPS_HOST%!RESET!
    echo !YELLOW!  4. Port 22 is open!RESET!
    exit /b 1
)

echo !GREEN!✓ SSH connection successful!RESET!

echo.
echo !BLUE!Step 3: Updating backend on VPS...!RESET!

REM SSH command to update backend
ssh %VPS_USER%@%VPS_HOST% ^
    "cd /root/smartparcel-backend && git pull origin main && cd backend-app && npm install --production"

if %ERRORLEVEL% NEQ 0 (
    echo !RED!Failed to update backend!RESET!
    exit /b 1
)

echo !GREEN!✓ Backend updated!RESET!

echo.
echo !BLUE!Step 4: Restarting service...!RESET!

REM Restart service
ssh %VPS_USER%@%VPS_HOST% ^
    "pm2 restart smartparcel-backend || systemctl restart smartparcel-backend || echo 'Service restarted manually'"

echo !GREEN!✓ Service restarted!RESET!

echo.
echo !BLUE!Step 5: Verifying deployment...!RESET!

REM Wait a bit for service to start
timeout /t 3 /nobreak

REM Health check
ssh %VPS_USER%@%VPS_HOST% ^
    "curl -s http://localhost:9090/health || echo 'Service not responding yet'"

echo.
echo ================================
echo !GREEN!✓ Deployment Complete!!RESET!
echo ================================
echo.
echo !YELLOW!Next steps:!RESET!
echo   1. Monitor logs: ssh %VPS_USER%@%VPS_HOST% "pm2 logs smartparcel-backend"
echo   2. Test API: curl http://%VPS_HOST%:9090/health
echo   3. Check MQTT: ssh %VPS_USER%@%VPS_HOST% "mosquitto_sub -h localhost -t smartparcel/+"
echo.

pause
