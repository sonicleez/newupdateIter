import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import Modal from '../Modal';
import { PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from '../../constants/presets';

export interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => {
    const [checkStatus, setCheckStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setCheckStatus('idle');
            setStatusMsg('');
        }
    }, [isOpen]);

    const handleVerify = async () => {
        if (!apiKey.trim()) {
            setCheckStatus('error');
            setStatusMsg("Vui lòng nhập API Key.");
            return;
        }

        setCheckStatus('checking');
        try {
            const ai = new GoogleGenAI({ apiKey });
            // Test connection with a cheap/fast model to verify key permissions
            await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ text: 'Test connection' }] }
            });
            setCheckStatus('success');
            setStatusMsg("Kết nối thành công! Key hợp lệ.");
            setTimeout(onClose, 1500);
        } catch (error: any) {
            setCheckStatus('error');
            let msg = error.message || "Lỗi kết nối.";
            if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
                msg = "Lỗi 403: Quyền bị từ chối. Hãy kiểm tra: 1) Project GCP đã bật Generative AI API chưa? 2) Billing đã kích hoạt chưa?";
            } else if (msg.includes('400') || msg.includes('INVALID_ARGUMENT')) {
                msg = "Lỗi 400: API Key không hợp lệ.";
            }
            setStatusMsg(msg);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quản lý API Key">
            <p className="text-gray-400 mb-4">Nhập Gemini API key của bạn (Paid Tier 1) để sử dụng.</p>
            <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API Key"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />

            {checkStatus !== 'idle' && (
                <div className={`mt-3 text-sm p-3 rounded-lg border flex items-start ${checkStatus === 'checking' ? 'bg-blue-900/30 border-blue-800 text-blue-200' :
                    checkStatus === 'success' ? 'bg-green-900/30 border-green-800 text-green-200' :
                        'bg-red-900/30 border-red-800 text-red-200'
                    }`}>
                    <span className="mr-2 text-lg">
                        {checkStatus === 'checking' && '⏳'}
                        {checkStatus === 'success' && '✅'}
                        {checkStatus === 'error' && '⚠️'}
                    </span>
                    <span>{statusMsg}</span>
                </div>
            )}

            <div className="flex justify-end mt-6 space-x-2">
                <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors font-medium">Đóng</button>
                <button
                    onClick={handleVerify}
                    disabled={checkStatus === 'checking'}
                    className={`px-6 py-2 font-semibold text-white rounded-lg bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {checkStatus === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra & Lưu'}
                </button>
            </div>
        </Modal>
    );
};
