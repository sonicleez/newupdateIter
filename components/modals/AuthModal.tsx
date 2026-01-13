import React, { useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from '../../constants/presets';

interface AuthModalProps {
    isOpen: boolean;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [mode, setMode] = useState<AuthMode>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (mode === 'signup') {
                // Sign up with name in metadata
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName.trim() || email.split('@')[0]
                        }
                    }
                });
                if (error) {
                    setError(error.message);
                } else {
                    setSuccessMsg("Đăng ký thành công! Vui lòng kiểm tra email để xác nhận.");
                }
            } else if (mode === 'forgot') {
                // Forgot password - send reset email
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/reset-password`
                });
                if (error) {
                    setError(error.message);
                } else {
                    setSuccessMsg("Đã gửi email đặt lại mật khẩu! Vui lòng kiểm tra hộp thư của bạn.");
                }
            } else {
                // Login
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) {
                    setError(error.message);
                }
            }
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra');
        }
        setLoading(false);
    };

    const switchMode = (newMode: AuthMode) => {
        setMode(newMode);
        setError(null);
        setSuccessMsg(null);
    };

    const getTitle = () => {
        switch (mode) {
            case 'signup': return 'JOIN THE VISION';
            case 'forgot': return 'RESET PASSWORD';
            default: return 'WELCOME BACK';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'signup': return 'Create your account to start generating.';
            case 'forgot': return 'Enter your email to receive a password reset link.';
            default: return 'Login to sync your projects and keys.';
        }
    };

    const getButtonText = () => {
        if (loading) return 'PROCESSING...';
        switch (mode) {
            case 'signup': return 'CREATE ACCOUNT';
            case 'forgot': return 'SEND RESET LINK';
            default: return 'LOGIN';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-brand-dark/90 border border-brand-orange/30 rounded-2xl shadow-2xl p-8 animate-in fade-in scale-in duration-300">
                <h2 className="text-3xl font-black text-center bg-gradient-to-r from-brand-orange to-brand-red bg-clip-text text-transparent mb-2">
                    {getTitle()}
                </h2>
                <p className="text-brand-cream/60 text-center mb-8 text-sm">
                    {getSubtitle()}
                </p>

                <form onSubmit={handleAuth} className="space-y-4">
                    {/* Full Name - Only for Sign Up */}
                    {mode === 'signup' && (
                        <div>
                            <label className="block text-xs font-bold text-brand-orange mb-1 uppercase tracking-widest">Họ và Tên</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-cream focus:outline-none focus:border-brand-orange/50 transition-all"
                                placeholder="Nguyễn Văn A"
                            />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-bold text-brand-orange mb-1 uppercase tracking-widest">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-cream focus:outline-none focus:border-brand-orange/50 transition-all"
                            placeholder="director@example.com"
                            required
                        />
                    </div>

                    {/* Password - Not shown for forgot mode */}
                    {mode !== 'forgot' && (
                        <div>
                            <label className="block text-xs font-bold text-brand-orange mb-1 uppercase tracking-widest">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-brand-cream focus:outline-none focus:border-brand-orange/50 transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    {error && <p className="text-red-400 text-xs mt-2 bg-red-400/10 p-2 rounded-lg border border-red-400/20">{error}</p>}
                    {successMsg && <p className="text-green-400 text-xs mt-2 bg-green-400/10 p-2 rounded-lg border border-green-400/20">{successMsg}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-xl text-white font-bold bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all shadow-lg active:scale-95 disabled:opacity-50`}
                    >
                        {getButtonText()}
                    </button>
                </form>

                {/* Auth Mode Switch */}
                <div className="mt-6 text-center space-y-2">
                    {mode === 'login' && (
                        <>
                            <button
                                onClick={() => switchMode('forgot')}
                                className="text-brand-cream/40 hover:text-brand-orange text-xs transition-colors block w-full"
                            >
                                Quên mật khẩu?
                            </button>
                            <button
                                onClick={() => switchMode('signup')}
                                className="text-brand-cream/40 hover:text-brand-orange text-xs transition-colors"
                            >
                                Don't have an account? Sign up
                            </button>
                        </>
                    )}
                    {mode === 'signup' && (
                        <button
                            onClick={() => switchMode('login')}
                            className="text-brand-cream/40 hover:text-brand-orange text-xs transition-colors"
                        >
                            Already have an account? Login
                        </button>
                    )}
                    {mode === 'forgot' && (
                        <button
                            onClick={() => switchMode('login')}
                            className="text-brand-cream/40 hover:text-brand-orange text-xs transition-colors"
                        >
                            ← Back to Login
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
