import { useState } from 'react';
import { Lock } from 'lucide-react';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import Input from '../Input';
import { deviceAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface UnlockDoorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function UnlockDoorModal({ isOpen, onClose }: UnlockDoorModalProps) {
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await deviceAPI.controlDoor(pin);
            success('Perintah buka pintu dikirim!');
            onClose();
            setPin('');
        } catch (err: any) {
            error(err.message || 'Gagal membuka pintu');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Buka Kunci Pintu">
            <form onSubmit={handleUnlock} className="space-y-6">
                <div className="bg-orange-50 p-4 rounded-xl flex items-start gap-3">
                    <Lock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <p className="text-sm text-orange-800">
                        Masukkan PIN keamanan untuk membuka kunci pintu secara remote.
                    </p>
                </div>

                <Input
                    label="PIN Keamanan"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Masukkan PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    maxLength={8}
                    className="text-center text-2xl tracking-widest"
                />

                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Buka Kunci Sekarang
                </Button>
            </form>
        </BottomSheet>
    );
}
