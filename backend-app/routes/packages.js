import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readDB, appendDB, writeDB } from '../utils/db.js';
import { deviceTokenMiddleware } from '../middleware/auth.js';
import GowaService from '../services/gowa.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_PATH = path.join(__dirname, '..', 'storage');

// Initialize GOWA Service for WhatsApp notifications
const gowa = new GowaService({
  baseUrl: process.env.GOWA_API_URL,
  username: process.env.GOWA_USERNAME,
  password: process.env.GOWA_PASSWORD
});

const router = express.Router();

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  }
});

/**
 * POST /api/v1/packages
 * Upload package photo from ESP32-CAM
 */
router.post('/', deviceTokenMiddleware, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    
    const meta = req.body.meta ? JSON.parse(req.body.meta) : {};
    const timestamp = new Date().toISOString();
    const filename = `package_${Date.now()}`;
    
    // Save original photo (DIRECT write - skip Sharp to avoid JPEG parsing errors)
    const photoPath = path.join(STORAGE_PATH, `${filename}.jpg`);
    fs.writeFileSync(photoPath, req.file.buffer);
    
    // Generate thumbnail (with error handling - tidak gagal jika Sharp error)
    const thumbPath = path.join(STORAGE_PATH, `${filename}_thumb.jpg`);
    try {
      await sharp(req.file.buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 70 })
        .toFile(thumbPath);
      console.log(`✅ Thumbnail generated: ${filename}_thumb.jpg`);
    } catch (thumbError) {
      console.warn(`⚠️ Thumbnail generation failed (using original): ${thumbError.message}`);
      // Fallback: copy original as thumbnail if Sharp fails
      fs.writeFileSync(thumbPath, req.file.buffer);
    }
    
    const packages = readDB('packages');
    const packageId = packages.length + 1;
    
    const packageData = {
      id: packageId,
      deviceId: meta.deviceId || 'box-01',
      timestamp,
      ts: timestamp,
      photoUrl: `/storage/${filename}.jpg`,
      thumbUrl: `/storage/${filename}_thumb.jpg`,
      distanceCm: meta.distanceCm || null,
      reason: meta.reason || 'detect',
      firmware: meta.firmware || 'unknown',
      status: 'received', // NEW: Package lifecycle status
      pickedUpAt: null    // NEW: Pickup timestamp
    };
    
    appendDB('packages', packageData);
    
    // ✅ SEND WHATSAPP NOTIFICATION IMMEDIATELY (tidak tunggu MQTT!)
    sendWhatsAppNotification(packageData).catch(err => {
      console.error('❌ WhatsApp notification error:', err.message);
      // Don't fail the request if notification fails
    });
    
    res.status(201).json({
      success: true,
      id: packageId,
      photoUrl: packageData.photoUrl,
      thumbUrl: packageData.thumbUrl,
      ts: timestamp
    });
    
  } catch (error) {
    console.error('Package upload error:', error);
    res.status(500).json({ error: 'Failed to upload package' });
  }
});

/**
 * Send WhatsApp notification for new package
 */
