import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Key, LogOut, ChevronRight, Sliders, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import ChangePasswordModal from '../components/modals/ChangePasswordModal';
import ChangePinModal from '../components/modals/ChangePinModal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function Settings() {
    const navigate = useNavigate();
    const { user, logout } = useStore();
    const { success, error } = useToast();

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showAppPinModal, setShowAppPinModal] = useState(false);
    const [showDoorPinModal, setShowDoorPinModal] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await authAPI.logout();
            logout();
            success('Logout berhasil');
            navigate('/login');
        } catch (err) {
            error('Gagal logout');
        } finally {
            setIsLoggingOut(false);
        }
    };

    const SettingItem = ({ icon: Icon, label, onClick, color = 'text-gray-600' }: any) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-gray-700 text-sm">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
        </button>
    );

    return (
        <div className="page-container space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 pt-2">Settings</h1>

            {/* Profile Card */}
            <Card className="flex items-center gap-4 bg-gradient-to-br from-brand-500 to-orange-600 text-white border-none">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <User className="w-7 h-7 text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-lg">{user?.username || 'Admin'}</h3>
                    <p className="text-orange-100 text-sm">Administrator</p>
                </div>
            </Card>

            {/* Device Management */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3 ml-1">Device</h3>
                <Card className="!p-0 overflow-hidden">
                    <SettingItem
                        icon={Sliders}
                        label="Device Control"
                        onClick={() => navigate('/device-control')}
                        color="text-blue-600"
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
                <h3 className="font-semibold text-gray-900 mb-3 ml-1">Security</h3>
                <Card className="!p-0 overflow-hidden">
                    <SettingItem
                        icon={Lock}
                        label="Change Password"
                        onClick={() => setShowPasswordModal(true)}
                    />
                    <SettingItem
                        icon={Key}
                        label="Change App PIN"
                        onClick={() => setShowAppPinModal(true)}
                    />
                    <SettingItem
                        icon={Key}
                        label="Change Door Lock PIN"
                        onClick={() => setShowDoorPinModal(true)}
                    />
                </Card>
            </div>

            {/* Logout */}
            <button
                onClick={() => setShowLogoutConfirm(true)}
                className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-semibold bg-red-50 rounded-2xl hover:bg-red-100 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                Logout
            </button>

            <p className="text-center text-xs text-gray-400 pb-4">
                App Version 2.0.0 (Build 2025)
            </p>

            {/* Modals */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
            />
            <ChangePinModal
                isOpen={showAppPinModal}
                onClose={() => setShowAppPinModal(false)}
                type="app"
            />
            <ChangePinModal
                isOpen={showDoorPinModal}
                onClose={() => setShowDoorPinModal(false)}
                type="door"
            />
            <ConfirmationModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleLogout}
                title="Konfirmasi Logout"
                message="Yakin ingin keluar dari aplikasi?"
                variant="danger"
                isLoading={isLoggingOut}
            />
        </div>
    );
}
