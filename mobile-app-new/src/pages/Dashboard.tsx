import { useState, useEffect } from 'react';
import { Wifi, Lock, Signal, Package, Zap, VolumeX, Unlock, Radio, Cpu, Camera, Layers } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deviceAPI, packageAPI, API_CONFIG } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatter';
import Card from '../components/Card';
import UnlockDoorModal from '../components/modals/UnlockDoorModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Dashboard() {
    const { deviceStatus, setDeviceStatus } = useStore();
    const { success, error } = useToast();

    const [stats, setStats] = useState({ today: 0, thisWeek: 0, total: 0 });
    const [latestPackage, setLatestPackage] = useState<any>(null);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
    const [isReleasing, setIsReleasing] = useState(false);
    const [detectionMode, setDetectionMode] = useState<string>('BOTH');

    const loadData = async () => {
        try {
            const [statusRes, statsRes, pkgRes, settingsRes] = await Promise.all([
                deviceAPI.getStatus(),
                packageAPI.getStats(),
                packageAPI.getList(1, 0),
                deviceAPI.getSettings()
            ]);

            setDeviceStatus(statusRes.status);
            setStats(statsRes.stats);
            if (pkgRes.packages.length > 0) {
                setLatestPackage(pkgRes.packages[0]);
            }
            // Load detection mode from settings
            if (settingsRes.settings?.detection?.mode) {
                setDetectionMode(settingsRes.settings.detection.mode);
            }
        } catch (err) {
            console.error('Failed to load dashboard data', err);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, API_CONFIG.POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, []);

    const handleReleaseHolder = () => {
        setShowReleaseConfirm(true);
    };

    const confirmReleaseHolder = async () => {
        setIsReleasing(true);
        try {
            await deviceAPI.controlHolder('pulse', 2000);
            success('Holder dilepas!');
            setShowReleaseConfirm(false);
        } catch (err) {
            error('Gagal melepas holder');
        } finally {
            setIsReleasing(false);
        }
    };

    const handleStopBuzzer = async () => {
        try {
            await deviceAPI.controlBuzzer('stop');
            success('Buzzer dimatikan');
        } catch (err) {
            error('Gagal mematikan buzzer');
        }
    };

    return (
        <div className="page-container space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">SmartParcel</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Monitoring System</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${deviceStatus?.isOnline ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${deviceStatus?.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {deviceStatus?.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Detection Mode Indicator */}
            <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-100 dark:border-blue-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            {detectionMode === 'FULL_HCSR' && <Cpu className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                            {detectionMode === 'FULL_GEMINI' && <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                            {detectionMode === 'BOTH' && <Layers className="w-5 h-5 text-green-600 dark:text-green-400" />}
                        </div>
                        <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Detection Mode</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                {detectionMode === 'FULL_HCSR' && '📡 Ultrasonic Only'}
                                {detectionMode === 'FULL_GEMINI' && '🤖 AI Camera Only'}
                                {detectionMode === 'BOTH' && '🔄 Hybrid (Both)'}
                            </p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        detectionMode === 'FULL_HCSR' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' :
                        detectionMode === 'FULL_GEMINI' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' :
                        'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                    }`}>
                        Active
                    </div>
                </div>
            </Card>

            {/* Device Status Card */}
            <Card className="space-y-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Device Status</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Wifi className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Connection</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">Connected</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Lock Status</span>
                        </div>
                        <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">Locked</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <Signal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Sensor Distance</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {deviceStatus?.lastDistance?.toFixed(1) || 0} cm
                        </span>
                    </div>
                </div>
            </Card>

            {/* Stats Grid */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Package Statistics</h3>
                <div className="grid grid-cols-2 gap-4">
                    <Card className="!p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paket Hari Ini</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.today}</p>
                    </Card>
                    <Card className="!p-4">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paket Minggu Ini</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.thisWeek}</p>
                    </Card>
                    <Card className="!p-4 col-span-2 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Paket</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
                        </div>
                        <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-brand-600 dark:text-brand-400">
                            <Package className="w-6 h-6" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={handleReleaseHolder}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-3xl active:scale-95 transition-transform"
                    >
                        <Zap className="w-6 h-6" />
                        <span className="text-[10px] font-bold text-center leading-tight">Release<br />Holder</span>
                    </button>

                    <button
                        onClick={handleStopBuzzer}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-3xl active:scale-95 transition-transform"
                    >
                        <VolumeX className="w-6 h-6" />
                        <span className="text-[10px] font-bold text-center leading-tight">Stop<br />Buzzer</span>
                    </button>

                    <button
                        onClick={() => setIsUnlockModalOpen(true)}
                        className="flex flex-col items-center justify-center gap-2 p-4 bg-brand-500 text-white rounded-3xl shadow-lg shadow-brand-500/30 active:scale-95 transition-transform"
                    >
                        <Unlock className="w-6 h-6" />
                        <span className="text-[10px] font-bold text-center leading-tight">Unlock<br />Door</span>
                    </button>
                </div>
            </div>

            {/* Latest Package */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Latest Package</h3>
                {latestPackage ? (
                    <Card className="flex gap-4 !p-4 active:scale-95 transition-transform cursor-pointer">
                        <img
                            src={latestPackage.thumbUrl || 'https://placehold.co/100x100/orange/white?text=Box'}
                            alt="Package"
                            className="w-20 h-20 rounded-xl object-cover bg-gray-100 dark:bg-gray-700"
                        />
                        <div className="flex flex-col justify-center">
                            <h4 className="font-bold text-gray-900 dark:text-white">Package Detected</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDate(latestPackage.timestamp)}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sensor: {latestPackage.distance || 0} cm</p>
                        </div>
                    </Card>
                ) : (
                    <Card className="flex flex-col items-center justify-center py-8 text-center border-dashed">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                            <Package className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="font-medium text-gray-900 dark:text-white">No recent packages</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">New packages will appear here.</p>
                    </Card>
                )}
            </div>

            <UnlockDoorModal
                isOpen={isUnlockModalOpen}
                onClose={() => setIsUnlockModalOpen(false)}
            />

            <ConfirmationModal
                isOpen={showReleaseConfirm}
                onClose={() => setShowReleaseConfirm(false)}
                onConfirm={confirmReleaseHolder}
                title="Lepas Penahan Paket"
                message="Yakin melepas penahan paket sekarang?"
                variant="warning"
                isLoading={isReleasing}
            />
        </div>
    );
}
