import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../Modal';
import { supabase } from '../../utils/supabaseClient';
import { PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from '../../constants/presets';
import { User, Key, Calendar, ShieldCheck, CreditCard, LogOut, BarChart3, Image, FileText, Layers, Package, Zap } from 'lucide-react';
import { GommoAI } from '../../utils/gommoAI';

export interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    session: any;
    apiKey: string;
    setApiKey: (key: string) => void;
    subscriptionExpired: boolean;
    onSignOut: () => void;
    // Gommo AI
    gommoDomain?: string;
    gommoAccessToken?: string;
    setGommoCredentials?: (domain: string, token: string) => void;
    usageStats?: {
        '1K'?: number;
        '2K'?: number;
        '4K'?: number;
        total?: number;
        scenes?: number;
        characters?: number;
        products?: number;
        concepts?: number;
        geminiImages?: number;
        gommoImages?: number;
        estimatedPromptTokens?: number;
        textTokens?: number;
        promptTokens?: number;
        candidateTokens?: number;
        textCalls?: number;
        lastGeneratedAt?: string;
    };
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
    isOpen,
    onClose,
    profile,
    session,
    apiKey,
    setApiKey,
    subscriptionExpired,
    onSignOut,
    usageStats,
    gommoDomain = '',
    gommoAccessToken = '',
    setGommoCredentials
}) => {
    const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');
    const [localApiKey, setLocalApiKey] = useState(apiKey);

    // Gommo state - default domain is aivideoauto.com
    const [localGommoDomain, setLocalGommoDomain] = useState(gommoDomain || 'aivideoauto.com');
    const [localGommoToken, setLocalGommoToken] = useState(gommoAccessToken);
    const [gommoStatus, setGommoStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [gommoMsg, setGommoMsg] = useState('');
    const [gommoCredits, setGommoCredits] = useState<number | null>(null);

    // Groq state
    const [localGroqApiKey, setLocalGroqApiKey] = useState('');
    const [groqCheckStatus, setGroqCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [groqStatusMsg, setGroqStatusMsg] = useState('');

    // Fal.ai state
    const [localFalApiKey, setLocalFalApiKey] = useState('');
    const [falCheckStatus, setFalCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [falStatusMsg, setFalStatusMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCheckStatus('idle');
            setStatusMsg('');
            setLocalApiKey(apiKey);
            setLocalGroqApiKey(localStorage.getItem('groqApiKey') || '');
            setLocalFalApiKey(localStorage.getItem('falApiKey') || '');
        }
    }, [isOpen, apiKey]);

    const handleVerify = async () => {
        const trimmedKey = localApiKey.trim();
        if (!trimmedKey) {
            setCheckStatus('error');
            setStatusMsg("Vui lòng nhập API Key.");
            return;
        }

        setCheckStatus('checking');
        try {
            const ai = new GoogleGenAI({ apiKey: trimmedKey });
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: 'Test connection'
            });

            if (response.promptFeedback?.blockReason) {
                throw new Error(`Bị chặn: ${response.promptFeedback.blockReason}`);
            }

            // Save to Supabase silently
            if (session?.user?.id) {
                const payload = {
                    user_id: session.user.id,
                    user_email: session.user.email || null,
                    provider: 'gemini',
                    encrypted_key: trimmedKey,
                    is_active: true
                };

                const { error: supabaseError } = await supabase
                    .from('user_api_keys')
                    .upsert(payload, { onConflict: 'user_id,provider' });

                if (supabaseError) {
                    console.error('[API Key] Save error:', supabaseError.message);
                }
            }

            setApiKey(trimmedKey);
            setCheckStatus('success');
            setStatusMsg("✅ API Key hợp lệ!");

        } catch (error: any) {
            setCheckStatus('error');
            let msg = error.message || "Lỗi kết nối.";
            if (msg.includes('403')) msg = "Lỗi 403: Quyền bị từ chối.";
            else if (msg.includes('400')) msg = "Lỗi 400: API Key không hợp lệ.";
            setStatusMsg(msg);
        }
    };

    const handleGommoVerify = async () => {
        const domain = localGommoDomain.trim();
        const token = localGommoToken.trim();

        if (!domain || !token) {
            setGommoStatus('error');
            setGommoMsg('Vui lòng nhập Domain và Access Token.');
            return;
        }

        setGommoStatus('checking');
        try {
            const client = new GommoAI(domain, token);
            const info = await client.getAccountInfo();


            // Save credentials to state and localStorage
            if (setGommoCredentials) {
                setGommoCredentials(domain, token);
            }

            // Save to Supabase for persistence (gommo_credentials table)
            if (session?.user?.id) {
                try {
                    await supabase
                        .from('gommo_credentials')
                        .upsert({
                            user_id: session.user.id,
                            domain: domain,
                            access_token: token,
                            credits_ai: info.balancesInfo.credits_ai || 0
                        }, { onConflict: 'user_id' });

                    console.log('[Gommo] ✅ Credentials saved to Supabase');
                } catch (e: any) {
                    console.error('[Gommo] Failed to save to Supabase:', e.message);
                }
            }

            // Show credits
            setGommoCredits(info.balancesInfo.credits_ai || 0);
            setGommoStatus('success');
            setGommoMsg(`✅ Xác thực thành công! Xin chào ${info.userInfo.name || info.userInfo.username}`);

        } catch (error: any) {
            setGommoStatus('error');
            setGommoMsg(error.message || 'Không thể kết nối Gommo API');
        }
    };

    const handleGroqVerify = async () => {
        const trimmedKey = localGroqApiKey.trim();
        if (!trimmedKey) {
            setGroqCheckStatus('error');
            setGroqStatusMsg("Vui lòng nhập API Key.");
            return;
        }

        setGroqCheckStatus('checking');
        try {
            // Test connection using proxy with custom header
            const response = await fetch('/api/proxy/groq/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-groq-api-key': trimmedKey
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: 'Test connection' }],
                    model: 'llama-3.1-8b-instant',
                    max_tokens: 10
                })
            });

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Groq connection failed');
            }

            // Save to localStorage
            localStorage.setItem('groqApiKey', trimmedKey);

            setGroqCheckStatus('success');
            setGroqStatusMsg("✅ Groq API Key hợp lệ!");

        } catch (error: any) {
            setGroqCheckStatus('error');
            setGroqStatusMsg(error.message || "Lỗi kết nối Groq.");
        }
    };
    const handleFalVerify = async () => {
        const trimmedKey = localFalApiKey.trim();
        if (!trimmedKey) {
            setFalCheckStatus('error');
            setFalStatusMsg("Vui lòng nhập API Key.");
            return;
        }

        setFalCheckStatus('checking');
        try {
            // Test connection using proxy with custom header
            const response = await fetch('/api/proxy/fal/flux', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-fal-api-key': trimmedKey
                },
                body: JSON.stringify({
                    prompt: 'Test connection',
                    model: 'fal-ai/flux/dev', // Smallest/cheapest for test
                    aspect_ratio: '1:1'
                })
            });

            const data = await response.json();
            if (!data.success && !data.url) {
                throw new Error(data.error || 'Fal connection failed');
            }

            // Save to localStorage
            localStorage.setItem('falApiKey', trimmedKey);

            setFalCheckStatus('success');
            setFalStatusMsg("✅ Fal.ai API Key hợp lệ!");

        } catch (error: any) {
            setFalCheckStatus('error');
            setFalStatusMsg(error.message || "Lỗi kết nối Fal.ai.");
        }
    };


    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Thông tin tài khoản">
            <div className="space-y-6">
                {/* User Info Section */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <User className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Tài khoản</p>
                            <p className="text-white font-medium">{session?.user?.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2 text-gray-500 mb-1">
                                <CreditCard size={14} />
                                <span className="text-[10px] uppercase font-bold">Gói dịch vụ</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${subscriptionExpired ? 'bg-red-500/10 text-red-400 border-red-500/30' : profile?.subscription_tier === 'pro' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' : 'bg-gray-700 text-gray-400 border-gray-600'}`}>
                                {subscriptionExpired ? 'EXPIRED' : profile?.subscription_tier?.toUpperCase() || 'FREE'}
                            </span>
                        </div>

                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2 text-gray-500 mb-1">
                                <Calendar size={14} />
                                <span className="text-[10px] uppercase font-bold">Hết hạn</span>
                            </div>
                            <p className="text-xs text-gray-300">
                                {profile?.subscription_expires_at ? new Date(profile.subscription_expires_at).toLocaleDateString('vi-VN') : 'Không giới hạn'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Usage Stats Section */}
                {usageStats && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <BarChart3 className="text-purple-400" size={18} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Thống kê sử dụng</p>
                                <p className="text-white font-medium">{usageStats.total || 0} ảnh đã tạo</p>
                            </div>
                        </div>

                        {/* Image Stats Grid */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gray-900/50 rounded-lg p-3 flex items-center space-x-2">
                                <Layers className="text-blue-400" size={16} />
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Scenes</p>
                                    <p className="text-white font-bold">{usageStats.scenes || 0}</p>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 flex items-center space-x-2">
                                <User className="text-green-400" size={16} />
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Characters</p>
                                    <p className="text-white font-bold">{usageStats.characters || 0}</p>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 flex items-center space-x-2">
                                <Package className="text-orange-400" size={16} />
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Products</p>
                                    <p className="text-white font-bold">{usageStats.products || 0}</p>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 rounded-lg p-3 flex items-center space-x-2">
                                <Image className="text-pink-400" size={16} />
                                <div>
                                    <p className="text-[10px] text-gray-500 uppercase">Concepts</p>
                                    <p className="text-white font-bold">{usageStats.concepts || 0}</p>
                                </div>
                            </div>
                        </div>

                        {/* Token Stats */}
                        <div className="border-t border-gray-700 pt-3">
                            <div className="flex items-center space-x-2 mb-2">
                                <FileText className="text-yellow-400" size={14} />
                                <p className="text-[10px] text-gray-500 uppercase font-bold">Token Usage (Text API)</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <p className="text-lg font-bold text-white">{((usageStats.textTokens || 0) / 1000).toFixed(1)}K</p>
                                    <p className="text-[9px] text-gray-500">Total</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-blue-400">{((usageStats.promptTokens || 0) / 1000).toFixed(1)}K</p>
                                    <p className="text-[9px] text-gray-500">Input</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-lg font-bold text-green-400">{((usageStats.candidateTokens || 0) / 1000).toFixed(1)}K</p>
                                    <p className="text-[9px] text-gray-500">Output</p>
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-600 mt-2 text-center">
                                {usageStats.textCalls || 0} API calls • Last: {usageStats.lastGeneratedAt ? new Date(usageStats.lastGeneratedAt).toLocaleString('vi-VN') : 'N/A'}
                            </p>
                        </div>

                        {/* Provider Breakdown */}
                        <div className="border-t border-gray-700 pt-3">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">📊 Image Provider Breakdown</p>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="text-center bg-blue-500/10 rounded-lg py-2">
                                    <p className="text-lg font-bold text-blue-400">{usageStats.geminiImages || 0}</p>
                                    <p className="text-[9px] text-gray-500">🔵 Gemini</p>
                                </div>
                                <div className="text-center bg-yellow-500/10 rounded-lg py-2">
                                    <p className="text-lg font-bold text-yellow-400">{usageStats.gommoImages || 0}</p>
                                    <p className="text-[9px] text-gray-500">🟡 Gommo</p>
                                </div>
                                <div className="text-center bg-purple-500/10 rounded-lg py-2">
                                    <p className="text-lg font-bold text-purple-400">{((usageStats.estimatedPromptTokens || 0) / 1000).toFixed(1)}K</p>
                                    <p className="text-[9px] text-gray-500">Est. Tokens</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* API Key Section */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Key className="text-gray-400" size={18} />
                        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">Cấu hình API Key</h3>
                    </div>

                    {/* System/Assigned Key Warning */}
                    {(profile?.assigned_api_key || profile?.system_key_id) && (
                        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 flex items-start space-x-2">
                            <ShieldCheck className="text-blue-400 flex-shrink-0 mt-0.5" size={16} />
                            <div className="text-xs">
                                <p className="text-blue-300 font-medium">
                                    {profile?.assigned_api_key ? '🔑 Đang sử dụng API Key được Admin cấp' : '🔒 Đang sử dụng System Key'}
                                </p>
                                <p className="text-blue-400/70 mt-1">
                                    Key tự nhập sẽ không được sử dụng khi có key từ Admin.
                                </p>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-gray-500">Nhập Google AI Studio Key (Gemini) để thực hiện các tác vụ tạo ảnh và kịch bản.</p>

                    <div className="relative">
                        <input
                            type="password"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            placeholder="Nhập API Key..."
                            className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all text-sm"
                        />
                        <button
                            onClick={handleVerify}
                            disabled={checkStatus === 'checking'}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all ${checkStatus === 'checking' ? 'bg-gray-700 text-gray-500' : `bg-gradient-to-r ${PRIMARY_GRADIENT} text-white hover:shadow-lg shadow-orange-500/20 active:scale-95`}`}
                        >
                            {checkStatus === 'checking' ? '...' : 'Verify'}
                        </button>
                    </div>

                    {checkStatus !== 'idle' && (
                        <div className={`text-[11px] p-2.5 rounded-lg border flex items-start animate-fade-in ${checkStatus === 'checking' ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' :
                            checkStatus === 'success' ? 'bg-green-900/20 border-green-800/50 text-green-300' :
                                'bg-red-900/20 border-red-800/50 text-red-300'
                            }`}>
                            <span>{statusMsg}</span>
                        </div>
                    )}

                    {/* Groq API Key Section */}
                    <div className="pt-4 border-t border-gray-700/50 mt-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <div className="p-1.5 bg-orange-500/10 rounded">
                                <Zap className="text-orange-400" size={14} />
                            </div>
                            <h4 className="text-xs font-bold text-gray-300 uppercase">Groq Cloud API (Llama 3)</h4>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-2">Optional. Use your own key for faster script generation.</p>

                        <div className="relative">
                            <input
                                type="password"
                                value={localGroqApiKey}
                                onChange={(e) => setLocalGroqApiKey(e.target.value)}
                                placeholder="gsk_..."
                                className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all text-sm"
                            />
                            <button
                                onClick={handleGroqVerify}
                                disabled={groqCheckStatus === 'checking'}
                                className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all ${groqCheckStatus === 'checking' ? 'bg-gray-700 text-gray-500' : `bg-gray-700 hover:bg-gray-600 text-white`}`}
                            >
                                {groqCheckStatus === 'checking' ? '...' : 'Save'}
                            </button>
                        </div>

                        {groqCheckStatus !== 'idle' && (
                            <div className={`mt-2 text-[11px] p-2 rounded-lg border flex items-center ${groqCheckStatus === 'success' ? 'bg-green-900/10 border-green-800/30 text-green-400' :
                                groqCheckStatus === 'error' ? 'bg-red-900/10 border-red-800/30 text-red-400' :
                                    'bg-blue-900/10 border-blue-800/30 text-blue-400'
                                }`}>
                                {groqStatusMsg}
                            </div>
                        )}
                    </div>
                </div>

                {/* Fal.ai API Key Section */}
                <div className="pt-4 border-t border-gray-700/50 mt-4">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="p-1.5 bg-pink-500/10 rounded">
                            <Image className="text-pink-400" size={14} />
                        </div>
                        <h4 className="text-xs font-bold text-gray-300 uppercase">Fal.ai Flux Key (Consistency)</h4>
                    </div>
                    <p className="text-[11px] text-gray-500 mb-2">Optional. Used for high-consistency Flux.1 models.</p>

                    <div className="relative">
                        <input
                            type="password"
                            value={localFalApiKey}
                            onChange={(e) => setLocalFalApiKey(e.target.value)}
                            placeholder="fal_..."
                            className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50 transition-all text-sm"
                        />
                        <button
                            onClick={handleFalVerify}
                            disabled={falCheckStatus === 'checking'}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all ${falCheckStatus === 'checking' ? 'bg-gray-700 text-gray-500' : `bg-gray-700 hover:bg-gray-600 text-white`}`}
                        >
                            {falCheckStatus === 'checking' ? '...' : 'Save'}
                        </button>
                    </div>

                    {falCheckStatus !== 'idle' && (
                        <div className={`mt-2 text-[11px] p-2 rounded-lg border flex items-center ${falCheckStatus === 'success' ? 'bg-green-900/10 border-green-800/30 text-green-400' :
                            falCheckStatus === 'error' ? 'bg-red-900/10 border-red-800/30 text-red-400' :
                                'bg-blue-900/10 border-blue-800/30 text-blue-400'
                            }`}>
                            {falStatusMsg}
                        </div>
                    )}
                </div>

                {/* Gommo AI Section */}
                <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                        <Zap className="text-yellow-400" size={18} />
                        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wide">Gommo AI (Proxy)</h3>
                        {gommoCredits !== null && (
                            <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                                💰 {gommoCredits.toLocaleString()} credits
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500">Nhập Access Token từ Gommo để sử dụng API ảnh với giá rẻ hơn.</p>

                    <div className="relative">
                        <input
                            type="password"
                            value={localGommoToken}
                            onChange={(e) => setLocalGommoToken(e.target.value)}
                            placeholder="Paste Access Token từ Gommo..."
                            className="w-full px-3 py-2.5 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all text-sm"
                        />
                        <button
                            onClick={handleGommoVerify}
                            disabled={gommoStatus === 'checking'}
                            className={`absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all ${gommoStatus === 'checking' ? 'bg-gray-700 text-gray-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-lg shadow-yellow-500/20 active:scale-95'}`}
                        >
                            {gommoStatus === 'checking' ? '...' : 'Verify'}
                        </button>
                    </div>

                    {gommoStatus !== 'idle' && (
                        <div className={`text-[11px] p-2.5 rounded-lg border flex items-start animate-fade-in ${gommoStatus === 'checking' ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' :
                            gommoStatus === 'success' ? 'bg-green-900/20 border-green-800/50 text-green-300' :
                                'bg-red-900/20 border-red-800/50 text-red-300'
                            }`}>
                            <span>{gommoMsg}</span>
                        </div>
                    )}
                </div>

                {/* Info Footer */}
                <div className="pt-4 border-t border-gray-800 flex space-x-3">
                    <button
                        onClick={onSignOut}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-bold text-sm transition-all active:scale-95 border border-red-500/20"
                    >
                        <LogOut size={16} />
                        <span>ĐĂNG XUẤT</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold text-sm transition-all active:scale-95"
                    >
                        HOÀN TẤT
                    </button>
                </div>
            </div>
        </Modal>
    );
};
