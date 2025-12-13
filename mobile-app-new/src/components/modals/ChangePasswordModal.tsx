import { useState } from 'react';
import BottomSheet from '../BottomSheet';
import Input from '../Input';
import Button from '../Button';
import { authAPI } from '../../services/api';
import { useToast } from '../../hooks/useToast';

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { success, error } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return error('Password baru tidak cocok');
        }

        setIsLoading(true);
        try {
            await authAPI.changePassword(currentPassword, newPassword);
            success('Password berhasil diubah');
            onClose();
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            error(err.message || 'Gagal mengubah password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BottomSheet isOpen={isOpen} onClose={onClose} title="Ubah Password">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                    label="Password Saat Ini"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                />
                <Input
                    label="Password Baru"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                />
                <Input
                    label="Konfirmasi Password Baru"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                />
                <Button type="submit" className="w-full" isLoading={isLoading}>
                    Simpan Password
                </Button>
            </form>
        </BottomSheet>
    );
}
