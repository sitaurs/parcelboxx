import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon } from 'lucide-react';
import { packageAPI, API_URL } from '../services/api';
import { useToast } from '../hooks/useToast';
import { formatDate } from '../utils/formatter';
import PhotoLightbox from '../components/modals/PhotoLightbox';
import ConfirmationModal from '../components/ConfirmationModal';

// Animation variants
const containerVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { staggerChildren: 0.05, delayChildren: 0.1 }
    }
};

const itemVariants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: { 
        opacity: 1, 
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    },
    exit: { opacity: 0, scale: 0.8 }
};

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
        <motion.div 
            className="page-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div 
                className="flex items-center justify-between mb-6 pt-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gallery</h1>
                <motion.span 
                    className="text-sm text-gray-500 dark:text-gray-400"
                    key={filteredPackages.length}
                    initial={{ scale: 1.2, color: '#F97316' }}
                    animate={{ scale: 1, color: 'inherit' }}
                >
                    {filteredPackages.length} Photos
                </motion.span>
            </motion.div>

            {/* Filters */}
            <motion.div 
                className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
            >
                {[
                    { id: 'all', label: 'All Photos' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This Week' },
                ].map((f, index) => (
                    <motion.button
                        key={f.id}
                        onClick={() => setFilter(f.id as any)}
                        className={`
              px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
              ${filter === f.id
                                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}
            `}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                    >
                        {f.label}
                    </motion.button>
                ))}
            </motion.div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <motion.div 
                            key={i} 
                            className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-2xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                        />
                    ))}
                </div>
            ) : filteredPackages.length > 0 ? (
                <motion.div 
                    className="grid grid-cols-2 gap-4 pb-20"
                    variants={containerVariants}
                    initial="initial"
                    animate="animate"
                >
                    {filteredPackages.map((pkg, index) => (
                        <motion.div
                            key={pkg.id}
                            variants={itemVariants}
                            onClick={() => setSelectedPhotoIndex(index)}
                            className="group relative aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
                            whileHover={{ scale: 1.05, zIndex: 10 }}
                            whileTap={{ scale: 0.95 }}
                            layoutId={`photo-${pkg.id}`}
                        >
                            <motion.img
                                src={pkg.thumbUrl ? `${API_URL.replace('/api', '')}${pkg.thumbUrl}` : (pkg.photoUrl ? `${API_URL.replace('/api', '')}${pkg.photoUrl}` : 'https://placehold.co/400x400/orange/white?text=No+Image')}
                                alt={`Package ${pkg.id}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400x400/orange/white?text=Error';
                                }}
                                whileHover={{ scale: 1.1 }}
                                transition={{ duration: 0.3 }}
                            />
                            <motion.div 
                                className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3"
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                            >
                                <p className="text-white text-xs font-medium truncate">
                                    {formatDate(pkg.timestamp)}
                                </p>
                            </motion.div>
                        </motion.div>
                    ))}
                </motion.div>
            ) : (
                <motion.div 
                    className="flex flex-col items-center justify-center py-20 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <motion.div 
                        className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </motion.div>
                    <h3 className="font-bold text-gray-900 dark:text-white">No photos found</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Try changing the filter</p>
                </motion.div>
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
        </motion.div>
    );
}
