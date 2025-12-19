import React, { useState } from 'react';
import Modal from '../Modal';

export interface GenyuTokenModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
    setToken: (token: string) => void;
    recaptchaToken: string;
    setRecaptchaToken: (token: string) => void;
}

export const GenyuTokenModal: React.FC<GenyuTokenModalProps> = ({ isOpen, onClose, token, setToken, recaptchaToken, setRecaptchaToken }) => {
    const [testResult, setTestResult] = useState<any>(null);
    const [isTesting, setIsTesting] = useState(false);

    const handleTestTokens = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const response = await fetch('http://localhost:3001/api/test-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, recaptchaToken })
            });

            const result = await response.json();
            setTestResult(result);
            console.log('Token Test Result:', result);
        } catch (error) {
            console.error('Test failed:', error);
            setTestResult({ ready: false, message: '❌ Server error' });
        } finally {
            setIsTesting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Genyu Token & Recaptcha">
            <div className="space-y-4">
                <div>
                    <p className="text-gray-400 mb-2">1. Session Token (Cookie):</p>
                    <p className="text-xs text-gray-500 mb-1">F12 → Application → Cookies → __Secure-next-auth.session-token</p>
                    <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="eyJh..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div>
                    <p className="text-gray-400 mb-2">2. Recaptcha Token (Google Labs):</p>
                    <p className="text-xs text-gray-500 mb-1">F12 → Network → Filter "video:batchAsyncGenerateVideoStartImage" → Payload → clientContext.recaptchaToken</p>
                    <input
                        type="text"
                        value={recaptchaToken}
                        onChange={(e) => setRecaptchaToken(e.target.value)}
                        placeholder="0cAFcWeA..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                {/* Test Result Display */}
                {testResult && (
                    <div className={`p-4 rounded-lg ${testResult.ready ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                        <p className="font-bold mb-2">{testResult.message}</p>
                        {testResult.issues && testResult.issues.length > 0 && (
                            <ul className="text-sm space-y-1">
                                {testResult.issues.map((issue: string, i: number) => (
                                    <li key={i} className="text-red-400">• {issue}</li>
                                ))}
                            </ul>
                        )}
                        {testResult.ready && (
                            <p className="text-sm text-green-400 mt-2">✅ Ready to generate videos!</p>
                        )}
                    </div>
                )}
            </div>
            <div className="flex justify-between mt-6">
                <button
                    onClick={handleTestTokens}
                    disabled={isTesting}
                    className="px-6 py-2 font-semibold text-white rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
                >
                    {isTesting ? 'Testing...' : '🔍 Test Tokens'}
                </button>
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-lg bg-green-600 hover:bg-green-500">
                    Save & Close
                </button>
            </div>
        </Modal>
    );
};
