import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    isLoading?: boolean;
    children: ReactNode;
}

export default function Button({
    variant = 'primary',
    isLoading,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {

    const baseStyles = "font-semibold py-3 px-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100";

    const variants = {
        primary: "bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600",
        secondary: "bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-400 border-2 border-brand-100 dark:border-brand-800 active:bg-brand-50 dark:active:bg-gray-600",
        ghost: "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600",
        danger: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 active:bg-red-200 border border-red-100 dark:border-red-800"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : children}
        </button>
    );
}
