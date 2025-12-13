import { create } from 'zustand';

interface User {
    username: string;
    role?: string;
}

interface DeviceStatus {
    isOnline: boolean;
    lastSeen: string;
    lastDistance: number;
    isLocked: boolean;
}

interface AppState {
    // Auth
    isAuthenticated: boolean;
    user: User | null;
    setUser: (user: User) => void;
    logout: () => void;
    checkAuth: () => void;

    // Device
    deviceStatus: DeviceStatus | null;
    setDeviceStatus: (status: DeviceStatus) => void;

    // UI
    isLoading: boolean;
    setLoading: (loading: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
    isAuthenticated: !!localStorage.getItem('authToken'),
    user: null,
    deviceStatus: null,
    isLoading: false,

    setUser: (user) => set({ user, isAuthenticated: true }),

    logout: () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('pinLockTime');
        set({ user: null, isAuthenticated: false });
    },

    checkAuth: () => {
        const token = localStorage.getItem('authToken');
        set({ isAuthenticated: !!token });
    },

    setDeviceStatus: (status) => set({ deviceStatus: status }),
    setLoading: (loading) => set({ isLoading: loading }),
}));
