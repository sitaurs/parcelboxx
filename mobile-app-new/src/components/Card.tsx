import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    delay?: number;
    hover?: boolean;
    floating?: boolean;
}

export default function Card({ children, className = '', onClick, delay = 0, hover = true, floating = false }: CardProps) {
    return (
        <motion.div
            onClick={onClick}
            className={`bg-[var(--bg-card)] rounded-3xl p-5 shadow-sm border border-[var(--border-color)] ${className}`}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
                opacity: 1, 
                y: floating ? [0, -5, 0] : 0, 
                scale: 1 
            }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
                type: 'spring',
                stiffness: 300,
                damping: 25,
                delay: delay,
                ...(floating && {
                    y: {
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }
                })
            }}
            whileHover={hover ? { 
                scale: 1.02, 
                boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                transition: { duration: 0.2 }
            } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
        >
            {children}
        </motion.div>
    );
}
