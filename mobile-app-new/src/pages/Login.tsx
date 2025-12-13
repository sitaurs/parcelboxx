import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, LogIn } from 'lucide-react';
import { authAPI, setAuthToken } from '../services/api';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import Input from '../components/Input';
import Button from '../components/Button';

export default function Login() {
    const navigate = useNavigate();
    const { setUser } = useStore();
    const { error: showError, success } = useToast();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authAPI.login(username, password);
            setAuthToken(response.token);
            setUser(response.user);
            localStorage.setItem('pinLockTime', Date.now().toString());
            success('Login berhasil! Selamat datang.');
            navigate('/');
        } catch (err: any) {
            showError(err.message || 'Username atau password salah');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-50 flex items-center justify-center p-6">
            <div className="w-full max-w-sm bg-white rounded-[32px] shadow-xl shadow-brand-500/5 p-8 border border-white">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                        <Package className="w-10 h-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">SmartParcel</h1>
                    <p className="text-gray-500 text-sm mt-1">Welcome Back</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <Input
                        label="Username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <div className="pt-2">
                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            <LogIn className="w-5 h-5" />
                            Login
                        </Button>
                    </div>
                </form>

                <p className="text-center text-xs text-gray-400 mt-8">
                    SmartParcel IoT Project © 2025
                </p>
            </div>
        </div>
    );
}
