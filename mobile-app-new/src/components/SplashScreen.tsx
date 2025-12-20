import { motion } from 'framer-motion';

interface SplashScreenProps {
    onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
    return (
        <motion.div
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-orange-600"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            onAnimationComplete={(definition) => {
                // Only trigger onComplete when exit animation finishes
                if (definition === 'exit') {
                    onComplete();
                }
            }}
        >
            {/* Background Particles */}
            <div className="absolute inset-0 overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-white/20 rounded-full"
                        initial={{
                            x: Math.random() * window.innerWidth,
                            y: window.innerHeight + 20,
                            scale: Math.random() * 0.5 + 0.5,
                        }}
                        animate={{
                            y: -20,
                            opacity: [0, 1, 1, 0],
                        }}
                        transition={{
                            duration: Math.random() * 3 + 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: 'linear',
                        }}
                    />
                ))}
            </div>

            {/* Glowing Ring Behind Logo */}
            <motion.div
                className="absolute w-40 h-40 rounded-full"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
                style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
                }}
            />

            {/* Logo Container */}
            <motion.div
                className="relative z-10"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2,
                }}
            >
                <motion.div
                    className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center overflow-hidden"
                    animate={{
                        boxShadow: [
                            '0 0 30px rgba(255,255,255,0.3)',
                            '0 0 60px rgba(255,255,255,0.5)',
                            '0 0 30px rgba(255,255,255,0.3)',
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    <motion.img
                        src="/logo.png"
                        alt="SmartParcel"
                        className="w-24 h-24 object-contain"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    />
                </motion.div>
            </motion.div>

            {/* App Name */}
            <motion.div
                className="mt-8 text-center z-10"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
            >
                <motion.h1
                    className="text-4xl font-bold text-white tracking-tight"
                    animate={{
                        textShadow: [
                            '0 0 20px rgba(255,255,255,0.5)',
                            '0 0 40px rgba(255,255,255,0.8)',
                            '0 0 20px rgba(255,255,255,0.5)',
                        ],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                >
                    SmartParcel
                </motion.h1>
                <motion.p
                    className="text-white/80 text-sm mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                >
                    Smart Package Management
                </motion.p>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
                className="absolute bottom-20 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className="w-2 h-2 bg-white rounded-full"
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.5, 1, 0.5],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.2,
                            }}
                        />
                    ))}
                </div>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-48 h-1 bg-white/20 rounded-full overflow-hidden z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
            >
                <motion.div
                    className="h-full bg-white rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{
                        duration: 3,
                        delay: 1.5,
                        ease: 'easeInOut',
                    }}
                    onAnimationComplete={onComplete}
                />
            </motion.div>

            {/* Version */}
            <motion.p
                className="absolute bottom-4 text-white/50 text-xs z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
            >
                v2.0.0
            </motion.p>
        </motion.div>
    );
}
