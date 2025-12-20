import { useState, useEffect } from 'react';
import { Wifi, Lock, Signal, Package, VolumeX, Unlock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { deviceAPI, packageAPI, API_CONFIG, API_URL } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatter';
import Card from '../components/Card';
import UnlockDoorModal from '../components/modals/UnlockDoorModal';

export default function Dashboard() {
    const { deviceStatus, setDeviceStatus } = useStore();
    const { success, error } = useToast();

    const [stats, setStats] = useState({ today: 0, thisWeek: 0, total: 0 });
    const [latestPackage, setLatestPackage] = useState<any>(null);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

    const loadData = async () => {
        try {
            const [statusRes, statsRes, pkgRes] = await Promise.all([
                deviceAPI.getStatus(),
                packageAPI.getStats(),
                packageAPI.getList(1, 0)
            ]);

            setDeviceStatus(statusRes.status);
            setStats(statsRes.stats);
            if (pkgRes.packages.length > 0) {
                setLatestPackage(pkgRes.packages[0]);
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
                <div className="grid grid-cols-2 gap-3">
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
                            src={latestPackage.photoPath ? `${API_URL.replace('/api', '')}/uploads/${latestPackage.photoPath}` : 'https://placehold.co/100x100/orange/white?text=Box'}
                            alt="Package"
                            className="w-20 h-20 rounded-xl object-cover bg-gray-100 dark:bg-gray-700"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/orange/white?text=Box';
                            }}
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
        </div>
    );
}
