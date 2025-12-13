import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Delete, Lock } from 'lucide-react';
import { authAPI } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function PinLock() {
    const navigate = useNavigate();
    const { error: showError } = useToast();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleNumberClick = (num: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    useEffect(() => {
        if (pin.length === 6) {
            verifyPin();
        }
    }, [pin]);

    const verifyPin = async () => {
        setIsLoading(true);
        try {
            await authAPI.verifyPin(pin);
            localStorage.setItem('pinLockTime', Date.now().toString());
            navigate('/');
        } catch (err) {
            showError('PIN Salah. Silakan coba lagi.');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-brand-200 rounded-full blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-brand-300 rounded-full blur-3xl opacity-20 translate-x-1/2 translate-y-1/2" />

            <div className="w-full max-w-sm relative z-10">
                <div className="text-center mb-12">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <Lock className="w-8 h-8 text-brand-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Security PIN</h2>
                    <p className="text-gray-500 mt-2">Masukkan 6 digit PIN aplikasi</p>
                </div>

                {/* PIN Dots */}
                <div className="flex justify-center gap-4 mb-12">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length
                                    ? 'bg-brand-500 scale-110 shadow-lg shadow-brand-500/30'
                                    : 'bg-brand-200'
                                }`}
                        />
                    ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-4 px-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num.toString())}
                            disabled={isLoading}
                            className="h-20 rounded-2xl bg-white text-2xl font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {num}
                        </button>
                    ))}
                    <div /> {/* Empty slot */}
                    <button
                        onClick={() => handleNumberClick('0')}
                        disabled={isLoading}
                        className="h-20 rounded-2xl bg-white text-2xl font-semibold text-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={isLoading}
                        className="h-20 rounded-2xl bg-transparent text-gray-400 flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all"
                    >
                        <Delete className="w-8 h-8" />
                    </button>
                </div>

                <button
                    onClick={() => {
                        localStorage.removeItem('authToken');
                        navigate('/login');
                    }}
                    className="w-full text-center mt-8 text-brand-600 font-medium text-sm hover:underline"
                >
                    Lupa PIN? Logout
                </button>
            </div>
        </div>
    );
}
