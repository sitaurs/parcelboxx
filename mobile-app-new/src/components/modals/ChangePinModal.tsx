import { useState } from 'react';
import BottomSheet from '../BottomSheet';
import Input from '../Input';
import Button from '../Button';
import { authAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface ChangePinModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'app' | 'door'; // Reusable for both App PIN and Door PIN
}

export default function ChangePinModal({ isOpen, onClose, type }: ChangePinModalProps) {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const title = type === 'app' ? 'Ubah PIN Aplikasi' : 'Ubah PIN Pintu';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (type === 'app') {
                await authAPI.changePin(currentPin, newPin);
            } else {
                await authAPI.changeDoorPin(newPin);
            }
            success(`${title} berhasil!`);
            onClose();
            setCurrentPin('');
            setNewPin('');
        } catch (err: any) {
            error(err.message || 'Gagal mengubah PIN');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {type === 'app' && (
                    <Input
                        label="PIN Saat Ini"
                        type="password"
                        inputMode="numeric"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        required
                        className="text-center tracking-widest"
                    />
                )}
                <Input
                    label="PIN Baru (4-8 digit)"
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    required
                    minLength={4}
                    maxLength={8}
                    className="text-center tracking-widest"
                />
                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Simpan PIN
                </Button>
            </form>
        </BottomSheet>
    );
}
