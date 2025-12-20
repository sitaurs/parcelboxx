import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                className={`
          w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-700 border-2 
          focus:ring-4 focus:ring-brand-500/10 outline-none transition-all
          placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white
          ${error
                        ? 'border-red-300 dark:border-red-500 focus:border-red-500'
                        : 'border-transparent focus:border-brand-500 hover:border-gray-200 dark:hover:border-gray-600'}
          ${className}
        `}
                {...props}
            />
            {error && (
                <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
