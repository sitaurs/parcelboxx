#!/bin/bash
# SmartParcel Backend Deployment Script v2.1.0
# Usage: ./deploy.sh

set -e  # Exit on error

echo "================================"
echo "🚀 SmartParcel Backend v2.1.0"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BACKEND_DIR="/root/smartparcel-backend/backend-app"
SERVICE_NAME="smartparcel-backend"

# Check if script is run as root
if [ "$EUID" -ne 0 ]; then 
  echo -e "${RED}❌ Please run as root (use sudo)${NC}"
  exit 1
fi

echo -e "${BLUE}1️⃣  Checking prerequisites...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not installed${NC}"
  exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
  echo -e "${RED}❌ npm not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ npm $(npm -v)${NC}"

# Check git
if ! command -v git &> /dev/null; then
  echo -e "${RED}❌ git not installed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ git installed${NC}"

echo ""
echo -e "${BLUE}2️⃣  Pulling latest code from GitHub...${NC}"

# Ensure backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
  echo -e "${YELLOW}Creating backend directory...${NC}"
  mkdir -p /root/smartparcel-backend
  cd /root/smartparcel-backend
  git clone https://github.com/sitaurs/parcelboxx.git .
else
  cd "$BACKEND_DIR"
  git fetch origin
fi

cd "$BACKEND_DIR"
git pull origin main --ff-only
echo -e "${GREEN}✓ Code updated${NC}"

echo ""
echo -e "${BLUE}3️⃣  Checking .env file...${NC}"

if [ ! -f ".env" ]; then
  echo -e "${RED}❌ .env file not found!${NC}"
  echo -e "${YELLOW}Please create .env file with required variables:${NC}"
  cat << 'EOF'
PORT=9090
NODE_ENV=production
BASE_URL=http://3.27.11.106:9090
JWT_SECRET=your-secret-key
DEVICE_JWT_SECRET=your-device-secret
MQTT_BROKER=mqtt://3.27.11.106:1884
MQTT_USER=mcuzaman
MQTT_PASS=McuZaman#2025Aman!
DEVICE_ID=box-01
GOWA_API_URL=http://gowa1.flx.web.id
GOWA_USERNAME=username
GOWA_PASSWORD=password
GEMINI_API_KEY_1=your-key
EOF
  exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

echo ""
echo -e "${BLUE}4️⃣  Installing dependencies...${NC}"

npm install --production
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo -e "${BLUE}5️⃣  Stopping old service...${NC}"

# Try PM2 first
if command -v pm2 &> /dev/null; then
  pm2 stop "$SERVICE_NAME" 2>/dev/null || true
  echo -e "${GREEN}✓ PM2 service stopped${NC}"
elif systemctl is-enabled "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  echo -e "${GREEN}✓ Systemd service stopped${NC}"
else
  echo -e "${YELLOW}⚠ No running service found${NC}"
fi

echo ""
echo -e "${BLUE}6️⃣  Starting new service...${NC}"

# Prefer PM2 if available
if command -v pm2 &> /dev/null; then
  pm2 start server.js --name "$SERVICE_NAME" --instances max --merge-logs
  pm2 save
  echo -e "${GREEN}✓ Service started with PM2${NC}"
  echo -e "${YELLOW}Monitor with: pm2 logs ${SERVICE_NAME}${NC}"
elif systemctl is-enabled "$SERVICE_NAME" 2>/dev/null; then
  systemctl start "$SERVICE_NAME"
  echo -e "${GREEN}✓ Service started with systemd${NC}"
else
  echo -e "${YELLOW}⚠ Starting service manually (background)${NC}"
  nohup node server.js > /tmp/smartparcel-backend.log 2>&1 &
  echo -e "${GREEN}✓ Service started in background${NC}"
  echo -e "${YELLOW}Monitor with: tail -f /tmp/smartparcel-backend.log${NC}"
fi

echo ""
echo -e "${BLUE}7️⃣  Waiting for service to be ready...${NC}"

sleep 3

# Check health endpoint
for i in {1..10}; do
  if curl -s http://localhost:9090/health > /dev/null; then
    echo -e "${GREEN}✓ Service is healthy${NC}"
    break
  fi
  if [ $i -eq 10 ]; then
    echo -e "${RED}⚠ Service not responding (check logs)${NC}"
  fi
  echo -n "."
  sleep 1
done

echo ""
echo -e "${BLUE}8️⃣  Deployment Summary${NC}"
echo "================================"
echo -e "${GREEN}✓ Backend: v2.1.0${NC}"
echo -e "${GREEN}✓ Location: ${BACKEND_DIR}${NC}"
echo -e "${GREEN}✓ API URL: http://3.27.11.106:9090${NC}"
echo -e "${GREEN}✓ Health: http://3.27.11.106:9090/health${NC}"
echo ""
echo "📦 New Features (v2.1.0):"
echo "  • AI Baseline Photo Comparison"
echo "  • ESP32 Holder Release Event"
echo "  • Improved MQTT Integration"
echo "  • Flash default: 150ms → 300ms"
echo "  • Holder safety cap: max 10s"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "  1. Test API endpoints"
echo "  2. Check MQTT connection"
echo "  3. Monitor ESP32/ESP8266 devices"
echo "  4. Verify database syncing"
echo ""
echo "================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "================================"
