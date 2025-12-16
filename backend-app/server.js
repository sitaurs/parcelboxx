import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import packageRoutes from './routes/packages.js';
import deviceRoutes from './routes/device.js';
import whatsappRoutes from './routes/whatsapp.js';
import { aiRoutes, initializeAI } from './routes/ai.js';

// Import auth utilities
import { cleanExpiredSessions } from './middleware/auth.js';

// Import MQTT client
import { initMQTT } from './mqtt/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9090;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Serve static files from storage directory
app.use('/storage', express.static(path.join(__dirname, 'storage')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SmartParcel Backend App',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/v1/packages', packageRoutes); // For ESP32-CAM compatibility
app.use('/api/device', deviceRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Initialize AI service first (needed by MQTT for baseline capture)
console.log('→ Initializing AI service...');
const aiInitialized = initializeAI();
if (aiInitialized) {
  console.log('✓ AI service initialized successfully');
} else {
  console.warn('⚠️  AI service not initialized - Gemini API keys not configured');
}

// Initialize MQTT connection with AI Engine reference
import { getAIEngine } from './routes/ai.js';
const aiEngine = getAIEngine();
initMQTT({ aiEngine: aiEngine });
console.log('✓ MQTT connected with AI Engine integration');

// Clean expired sessions on startup
console.log('→ Cleaning expired sessions...');
cleanExpiredSessions();

// Validate JWT Secret before starting server
const DEFAULT_JWT = 'smartparcel_secret_key_change_in_production_2025';
const DEFAULT_DEVICE_JWT = 'device_jwt_secret_change_in_production_2025';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT) {
  console.warn('⚠️  WARNING: Using default JWT_SECRET! Please set in .env file!');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Cannot use default JWT_SECRET in production mode!');
    console.error('   Please set JWT_SECRET in .env file');
    process.exit(1);
  }
}

if (!process.env.DEVICE_JWT_SECRET || process.env.DEVICE_JWT_SECRET === DEFAULT_DEVICE_JWT) {
  console.warn('⚠️  WARNING: Using default DEVICE_JWT_SECRET! Please set in .env file!');
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: Cannot use default DEVICE_JWT_SECRET in production mode!');
    console.error('   Please set DEVICE_JWT_SECRET in .env file');
    process.exit(1);
  }
}

// Start server
app.listen(PORT, () => {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   SmartParcel Backend App - Tugas Akhir     ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`→ Server running on port ${PORT}`);
  console.log(`→ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`→ MQTT Broker: ${process.env.MQTT_BROKER}`);
  console.log(`→ Device ID: ${process.env.DEVICE_ID}`);
  console.log('');
  console.log('API Endpoints:');
  console.log('  - POST   /api/auth/login');
  console.log('  - POST   /api/auth/verify-pin');
  console.log('  - POST   /api/auth/change-password');
  console.log('  - POST   /api/auth/change-pin');
  console.log('  - GET    /api/packages');
  console.log('  - POST   /api/v1/packages (ESP32)');
  console.log('  - GET    /api/device/status');
  console.log('  - GET    /api/device/settings');
  console.log('  - PUT    /api/device/settings');
  console.log('  - POST   /api/device/control/*');
  console.log('  - POST   /api/ai/verify-package (AI)');
  console.log('  - GET    /api/ai/stats (AI)');
  console.log('  - GET    /api/ai/health (AI)');
  console.log('');
  console.log('Ready for connections! 🚀');
  console.log('═══════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});
