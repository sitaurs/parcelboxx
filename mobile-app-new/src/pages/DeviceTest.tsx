import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Zap, Volume2, VolumeX, AlertCircle } from 'lucide-react';
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
    initial: { opacity: 0, y: 20 },
    animate: { 
        opacity: 1, 
        y: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
};

export default function DeviceTest() {
    const { deviceStatus } = useStore();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isFlashOn, setIsFlashOn] = useState(false);
    const [buzzerDuration, setBuzzerDuration] = useState('1');

    const checkOnline = () => {
        if (!deviceStatus?.isOnline) {
            error('Device offline');
            return false;
        }
        return true;
    };

    // Camera & Flash Test
    const handleTestCapture = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await deviceAPI.capture();
            success('✅ Test foto berhasil');
        } catch (err: any) {
            error(err.message || 'Gagal test kamera');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlashPulse = async (ms: number) => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await deviceAPI.controlFlash('pulse', ms);
            success(`✅ Flash pulse ${ms}ms`);
        } catch (err: any) {
            error(err.message || 'Gagal test flash');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlashToggle = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            const newState = !isFlashOn;
            await deviceAPI.controlFlash(newState ? 'on' : 'off');
            setIsFlashOn(newState);
            success(`Flash ${newState ? 'ON' : 'OFF'}`);
        } catch (err: any) {
            error(err.message || 'Gagal toggle flash');
        } finally {
            setIsLoading(false);
        }
    };

    // Buzzer Test
    const handleBuzzerTest = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            const ms = parseInt(buzzerDuration) * 1000;
            await deviceAPI.controlBuzzer('start', ms);
            success(`✅ Buzzer test ${buzzerDuration}s`);
        } catch (err: any) {
            error(err.message || 'Gagal test buzzer');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuzzerStop = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await deviceAPI.controlBuzzer('stop');
            success('⚠️ Buzzer dihentikan paksa');
        } catch (err: any) {
            error(err.message || 'Gagal stop buzzer');
        } finally {
            setIsLoading(false);
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
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Device</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mode teknisi & debugging</p>
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

            {/* Offline Warning */}
            {!deviceStatus?.isOnline && (
                <motion.div variants={itemVariants}>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-red-900 dark:text-red-300 text-sm">Device Offline</h3>
                            <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                Test mode dinonaktifkan. Pastikan device terhubung.
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* 1. Camera & Flash Test */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Camera & Flash</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Test capture dan LED flash</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Test Capture Button */}
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleTestCapture}
                            disabled={!deviceStatus?.isOnline || isLoading}
                            isLoading={isLoading}
                        >
                            <Camera className="w-4 h-4 mr-2" />
                            Test Capture (No Unlock)
                        </Button>

                        {/* Flash Pulse Controls */}
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleFlashPulse(500)}
                                disabled={!deviceStatus?.isOnline || isLoading}
                            >
                                <Zap className="w-3 h-3 mr-1" />
                                500ms
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleFlashPulse(1000)}
                                disabled={!deviceStatus?.isOnline || isLoading}
                            >
                                <Zap className="w-3 h-3 mr-1" />
                                1s
                            </Button>
                            <Button
                                variant={isFlashOn ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={handleFlashToggle}
                                disabled={!deviceStatus?.isOnline || isLoading}
                            >
                                <Zap className="w-3 h-3 mr-1" />
                                {isFlashOn ? 'ON' : 'OFF'}
                            </Button>
                        </div>

                        {/* Status Indicator */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Flash Status:</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${isFlashOn ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {isFlashOn ? 'Menyala' : 'Mati'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* 2. Buzzer Test */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-full flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <Volume2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Buzzer Test</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Test alarm buzzer</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Duration Selection */}
                        <div>
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Durasi Test:
                            </label>
                            <div className="flex gap-2">
                                {['1', '2', '5'].map((sec) => (
                                    <button
                                        key={sec}
                                        onClick={() => setBuzzerDuration(sec)}
                                        className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            buzzerDuration === sec
                                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {sec}s
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Test Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="primary"
                                onClick={handleBuzzerTest}
                                disabled={!deviceStatus?.isOnline || isLoading}
                                isLoading={isLoading}
                            >
                                <Volume2 className="w-4 h-4 mr-2" />
                                Test {buzzerDuration}s
                            </Button>
                            <Button
                                variant="danger"
                                onClick={handleBuzzerStop}
                                disabled={!deviceStatus?.isOnline || isLoading}
                            >
                                <VolumeX className="w-4 h-4 mr-2" />
                                Force Stop
                            </Button>
                        </div>

                        {/* Info */}
                        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                            <p className="text-xs text-orange-700 dark:text-orange-300">
                                🔔 Buzzer akan berbunyi dengan pola ON/OFF sesuai durasi yang dipilih
                            </p>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {/* Info Box */}
            <motion.div variants={itemVariants}>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <h4 className="font-bold text-blue-900 dark:text-blue-300 text-sm mb-2">ℹ️ Test Mode Info</h4>
                    <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                        <li>• <strong>Test Capture:</strong> Ambil foto tanpa unlock door</li>
                        <li>• <strong>Flash Pulse:</strong> Nyalakan flash sebentar untuk test</li>
                        <li>• <strong>Flash ON/OFF:</strong> Kontrol manual flash LED</li>
                        <li>• <strong>Buzzer Test:</strong> Test alarm dengan durasi custom</li>
                        <li>• <strong>Force Stop:</strong> Paksa hentikan buzzer yang sedang aktif</li>
                    </ul>
                </div>
            </motion.div>
        </motion.div>
    );
}