async function sendWhatsAppNotification(packageData) {
  try {
    // Get WhatsApp configuration
    const config = readDB('whatsappConfig');
    
    // Check if WhatsApp is paired and not blocked
    if (!config.isPaired || config.isBlocked) {
      console.log('⚠️ WhatsApp not configured or blocked. Skipping notification.');
      return;
    }

    // Get recipients from config
    const recipients = config.recipients || [];
    if (recipients.length === 0) {
      console.log('⚠️ No WhatsApp recipients configured.');
      return;
    }

    // Prepare message
    const message = `📦 *SmartParcel - Paket Diterima*\n\n` +
      `⏰ Waktu: ${new Date(packageData.timestamp).toLocaleString('id-ID')}\n` +
      `📍 Device: ${packageData.deviceId}\n` +
      `📏 Jarak: ${packageData.distanceCm ? packageData.distanceCm.toFixed(1) + ' cm' : 'N/A'}\n\n` +
      `Paket baru telah diterima dan tersimpan dengan aman.\n` +
      `Silakan ambil paket Anda.`;
    
    // Get full photo URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9090}`;
    const photoUrl = packageData.photoUrl.startsWith('http') 
      ? packageData.photoUrl 
      : `${baseUrl}${packageData.photoUrl}`;

    console.log(`📤 Sending WhatsApp notification to ${recipients.length} recipient(s)...`);
    
    // Send to all recipients
    for (const recipient of recipients) {
      try {
        const result = await gowa.sendImage(recipient, message, photoUrl, true);
        
        if (result.success) {
          console.log(`✅ WhatsApp sent to ${recipient}: ${result.messageId}`);
        } else {
          console.error(`❌ Failed to send WhatsApp to ${recipient}:`, result.error);
        }
      } catch (error) {
        console.error(`❌ Error sending to ${recipient}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ WhatsApp notification error:', error.message);
    throw error;
  }
}

/**
 * GET /api/packages
 * Get all packages (for mobile app)
 */
router.get('/', (req, res) => {
  try {
    const { limit, offset } = req.query;
    let packages = readDB('packages');
    
    // Sort by timestamp descending (newest first)
    packages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Pagination
    if (limit) {
      const start = parseInt(offset) || 0;
      const end = start + parseInt(limit);
      packages = packages.slice(start, end);
    }
    
    res.json({
      success: true,
      packages,
      total: packages.length
    });
    
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({ error: 'Failed to get packages' });
  }
});

/**
 * GET /api/packages/:id
 * Get single package by ID
 */
router.get('/:id', (req, res) => {
  try {
    const packages = readDB('packages');
    const pkg = packages.find(p => p.id === parseInt(req.params.id));
    
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    res.json({
      success: true,
      package: pkg
    });
    
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Failed to get package' });
  }
});

/**
 * DELETE /api/packages/:id
 * Delete package by ID
 */
router.delete('/:id', (req, res) => {
  try {
    const packages = readDB('packages');
    const pkg = packages.find(p => p.id === parseInt(req.params.id));
    
    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    // Delete files
    const photoPath = path.join(STORAGE_PATH, path.basename(pkg.photoUrl));
    const thumbPath = path.join(STORAGE_PATH, path.basename(pkg.thumbUrl));
    
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
    
    // Remove from database
    const filtered = packages.filter(p => p.id !== parseInt(req.params.id));
    writeDB('packages', filtered);
    
    res.json({
      success: true,
      message: 'Package deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: 'Failed to delete package' });
  }
});

/**
 * GET /api/packages/stats
 * Get package statistics
 */
router.get('/stats/summary', (req, res) => {
  try {
    const packages = readDB('packages');
    
    // Today calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayPackages = packages.filter(p => new Date(p.timestamp) >= today);
    
    // This week calculation (last 7 days, not start of week)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const weekPackages = packages.filter(p => new Date(p.timestamp) >= sevenDaysAgo);
    
    // Latest package (sorted by timestamp)
    const sortedPackages = [...packages].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    res.json({
      success: true,
      stats: {
        total: packages.length,
        today: todayPackages.length,
        thisWeek: weekPackages.length,
        latest: sortedPackages[0] || null
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

/**
 * POST /api/packages/:id/pickup
 * Mark package as picked up
 */
router.post('/:id/pickup', (req, res) => {
  try {
    const packages = readDB('packages');
    const packageIndex = packages.findIndex(p => p.id === parseInt(req.params.id));
    
    if (packageIndex === -1) {
      return res.status(404).json({ error: 'Package not found' });
    }
    
    if (packages[packageIndex].status === 'picked_up') {
      return res.status(400).json({ error: 'Package already picked up' });
    }
    
    packages[packageIndex].status = 'picked_up';
    packages[packageIndex].pickedUpAt = new Date().toISOString();
    
    writeDB('packages', packages);
    
    res.json({
      success: true,
      package: packages[packageIndex],
      message: 'Package marked as picked up'
    });
    
  } catch (error) {
    console.error('Pickup package error:', error);
    res.status(500).json({ error: 'Failed to mark package as picked up' });
  }
});

export default router;
