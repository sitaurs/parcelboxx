// WhatsApp GOWA API Service
// Integrasi dengan Go-WhatsApp-Web-Multidevice (GOWA)

import FormData from 'form-data';
import fetch from 'node-fetch';
import fs from 'fs';

class GowaService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.GOWA_API_URL || 'http://gowa1.flx.web.id';
    this.username = config.username || process.env.GOWA_USERNAME || 'smartparcel';
    this.password = config.password || process.env.GOWA_PASSWORD || 'SmartParcel2025!';
    this.authHeader = 'Basic ' + Buffer.from(`${this.username}:${this.password}`).toString('base64');
  }

  /**
   * Send text message
   * @param {string} phone - Phone number (without @s.whatsapp.net)
   * @param {string} message - Message text
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendText(phone, message) {
    try {
      const response = await fetch(`${this.baseUrl}/send/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        },
        body: JSON.stringify({
          phone: phone,
          message: message
        })
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          messageId: result.results.message_id,
          status: result.results.status
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to send message'
        };
      }
    } catch (error) {
      console.error('GOWA sendText error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send image with caption
   * @param {string} phone - Phone number
   * @param {string} caption - Image caption
   * @param {string} imageUrl - Image URL (http://...) or local file path
   * @param {boolean} compress - Auto compress image (default: true)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendImage(phone, caption, imageUrl, compress = true) {
    try {
      const formData = new FormData();
      formData.append('phone', phone);
      formData.append('caption', caption);
      formData.append('compress', compress ? 'true' : 'false');

      // Check if imageUrl is local file or URL
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // Remote URL
        formData.append('image_url', imageUrl);
      } else {
        // Local file
        if (fs.existsSync(imageUrl)) {
          formData.append('image', fs.createReadStream(imageUrl));
        } else {
          return {
            success: false,
            error: `Image file not found: ${imageUrl}`
          };
        }
      }

      const response = await fetch(`${this.baseUrl}/send/image`, {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          ...formData.getHeaders()
        },
        body: formData
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          messageId: result.results.message_id,
          status: result.results.status
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to send image'
        };
      }
    } catch (error) {
      console.error('GOWA sendImage error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send location
   * @param {string} phone - Phone number
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {string} name - Location name (optional)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendLocation(phone, latitude, longitude, name = '') {
    try {
      const response = await fetch(`${this.baseUrl}/send/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        },
        body: JSON.stringify({
          phone: phone,
          latitude: latitude,
          longitude: longitude,
          name: name
        })
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          messageId: result.results.message_id
        };
      } else {
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('GOWA sendLocation error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check WhatsApp connection status
   * @returns {Promise<{isConnected: boolean, devices?: array}>}
   */
  async getStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/app/devices`, {
        headers: {
          'Authorization': this.authHeader
        }
      });

      const result = await response.json();

      console.log('🔍 GOWA /app/devices response:', JSON.stringify(result, null, 2));

      // Check if WhatsApp is actually connected
      // result.code === 'SUCCESS' means API call succeeded
      // But we need to check if there are active devices
      const hasActiveDevices = Array.isArray(result.results) && result.results.length > 0;
      
      console.log('🔍 hasActiveDevices:', hasActiveDevices);
      
      return {
        isConnected: hasActiveDevices ? true : false,
        devices: result.results || []
      };
    } catch (error) {
      console.error('GOWA getStatus error:', error.message);
      return {
        isConnected: false,
        error: error.message
      };
    }
  }

  /**
   * Generate pairing code for WhatsApp login
   * @param {string} phone - Phone number with country code
   * @returns {Promise<{success: boolean, pairCode?: string, error?: string}>}
   */
  async getPairingCode(phone) {
    try {
      const response = await fetch(`${this.baseUrl}/app/login-with-code?phone=${phone}`, {
        headers: {
          'Authorization': this.authHeader
        }
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          pairCode: result.results.pair_code
        };
      } else {
        return {
          success: false,
          error: result.message
        };
      }
    } catch (error) {
      console.error('GOWA getPairingCode error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Logout and remove database session
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async logout() {
    try {
      const response = await fetch(`${this.baseUrl}/app/logout`, {
        headers: {
          'Authorization': this.authHeader
        }
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          message: result.message || 'Successfully logged out and removed session'
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to logout'
        };
      }
    } catch (error) {
      console.error('GOWA logout error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reconnect to WhatsApp server (without logging out)
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async reconnect() {
    try {
      const response = await fetch(`${this.baseUrl}/app/reconnect`, {
        headers: {
          'Authorization': this.authHeader
        }
      });

      const result = await response.json();

      if (result.code === 'SUCCESS') {
        return {
          success: true,
          message: result.message || 'Successfully reconnected to WhatsApp server'
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to reconnect'
        };
      }
    } catch (error) {
      console.error('GOWA reconnect error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all WhatsApp groups (User My Groups)
   * @returns {Promise<{success: boolean, groups?: array, error?: string}>}
   */
  async listGroups() {
    try {
      const response = await fetch(`${this.baseUrl}/user/my/groups`, {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader
        }
      });

      const result = await response.json();
      
      console.log('🔍 GOWA /user/my/groups response:', JSON.stringify(result, null, 2));

      if (result.code === 'SUCCESS') {
        // GOWA returns: { code: "SUCCESS", results: { data: [...] } }
        // Extract the data array from results.data
        let groupsList = [];
        
        if (result.results && result.results.data && Array.isArray(result.results.data)) {
          groupsList = result.results.data;
          console.log('✅ Found groups array in results.data:', groupsList.length, 'groups');
        } else if (Array.isArray(result.results)) {
          // Fallback: if results is directly an array
          groupsList = result.results;
          console.log('✅ Found groups array in results:', groupsList.length, 'groups');
        } else {
          console.warn('⚠️ Unexpected response structure:', typeof result.results);
        }
        
        return {
          success: true,
          groups: groupsList
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to fetch groups'
        };
      }
    } catch (error) {
      console.error('GOWA listGroups error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default GowaService;
