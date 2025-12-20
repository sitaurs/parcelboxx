import { useStore } from '../store/useStore';

// VPS URL as per user instruction
export const API_URL = 'http://3.27.11.106:9090/api';

// Configurable settings
export const API_CONFIG = {
    POLLING_INTERVAL: 5000, // 5 seconds - optimized for battery life (was 2s)
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second between retries
    TIMEOUT: 30000, // 30 second timeout
};

interface RequestOptions extends RequestInit {
    headers?: Record<string, string>;
    retries?: number;
}

// Sleep utility for retry delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const request = async (endpoint: string, options: RequestOptions = {}, retryCount = 0): Promise<any> => {
    const token = localStorage.getItem('authToken');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const maxRetries = options.retries ?? API_CONFIG.MAX_RETRIES;

    try {
        // Add timeout support
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
            // Don't logout on 401 from device control endpoints (incorrect PIN is not session expiry)
            const isDeviceControl = endpoint.includes('/device/control/');
            if (!isDeviceControl) {
                // Token expired or invalid for auth endpoints
                localStorage.removeItem('authToken');
                useStore.getState().logout();
                window.location.href = '/login';
                throw new Error('Session expired');
            }
        }

        // Try to parse as JSON, fallback to text if it fails
        let data;
        const contentType = response.headers.get('content-type');
        try {
            if (contentType?.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                // If response is not OK and we got text, treat it as an error
                if (!response.ok) {
                    throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
                }
                // Try to parse text as JSON anyway (some APIs don't set correct content-type)
                try {
                    data = JSON.parse(text);
                } catch {
                    // Not JSON, return as text
                    data = { data: text };
                }
            }
        } catch (parseError: any) {
            // JSON parse failed
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            throw parseError;
        }

        if (!response.ok) {
            // Check if we should retry for 429 (Rate Limit) or 503 (Service Unavailable)
            if ((response.status === 429 || response.status === 503) && retryCount < maxRetries) {
                console.warn(`API retry ${retryCount + 1}/${maxRetries} for ${endpoint} (HTTP ${response.status})`);
                await sleep(API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
                return request(endpoint, options, retryCount + 1);
            }
            throw new Error(data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return data;
    } catch (error: any) {
        // Retry logic for network errors (not for 4xx errors)
        const isNetworkError = error.name === 'AbortError' || 
                               error.message === 'Failed to fetch' ||
                               error.message.includes('network');
        
        if (isNetworkError && retryCount < maxRetries) {
            console.warn(`API retry ${retryCount + 1}/${maxRetries} for ${endpoint}`);
            await sleep(API_CONFIG.RETRY_DELAY * (retryCount + 1)); // Exponential backoff
            return request(endpoint, options, retryCount + 1);
        }
        
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

export const authAPI = {
    login: (username: string, password: string) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

    verifyPin: (pin: string) =>
        request('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) }),

    changePassword: (currentPassword: string, newPassword: string) =>
        request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),

    changePin: (currentPin: string, newPin: string) =>
        request('/auth/change-pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }),

    changeDoorPin: (newPin: string) =>
        request('/auth/change-door-pin', { method: 'POST', body: JSON.stringify({ newPin }) }),

    logout: () => request('/auth/logout', { method: 'POST' }),
};

export const deviceAPI = {
    getStatus: () => request('/device/status'),

    getSettings: () => request('/device/settings'),

    updateSettings: (settings: any) =>
        request('/device/settings', { method: 'PUT', body: JSON.stringify(settings) }),

    controlDoor: (pin: string) =>
        request('/device/control/door', { method: 'POST', body: JSON.stringify({ pin }) }),

    controlHolder: (action: 'pulse' | 'open' | 'close', ms?: number) =>
        request('/device/control/holder', { method: 'POST', body: JSON.stringify({ action, ms }) }),

    controlBuzzer: (action: 'start' | 'stop' | 'enable' | 'disable', ms?: number) =>
        request('/device/control/buzzer', { method: 'POST', body: JSON.stringify({ action, ms }) }),

    controlFlash: (state: 'on' | 'off' | 'pulse', ms?: number) =>
        request('/device/control/flash', { method: 'POST', body: JSON.stringify({ state, ms }) }),

    capture: () => request('/device/control/capture', { method: 'POST' }),
};

export const packageAPI = {
    getStats: () => request('/packages/stats/summary'),

    getList: (limit = 20, offset = 0) =>
        request(`/packages?limit=${limit}&offset=${offset}`),

    delete: (id: number) => request(`/packages/${id}`, { method: 'DELETE' }),
};

export const whatsappAPI = {
    getStatus: () => request('/whatsapp/status'),

    getPairingCode: (phone: string) =>
        request('/whatsapp/pairing-code', { method: 'POST', body: JSON.stringify({ phone }) }),

    getRecipients: () => request('/whatsapp/recipients'),

    addRecipient: (phone: string, name?: string) =>
        request('/whatsapp/recipients', { method: 'POST', body: JSON.stringify({ phone, name }) }),

    removeRecipient: (phone: string) =>
        request(`/whatsapp/recipients/${phone}`, { method: 'DELETE' }),

    getGroups: () => request('/whatsapp/groups'),

    sendTest: (phone: string, message: string) =>
        request('/whatsapp/test', { method: 'POST', body: JSON.stringify({ phone, message }) }),

    logout: () => request('/whatsapp/logout', { method: 'POST' }),
};

export const setAuthToken = (token: string | null) => {
    if (token) {
        localStorage.setItem('authToken', token);
    } else {
        localStorage.removeItem('authToken');
    }
};
