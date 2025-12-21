import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, History, MessageCircle, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
};

export default function Layout() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/history', icon: History, label: 'History' },
        { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)] pt-safe">
            <main className="pb-24">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{
                            type: 'spring',
                            stiffness: 300,
                            damping: 30,
                        }}
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-[var(--nav-bg)] backdrop-blur-lg border-t border-[var(--border-color)] pb-safe pt-2 px-6 z-40">
                <div className="flex justify-between items-center max-w-md mx-auto h-16">
                    {navItems.map((item, index) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className="relative flex flex-col items-center justify-center w-16 h-full"
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="nav-pill"
                                        className="absolute -top-2 w-8 h-1 bg-brand-500 rounded-full"
                                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <item.icon
                                        className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-[var(--text-secondary)]'
                                            }`}
                                    />
                                </motion.div>
                                <motion.span
                                    className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-[var(--text-secondary)]'
                                        }`}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 + 0.1 }}
                                >
                                    {item.label}
                                </motion.span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
