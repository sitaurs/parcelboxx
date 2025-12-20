import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sliders, Activity, Sun, Moon, ChevronRight, KeyRound } from 'lucide-react';
import { useStore } from '../store/useStore';
import Card from '../components/Card';
import ChangeDoorPinModal from '../components/modals/ChangeDoorPinModal';

// Animation variants
const containerVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.1 }
    }
};

const itemVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { 
        opacity: 1, 
        x: 0,
        transition: { type: 'spring' as const, stiffness: 300, damping: 25 }
    }
};

export default function Settings() {
    const navigate = useNavigate();
    const { isDarkMode, toggleDarkMode } = useStore();

    const [showChangeDoorPinModal, setShowChangeDoorPinModal] = useState(false);

    const SettingItem = ({ icon: Icon, label, onClick, color = 'text-gray-600', index = 0 }: any) => (
        <motion.button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors border-b border-gray-50 dark:border-zinc-800 last:border-0"
            whileHover={{ x: 5, backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
        >
            <div className="flex items-center gap-3">
                <motion.div 
                    className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-700 flex items-center justify-center ${color}`}
                    whileHover={{ rotate: 15, scale: 1.1 }}
                >
                    <Icon className="w-4 h-4" />
                </motion.div>
                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">{label}</span>
            </div>
            <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            </motion.div>
        </motion.button>
    );

    return (
        <motion.div 
            className="page-container space-y-6"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            <motion.h1 
                className="text-2xl font-bold text-gray-900 dark:text-gray-100 pt-2"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                Settings
            </motion.h1>

            {/* Device Management */}
            <motion.div variants={itemVariants}>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Device</h3>
                <Card className="!p-0 overflow-hidden" delay={0.1}>
                    <SettingItem
                        icon={Sliders}
                        label="Device Control"
                        onClick={() => navigate('/device-control')}
                        color="text-blue-600"
                        index={0}
                    />
                    <SettingItem
                        icon={Activity}
                        label="Test Device Hardware"
                        onClick={() => navigate('/test-device')}
                        color="text-purple-600"
                        index={1}
                    />
                </Card>
            </motion.div>

            {/* Security */}
            <motion.div variants={itemVariants}>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Security</h3>
                <Card className="!p-0 overflow-hidden" delay={0.2}>
                    <SettingItem
                        icon={KeyRound}
                        label="Change Door Lock PIN"
                        onClick={() => setShowChangeDoorPinModal(true)}
                        color="text-red-600"
                        index={0}
                    />
                </Card>
            </motion.div>

            {/* Appearance */}
            <motion.div variants={itemVariants}>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 ml-1">Appearance</h3>
                <Card className="!p-0 overflow-hidden" delay={0.3}>
                    <motion.div 
                        className="w-full flex items-center justify-between p-4"
                        whileHover={{ backgroundColor: 'rgba(249, 115, 22, 0.05)' }}
                    >
                        <div className="flex items-center gap-3">
                            <motion.div 
                                className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${isDarkMode ? 'text-yellow-500' : 'text-gray-600'}`}
                                animate={isDarkMode ? { rotate: [0, 360] } : {}}
                                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            >
                                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            </motion.div>
                            <div>
                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm">Dark Mode</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {isDarkMode ? 'Mode gelap aktif' : 'Mode terang aktif'}
                                </p>
                            </div>
                        </div>
                        <motion.button
                            onClick={toggleDarkMode}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isDarkMode ? 'bg-brand-500' : 'bg-gray-300'
                            }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <motion.span
                                className="inline-block h-4 w-4 rounded-full bg-white"
                                animate={{ x: isDarkMode ? 24 : 4 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                        </motion.button>
                    </motion.div>
                </Card>
            </motion.div>

            <motion.p 
                className="text-center text-xs text-gray-400 dark:text-gray-500 pb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                SmartParcel App v2.0.0 (Build 2025)
            </motion.p>

            {/* Modals */}
            <ChangeDoorPinModal
                isOpen={showChangeDoorPinModal}
                onClose={() => setShowChangeDoorPinModal(false)}
            />
        </motion.div>
    );
}
