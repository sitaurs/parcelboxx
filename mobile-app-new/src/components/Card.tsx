import type { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
    return (
        <div
            onClick={onClick}
            className={`bg-[var(--bg-card)] rounded-3xl p-5 shadow-sm border border-[var(--border-color)] ${className}`}
        >
            {children}
        </div>
    );
}
