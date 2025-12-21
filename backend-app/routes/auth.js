import express from 'express';
import bcrypt from 'bcrypt';
import { readDB, updateDB } from '../utils/db.js';
import { generateToken, createSession, deleteSession } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const users = readDB('users');
    
    if (!users || users.username !== username) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, users.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // SECURITY: Enforce password change on first login
    if (users.requirePasswordChange === true) {
      return res.status(403).json({ 
        error: 'Password must be changed on first login',
        requiresSetup: true,
        message: 'Please complete first-time setup at /api/auth/first-setup'
      });
    }
    
    const token = generateToken(username);
    const session = createSession(username, token);
    
    res.json({
      success: true,
      token,
      session: {
        id: session.id,
        expiresAt: session.expiresAt
      },
      user: {
        username: users.username,
        requirePasswordChange: users.requirePasswordChange || false,
        isFirstLogin: users.isFirstLogin || false
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/verify-pin
 * Verify PIN for quick unlock
 */
router.post('/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: 'PIN required' });
    }
    
    const pins = readDB('pins');
    
    if (!pins || pins.appPin !== pin) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    
    res.json({ success: true, message: 'PIN verified' });
    
  } catch (error) {
    console.error('PIN verification error:', error);
    res.status(500).json({ error: 'PIN verification failed' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const users = readDB('users');
    
    const isValidPassword = await bcrypt.compare(currentPassword, users.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    updateDB('users', {
      password: hashedPassword
    });
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/change-pin
 * Change app PIN
 */
router.post('/change-pin', async (req, res) => {
  try {
    const { currentPin, newPin } = req.body;
    
    if (!currentPin || !newPin) {
      return res.status(400).json({ error: 'Current and new PIN required' });
    }
    
    if (!/^\d{4,8}$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits' });
    }
    
    const pins = readDB('pins');
    
    if (pins.appPin !== currentPin) {
      return res.status(401).json({ error: 'Invalid current PIN' });
    }
    
    updateDB('pins', {
      appPin: newPin
    });
    
    res.json({ success: true, message: 'PIN changed successfully' });
    
  } catch (error) {
    console.error('Change PIN error:', error);
    res.status(500).json({ error: 'Failed to change PIN' });
  }
});

/**
 * POST /api/auth/change-door-pin
 * Change door lock PIN
 */
router.post('/change-door-pin', async (req, res) => {
  try {
    const { newPin } = req.body;
    
    if (!newPin) {
      return res.status(400).json({ error: 'New PIN required' });
    }
    
    if (!/^\d{4,8}$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits' });
    }
    
    updateDB('pins', {
      doorLockPin: newPin
    });
    
    // Publish to ESP8266 via MQTT
    const { publishPinUpdate } = await import('../mqtt/client.js');
    publishPinUpdate(newPin);
    
    res.json({ success: true, message: 'Door lock PIN changed successfully' });
    
  } catch (error) {
    console.error('Change door PIN error:', error);
    res.status(500).json({ error: 'Failed to change door PIN' });
  }
});

/**
 * POST /api/auth/logout
 * Logout and invalidate session
 */
router.post('/logout', (req, res) => {
  try {
    // Just return success - no session to invalidate
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/session
 * Get current session info
 */
router.get('/session', (req, res) => {
  res.json({
    success: true,
    session: {
      id: 'no-auth',
      username: 'user',
      expiresAt: null,
      lastActivity: new Date().toISOString()
    }
  });
});

/**
 * POST /api/auth/first-setup
 * First-time setup: Force password change on first login
 */
router.post('/first-setup', async (req, res) => {
  try {
    const { newPassword, newPin } = req.body;
    
    const users = readDB('users');
    
    // Check if first login is required
    if (!users.requirePasswordChange) {
      return res.status(400).json({ error: 'First-time setup already completed' });
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters',
        requirements: {
          minLength: 8,
          recommended: 'Use mix of letters, numbers, and special characters'
        }
      });
    }
    
    // Validate new PIN
    if (!newPin || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ 
        error: 'PIN must be exactly 6 digits',
        example: '123456'
      });
    }
    
    // Check password strength (basic check)
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    const strengthCount = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strengthCount < 3) {
      return res.status(400).json({ 
        error: 'Password too weak. Use at least 3 of: uppercase, lowercase, numbers, special characters',
        strength: {
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecialChar
        }
      });
    }
    
    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    updateDB('users', {
      password: hashedPassword,
      requirePasswordChange: false,
      isFirstLogin: false
    });
    
    // Update PIN
    updateDB('pins', {
      appPin: newPin,
      doorLockPin: newPin  // Set same PIN for both initially
    });
    
    res.json({
      success: true,
      message: 'First-time setup completed successfully',
      recommendation: 'Please remember your new password and PIN'
    });
    
  } catch (error) {
    console.error('First setup error:', error);
    res.status(500).json({ error: 'First-time setup failed' });
  }
});

export default router;
