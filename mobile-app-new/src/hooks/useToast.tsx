import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    const success = (msg: string) => showToast(msg, 'success');
    const error = (msg: string) => showToast(msg, 'error');
    const info = (msg: string) => showToast(msg, 'info');
    const warning = (msg: string) => showToast(msg, 'warning');

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
            <div className="fixed top-4 left-0 right-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
                <AnimatePresence>
                    {toasts.map((toast) => (
                        <motion.div
                            key={toast.id}
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            className={`
                pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg border min-w-[300px] max-w-sm backdrop-blur-md bg-[var(--bg-card)]/90
                ${toast.type === 'success' ? 'border-green-200 text-green-700 dark:border-green-700 dark:text-green-400' : ''}
                ${toast.type === 'error' ? 'border-red-200 text-red-700 dark:border-red-700 dark:text-red-400' : ''}
                ${toast.type === 'info' ? 'border-blue-200 text-blue-700 dark:border-blue-700 dark:text-blue-400' : ''}
                ${toast.type === 'warning' ? 'border-orange-200 text-orange-700 dark:border-orange-700 dark:text-orange-400' : ''}
              `}
                        >
                            {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
                            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-orange-500" />}

                            <p className="text-sm font-medium flex-1">{toast.message}</p>

                            <button onClick={() => removeToast(toast.id)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                                <X className="w-4 h-4 opacity-50" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
};
