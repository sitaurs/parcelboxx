import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sliders, Activity, Radio, Sun, Moon, ChevronRight, KeyRound } from 'lucide-react';
import { useStore } from '../store/useStore';
import Card from '../components/Card';
import DetectionModeModal from '../components/modals/DetectionModeModal';
import ChangeDoorPinModal from '../components/modals/ChangeDoorPinModal';

export default function Settings() {
    const navigate = useNavigate();
    const { isDarkMode, toggleDarkMode } = useStore();

    const [showDetectionModeModal, setShowDetectionModeModal] = useState(false);
    const [showChangeDoorPinModal, setShowChangeDoorPinModal] = useState(false);

    const SettingItem = ({ icon: Icon, label, onClick, color = 'text-gray-600' }: any) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-50 dark:border-zinc-800 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>
    );

    return (
        <div className="page-container space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 pt-2">Settings</h1>

            {/* Device Management */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Device</h3>
                <Card className="!p-0 overflow-hidden">
                    <SettingItem
                        icon={Sliders}
                        label="Device Control"
                        onClick={() => navigate('/device-control')}
                        color="text-blue-600"
                    />
                    <SettingItem
                        icon={Radio}
                        label="Detection Mode"
                        onClick={() => setShowDetectionModeModal(true)}
                        color="text-green-600"
                    />
                    <SettingItem
                        icon={Activity}
                        label="Test Device Hardware"
                        onClick={() => navigate('/test-device')}
                        color="text-purple-600"
                    />
                </Card>
            </div>

            {/* Security */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Security</h3>
                <Card className="!p-0 overflow-hidden">
                    <SettingItem
                        icon={KeyRound}
                        label="Change Door Lock PIN"
                        onClick={() => setShowChangeDoorPinModal(true)}
                        color="text-red-600"
                    />
                </Card>
            </div>

            {/* Appearance */}
            <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Appearance</h3>
                <Card className="!p-0 overflow-hidden">
                    <div className="w-full flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${isDarkMode ? 'text-yellow-500' : 'text-gray-600'}`}>
                                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </div>
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">Dark Mode</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isDarkMode ? 'Mode gelap aktif' : 'Mode terang aktif'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isDarkMode ? 'bg-brand-500' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </Card>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4">
                SmartParcel App v2.0.0 (Build 2025)
            </p>

            {/* Modals */}
            <DetectionModeModal
                isOpen={showDetectionModeModal}
                onClose={() => setShowDetectionModeModal(false)}
            />
            <ChangeDoorPinModal
                isOpen={showChangeDoorPinModal}
                onClose={() => setShowChangeDoorPinModal(false)}
            />
        </div>
    );
}
