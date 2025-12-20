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
    
    // Theme
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    setDarkMode: (isDark: boolean) => void;
}

// Get initial theme from localStorage or default to light
const getInitialTheme = (): boolean => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
        return saved === 'true';
    }
    // Default to light mode
    return false;
};

export const useStore = create<AppState>((set) => ({
    isAuthenticated: !!localStorage.getItem('authToken'),
    user: null,
    deviceStatus: null,
    isLoading: false,
    isDarkMode: getInitialTheme(),

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
    
    toggleDarkMode: () => set((state) => {
        const newMode = !state.isDarkMode;
        localStorage.setItem('darkMode', String(newMode));
        // Apply to document
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return { isDarkMode: newMode };
    }),
    
    setDarkMode: (isDark) => {
        localStorage.setItem('darkMode', String(isDark));
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        set({ isDarkMode: isDark });
    },
}));
