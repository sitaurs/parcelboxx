import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { packageAPI } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatter';
import PhotoLightbox from '../components/modals/PhotoLightbox';
import ConfirmationModal from '../components/ConfirmationModal';

export default function History() {
    const [packages, setPackages] = useState<any[]>([]);
    const [filter, setFilter] = useState<'all' | 'today' | 'week'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const { error: showError, success } = useToast();

    useEffect(() => {
        loadPackages();
    }, []);

    const loadPackages = async () => {
        setIsLoading(true);
        try {
            // Fetch 100 items for now (pagination later)
            const res = await packageAPI.getList(100, 0);
            setPackages(res.packages);
        } catch (err) {
            showError('Gagal memuat riwayat paket');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredPackages = packages.filter(pkg => {
        const date = new Date(pkg.timestamp);
        const today = new Date();
        if (filter === 'today') {
            return date.getDate() === today.getDate() &&
                date.getMonth() === today.getMonth() &&
                date.getFullYear() === today.getFullYear();
        }
        if (filter === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date >= weekAgo;
        }
        return true;
    });

    const handleDeleteRequest = () => {
        setShowDeleteConfirm(true);
    };

    const handleDelete = async () => {
        if (selectedPhotoIndex === null) return;
        const pkg = filteredPackages[selectedPhotoIndex];

        setIsDeleting(true);
        try {
            await packageAPI.delete(pkg.id);
            success('Foto dihapus');
            setPackages(prev => prev.filter(p => p.id !== pkg.id));
            setSelectedPhotoIndex(null);
            setShowDeleteConfirm(false);
        } catch (err) {
            showError('Gagal menghapus foto');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="flex items-center justify-between mb-6 pt-2">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery</h1>
                <span className="text-sm text-gray-500 dark:text-gray-400">{filteredPackages.length} Photos</span>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2">
                {[
                    { id: 'all', label: 'All Photos' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${filter === f.id
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}
            `}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : filteredPackages.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 pb-20">
                    {filteredPackages.map((pkg, index) => (
                        <div
                            key={pkg.id}
                            onClick={() => setSelectedPhotoIndex(index)}
                            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer active:scale-95 transition-transform"
                        >
                            <img
                                src={pkg.thumbUrl || pkg.photoUrl}
                                alt={`Package ${pkg.id}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                <p className="text-white text-xs font-medium truncate">
                                    {formatDate(pkg.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">No photos found</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Try changing the filter</p>
                </div>
            )}

            <PhotoLightbox
                isOpen={selectedPhotoIndex !== null}
                onClose={() => setSelectedPhotoIndex(null)}
                photo={selectedPhotoIndex !== null ? filteredPackages[selectedPhotoIndex] : null}
                onNext={selectedPhotoIndex !== null && selectedPhotoIndex < filteredPackages.length - 1
                    ? () => setSelectedPhotoIndex(selectedPhotoIndex + 1)
                    : undefined}
                onPrev={selectedPhotoIndex !== null && selectedPhotoIndex > 0
                    ? () => setSelectedPhotoIndex(selectedPhotoIndex - 1)
                    : undefined}
                onDelete={handleDeleteRequest}
            />

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                title="Hapus Foto"
                message="Yakin ingin menghapus foto ini secara permanen?"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
}
