import { useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';
import Button from '../Button';
import { deviceAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface ChangeDoorPinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangeDoorPinModal({ isOpen, onClose }: ChangeDoorPinModalProps) {
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (newPin.length < 4 || newPin.length > 8) {
            error('PIN harus 4-8 digit');
            return;
        }

        if (!/^\d+$/.test(newPin)) {
            error('PIN harus angka saja');
            return;
        }

        if (newPin !== confirmPin) {
            error('PIN tidak cocok');
            return;
        }

        setIsLoading(true);
        try {
            // Update PIN via MQTT (backend will sync to ESP8266)
            await deviceAPI.updateDoorPin(newPin);
            success('PIN doorlock berhasil diubah');
            setNewPin('');
            setConfirmPin('');
            onClose();
        } catch (err: any) {
            error(err.message || 'Gagal mengubah PIN');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setNewPin('');
            setConfirmPin('');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-3xl max-w-md w-full shadow-2xl animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center">
                            <Lock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Change Door PIN</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isLoading}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Info Banner */}
                <div className="m-6 mb-0 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                        <p className="font-semibold mb-1">PIN untuk ESP8266 Door Lock</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            PIN ini akan disinkronkan ke ESP8266 via MQTT. Gunakan PIN ini untuk unlock dari keypad atau app.
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            PIN Baru (4-8 digit)
                        </label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="Masukkan PIN baru"
                            maxLength={8}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg tracking-widest text-center font-mono"
                            disabled={isLoading}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {newPin.length}/8 digit
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Konfirmasi PIN
                        </label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                            placeholder="Ulangi PIN baru"
                            maxLength={8}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-lg tracking-widest text-center font-mono"
                            disabled={isLoading}
                        />
                        {confirmPin.length > 0 && (
                            <p className={`text-xs mt-1 ${newPin === confirmPin ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {newPin === confirmPin ? '✓ PIN cocok' : '✗ PIN tidak cocok'}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            isLoading={isLoading}
                            disabled={!newPin || !confirmPin || newPin !== confirmPin || newPin.length < 4}
                            className="flex-1"
                        >
                            Ubah PIN
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
