const API_URL = import.meta.env.VITE_API_URL || 'http://3.27.0.139:9090/api';
// WhatsApp API now integrated into main backend (no separate server needed)
const WA_API_URL = `${API_URL}/whatsapp`;

// Auth token management
let authToken: string | null = localStorage.getItem('authToken');

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = () => authToken;

// HTTP request helper
async function request(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken && !url.includes('/auth/login')) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    setAuthToken(null);
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth API
export const authAPI = {
  login: (username: string, password: string) =>
    request(`${API_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  verifyPin: (pin: string) =>
    request(`${API_URL}/auth/verify-pin`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request(`${API_URL}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  changePin: (currentPin: string, newPin: string) =>
    request(`${API_URL}/auth/change-pin`, {
      method: 'POST',
      body: JSON.stringify({ currentPin, newPin }),
    }),

  changeDoorPin: (newPin: string) =>
    request(`${API_URL}/auth/change-door-pin`, {
      method: 'POST',
      body: JSON.stringify({ newPin }),
    }),

  logout: () =>
    request(`${API_URL}/auth/logout`, {
      method: 'POST',
    }),

  getSession: () => request(`${API_URL}/auth/session`),
};

// Package API
export const packageAPI = {
  getPackages: (limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    return request(`${API_URL}/packages?${params}`);
  },

  getPackage: (id: number) =>
    request(`${API_URL}/packages/${id}`),

  deletePackage: (id: number) =>
    request(`${API_URL}/packages/${id}`, {
      method: 'DELETE',
    }),

  getStats: () =>
    request(`${API_URL}/packages/stats/summary`),
};

// Device API
export const deviceAPI = {
  getStatus: () => request(`${API_URL}/device/status`),

  getSettings: () => request(`${API_URL}/device/settings`),

  updateSettings: (settings: any) =>
    request(`${API_URL}/device/settings`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  capture: () =>
    request(`${API_URL}/device/control/capture`, {
      method: 'POST',
    }),

  controlFlash: (state: 'on' | 'off' | 'pulse', ms?: number) =>
    request(`${API_URL}/device/control/flash`, {
      method: 'POST',
      body: JSON.stringify({ state, ms }),
    }),

  controlBuzzer: (action: 'start' | 'stop', ms?: number) =>
    request(`${API_URL}/device/control/buzzer`, {
      method: 'POST',
      body: JSON.stringify({ action, ms }),
    }),

  controlHolder: (action: 'open' | 'closed' | 'pulse', ms?: number) =>
    request(`${API_URL}/device/control/holder`, {
      method: 'POST',
      body: JSON.stringify({ action, ms }),
    }),

  stopPipeline: () =>
    request(`${API_URL}/device/control/stop-pipeline`, {
      method: 'POST',
    }),

  // Convenience methods for quick actions
  testHolder: () =>
    request(`${API_URL}/device/control/holder`, {
      method: 'POST',
      body: JSON.stringify({ action: 'pulse', ms: 3000 }),
    }),

  stopBuzzer: () =>
    request(`${API_URL}/device/control/buzzer`, {
      method: 'POST',
      body: JSON.stringify({ action: 'stop' }),
    }),

  unlockDoor: (pin: string) =>
    request(`${API_URL}/device/control/door`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),
};

// WhatsApp API (integrated with GOWA)
export const whatsappAPI = {
  getStatus: () => request(`${WA_API_URL}/status`),

  requestPairingCode: (phone: string) =>
    request(`${WA_API_URL}/pairing-code`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  addRecipient: (phone: string) =>
    request(`${WA_API_URL}/recipients`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  removeRecipient: (phone: string) =>
    request(`${WA_API_URL}/recipients/${phone}`, {
      method: 'DELETE',
    }),

  getRecipients: () => request(`${WA_API_URL}/recipients`),

  testMessage: (phone: string, message: string) =>
    request(`${WA_API_URL}/test`, {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    }),

  logout: () =>
    request(`${WA_API_URL}/logout`, {
      method: 'POST',
    }),
  
  reconnect: () =>
    request(`${WA_API_URL}/reconnect`, {
      method: 'POST',
    }),
  
  blockNotifications: (blocked: boolean) =>
    request(`${WA_API_URL}/block`, {
      method: 'POST',
      body: JSON.stringify({ blocked }),
    }),
  
  getGroups: () => request(`${WA_API_URL}/groups`),
};
