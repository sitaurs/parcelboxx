import { useState } from 'react';
import {
    Lock, Unlock, Camera, Zap, Volume2,
    AlertTriangle, Power, Activity, Signal
} from 'lucide-react';
import { deviceAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

export default function DeviceControl() {
    const { deviceStatus } = useStore();
    const { success, error } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [pin, setPin] = useState('');

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        variant: 'danger' | 'primary' | 'warning';
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        variant: 'primary',
        onConfirm: () => { },
    });

    const [buzzerDuration, setBuzzerDuration] = useState('5');
    const [isFlashOn, setIsFlashOn] = useState(false);

    // Helper for offline check
    const checkOnline = () => {
        if (!deviceStatus?.isOnline) {
            error('Device offline, kontrol dinonaktifkan');
            return false;
        }
        return true;
    };

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkOnline()) return;

        setIsLoading(true);
        try {
            await deviceAPI.controlDoor(pin);
            success('Pintu berhasil dibuka');
            setIsPinModalOpen(false);
            setPin('');
        } catch (err: any) {
            error(err.message || 'Gagal membuka pintu');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReleaseHolder = () => {
        if (!checkOnline()) return;

        setConfirmModal({
            isOpen: true,
            title: 'Lepas Penahan Paket',
            message: 'Yakin melepas penahan paket sekarang?',
            variant: 'warning',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await deviceAPI.controlHolder('pulse', 2000);
                    success('Penahan paket dilepas');
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                } catch (err: any) {
                    error(err.message || 'Gagal melepas penahan');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleCapture = async () => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await deviceAPI.capture();
            success('Foto berhasil diambil');
        } catch (err: any) {
            error(err.message || 'Gagal mengambil foto');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFlash = async (state: 'on' | 'off' | 'pulse', ms?: number) => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            await deviceAPI.controlFlash(state, ms);
            if (state === 'on') setIsFlashOn(true);
            if (state === 'off') setIsFlashOn(false);
            success(`Flash ${state === 'off' ? 'dimatikan' : 'dinyalakan'}`);
        } catch (err: any) {
            error(err.message || 'Gagal mengontrol flash');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuzzer = async (action: 'start' | 'stop') => {
        if (!checkOnline()) return;
        setIsLoading(true);
        try {
            const ms = action === 'start' ? parseInt(buzzerDuration) * 1000 : undefined;
            await deviceAPI.controlBuzzer(action, ms);
            success(`Buzzer ${action === 'start' ? 'aktif' : 'berhenti'}`);
        } catch (err: any) {
            error(err.message || 'Gagal mengontrol buzzer');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container space-y-6">
            {/* 1. Header Section */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Device Control</h1>
                    <p className="text-sm text-gray-500">Kontrol operasional harian</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${deviceStatus?.isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${deviceStatus?.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                    {deviceStatus?.isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Offline Banner */}
            {!deviceStatus?.isOnline && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-red-900 text-sm">Device Offline</h3>
                        <p className="text-xs text-red-700 mt-1">
                            Kontrol dinonaktifkan. Pastikan alat terhubung ke internet dan listrik.
                        </p>
                    </div>
                </div>
            )}

            {/* 2. Device Status Card */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Status Sensor</h3>
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                <Signal className="w-4 h-4" />
                                <span>Jarak: <strong>{deviceStatus?.lastDistance ?? '-'} cm</strong></span>
                            </div>
                            <div className="text-xs text-gray-400">Update tiap 1 detik</div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 3. Lock Control */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Kunci Pintu (Solenoid Lock)</h3>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${deviceStatus?.isLocked !== false ? 'bg-red-500' : 'bg-green-500'}`} />
                        <span className="text-sm font-medium text-gray-700">Status: {deviceStatus?.isLocked !== false ? 'Terkunci' : 'Terbuka'}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="primary"
                        onClick={() => setIsPinModalOpen(true)}
                        disabled={!deviceStatus?.isOnline || isLoading}
                        isLoading={isLoading}
                    >
                        <Unlock className="w-4 h-4 mr-2" /> Unlock Door
                    </Button>
                    {/* Lock is usually auto, but adding manual lock if needed */}
                    <Button
                        variant="secondary"
                        onClick={() => {/* Logic to lock if manual lock supported */ }}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <Lock className="w-4 h-4 mr-2" /> Lock Door
                    </Button>
                </div>
            </Card>

            {/* 4. Holder Control */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Penahan Paket (Holder)</h3>
                    <span className="text-sm font-medium text-gray-700">Status: Active</span>
                </div>
                <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleReleaseHolder}
                    disabled={!deviceStatus?.isOnline || isLoading}
                    isLoading={isLoading}
                >
                    <Power className="w-4 h-4 mr-2" /> Release Holder
                </Button>
            </Card>

            {/* 5. Camera Control */}
            <Card>
                <h3 className="font-bold text-gray-900 mb-4">Kamera</h3>
                <div className="flex items-start gap-4">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-xs text-center p-2">
                        Thumbnail Foto Terakhir
                    </div>
                    <div className="flex-1 space-y-3">
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={handleCapture}
                            disabled={!deviceStatus?.isOnline || isLoading}
                            isLoading={isLoading}
                        >
                            <Camera className="w-4 h-4 mr-2" /> Capture Photo
                        </Button>
                        <p className="text-xs text-gray-500">
                            Foto terakhir: {new Date().toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            </Card>

            {/* 6. Flash LED Control */}
            <Card>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Flash LED</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                            Status: {isFlashOn ? 'Menyala' : 'Mati'}
                        </span>
                        <div className={`w-3 h-3 rounded-full ${isFlashOn ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-gray-300'}`} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => handleFlash('pulse', 500)}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        Flash 500ms
                    </Button>
                    <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => handleFlash('pulse', 1000)}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        Flash 1s
                    </Button>
                    <Button
                        variant="secondary"
                        className="text-xs"
                        onClick={() => handleFlash('pulse', 2000)}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        Flash 2s
                    </Button>
                    <Button
                        variant={isFlashOn ? 'danger' : 'primary'}
                        className="text-xs"
                        onClick={() => handleFlash(isFlashOn ? 'off' : 'on')}
                        disabled={!deviceStatus?.isOnline || isLoading}
                    >
                        <Zap className="w-3 h-3 mr-1" /> {isFlashOn ? 'Matikan' : 'Nyalakan'}
                    </Button>
                </div>
            </Card>

            {/* 7. Buzzer Control */}
            <Card>
                <h3 className="font-bold text-gray-900 mb-4">Buzzer Alarm</h3>
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Durasi (detik)</label>
                        <div className="flex gap-2">
                            {[1, 2, 5].map(sec => (
                                <button
                                    key={sec}
                                    onClick={() => setBuzzerDuration(sec.toString())}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${buzzerDuration === sec.toString()
                                            ? 'bg-brand-100 text-brand-700 border border-brand-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {sec}s
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="primary"
                            onClick={() => handleBuzzer('start')}
                            disabled={!deviceStatus?.isOnline || isLoading}
                            isLoading={isLoading}
                        >
                            <Volume2 className="w-4 h-4 mr-2" /> Start
                        </Button>
                        <Button
                            variant="danger"
                            onClick={() => handleBuzzer('stop')}
                            disabled={!deviceStatus?.isOnline || isLoading}
                            isLoading={isLoading}
                        >
                            Stop
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Modals */}
            <Modal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                title="Masukkan PIN Keamanan"
            >
                <form onSubmit={handleUnlock} className="space-y-4">
                    <Input
                        label="PIN Pintu"
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="******"
                        maxLength={6}
                        required
                        className="text-center text-2xl tracking-widest"
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                        Buka Pintu
                    </Button>
                </form>
            </Modal>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={isLoading}
            />
        </div>
    );
}
