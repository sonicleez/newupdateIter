import React from 'react';
import { APP_NAME, PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from '../utils/constants';

interface HeaderProps {
    isSticky: boolean;
    onApiKeyClick: () => void;
    onSave: () => void;
    onOpen: () => void;
    onDownloadAll: () => void;
    canDownload: boolean;
    isContinuityMode: boolean;
    toggleContinuityMode: () => void;
    onGenyuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    isSticky,
    onApiKeyClick,
    onSave,
    onOpen,
    onDownloadAll,
    canDownload,
    isContinuityMode,
    toggleContinuityMode,
    onGenyuClick
}) => (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isSticky ? 'bg-black/50 backdrop-blur-sm shadow-lg' : 'bg-transparent'}`}>
        <div className="container mx-auto px-6 py-3 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">{APP_NAME}</h1>

            <div className="flex items-center space-x-4">
                {/* Continuity Toggle */}
                <div className="flex items-center space-x-2 bg-gray-800/80 px-3 py-1.5 rounded-full border border-gray-600" title="Khi bật: AI sẽ nhìn thấy ảnh của cảnh trước để vẽ cảnh sau giống bối cảnh/ánh sáng.">
                    <span className="text-xs font-semibold text-gray-300">Khóa Bối Cảnh (Continuity):</span>
                    <button
                        onClick={toggleContinuityMode}
                        className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${isContinuityMode ? 'bg-brand-orange' : 'bg-gray-600'}`}
                    >
                        <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${isContinuityMode ? 'translate-x-5' : ''}`}></div>
                    </button>
                </div>

                <div className="flex items-center space-x-2 md:space-x-4">
                    <button onClick={onSave} className="px-3 py-2 text-xs md:text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors">Lưu (Ctrl+S)</button>
                    <button onClick={onOpen} className="px-3 py-2 text-xs md:text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors">Mở (Ctrl+O)</button>
                    {canDownload && <button onClick={onDownloadAll} className={`px-3 py-2 text-xs md:text-sm font-semibold text-white rounded-lg bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all`}>Tải Full ZIP</button>}
                    <button onClick={onGenyuClick} className="px-3 py-2 text-xs md:text-sm font-semibold text-white bg-purple-600/50 rounded-lg hover:bg-purple-600/70 transition-colors">Genyu API</button>
                    <button onClick={onApiKeyClick} className="px-3 py-2 text-xs md:text-sm font-semibold text-white bg-white/10 rounded-lg hover:bg-white/20 transition-colors">API Key</button>
                </div>
            </div>
        </div>
    </header>
);
