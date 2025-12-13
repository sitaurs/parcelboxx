import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[32px] shadow-2xl max-h-[90vh] overflow-y-auto"
                    >
                        <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between border-b border-gray-50">
                            <div className="w-12" /> {/* Spacer */}
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full absolute left-1/2 -translate-x-1/2 top-3" />
                            {title && <h3 className="font-bold text-lg text-gray-900 mt-2">{title}</h3>}
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors mt-2">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-6 pb-safe">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
