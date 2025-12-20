import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface PageTransitionProps {
    children: ReactNode;
}

const pageVariants = {
    initial: {
        opacity: 0,
        x: 20,
        scale: 0.98,
    },
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
    },
    exit: {
        opacity: 0,
        x: -20,
        scale: 0.98,
    },
};

const pageTransition = {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
};

export default function PageTransition({ children }: PageTransitionProps) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
        >
            {children}
        </motion.div>
    );
}

// Stagger children animation helper
export const staggerContainer = {
    initial: {},
    animate: {
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1,
        },
    },
};

export const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { 
        opacity: 1, 
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
        }
    },
    exit: { opacity: 0, y: -10 },
};

export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};

export const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { 
        opacity: 1, 
        scale: 1,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
        }
    },
    exit: { opacity: 0, scale: 0.9 },
};

export const slideInLeft = {
    initial: { opacity: 0, x: -30 },
    animate: { 
        opacity: 1, 
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
        }
    },
    exit: { opacity: 0, x: 30 },
};

export const slideInRight = {
    initial: { opacity: 0, x: 30 },
    animate: { 
        opacity: 1, 
        x: 0,
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 25,
        }
    },
    exit: { opacity: 0, x: -30 },
};

// Floating animation for decorative elements
export const floatingAnimation = {
    animate: {
        y: [0, -10, 0],
        transition: {
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Pulse animation for status indicators
export const pulseAnimation = {
    animate: {
        scale: [1, 1.1, 1],
        opacity: [1, 0.8, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

// Bounce animation for buttons
export const bounceAnimation = {
    animate: {
        y: [0, -5, 0],
        transition: {
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};
