import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    QrCode, Trash2, Users, Copy,
    RefreshCw, Plus, CheckCircle, XCircle, Phone
} from 'lucide-react';
import { whatsappAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import BottomSheet from '../components/BottomSheet';
import Modal from '../components/Modal';
import ConfirmationModal from '../components/ConfirmationModal';

// Animation variants
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

export default function WhatsApp() {
    const [status, setStatus] = useState<any>(null);
    const [recipients, setRecipients] = useState<any[]>([]);
    const [groups, setGroups] = useState<any[]>([]);

    const [pairingPhone, setPairingPhone] = useState('');
    const [pairingCode, setPairingCode] = useState('');

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

    // Confirmation Modal State
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

    const [newRecipientPhone, setNewRecipientPhone] = useState('');
    const [newRecipientName, setNewRecipientName] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isGroupLoading, setIsGroupLoading] = useState(false);

    const { success, error, info } = useToast();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [statusRes, recipientsRes] = await Promise.all([
                whatsappAPI.getStatus(),
                whatsappAPI.getRecipients()
            ]);
            setStatus(statusRes.status);
            setRecipients(recipientsRes.recipients || []);
        } catch (err) {
            console.error('Failed to load WhatsApp data');
        }
    };

    const closeConfirmModal = () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleSendTest = async () => {
        if (!status?.isConnected) {
            return info('WhatsApp belum terhubung, hubungkan dulu di halaman ini');
        }
        if (recipients.length === 0) {
            return error('Belum ada penerima. Tambahkan penerima terlebih dahulu.');
        }
        setIsLoading(true);
        try {
            await whatsappAPI.sendTest(recipients[0], 'Test Message from SmartParcel 📦');
            success('Berhasil mengirim pesan test');
        } catch (err: any) {
            error(err.message || 'Gagal mengirim pesan test');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetPairingCode = async () => {
        if (!pairingPhone || pairingPhone.length < 10) return error('Nomor WhatsApp tidak valid');
        setIsLoading(true);
        try {
            const res = await whatsappAPI.getPairingCode(pairingPhone);
            setPairingCode(res.pairCode);
            success('Pairing code berhasil dibuat');
        } catch (err: any) {
            error(err.message || 'Gagal menghubungkan WhatsApp');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReconnect = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Reconnect WhatsApp',
            message: 'Apakah Anda yakin ingin menghubungkan ulang ke server WhatsApp? Ini berguna jika koneksi terputus.',
            variant: 'primary',
            onConfirm: async () => {
                setIsLoading(true);
                info('Mencoba menghubungkan ulang...');
                try {
                    await loadData();
                    success('Data diperbarui');
                    closeConfirmModal();
                } catch (err) {
                    error('Gagal memperbarui status');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleLogout = () => {
        setConfirmModal({
            isOpen: true,
            title: 'Logout WhatsApp',
            message: 'Yakin logout dari WhatsApp? Notifikasi tidak akan dikirim sampai Anda pairing lagi.',
            variant: 'danger',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await whatsappAPI.logout();
                    success('Logout berhasil');
                    setStatus(null);
                    setPairingCode('');
                    loadData();
                    closeConfirmModal();
                } catch (err: any) {
                    error(err.message || 'Gagal logout');
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    const handleAddRecipient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRecipientPhone || newRecipientPhone.length < 10) {
            return error('Nomor WhatsApp tidak valid');
        }
        setIsLoading(true);
        try {
            await whatsappAPI.addRecipient(newRecipientPhone, newRecipientName);
            success('Penerima berhasil ditambahkan');
            setRecipients(prev => [...prev, newRecipientPhone]);
            setIsAddModalOpen(false);
            setNewRecipientPhone('');
            setNewRecipientName('');
            loadData();
        } catch (err: any) {
            error(err.message || 'Gagal menambah penerima');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddGroup = async (group: any) => {
        setIsLoading(true);
        try {
            const groupName = group.Name || group.name || 'Grup Tanpa Nama';
            const groupId = group.JID || group.id;
            await whatsappAPI.addRecipient(groupId, groupName);
            success(`Grup ${groupName} ditambahkan`);
            setIsGroupModalOpen(false);
            loadData();
        } catch (err: any) {
            error(err.message || 'Gagal menambah grup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteRecipient = (phone: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Hapus Penerima',
            message: 'Hapus penerima ini dari daftar notifikasi?',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await whatsappAPI.removeRecipient(phone);
                    success('Penerima berhasil dihapus');
                    setRecipients(prev => prev.filter(p => p !== phone));
                    closeConfirmModal();
                } catch (err: any) {
                    error(err.message || 'Gagal menghapus');
                }
            }
        });
    };

    const fetchGroups = async () => {
        if (!status?.isConnected) {
            return info('WhatsApp belum terhubung, hubungkan dulu di halaman ini');
        }
        setIsGroupModalOpen(true);
        setIsGroupLoading(true);
        try {
            const res = await whatsappAPI.getGroups();
            setGroups(res.groups || []);
        } catch (err: any) {
            error('Gagal mengambil daftar grup');
            setGroups([]);
        } finally {
            setIsGroupLoading(false);
        }
    };

    return (
        <motion.div 
            className="page-container space-y-6"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            {/* 1. Header Section */}
            <motion.div 
                className="flex items-center justify-between pt-2"
                variants={itemVariants}
            >
                <div>
                    <motion.h1 
                        className="text-2xl font-bold text-gray-900 dark:text-white"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        WhatsApp Settings
                    </motion.h1>
                    {status?.isConnected && status?.senderPhone && (
                        <motion.p 
                            className="text-sm text-gray-500 dark:text-gray-400 font-mono"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {status.senderPhone}
                        </motion.p>
                    )}
                </div>
                <motion.div 
                    className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status?.isConnected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <motion.div 
                        className={`w-2 h-2 rounded-full ${status?.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        animate={status?.isConnected ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    {status?.isConnected ? 'Terhubung' : 'Belum Terhubung'}
                </motion.div>
            </motion.div>

            {/* 2. Connection Status Card */}
            <Card className={`border-l-4 ${status?.isConnected ? 'border-l-green-500' : 'border-l-red-500'}`} delay={0.1}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <motion.div 
                            className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${status?.isConnected ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            }`}
                            animate={status?.isConnected ? { rotate: [0, 5, -5, 0] } : { scale: [1, 0.95, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        >
                            {status?.isConnected ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </motion.div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Status Koneksi</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {status?.isConnected
                                    ? 'Terhubung – siap mengirim notifikasi'
                                    : 'Belum terhubung – hubungkan WhatsApp terlebih dahulu'}
                            </p>
                        </div>
                    </div>
                </div>
                {status?.isConnected && (
                    <motion.div 
                        className="mt-4 flex justify-end"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <Button
                            variant="secondary"
                            className="text-xs py-2 h-auto"
                            onClick={handleSendTest}
                            isLoading={isLoading}
                        >
                            Kirim Pesan Tes
                        </Button>
                    </motion.div>
                )}
            </Card>

            {/* 3. Pairing Section (Only if NOT connected) */}
            {!status?.isConnected && (
                <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <QrCode className="w-5 h-5 text-brand-500" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Hubungkan WhatsApp</h3>
                    </div>

                    <div className="space-y-4">
                        <Input
                            label="Nomor HP (Format Internasional)"
                            placeholder="6281234567890"
                            value={pairingPhone}
                            onChange={(e) => setPairingPhone(e.target.value)}
                            type="tel"
                        />

                        <Button onClick={handleGetPairingCode} isLoading={isLoading} className="w-full">
                            Dapatkan Pairing Code
                        </Button>

                        {pairingCode && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 text-center mt-2 animate-fade-in">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kode Pairing Anda:</p>
                                <div className="flex items-center justify-center gap-3 mb-3">
                                    <span className="text-3xl font-mono font-bold tracking-widest text-gray-900 dark:text-white">
                                        {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pairingCode);
                                            success('📋 Kode berhasil disalin!');
                                        }}
                                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                    >
                                        <Copy className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>
                                <div className="text-left text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <p className="font-semibold mb-1">Langkah selanjutnya:</p>
                                    <ol className="list-decimal list-inside space-y-1">
                                        <li>Buka WhatsApp di HP Anda</li>
                                        <li>Buka <strong>Pengaturan</strong> {'>'} <strong>Perangkat Tertaut</strong></li>
                                        <li>Pilih <strong>"Tautkan dengan Nomor Telepon"</strong></li>
                                        <li>Masukkan kode di atas</li>
                                    </ol>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            )}

            {/* 4. Connection Management (Only if Connected) */}
            {status?.isConnected && (
                <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-gray-900 dark:text-white">Kelola Koneksi</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="secondary"
                            onClick={handleReconnect}
                            isLoading={isLoading}
                        >
                            Reconnect
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleLogout}
                            isLoading={isLoading}
                        >
                            Logout WhatsApp
                        </Button>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                        Logout akan menghentikan semua notifikasi sampai Anda pairing ulang.
                    </p>
                </Card>
            )}

            {/* 5. Recipients Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Penerima Notifikasi</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{recipients.length} penerima terdaftar</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <Button
                        variant="secondary"
                        className="text-xs h-10"
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" /> Tambah Manual
                    </Button>
                    <Button
                        variant="secondary"
                        className="text-xs h-10"
                        onClick={fetchGroups}
                    >
                        <Users className="w-4 h-4" /> Pilih Grup
                    </Button>
                </div>

                <div className="space-y-3">
                    {recipients.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Users className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada penerima</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Tambahkan agar notifikasi berjalan</p>
                        </div>
                    ) : (
                        recipients.map((phone, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${phone.length > 15 ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400'
                                        }`}>
                                        {phone.length > 15 ? <Users className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[180px]">{phone}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${phone.length > 15 ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                            }`}>
                                            {phone.length > 15 ? 'Group' : 'Individual'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRecipient(phone)}
                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Modals */}
            <BottomSheet
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Tambah Penerima"
            >
                <form onSubmit={handleAddRecipient} className="space-y-4">
                    <Input
                        label="Nama Penerima (Opsional)"
                        placeholder="Contoh: Budi"
                        value={newRecipientName}
                        onChange={(e) => setNewRecipientName(e.target.value)}
                    />
                    <Input
                        label="Nomor WhatsApp"
                        placeholder="628xxxxxxxxxx"
                        value={newRecipientPhone}
                        onChange={(e) => setNewRecipientPhone(e.target.value)}
                        required
                        type="tel"
                    />
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1"
                            onClick={() => setIsAddModalOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" className="flex-1" isLoading={isLoading}>
                            Simpan
                        </Button>
                    </div>
                </form>
            </BottomSheet>

            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                title="Pilih Grup WhatsApp"
            >
                <div className="max-h-[60vh] overflow-y-auto -mx-2 px-2">
                    {isGroupLoading ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">Memuat daftar grup...</div>
                    ) : groups.length === 0 ? (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">Tidak ada grup ditemukan</div>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <button
                                    key={group.JID || group.id}
                                    onClick={() => handleAddGroup(group)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">{group.Name || group.name || 'Grup Tanpa Nama'}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{group.JID || group.id}</p>
                                    </div>
                                    <Plus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={closeConfirmModal}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant={confirmModal.variant}
                isLoading={isLoading}
            />
        </motion.div>
    );
}
