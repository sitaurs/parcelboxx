import { create } from 'zustand';

interface User {
  username: string;
}

interface DeviceStatus {
  isOnline: boolean;
  lastSeen?: string;
  lastDistance?: number;
  lastCommand?: string;
  lastCommandStatus?: string;
  lastCommandTime?: string;
  settingsApplied?: boolean;
  settingsError?: string | null;
  lastSettingsUpdate?: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Device
  deviceStatus: DeviceStatus | null;
  setDeviceStatus: (status: DeviceStatus | null) => void;

  // UI
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const useStore = create<AppState>((set) => ({
  // Auth
  isAuthenticated: !!localStorage.getItem('authToken'),
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('pinLockTime');
    set({ user: null, isAuthenticated: false });
  },

  // Device
  deviceStatus: null,
  setDeviceStatus: (status) => set({ deviceStatus: status }),

  // UI
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
}));

export { useStore };
export default useStore;
