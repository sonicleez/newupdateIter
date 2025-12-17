import React, { useState } from 'react';
import Spinner from './Spinner';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  validateCode: (code: string) => boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, validateCode }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) {
      setError('Please enter an access code.');
      return;
    }
    setIsLoading(true);
    // Simulate a small delay for better UX
    setTimeout(() => {
      const isValid = validateCode(code.trim());
      if (isValid) {
        onLoginSuccess();
      } else {
        setError('Invalid access code. Please try again.');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-black/30 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20">
        <div className="text-center mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
            </svg>
            <h1 className="text-3xl font-bold mt-4">Gemini Character Creator</h1>
            <p className="text-gray-300 mt-2">Enter your access code to begin.</p>
        </div>
        
        <form onSubmit={handleCodeSubmit}>
          <div className="mb-4">
            <label htmlFor="access-code" className="sr-only">Access Code</label>
            <input
              id="access-code"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access Code"
              className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
          {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}
          <button
            type="submit"
            disabled={isLoading || !code.trim()}
            className="w-full flex justify-center items-center gap-2 bg-blue-500/50 hover:bg-blue-500/70 border border-blue-400/50 disabled:bg-gray-500/50 disabled:border-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300"
          >
            {isLoading ? <Spinner /> : 'Unlock Creator'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
