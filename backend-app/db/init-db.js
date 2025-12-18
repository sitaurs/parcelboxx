import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initial database structure
const initialData = {
  users: {
    username: 'zamn',
    password: await bcrypt.hash('admin123', 10), // Default password - MUST BE CHANGED
    createdAt: new Date().toISOString(),
    isFirstLogin: true,
    requirePasswordChange: true
  },
  
  pins: {
    doorLockPin: '123456', // Default PIN for door lock
    appPin: '123456', // Default PIN for app quick unlock
    updatedAt: new Date().toISOString()
  },
  
  settings: {
    ultra: {
      min: 12.0,
      max: 25.0
    },
    lock: {
      ms: 5000 // Solenoid penahan paket duration
    },
    buzzer: {
      ms: 60000,
      buzzOn: 500,
      buzzOff: 300
    },
    doorLock: {
      ms: 3000 // Door lock solenoid duration
    },
    detection: {
      mode: 'FULL_HCSR' // Default: Ultrasonic only (fastest, no AI overhead)
    },
    updatedAt: new Date().toISOString()
  },
  
  packages: [],
  
  sessions: [],
  
  deviceStatus: {
    isOnline: false,
    lastSeen: null,
    lastDistance: null,
    firmware: 'esp32cam-allinone'
  },
  
  whatsappConfig: {
    senderPhone: '',
    isPaired: false,
    isConnected: false,
    recipients: [],
    updatedAt: new Date().toISOString()
  }
};

// Create database files
async function initDatabase() {
  const dbPath = __dirname;
  
  // Create db directory if not exists
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath, { recursive: true });
  }

  // Create each JSON file
  for (const [filename, data] of Object.entries(initialData)) {
    const filePath = path.join(dbPath, `${filename}.json`);
    
    // Only create if file doesn't exist
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ Created ${filename}.json`);
    } else {
      console.log(`→ ${filename}.json already exists, skipping...`);
    }
  }
  
  console.log('✓ Database initialization complete!');
}

initDatabase().catch(console.error);
