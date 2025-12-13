import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '../../utils/formatter';
import { useToast } from '../../hooks/useToast';

interface PhotoLightboxProps {
    isOpen: boolean;
    onClose: () => void;
    photo: any;
    onNext?: () => void;
    onPrev?: () => void;
    onDelete?: () => void;
}

export default function PhotoLightbox({ isOpen, onClose, photo, onNext, onPrev, onDelete }: PhotoLightboxProps) {
    const { success, error } = useToast();

    if (!isOpen || !photo) return null;

    const handleDownload = async () => {
        try {
            const response = await fetch(photo.photoUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `package-${photo.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            success('Foto berhasil diunduh');
        } catch (e) {
            error('Gagal mengunduh foto');
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SmartParcel Photo',
                    text: `Paket diterima pada ${formatDate(photo.timestamp)}`,
                    url: photo.photoUrl,
                });
            } catch (e) {
                // Share cancelled
            }
        } else {
            // Fallback copy link
            navigator.clipboard.writeText(photo.photoUrl);
            success('Link foto disalin');
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black z-50 flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 text-white bg-gradient-to-b from-black/50 to-transparent z-10">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                    <span className="font-medium text-sm">
                        {formatDate(photo.timestamp)}
                    </span>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Main Image */}
                <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                    <motion.img
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={photo.photoUrl}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain"
                    />

                    {/* Navigation */}
                    {onPrev && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onPrev(); }}
                            className="absolute left-4 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    )}
                    {onNext && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            className="absolute right-4 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="bg-white rounded-t-3xl p-6 pb-safe">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900 text-lg">Package Details</h3>
                            <p className="text-gray-500 text-sm">ID: #{photo.id} • {photo.distance || 0} cm</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                            Received
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <button
                            onClick={handleDownload}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-700">
                                <Download className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">Download</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600">
                                <Share2 className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">Share</span>
                        </button>

                        <button
                            onClick={onDelete}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-red-50 transition-colors"
                        >
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-medium text-gray-600">Delete</span>
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
