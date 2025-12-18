import { useState, useEffect } from 'react';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import { deviceAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Cpu, Camera, Layers, Check } from 'lucide-react';

interface DetectionModeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type DetectionMode = 'FULL_HCSR' | 'FULL_GEMINI' | 'BOTH';

const modeOptions: { value: DetectionMode; label: string; description: string; icon: any }[] = [
    {
        value: 'FULL_HCSR',
        label: 'Ultrasonic Only',
        description: 'Deteksi paket menggunakan sensor HC-SR04 saja. Cepat tapi kurang akurat.',
        icon: Cpu
    },
    {
        value: 'FULL_GEMINI',
        label: 'Gemini AI Only',
        description: 'Deteksi paket menggunakan kamera + Gemini AI. Akurat tapi butuh internet.',
        icon: Camera
    },
    {
        value: 'BOTH',
        label: 'Both (Recommended)',
        description: 'Kombinasi keduanya. Ultrasonic sebagai trigger, AI untuk verifikasi.',
        icon: Layers
    }
];

export default function DetectionModeModal({ isOpen, onClose }: DetectionModeModalProps) {
    const [selectedMode, setSelectedMode] = useState<DetectionMode>('BOTH');
    const [currentMode, setCurrentMode] = useState<DetectionMode>('BOTH');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const { success, error } = useToast();

    // Fetch current settings when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchCurrentMode();
        }
    }, [isOpen]);

    const fetchCurrentMode = async () => {
        setIsFetching(true);
        try {
            const response = await deviceAPI.getSettings();
            const mode = response.settings?.detection?.mode || 'BOTH';
            setCurrentMode(mode);
            setSelectedMode(mode);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = async () => {
        if (selectedMode === currentMode) {
            onClose();
            return;
        }

        setIsLoading(true);
        try {
            await deviceAPI.updateSettings({
                detection: { mode: selectedMode }
            });
            success(`Mode deteksi diubah ke ${getModeLabel(selectedMode)}`);
            setCurrentMode(selectedMode);
            onClose();
        } catch (err: any) {
            error(err.message || 'Gagal mengubah mode deteksi');
        } finally {
            setIsLoading(false);
        }
    };

    const getModeLabel = (mode: DetectionMode) => {
        return modeOptions.find(m => m.value === mode)?.label || mode;
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Mode Deteksi Paket">
            <div className="space-y-4">
                <p className="text-sm text-gray-500">
                    Pilih metode deteksi paket yang akan digunakan oleh SmartParcel Box.
                </p>

                {isFetching ? (
                    <div className="py-8 text-center text-gray-400">
                        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        Memuat pengaturan...
                    </div>
                ) : (
                    <div className="space-y-3">
                        {modeOptions.map((option) => {
                            const Icon = option.icon;
                            const isSelected = selectedMode === option.value;
                            const isCurrent = currentMode === option.value;
                            
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => setSelectedMode(option.value)}
                                    className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                                        isSelected
                                            ? 'border-brand-500 bg-brand-50'
                                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                            isSelected ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${isSelected ? 'text-brand-700' : 'text-gray-700'}`}>
                                                    {option.label}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                        Aktif
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {option.description}
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <Check className="w-5 h-5 text-brand-500 mt-2" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="pt-2 space-y-2">
                    <Button 
                        onClick={handleSave} 
                        className="w-full" 
                        isLoading={isLoading}
                        disabled={isFetching || selectedMode === currentMode}
                    >
                        {selectedMode === currentMode ? 'Mode Sudah Aktif' : 'Simpan Perubahan'}
                    </Button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </BottomSheet>
    );
}
