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
            className={`bg-white rounded-3xl p-5 shadow-sm border border-gray-100 ${className}`}
        >
            {children}
        </div>
    );
}
