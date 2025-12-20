import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Volume2, VolumeX, Signal } from 'lucide-react';
import { deviceAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import Card from '../components/Card';
import Button from '../components/Button';

const containerVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
};

const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
        opacity: 1, 
        x: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
};

export default function DeviceSettings() {
    const { deviceStatus } = useStore();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isBuzzerEnabled, setIsBuzzerEnabled] = useState(true);
    const [threshold, setThreshold] = useState(27); // Default threshold in cm
    const [isSaving, setIsSaving] = useState(false);

    // Load current settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // Get device settings
                const settingsRes = await deviceAPI.getSettings();
                
                // Buzzer enabled status from diagnostic
                const status = await deviceAPI.diagnostic();
                if (status.data?.buzzerEnabled !== undefined) {
                    setIsBuzzerEnabled(status.data.buzzerEnabled);
                }
                
                // Threshold from ultra.min
                if (settingsRes.settings?.ultra?.min !== undefined) {
                    setThreshold(settingsRes.settings.ultra.min);
                }
            } catch (err) {
                // Use defaults
            }
        };
        if (deviceStatus?.isOnline) {
            loadSettings();
        }
    }, [deviceStatus?.isOnline]);

    const handleBuzzerToggle = async (enable: boolean) => {
        if (!deviceStatus?.isOnline) {
            error('Device offline');
            return;
        }
        setIsLoading(true);
        try {
            await deviceAPI.controlBuzzer(enable ? 'enable' : 'disable');
            setIsBuzzerEnabled(enable);
            success(`Buzzer notifikasi ${enable ? 'DIAKTIFKAN' : 'DINONAKTIFKAN'}`);
        } catch (err: any) {
            error(err.message || 'Gagal mengubah buzzer');
        } finally {
            setIsLoading(false);
        }
    };

    const handleThresholdChange = (value: number) => {
        setThreshold(value);
    };

    const handleSaveThreshold = async () => {
        if (!deviceStatus?.isOnline) {
            error('Device offline');
            return;
        }
        setIsSaving(true);
        try {
            // Send threshold update to ESP32 via backend
            // Use ultra.min as detection threshold
            await deviceAPI.updateSettings({ 
                ultra: { 
                    min: threshold 
                } 
            });
            success(`Threshold diubah ke ${threshold} cm`);
        } catch (err: any) {
            error(err.message || 'Gagal menyimpan threshold');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div 
            className="page-container space-y-6"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            {/* Header */}
            <motion.div 
                className="flex items-center justify-between pt-2"
                variants={itemVariants}
            >
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pengaturan perangkat dan sensor</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                    deviceStatus?.isOnline 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${deviceStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    {deviceStatus?.isOnline ? 'Online' : 'Offline'}
                </div>
            </motion.div>

            {/* 1. Buzzer Notification Setting */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            isBuzzerEnabled 
                                ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                        }`}>
                            {isBuzzerEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white">Buzzer Notification</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {isBuzzerEnabled ? 'Buzzer aktif saat paket terdeteksi' : 'Hanya notifikasi WhatsApp'}
                            </p>
                        </div>
                        <button
                            onClick={() => handleBuzzerToggle(!isBuzzerEnabled)}
                            disabled={!deviceStatus?.isOnline || isLoading}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ${
                                isBuzzerEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                            } ${!deviceStatus?.isOnline || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                                    isBuzzerEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <div className={`w-2 h-2 rounded-full ${isBuzzerEnabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <span>Status: <strong className="text-gray-900 dark:text-white">{isBuzzerEnabled ? 'ON' : 'OFF'}</strong></span>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* 2. Detection Threshold Setting */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Signal className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-white">Detection Threshold</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Batas jarak untuk mendeteksi paket
                            </p>
                        </div>
                    </div>

                    {/* Current Value Display */}
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-4 text-center">
                        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                            {threshold} <span className="text-xl">cm</span>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            Jarak saat ini: {deviceStatus?.lastDistance ?? '-'} cm
                        </p>
                    </div>

                    {/* Slider */}
                    <div className="space-y-4">
                        <div className="px-2">
                            <input
                                type="range"
                                min="10"
                                max="50"
                                step="1"
                                value={threshold}
                                onChange={(e) => handleThresholdChange(parseInt(e.target.value))}
                                disabled={!deviceStatus?.isOnline}
                                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                style={{
                                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${((threshold - 10) / 40) * 100}%, rgb(229, 231, 235) ${((threshold - 10) / 40) * 100}%, rgb(229, 231, 235) 100%)`
                                }}
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>10 cm</span>
                                <span>50 cm</span>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                📦 Paket akan terdeteksi jika sensor membaca <strong>{threshold} cm atau kurang</strong>
                            </p>
                        </div>

                        {/* Save Button */}
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={handleSaveThreshold}
                            disabled={!deviceStatus?.isOnline || isSaving}
                            isLoading={isSaving}
                        >
                            <SettingsIcon className="w-4 h-4 mr-2" />
                            Simpan Threshold
                        </Button>
                    </div>
                </Card>
            </motion.div>

            {/* Info Card */}
            <motion.div variants={itemVariants}>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-2">ℹ️ Informasi</h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                        <li>• <strong>Buzzer ON:</strong> Alarm akan berbunyi saat paket terdeteksi</li>
                        <li>• <strong>Buzzer OFF:</strong> Hanya kirim notifikasi WhatsApp (silent mode)</li>
                        <li>• <strong>Threshold:</strong> Semakin kecil nilai, semakin sensitif deteksi</li>
                        <li>• <strong>Rekomendasi:</strong> Set threshold 20-30 cm untuk deteksi optimal</li>
                    </ul>
                </div>
            </motion.div>
        </motion.div>
    );
}
