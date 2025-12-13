import { useState, useEffect } from 'react';
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
        <div className="page-container space-y-6">
            {/* 1. Header Section */}
            <div className="flex items-center justify-between pt-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">WhatsApp Settings</h1>
                    {status?.isConnected && status?.senderPhone && (
                        <p className="text-sm text-gray-500 font-mono">{status.senderPhone}</p>
                    )}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${status?.isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${status?.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {status?.isConnected ? 'Terhubung' : 'Belum Terhubung'}
                </div>
            </div>

            {/* 2. Connection Status Card */}
            <Card className={`border-l-4 ${status?.isConnected ? 'border-l-green-500' : 'border-l-red-500'}`}>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${status?.isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                            {status?.isConnected ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Status Koneksi</h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {status?.isConnected
                                    ? 'Terhubung – siap mengirim notifikasi'
                                    : 'Belum terhubung – hubungkan WhatsApp terlebih dahulu'}
                            </p>
                        </div>
                    </div>
                </div>
                {status?.isConnected && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            variant="secondary"
                            className="text-xs py-2 h-auto"
                            onClick={handleSendTest}
                            isLoading={isLoading}
                        >
                            Kirim Pesan Tes
                        </Button>
                    </div>
                )}
            </Card>

            {/* 3. Pairing Section (Only if NOT connected) */}
            {!status?.isConnected && (
                <Card className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                        <QrCode className="w-5 h-5 text-brand-500" />
                        <h3 className="font-bold text-gray-900">Hubungkan WhatsApp</h3>
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
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-center mt-2 animate-fade-in">
                                <p className="text-xs text-gray-500 mb-2">Kode Pairing Anda:</p>
                                <div className="flex items-center justify-center gap-3 mb-3">
                                    <span className="text-3xl font-mono font-bold tracking-widest text-gray-900">
                                        {pairingCode.slice(0, 4)}-{pairingCode.slice(4)}
                                    </span>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(pairingCode);
                                            success('📋 Kode berhasil disalin!');
                                        }}
                                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                        <Copy className="w-5 h-5 text-gray-500" />
                                    </button>
                                </div>
                                <div className="text-left text-xs text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
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
                    <div className="flex items-center gap-2 mb-2 border-b pb-2">
                        <RefreshCw className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-gray-900">Kelola Koneksi</h3>
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
                    <p className="text-xs text-gray-400 text-center">
                        Logout akan menghentikan semua notifikasi sampai Anda pairing ulang.
                    </p>
                </Card>
            )}

            {/* 5. Recipients Section */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h3 className="font-semibold text-gray-900">Penerima Notifikasi</h3>
                        <p className="text-xs text-gray-500">{recipients.length} penerima terdaftar</p>
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
                        <div className="text-center py-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Belum ada penerima</p>
                            <p className="text-xs text-gray-400">Tambahkan agar notifikasi berjalan</p>
                        </div>
                    ) : (
                        recipients.map((phone, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${phone.length > 15 ? 'bg-purple-100 text-purple-600' : 'bg-brand-50 text-brand-600'
                                        }`}>
                                        {phone.length > 15 ? <Users className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm truncate max-w-[180px]">{phone}</p>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${phone.length > 15 ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {phone.length > 15 ? 'Group' : 'Individual'}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteRecipient(phone)}
                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
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
                        <div className="py-8 text-center text-gray-500">Memuat daftar grup...</div>
                    ) : groups.length === 0 ? (
                        <div className="py-8 text-center text-gray-500">Tidak ada grup ditemukan</div>
                    ) : (
                        <div className="space-y-2">
                            {groups.map((group) => (
                                <button
                                    key={group.JID || group.id}
                                    onClick={() => handleAddGroup(group)}
                                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-left"
                                >
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 shrink-0">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate">{group.Name || group.name || 'Grup Tanpa Nama'}</p>
                                        <p className="text-xs text-gray-500 truncate">{group.JID || group.id}</p>
                                    </div>
                                    <Plus className="w-5 h-5 text-gray-400" />
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
        </div>
    );
}
