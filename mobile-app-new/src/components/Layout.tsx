import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, History, MessageCircle, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Layout() {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/history', icon: History, label: 'History' },
        { path: '/whatsapp', icon: MessageCircle, label: 'WhatsApp' },
        { path: '/settings', icon: Settings, label: 'Settings' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] font-sans text-[var(--text-primary)]">
            <main className="pb-24">
                <Outlet />
            </main>

            <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 pb-safe pt-2 px-6 z-40">
                <div className="flex justify-between items-center max-w-md mx-auto h-16">
                    {navItems.map((item) => {
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
                                <item.icon
                                    className={`w-6 h-6 transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-gray-400'
                                        }`}
                                />
                                <span
                                    className={`text-[10px] font-medium mt-1 transition-colors duration-200 ${isActive ? 'text-brand-600' : 'text-gray-400'
                                        }`}
                                >
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
