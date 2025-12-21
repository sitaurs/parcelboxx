// WhatsApp Management Routes
// Menggantikan backend-whatsapp dengan GOWA API integration

import express from 'express';
import { readDB, updateDB, writeDB } from '../utils/db.js';
import GowaService from '../services/gowa.js';

const router = express.Router();

// Initialize GOWA service
const gowa = new GowaService();

/**
 * GET /api/whatsapp/status
 * Get WhatsApp connection status
 */
router.get('/status', async (req, res) => {
  try {
    const status = await gowa.getStatus();
    const config = readDB('whatsappConfig');

    const responseData = {
      success: true,
      status: {
        isConnected: status.isConnected,
        devices: status.devices || [],
        config: {
          isPaired: config.isPaired,
          recipients: config.recipients,
          isBlocked: config.isBlocked
        }
      }
    };

    console.log('📤 SENDING TO FRONTEND - isConnected:', status.isConnected);
    console.log('📤 Full response:', JSON.stringify(responseData, null, 2));

    res.json(responseData);
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WhatsApp status'
    });
  }
});

/**
 * POST /api/whatsapp/pairing-code
 * Generate pairing code for WhatsApp login
 */
router.post('/pairing-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    // Generate pairing code
    const result = await gowa.getPairingCode(cleanPhone);

    console.log('🎯 PAIRING CODE RESULT:', result);

    if (result.success) {
      // JANGAN set isPaired = true di sini!
      // isPaired harus di-set SETELAH user confirm pairing di WhatsApp
      
      res.json({
        success: true,
        pairCode: result.pairCode,
        message: 'Pairing code generated. Enter this code in WhatsApp settings.'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate pairing code'
      });
    }
  } catch (error) {
    console.error('Generate pairing code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate pairing code'
    });
  }
});

/**
 * POST /api/whatsapp/logout
 * Logout from WhatsApp and remove session
 */
router.post('/logout', async (req, res) => {
  try {
    const result = await gowa.logout();

    if (result.success) {
      // Update config
      const config = readDB('whatsappConfig');
      config.isPaired = false;
      writeDB('whatsappConfig', config);

      res.json({
        success: true,
        message: result.message || 'Successfully logged out from WhatsApp'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to logout'
      });
    }
  } catch (error) {
    console.error('WhatsApp logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout from WhatsApp'
    });
  }
});

/**
 * POST /api/whatsapp/reconnect
 * Reconnect to WhatsApp server
 */
router.post('/reconnect', async (req, res) => {
  try {
    const result = await gowa.reconnect();

    if (result.success) {
      res.json({
        success: true,
        message: result.message || 'Successfully reconnected to WhatsApp'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to reconnect'
      });
    }
  } catch (error) {
    console.error('WhatsApp reconnect error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reconnect to WhatsApp'
    });
  }
});

/**
 * GET /api/whatsapp/recipients
 * Get list of WhatsApp recipients
 */
router.get('/recipients', (req, res) => {
  try {
    const config = readDB('whatsappConfig');
    res.json({
      success: true,
      recipients: config.recipients || []
    });
  } catch (error) {
    console.error('Get recipients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recipients'
    });
  }
});

/**
 * POST /api/whatsapp/recipients
 * Add WhatsApp recipient
 */
router.post('/recipients', (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');

    const config = readDB('whatsappConfig');
    
    // Ensure recipients is array of objects
    if (!Array.isArray(config.recipients)) {
      config.recipients = [];
    }
    
    // Check if already exists (by phone)
    const exists = config.recipients.find(r => 
      (typeof r === 'string' ? r : r.phone) === cleanPhone
    );
    
    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'Recipient already exists'
      });
    }

    // Add recipient with name
    config.recipients.push({
      phone: cleanPhone,
      name: name || cleanPhone
    });
    writeDB('whatsappConfig', config);

    res.json({
      success: true,
      message: 'Recipient added successfully',
      recipients: config.recipients
    });
  } catch (error) {
    console.error('Add recipient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add recipient'
    });
  }
});

/**
 * DELETE /api/whatsapp/recipients/:phone
 * Remove WhatsApp recipient
 */
router.delete('/recipients/:phone', (req, res) => {
  try {
    const { phone } = req.params;
    const cleanPhone = phone.replace(/\D/g, '');

    const config = readDB('whatsappConfig');
    
    // Find index (support both old string format and new object format)
    const index = config.recipients.findIndex(r => 
      (typeof r === 'string' ? r : r.phone) === cleanPhone
    );
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }

    // Remove recipient
    config.recipients.splice(index, 1);
    writeDB('whatsappConfig', config);

    res.json({
      success: true,
      message: 'Recipient removed successfully',
      recipients: config.recipients
    });
  } catch (error) {
    console.error('Remove recipient error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove recipient'
    });
  }
});

/**
 * POST /api/whatsapp/test
 * Send test message
 */
router.post('/test', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone and message are required'
      });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const result = await gowa.sendText(cleanPhone, message);

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
        message: 'Test message sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test message'
      });
    }
  } catch (error) {
    console.error('Send test message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test message'
    });
  }
});

/**
 * POST /api/whatsapp/block
 * Block/unblock WhatsApp notifications
 */
router.post('/block', (req, res) => {
  try {
    const { blocked } = req.body;

    if (typeof blocked !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'blocked must be a boolean'
      });
    }

    const config = readDB('whatsappConfig');
    config.isBlocked = blocked;
    writeDB('whatsappConfig', config);

    res.json({
      success: true,
      message: blocked ? 'WhatsApp notifications blocked' : 'WhatsApp notifications enabled',
      isBlocked: config.isBlocked
    });
  } catch (error) {
    console.error('Block/unblock error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update block status'
    });
  }
});

/**
 * GET /api/whatsapp/groups
 * Get list of all WhatsApp groups
 */
router.get('/groups', async (req, res) => {
  try {
    const result = await gowa.listGroups();

    console.log('📋 LIST GROUPS RESULT:', JSON.stringify(result, null, 2));

    if (result.success) {
      // Ensure groups is always an array
      let groupsList = [];
      
      if (Array.isArray(result.groups)) {
        groupsList = result.groups;
      } else if (result.groups && typeof result.groups === 'object') {
        // If groups is an object, try to extract array from common properties
        groupsList = result.groups.groups || result.groups.data || [];
      }
      
      const responseData = {
        success: true,
        groups: groupsList
      };
      
      console.log('📤 SENDING GROUPS TO FRONTEND:', groupsList.length, 'groups');
      console.log('📤 Groups type:', Array.isArray(groupsList) ? 'ARRAY' : typeof groupsList);
      
      res.json(responseData);
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to fetch groups'
      });
    }
  } catch (error) {
    console.error('List groups error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch groups'
    });
  }
});

export default router;
