import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { ProjectState, Character, Scene, CharacterProp } from './types';
import { useHotkeys } from './hooks/useHotkeys';
import { saveProject, openProject } from './utils/fileUtils';
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";

// @ts-ignore
const JSZip = window.JSZip;
// @ts-ignore
const XLSX = window.XLSX;


const APP_NAME = "Genyu.IO Creator";
// Theme: Red (Valorant style) #FF4655, Orange #FF9F43
const PRIMARY_GRADIENT = "from-[#FF4655] to-[#FF9F43]";
const PRIMARY_GRADIENT_HOVER = "from-[#E03545] to-[#E58E35]";

const slugify = (text: string): string => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- RETRY HELPER ---
async function callApiWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
    let currentDelay = initialDelay;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error: any) {
            // Check for Rate Limit (429) or Service Overload (503)
            const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('quota');
            const isServerOverload = error.status === 503;
            const isPermission = error.status === 403;

            // Don't retry on permission denied, as it likely won't succeed
            if (isPermission) throw error;

            if ((isRateLimit || isServerOverload) && i < retries - 1) {
                console.warn(`API Error ${error.status || 'Quota'}. Retrying in ${currentDelay}ms... (Attempt ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay *= 2; // Exponential backoff
                continue;
            }
            throw error;
        }
    }
    throw new Error("Max retries exceeded");
}

// --- DEFINED GLOBAL STYLES ---
const GLOBAL_STYLES = [
    { 
        value: 'cinematic-realistic', 
        label: 'Cinematic Realistic (Phim điện ảnh)', 
        prompt: 'Cinematic movie screengrab, shot on Arri Alexa, photorealistic, 8k, highly detailed texture, dramatic lighting, shallow depth of field, color graded, film grain.' 
    },
    { 
        value: '3d-pixar', 
        label: '3D Animation (Pixar/Disney)', 
        prompt: '3D render style, Pixar animation style, octane render, unreal engine 5, cute, vibrant lighting, soft smooth textures, expressive, volumetric lighting, masterpiece.' 
    },
    { 
        value: 'anime-makoto', 
        label: 'Anime (Makoto Shinkai Style)', 
        prompt: 'Anime style, Makoto Shinkai art style, high quality 2D animation, beautiful sky, detailed background, vibrant colors, emotional atmosphere, cell shading.' 
    },
    { 
        value: 'vintage-film', 
        label: 'Vintage 1980s Film (Retro)', 
        prompt: '1980s vintage movie look, film grain, retro aesthetic, warm tones, soft focus, kodak portra 400, nostalgia atmosphere.' 
    },
    { 
        value: 'cyberpunk', 
        label: 'Cyberpunk / Sci-Fi', 
        prompt: 'Cyberpunk aesthetic, neon lighting, dark atmosphere, futuristic, high contrast, wet streets, technological details, blade runner style.' 
    },
    { 
        value: 'watercolor', 
        label: 'Watercolor / Artistic', 
        prompt: 'Watercolor painting style, soft edges, artistic, painterly, dreamy atmosphere, paper texture, pastel colors.' 
    },
    { 
        value: 'dark-fantasy', 
        label: 'Dark Fantasy (Game Style)', 
        prompt: 'Dark fantasy art, elden ring style, gritty, atmospheric, ominous lighting, detailed armor and textures, epic scale, oil painting aesthetic.' 
    }
];

const IMAGE_MODELS = [
    { value: 'gemini-2.5-flash-image', label: 'Google Nano Banana (Fast)' },
    { value: 'gemini-3-pro-image-preview', label: 'Google Nano Banana Pro (High Quality)' },
];

const INITIAL_STATE: ProjectState = {
    projectName: '',
    stylePrompt: 'cinematic-realistic', // Default to value
    imageModel: 'gemini-2.5-flash-image',
    aspectRatio: '16:9',
    scriptLanguage: 'vietnamese',
    characters: Array.from({ length: 3 }).map(() => ({
        id: generateId(),
        name: '',
        description: '',
        masterImage: null,
        faceImage: null,
        bodyImage: null,
        props: [
            { id: generateId(), name: '', image: null },
            { id: generateId(), name: '', image: null },
            { id: generateId(), name: '', image: null },
        ],
        isDefault: false,
        isAnalyzing: false,
    })),
    scenes: [],
};

const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 (Landscape - Cinematic)' },
    { value: '9:16', label: '9:16 (Portrait - Mobile/Reels)' },
    { value: '1:1', label: '1:1 (Square - Social)' },
    { value: '4:3', label: '4:3 (Classic TV)' },
    { value: '3:4', label: '3:4 (Portrait)' },
];

const CHARACTER_STYLES = [
    { value: 'pixar', label: '3D Animation (Pixar/Disney Style)' },
    { value: 'anime', label: 'Anime / Manga' },
    { value: 'cinematic', label: 'Realistic Cinematic' },
    { value: 'comic', label: 'American Comic Book' },
    { value: 'fantasy', label: 'Digital Fantasy Art' },
    { value: 'clay', label: 'Claymation / Stop Motion' },
];

// --- Helper Functions ---
const downloadImage = (base64Image: string, filename: string) => {
    if (!base64Image) return;
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- Sub-components ---

interface HeaderProps {
  isSticky: boolean;
  onApiKeyClick: () => void;
  onSave: () => void;
  onOpen: () => void;
  onDownloadAll: () => void;
  canDownload: boolean;
  isContinuityMode: boolean;
  toggleContinuityMode: () => void;
}
const Header: React.FC<HeaderProps> = ({ isSticky, onApiKeyClick, onSave, onOpen, onDownloadAll, canDownload, isContinuityMode, toggleContinuityMode }) => (
  <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b border-[#402020] ${isSticky ? 'bg-[#1C1214]/90 backdrop-blur-md shadow-[0_4px_20px_rgba(255,70,85,0.1)]' : 'bg-transparent'}`}>
    <div className="container mx-auto px-6 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2">
          {/* Logo Placeholder - Gaming Red style */}
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF4655] to-[#FF9F43] flex items-center justify-center text-white font-bold font-heading shadow-[0_0_10px_rgba(255,70,85,0.4)]">G</div>
          <h1 className="text-xl md:text-2xl font-bold text-white font-heading tracking-tight">{APP_NAME}</h1>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Continuity Toggle */}
        <div className="flex items-center space-x-2 bg-[#2D1E21] px-3 py-1.5 rounded-full border border-[#402020]" title="Khi bật: AI sẽ nhìn thấy ảnh của cảnh trước để vẽ cảnh sau giống bối cảnh/ánh sáng.">
            <span className="text-xs font-semibold text-gray-300">Khóa Bối Cảnh (Continuity):</span>
            <button 
                onClick={toggleContinuityMode}
                className={`w-10 h-5 flex items-center rounded-full p-1 duration-300 ease-in-out ${isContinuityMode ? 'bg-[#FF4655]' : 'bg-gray-700'}`}
            >
                <div className={`bg-white w-3 h-3 rounded-full shadow-md transform duration-300 ease-in-out ${isContinuityMode ? 'translate-x-5' : ''}`}></div>
            </button>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
            <button onClick={onSave} className="px-4 py-2 text-xs md:text-sm font-semibold text-white bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-colors">Lưu (Ctrl+S)</button>
            <button onClick={onOpen} className="px-4 py-2 text-xs md:text-sm font-semibold text-white bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-colors">Mở (Ctrl+O)</button>
            {canDownload && <button onClick={onDownloadAll} className={`px-4 py-2 text-xs md:text-sm font-bold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all shadow-[0_0_15px_rgba(255,70,85,0.4)]`}>Tải Full ZIP</button>}
            <button onClick={onApiKeyClick} className="px-4 py-2 text-xs md:text-sm font-semibold text-white bg-white/5 rounded-full hover:bg-white/10 border border-white/10 transition-colors">API Key</button>
        </div>
      </div>
    </div>
  </header>
);

interface ProjectNameInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
const ProjectNameInput: React.FC<ProjectNameInputProps> = ({ value, onChange }) => (
    <div className="relative w-full max-w-2xl mx-auto my-8">
        <input
            type="text"
            value={value}
            onChange={onChange}
            placeholder=" "
            className={`peer w-full bg-transparent text-center text-4xl md:text-5xl font-extrabold outline-none border-none p-2 transition-all duration-300 font-heading tracking-wide ${value ? `bg-clip-text text-transparent bg-gradient-to-r ${PRIMARY_GRADIENT}` : 'text-gray-600'}`}
            style={{ textTransform: 'uppercase' }}
        />
        <label className={`absolute left-0 -top-3.5 w-full text-center text-gray-500 text-sm transition-all duration-300 pointer-events-none 
            peer-placeholder-shown:text-xl peer-placeholder-shown:top-2 peer-placeholder-shown:text-gray-600
            peer-focus:-top-3.5 peer-focus:text-sm peer-focus:text-[#FF4655]`}>
            NHẬP TÊN DỰ ÁN CỦA BẠN
        </label>
    </div>
);

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title: string;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-[#1C1214]/90 flex items-center justify-center z-50 backdrop-blur-md" onClick={onClose}>
            <div className="bg-[#2D1E21] border border-[#402020] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-md m-4 p-8 relative animate-fade-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4 text-white font-heading">{title}</h2>
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-2xl bg-white/5 w-8 h-8 rounded-full flex items-center justify-center">&times;</button>
                {children}
            </div>
        </div>
    );
};

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    setApiKey: (key: string) => void;
}
const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, apiKey, setApiKey }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Quản lý API Key">
        <p className="text-gray-400 mb-4">Nhập Gemini API key của bạn để sử dụng chức năng tạo ảnh.</p>
        <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API Key"
            className="w-full px-4 py-3 bg-[#1C1214] border border-[#402020] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#FF4655] placeholder-gray-600"
        />
        <div className="flex justify-end mt-6">
            <button onClick={onClose} className={`px-6 py-2.5 font-bold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(255,70,85,0.3)]`}>Lưu & Đóng</button>
        </div>
    </Modal>
);

interface CoffeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
}
const CoffeeModal: React.FC<CoffeeModalProps> = ({ isOpen, onClose }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Cho @Mrsonic30 1 follow ">
         <p className="text-gray-400 mb-4 text-center">Nếu bạn thấy những chia sẻ của mình hữu ích!</p>
        <div className="flex flex-col items-center">
            <img src="N/a images" alt="QR Code for coffee" className="w-64 h-64 rounded-2xl border-2 border-[#402020]"/>
            <p className="text-xs text-gray-500 mt-4">Đổi nội dung bong bóng này tùy theo nhu cầu của bạn.</p>
        </div>
    </Modal>
);

interface CoffeeButtonProps {
    onClick: () => void;
}
const CoffeeButton: React.FC<CoffeeButtonProps> = ({ onClick }) => (
    <button onClick={onClick} className={`fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl shadow-[0_0_20px_rgba(255,70,85,0.4)] transition-transform hover:scale-110 bg-gradient-to-br ${PRIMARY_GRADIENT}`}>
        ☕
    </button>
);

// --- Character Generator Modal ---
interface CharacterGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (image: string) => void;
    apiKey: string;
    model: string;
}

const CharacterGeneratorModal: React.FC<CharacterGeneratorModalProps> = ({ isOpen, onClose, onSave, apiKey, model }) => {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('pixar');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(model); // Local state for control

    useEffect(() => {
        if (isOpen) {
            setPrompt('');
            setGeneratedImage(null);
            setError(null);
            setSelectedModel(model); // Sync with prop on open
        }
    }, [isOpen, model]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        if (!apiKey) {
            setError("Vui lòng nhập API Key trước.");
            return;
        }

        setIsGenerating(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const styleLabel = CHARACTER_STYLES.find(s => s.value === style)?.label || style;
            
            const fullPrompt = `
            Design a character sheet.
            Subject: ${prompt}
            Style: ${styleLabel}
            Background: Neutral, simple studio background (white or grey) for easy cutout.
            Framing: Full body shot, clear pose.
            Quality: 8k, highly detailed, masterpiece.
            `;

            // Use retry helper
            const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: selectedModel, // Use local selection
                contents: { parts: [{ text: fullPrompt }] },
                config: { 
                    imageConfig: { aspectRatio: "1:1" }
                }
            }));

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                setGeneratedImage(imageUrl);
            } else {
                setError("AI không trả về ảnh. Thử lại.");
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Lỗi tạo ảnh.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Tạo Nhân Vật Mới (AI Creator)">
            <div className="space-y-4">
                <div className="flex justify-end items-center space-x-2">
                     <span className="text-xs text-gray-400">Model:</span>
                     <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-[#1C1214] border border-[#402020] rounded-lg text-xs text-white p-1.5 focus:outline-none focus:border-[#FF4655]"
                    >
                        {IMAGE_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
                
                {/* 1. Describe */}
                <div>
                    <label className="block text-sm font-bold text-gray-300 mb-1">1. Mô tả nhân vật của bạn</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="VD: Một chú chó đốm dễ thương, đeo vòng cổ đỏ, mắt to tròn..."
                        rows={3}
                        className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-white p-3 focus:outline-none focus:ring-2 focus:ring-[#FF4655]"
                    />
                </div>

                {/* 2. Configure */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Phong cách (Style)</label>
                        <select 
                            value={style}
                            onChange={(e) => setStyle(e.target.value)}
                            className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-white p-2 focus:outline-none focus:ring-2 focus:ring-[#FF4655]"
                        >
                            {CHARACTER_STYLES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-bold text-gray-300 mb-1">Tỷ lệ (Ratio)</label>
                         <div className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-gray-500 p-2 cursor-not-allowed">
                             Square (1:1) - Default
                         </div>
                    </div>
                </div>

                {/* Image Display Area */}
                <div className="w-full aspect-square bg-black rounded-2xl border-2 border-dashed border-[#402020] flex items-center justify-center overflow-hidden relative">
                    {isGenerating ? (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF9F43] mb-2"></div>
                            <span className="text-[#FF9F43] text-sm animate-pulse">AI đang vẽ...</span>
                        </div>
                    ) : generatedImage ? (
                        <img src={generatedImage} alt="Generated Character" className="w-full h-full object-contain" />
                    ) : (
                        <span className="text-gray-600 text-sm">Ảnh sẽ hiện ở đây</span>
                    )}
                </div>

                {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                {/* Actions */}
                <div className="flex space-x-3 pt-2">
                    {!generatedImage ? (
                         <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt}
                            className={`w-full py-3 font-bold text-white rounded-full bg-[#FF4655] hover:bg-[#E03545] transition-all disabled:opacity-50 shadow-lg`}
                        >
                            {isGenerating ? 'Đang tạo...' : 'Tạo Nhân Vật'}
                        </button>
                    ) : (
                        <>
                             <button 
                                onClick={handleGenerate}
                                className="flex-1 py-3 font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors border border-gray-600"
                            >
                                Thử lại
                            </button>
                            <button 
                                onClick={() => { onSave(generatedImage); onClose(); }}
                                className={`flex-[2] py-3 font-bold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all shadow-lg transform hover:scale-105`}
                            >
                                Dùng ảnh này & Phân tích
                            </button>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// --- Script Generator Modal ---
interface ScriptGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (idea: string, count: number) => Promise<void>;
    isGenerating: boolean;
}

const ScriptGeneratorModal: React.FC<ScriptGeneratorModalProps> = ({ isOpen, onClose, onGenerate, isGenerating }) => {
    const [idea, setIdea] = useState('');
    const [sceneCount, setSceneCount] = useState(5);

    const handleSubmit = async () => {
        if (!idea.trim()) return alert("Vui lòng nhập ý tưởng.");
        await onGenerate(idea, sceneCount);
        setIdea(''); // Clear after success if needed, or keep
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Viết Kịch Bản AI - Cinematic Pro">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Ý tưởng câu chuyện</label>
                    <textarea 
                        value={idea}
                        onChange={(e) => setIdea(e.target.value)}
                        placeholder="VD: Một cuộc rượt đuổi nghẹt thở dưới mưa neon, nhân vật chính bị thương..."
                        rows={5}
                        className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-white p-3 focus:outline-none focus:ring-2 focus:ring-[#FF4655]"
                    />
                    <p className="text-xs text-gray-500 mt-1">AI sẽ tính toán Blocking (vị trí đứng), Góc máy (OTS, Low angle) và Khớp nối bối cảnh.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Số lượng phân cảnh ước lượng</label>
                    <input 
                        type="number"
                        min={1}
                        max={50}
                        value={sceneCount}
                        onChange={(e) => setSceneCount(parseInt(e.target.value))}
                        className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-white p-2 focus:outline-none focus:ring-2 focus:ring-[#FF4655]"
                    />
                </div>
                <div className="flex justify-end pt-2">
                    <button 
                        onClick={handleSubmit} 
                        disabled={isGenerating}
                        className={`w-full py-3 font-semibold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all disabled:opacity-50 flex justify-center items-center shadow-[0_0_15px_rgba(255,70,85,0.3)]`}
                    >
                        {isGenerating ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đạo diễn đang phân cảnh...
                            </>
                        ) : 'Tạo Kịch Bản Điện Ảnh'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

// --- Image Editor Modal ---
interface ImageEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    image: string | null;
    onSave: (newImage: string) => void;
    apiKey: string;
    model: string;
}
const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ isOpen, onClose, image, onSave, apiKey, model }) => {
    const [editPrompt, setEditPrompt] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(model); // Local selection

    useEffect(() => {
        if (isOpen) {
            setEditPrompt('');
            setError(null);
            setIsEditing(false);
            setSelectedModel(model); // Sync
        }
    }, [isOpen, model]);

    if (!isOpen || !image) return null;

    const handleEdit = async () => {
        if (!editPrompt.trim()) return;
        if (!apiKey) {
            setError("Missing API Key");
            return;
        }

        setIsEditing(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const [header, data] = image.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

            const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: selectedModel, // Use local model
                contents: {
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: `Edit this image: ${editPrompt}. Maintain the core composition and identity, only applying the requested changes.` }
                    ]
                },
                config: { 
                    imageConfig: {} 
                }
            }));

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                onSave(imageUrl);
                onClose();
            } else {
                setError("AI không trả về ảnh. Thử lại với prompt khác.");
            }
        } catch (err) {
            console.error("Edit failed", err);
            setError("Chỉnh sửa thất bại. Kiểm tra API Key hoặc thử lại.");
        } finally {
            setIsEditing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nano Banana Editor (Sửa ảnh)">
            <div className="flex flex-col space-y-4">
                 <div className="flex justify-end items-center space-x-2">
                     <span className="text-xs text-gray-400">Model:</span>
                     <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="bg-[#1C1214] border border-[#402020] rounded-lg text-xs text-white p-1 focus:outline-none focus:border-[#FF4655]"
                    >
                        {IMAGE_MODELS.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full aspect-square bg-black/50 rounded flex items-center justify-center overflow-hidden">
                    <img src={image} alt="Target" className="max-w-full max-h-full object-contain" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bạn muốn sửa gì?</label>
                    <textarea 
                        value={editPrompt}
                        onChange={(e) => setEditPrompt(e.target.value)}
                        placeholder="VD: Đổi màu tóc thành đỏ, thêm vết sẹo trên má, làm quần áo cũ hơn..."
                        rows={3}
                        className="w-full bg-[#1C1214] border border-[#402020] rounded-xl text-white p-2 focus:outline-none focus:ring-2 focus:ring-[#FF4655]"
                    />
                </div>
                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex justify-end pt-2">
                     <button 
                        onClick={handleEdit} 
                        disabled={isEditing || !editPrompt}
                        className={`w-full py-2 font-semibold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all disabled:opacity-50`}
                    >
                        {isEditing ? 'AI đang sửa...' : 'Thực hiện chỉnh sửa'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// --- New Components ---
const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h2 className="text-3xl font-bold font-heading text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-[#FF4655] to-[#FF9F43]">{children}</h2>
);

interface SingleImageSlotProps {
    label: string;
    image: string | null;
    onUpload: (base64: string) => void;
    onDelete: () => void;
    onEdit?: () => void;
    onGenerate?: () => void; // New prop for AI Generation
    aspect?: 'square' | 'portrait';
    subLabel?: React.ReactNode;
    isProcessing?: boolean;
}

const SingleImageSlot: React.FC<SingleImageSlotProps> = ({ label, image, onUpload, onDelete, onEdit, onGenerate, aspect = 'square', subLabel, isProcessing }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => onUpload(ev.target?.result as string);
        reader.readAsDataURL(file);
        e.target.value = ''; // reset
    };

    return (
        <div className="flex flex-col space-y-1 w-full">
            <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400">{label}</span>
                {onGenerate && !image && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onGenerate(); }}
                        className="text-[10px] bg-[#FF4655] hover:bg-[#E03545] text-white px-2 py-0.5 rounded flex items-center space-x-1 transition-colors"
                    >
                        <span>✨ Tạo bằng AI</span>
                    </button>
                )}
            </div>
            <div 
                className={`relative border-2 border-dashed border-[#402020] rounded-2xl hover:border-[#FF4655] transition-colors bg-[#1C1214]/50 flex flex-col items-center justify-center cursor-pointer group overflow-hidden w-full ${aspect === 'portrait' ? 'aspect-[3/4]' : 'aspect-square'}`}
                onClick={() => !image && fileInputRef.current?.click()}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                
                {isProcessing ? (
                     <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center flex-col">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9F43] mb-2"></div>
                        <span className="text-[10px] text-[#FF9F43]">AI Creating...</span>
                    </div>
                ) : image ? (
                    <>
                        <img src={image} alt="slot" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity flex-col space-y-2 p-2">
                             <div className="flex space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-1.5 bg-[#FF4655] hover:bg-[#E03545] rounded text-white text-xs">Up lại</button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white text-xs">Xóa</button>
                             </div>
                             {onEdit && (
                                 <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-full p-1.5 bg-[#FF9F43] hover:bg-[#E58E35] rounded text-black text-xs font-bold flex items-center justify-center">
                                     ✏️ Sửa ảnh (AI)
                                 </button>
                             )}
                        </div>
                    </>
                ) : (
                    <div className="text-center p-2">
                        <span className="text-2xl text-gray-600">+</span>
                        {subLabel && <div className="text-[10px] text-gray-500 mt-1">{subLabel}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};


interface CharacterCardProps {
    character: Character;
    index: number;
    updateCharacter: (id: string, updates: Partial<Character>) => void;
    setDefault: (id: string) => void;
    onMasterUpload: (id: string, image: string) => void;
    onEditImage: (id: string, image: string, type: 'master' | 'face' | 'body' | 'prop', propIndex?: number) => void;
    onOpenCharGen: (id: string) => void; // New prop
}
const CharacterCard: React.FC<CharacterCardProps> = ({ character, index, updateCharacter, setDefault, onMasterUpload, onEditImage, onOpenCharGen }) => {
    
    const updateProp = (propIndex: number, field: keyof CharacterProp, value: string | null) => {
        const newProps = [...character.props];
        newProps[propIndex] = { ...newProps[propIndex], [field]: value };
        updateCharacter(character.id, { props: newProps });
    };

    return (
        <div className="bg-[#2D1E21] p-6 rounded-3xl border border-[#402020] hover:border-[#FF4655] transition-all duration-300 relative overflow-hidden flex flex-col h-full shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(255,70,85,0.2)] group">
             {character.isAnalyzing && !character.masterImage && (
                <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center rounded-3xl">
                    <div className="bg-[#1C1214] p-4 rounded-xl shadow-xl flex items-center space-x-3 border border-[#FF4655]/50">
                        <svg className="animate-spin h-6 w-6 text-[#FF4655]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-[#FF4655] font-medium animate-pulse">Analyzing...</span>
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <div className="flex-1 mr-2 relative">
                     <input 
                        type="text" 
                        placeholder={`Character Name ${index + 1}`} 
                        value={character.name}
                        onChange={e => updateCharacter(character.id, { name: e.target.value })}
                        className="w-full bg-transparent text-xl font-bold font-heading text-white border-b border-[#402020] focus:border-[#FF4655] outline-none pb-1 placeholder-gray-600 transition-colors"
                    />
                </div>
                <button onClick={() => setDefault(character.id)} title="Đặt làm nhân vật mặc định">
                    <svg className={`w-6 h-6 transition-colors ${character.isDefault ? 'text-[#FF9F43]' : 'text-gray-600 hover:text-[#FF9F43]'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </button>
            </div>

            <textarea 
                placeholder="Mô tả ngắn gọn (VD: Tóc vàng, mắt xanh, áo khoác da...)" 
                value={character.description}
                onChange={e => updateCharacter(character.id, { description: e.target.value })}
                rows={2}
                className="w-full bg-[#1C1214]/50 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4655] text-sm mb-4 border border-transparent focus:border-[#FF4655]"
            />
            
            {/* MASTER UPLOAD SECTION */}
            <div className="mb-4">
                 <SingleImageSlot 
                    label="Ảnh Gốc (Master Reference)" 
                    image={character.masterImage} 
                    onUpload={(img) => onMasterUpload(character.id, img)} 
                    onDelete={() => updateCharacter(character.id, { masterImage: null })}
                    onEdit={character.masterImage ? () => onEditImage(character.id, character.masterImage!, 'master') : undefined}
                    onGenerate={() => onOpenCharGen(character.id)}
                    aspect="square"
                    subLabel="Upload hoặc Tạo AI để tách Face/Body"
                    isProcessing={character.isAnalyzing}
                />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <SingleImageSlot 
                    label="Gương mặt (Face ID)" 
                    image={character.faceImage} 
                    onUpload={(img) => updateCharacter(character.id, { faceImage: img })} 
                    onDelete={() => updateCharacter(character.id, { faceImage: null })}
                    onEdit={character.faceImage ? () => onEditImage(character.id, character.faceImage!, 'face') : undefined}
                    subLabel="Chỉ khuôn mặt"
                />
                <SingleImageSlot 
                    label="Dáng/Trang phục (Body)" 
                    image={character.bodyImage} 
                    onUpload={(img) => updateCharacter(character.id, { bodyImage: img })} 
                    onDelete={() => updateCharacter(character.id, { bodyImage: null })}
                    onEdit={character.bodyImage ? () => onEditImage(character.id, character.bodyImage!, 'body') : undefined}
                    aspect="portrait"
                    subLabel="Toàn thân/Thiết kế"
                />
            </div>

            <div className="mt-auto">
                <span className="text-xs font-semibold text-gray-400 block mb-2">Đạo cụ (Props) & Tên gọi (Trigger Word)</span>
                <div className="grid grid-cols-3 gap-2">
                    {character.props.map((prop, i) => (
                        <div key={prop.id} className="flex flex-col space-y-1">
                            <SingleImageSlot 
                                label=""
                                image={prop.image}
                                onUpload={(img) => updateProp(i, 'image', img)}
                                onDelete={() => updateProp(i, 'image', null)}
                                onEdit={prop.image ? () => onEditImage(character.id, prop.image!, 'prop', i) : undefined}
                            />
                            <input 
                                type="text" 
                                placeholder="Tên (VD: Kiếm)"
                                value={prop.name}
                                onChange={(e) => updateProp(i, 'name', e.target.value)}
                                className="w-full bg-[#1C1214] border border-[#402020] rounded px-1 py-0.5 text-[10px] text-center text-white focus:border-[#FF4655] outline-none"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- Added Missing Components ---

const Tooltip: React.FC<{ text: string }> = ({ text }) => (
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-black text-white text-xs rounded z-50 pointer-events-none text-center shadow-lg border border-gray-700">
        {text}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
    </div>
);

interface ImageViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    scenes: Scene[];
    currentIndex: number;
    onNavigate: (index: number) => void;
    onRegenerate: (sceneId: string, prompt?: string) => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, scenes, currentIndex, onNavigate, onRegenerate }) => {
    const [refinePrompt, setRefinePrompt] = useState('');
    const currentScene = scenes[currentIndex];

    useEffect(() => {
        if (isOpen) setRefinePrompt('');
    }, [isOpen, currentIndex]);

    if (!isOpen || !currentScene) return null;

    const handlePrev = () => currentIndex > 0 && onNavigate(currentIndex - 1);
    const handleNext = () => currentIndex < scenes.length - 1 && onNavigate(currentIndex + 1);

    return (
        <div className="fixed inset-0 bg-[#1C1214]/95 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
             <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors text-4xl z-50">&times;</button>
             
             <div className="w-full h-full max-w-7xl flex flex-col md:flex-row gap-4" onClick={e => e.stopPropagation()}>
                {/* Image Area */}
                <div className="flex-1 flex items-center justify-center relative bg-[#2D1E21] rounded-3xl overflow-hidden border border-[#402020]">
                    {currentScene.generatedImage ? (
                        <img src={currentScene.generatedImage} className="max-w-full max-h-full object-contain shadow-2xl" alt={`Scene ${currentScene.sceneNumber}`} />
                    ) : (
                        <div className="text-gray-500 flex flex-col items-center">
                            <span className="text-4xl mb-2">📷</span>
                            <span>Chưa có ảnh</span>
                        </div>
                    )}

                    {/* Navigation */}
                    <button 
                        onClick={handlePrev} 
                        disabled={currentIndex === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full disabled:opacity-0 transition-all backdrop-blur-md border border-white/5"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button 
                        onClick={handleNext} 
                        disabled={currentIndex === scenes.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full disabled:opacity-0 transition-all backdrop-blur-md border border-white/5"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 rounded-full text-white text-sm backdrop-blur-sm border border-white/10">
                        {currentIndex + 1} / {scenes.length}
                    </div>
                </div>

                {/* Info Sidebar */}
                <div className="w-full md:w-80 bg-[#2D1E21] rounded-3xl p-6 flex flex-col border border-[#402020] overflow-y-auto">
                    <h3 className="text-xl font-bold font-heading text-white mb-1">{currentScene.sceneNumber}: {currentScene.promptName || 'Untitled'}</h3>
                    <div className="text-xs text-gray-400 mb-4 font-mono">{currentScene.id}</div>
                    
                    <div className="space-y-4 flex-1">
                        <div>
                            <label className="text-xs font-bold text-[#FF4655] uppercase">Bối cảnh</label>
                            <p className="text-sm text-gray-200 mt-1">{currentScene.contextDescription || 'Chưa có mô tả'}</p>
                        </div>
                         <div>
                            <label className="text-xs font-bold text-[#FF9F43] uppercase">Script (Viet)</label>
                            <p className="text-sm text-gray-300 italic mt-1">{currentScene.vietnamese || '...'}</p>
                        </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-[#402020]">
                        <label className="text-xs font-bold text-[#FF4655] uppercase mb-2 block">AI Refinement (Sửa ảnh)</label>
                        <textarea 
                            value={refinePrompt} 
                            onChange={(e) => setRefinePrompt(e.target.value)}
                            placeholder="VD: Làm cho trời tối hơn, thêm mưa..."
                            rows={3}
                            className="w-full bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-sm text-white focus:border-[#FF4655] mb-3"
                        />
                        <button 
                            onClick={() => onRegenerate(currentScene.id, refinePrompt)}
                            disabled={!currentScene.generatedImage}
                            className="w-full py-2 bg-[#FF4655] hover:bg-[#E03545] text-white font-bold rounded-full shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ✨ Sửa ảnh này
                        </button>
                         <button 
                            onClick={() => onRegenerate(currentScene.id)}
                            className="w-full mt-2 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold rounded-full transition-colors text-sm"
                        >
                            🔄 Tạo lại hoàn toàn
                        </button>
                    </div>
                </div>
             </div>
        </div>
    );
};

interface SceneRowProps {
    scene: Scene;
    index: number;
    characters: Character[];
    updateScene: (id: string, updates: Partial<Scene>) => void;
    removeScene: (id: string) => void;
    generateImage: () => void;
    openImageViewer: () => void;
}

const SceneRow: React.FC<SceneRowProps> = ({ scene, index, characters, updateScene, removeScene, generateImage, openImageViewer }) => {
    return (
        <div className="grid md:grid-cols-12 gap-4 items-start bg-[#2D1E21]/80 p-6 rounded-3xl border border-[#402020] hover:border-[#FF4655] transition-all group/row shadow-sm hover:shadow-[0_4px_30px_rgba(255,70,85,0.15)]">
             {/* Scene Number */}
             <div className="md:col-span-1 flex flex-col items-center space-y-2">
                 <div className="bg-[#402020] rounded-full w-8 h-8 flex items-center justify-center font-bold text-white text-sm">{index + 1}</div>
                 <input 
                    type="text" 
                    value={scene.sceneNumber} 
                    onChange={(e) => updateScene(scene.id, { sceneNumber: e.target.value })}
                    className="w-full bg-[#1C1214] border border-[#402020] rounded-lg p-1 text-center font-bold text-white focus:border-[#FF4655] text-sm"
                    placeholder="SC.."
                 />
                 <button onClick={() => removeScene(scene.id)} className="text-red-500 hover:text-red-400 text-xs opacity-0 group-hover/row:opacity-100 transition-opacity">Xóa</button>
             </div>

             {/* Script */}
             <div className="md:col-span-2 space-y-2">
                 <textarea 
                    value={scene.language1}
                    onChange={(e) => updateScene(scene.id, { language1: e.target.value })}
                    placeholder="Script (Lang 1)..."
                    rows={3}
                    className="w-full bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-xs text-gray-300 focus:border-[#FF4655] resize-none"
                 />
                 <textarea 
                    value={scene.vietnamese}
                    onChange={(e) => updateScene(scene.id, { vietnamese: e.target.value })}
                    placeholder="Lời thoại (Việt)..."
                    rows={3}
                    className="w-full bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-xs text-white focus:border-[#FF4655] resize-none"
                 />
             </div>

             {/* Context */}
             <div className="md:col-span-2 space-y-2">
                 <input 
                    type="text"
                    value={scene.promptName}
                    onChange={(e) => updateScene(scene.id, { promptName: e.target.value })}
                    placeholder="Tên cảnh (VD: Rượt đuổi)"
                    className="w-full bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-xs font-bold text-white focus:border-[#FF4655]"
                 />
                 <textarea 
                    value={scene.contextDescription}
                    onChange={(e) => updateScene(scene.id, { contextDescription: e.target.value })}
                    placeholder="Mô tả bối cảnh để AI vẽ..."
                    rows={4}
                    className="w-full bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-xs text-white focus:border-[#FF4655] resize-none"
                 />
             </div>
             
             {/* Veo Prompt */}
             <div className="md:col-span-3 h-full">
                 <textarea 
                    value={scene.veoPrompt}
                    onChange={(e) => updateScene(scene.id, { veoPrompt: e.target.value })}
                    placeholder="(00:00-00:05) Prompt cho Google Veo..."
                    className="w-full h-[160px] bg-[#1C1214] border border-[#402020] rounded-xl p-2 text-[11px] text-[#FF9F43] focus:border-[#FF4655] font-mono resize-none leading-relaxed"
                 />
             </div>

             {/* Characters */}
             <div className="md:col-span-1 h-[160px] overflow-y-auto space-y-1 bg-[#1C1214]/50 p-2 rounded-xl border border-[#402020] custom-scrollbar">
                 {characters.map(char => (
                     <label key={char.id} className="flex items-center space-x-2 cursor-pointer hover:bg-[#402020] p-1 rounded-lg group/char transition-colors">
                         <div className="relative flex items-center">
                            <input 
                                type="checkbox" 
                                checked={scene.characterIds.includes(char.id)}
                                onChange={(e) => {
                                    const newIds = e.target.checked 
                                        ? [...scene.characterIds, char.id]
                                        : scene.characterIds.filter(id => id !== char.id);
                                    updateScene(scene.id, { characterIds: newIds });
                                }}
                                className="peer h-3 w-3 cursor-pointer appearance-none rounded border border-gray-600 bg-[#1C1214] checked:border-[#FF4655] checked:bg-[#FF4655] transition-all"
                            />
                            <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" viewBox="0 0 14 14" fill="none">
                                <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                         </div>
                         <span className="text-[10px] truncate text-gray-400 peer-checked:text-white group-hover/char:text-gray-200">{char.name || 'No Name'}</span>
                     </label>
                 ))}
             </div>

             {/* Image & Actions */}
             <div className="md:col-span-3 flex flex-col space-y-2">
                 <div 
                    className="relative w-full aspect-video bg-black rounded-2xl border border-[#402020] overflow-hidden group cursor-pointer hover:border-[#FF9F43] transition-colors"
                    onClick={() => scene.generatedImage && openImageViewer()}
                 >
                     {scene.isGenerating ? (
                         <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#2D1E21]/80 z-10">
                             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF9F43] mb-2"></div>
                             <span className="text-[10px] text-[#FF9F43] animate-pulse">Rendering...</span>
                         </div>
                     ) : scene.generatedImage ? (
                         <>
                            <img src={scene.generatedImage} alt="Generated" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold border border-white px-3 py-1 rounded-full backdrop-blur-sm">🔍 Phóng to</span>
                            </div>
                         </>
                     ) : (
                         <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs flex-col">
                             <span className="text-2xl mb-1">🖼️</span>
                             <span>Chưa có ảnh</span>
                         </div>
                     )}
                     
                     {scene.error && (
                         <div className="absolute inset-0 bg-red-900/90 flex items-center justify-center p-2 text-center">
                             <span className="text-white text-xs">{scene.error}</span>
                         </div>
                     )}
                 </div>
                 
                 <button 
                    onClick={generateImage}
                    disabled={scene.isGenerating}
                    className={`w-full py-2 font-bold text-xs rounded-full shadow-lg transition-all transform active:scale-95 flex items-center justify-center space-x-2
                        ${scene.generatedImage 
                            ? 'bg-gray-700 text-white hover:bg-gray-600' 
                            : 'bg-gradient-to-r from-[#FF4655] to-[#E03545] hover:from-[#E03545] hover:to-[#C02E3B] text-white'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                     {scene.generatedImage ? (
                         <><span>↻</span> <span>Tạo Lại</span></>
                     ) : (
                         <><span>✨</span> <span>Tạo Ảnh AI</span></>
                     )}
                 </button>
             </div>
        </div>
    );
};

const App: React.FC = () => {
    const [state, setState] = useState<ProjectState>(INITIAL_STATE);
    const [history, setHistory] = useState<{ past: ProjectState[], future: ProjectState[] }>({ past: [], future: [] });
    const [zoom, setZoom] = useState(1);
    const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [isCoffeeModalOpen, setCoffeeModalOpen] = useState(false);
    const [isScriptModalOpen, setScriptModalOpen] = useState(false);
    const [userApiKey, setUserApiKey] = useState('');
    const [isHeaderSticky, setHeaderSticky] = useState(false);
    const [isContinuityMode, setIsContinuityMode] = useState(true); 
    const mainContentRef = useRef<HTMLDivElement>(null);
    const [isImageViewerOpen, setImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [isScriptGenerating, setIsScriptGenerating] = useState(false);
    const [isVeoGenerating, setIsVeoGenerating] = useState(false);

    // Editing State
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<{ id: string, image: string, type: 'master' | 'face' | 'body' | 'prop', propIndex?: number } | null>(null);

    // Character Gen State
    const [charGenState, setCharGenState] = useState<{ isOpen: boolean; charId: string | null }>({ isOpen: false, charId: null });

    // --- State Management ---
    // ... existing updateStateAndRecord, handleProjectNameChange, etc ...
    const updateStateAndRecord = (updater: (prevState: ProjectState) => ProjectState) => {
        setState(prevState => {
            const newState = updater(prevState);
            setHistory(h => {
                const newPast = [...h.past, prevState];
                if (newPast.length > 50) newPast.shift();
                return { past: newPast, future: [] };
            });
            return newState;
        });
    };

    const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value.toUpperCase();
        updateStateAndRecord(s => ({ ...s, projectName: newName }));
    };

    const handleStylePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStyle = e.target.value;
        updateStateAndRecord(s => ({ ...s, stylePrompt: newStyle }));
    };

    const handleImageModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newModel = e.target.value;
        updateStateAndRecord(s => ({ ...s, imageModel: newModel }));
    };

    const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newRatio = e.target.value;
        updateStateAndRecord(s => ({ ...s, aspectRatio: newRatio }));
    };
    
    const handleScriptLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const lang = e.target.value as 'vietnamese' | 'language1';
        updateStateAndRecord(s => ({ ...s, scriptLanguage: lang }));
    };

    const undo = useCallback(() => {
        setHistory(h => {
            if (h.past.length === 0) return h;
            const previous = h.past[h.past.length - 1];
            const newPast = h.past.slice(0, h.past.length - 1);
            setState(previous);
            return { past: newPast, future: [state, ...h.future] };
        });
    }, [state]);

    const redo = useCallback(() => {
        setHistory(h => {
            if (h.future.length === 0) return h;
            const next = h.future[0];
            const newFuture = h.future.slice(1);
            setState(next);
            return { past: [...h.past, state], future: newFuture };
        });
    }, [state]);

    // --- File & Hotkey Handlers ---
    const handleSave = () => {
        const filename = state.projectName ? `${slugify(state.projectName)}.json` : 'untitled-project.json';
        saveProject(state, filename);
    };

    const handleOpen = () => {
        openProject((loadedState: ProjectState) => {
            updateStateAndRecord(() => loadedState);
        });
    };
    
    useHotkeys([
        { keys: 'ctrl+s', callback: handleSave },
        { keys: 'ctrl+o', callback: handleOpen },
        { keys: 'ctrl+z', callback: undo },
        { keys: 'ctrl+shift+z', callback: redo },
    ]);

    // --- Character Logic ---
    const updateCharacter = (id: string, updates: Partial<Character>) => {
        updateStateAndRecord(s => ({
            ...s,
            characters: s.characters.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    };
    
    // Auto Extraction Logic from Master Image
    const handleMasterImageUpload = async (id: string, image: string) => {
        const apiKey = userApiKey || process.env.API_KEY;
        updateCharacter(id, { masterImage: image, isAnalyzing: true });

        if (!apiKey) {
            // Still save the image even if no API key
            updateCharacter(id, { isAnalyzing: false });
            setApiKeyModalOpen(true);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const [header, data] = image.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            const model = state.imageModel || 'gemini-2.5-flash-image';

            // SERIAL EXECUTION TO PREVENT 429 ERRORS (One by one instead of Promise.all)
            
            // 1. Analyze and Extract Name/Desc (Existing Logic)
            const analyzePrompt = `
            Analyze this character. Return JSON:
            {"name": "Suggest Name", "description": "Vietnamese description physical features"}
            `;
            const analysisRes: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: analyzePrompt }] },
                config: { responseMimeType: "application/json" }
            }));

            // 2. Generate Face ID (Crop/Refine)
            // REMOVED responseModalities to fix 403 Forbidden on some models
            const facePrompt = "Generate a close-up portrait of this character's face. Keep facial features identical to the reference. Neutral background.";
            const faceRes: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: model,
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: facePrompt }] },
                config: { 
                    imageConfig: { aspectRatio: "1:1" }
                }
            }));

            // 3. Generate Body Sheet
            const bodyPrompt = "Generate a full-body character view on a neutral background. Keep clothing and body type identical to the reference.";
            const bodyRes: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: model,
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: bodyPrompt }] },
                config: { 
                    imageConfig: { aspectRatio: "9:16" } // Portrait for body
                }
            }));

            // Process Text
            let updates: Partial<Character> = { isAnalyzing: false };
            try {
                const text = analysisRes.text || '{}';
                const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
                updates.name = json.name;
                updates.description = json.description;
            } catch (e) { console.error("Text parse failed", e); }

            // Process Face
            const facePart = faceRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (facePart?.inlineData) {
                updates.faceImage = `data:${facePart.inlineData.mimeType};base64,${facePart.inlineData.data}`;
            }

            // Process Body
            const bodyPart = bodyRes.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (bodyPart?.inlineData) {
                updates.bodyImage = `data:${bodyPart.inlineData.mimeType};base64,${bodyPart.inlineData.data}`;
            }

            updateCharacter(id, updates);

        } catch (error) {
            console.error("Master extraction failed:", error);
            updateCharacter(id, { isAnalyzing: false });
            alert("Lỗi khi phân tích ảnh gốc (Có thể do hết quota hoặc lỗi mạng). Vui lòng thử lại sau.");
        }
    };
    
    const handleCharGenSave = (image: string) => {
        if (charGenState.charId) {
             // Use existing master upload logic to trigger analysis
             handleMasterImageUpload(charGenState.charId, image);
        }
    };

    // ... existing setDefaultCharacter, openEditor, handleEditorSave, addScene, updateScene, removeScene, handleScriptUpload, triggerFileUpload, handleGenerateScript, performImageGeneration, generateVeoPrompt, handleGenerateAllVeoPrompts, handleGenerateAllImages, handleDownloadAll, handleOpenImageViewer ...
    const setDefaultCharacter = (id: string) => {
        updateStateAndRecord(s => {
            const newCharacters = s.characters.map(c => ({
                ...c,
                isDefault: c.id === id,
            }));
            const newScenes = s.scenes.map(scene => {
                const sceneNumber = scene.sceneNumber.toLowerCase();
                if (sceneNumber.startsWith('c')) {
                    return { ...scene, characterIds: [id] };
                }
                return scene;
            });
            return { ...s, characters: newCharacters, scenes: newScenes };
        });
    };

    // --- Editing Logic ---
    const openEditor = (id: string, image: string, type: 'master' | 'face' | 'body' | 'prop', propIndex?: number) => {
        setEditingImage({ id, image, type, propIndex });
        setIsEditorOpen(true);
    };

    const handleEditorSave = (newImage: string) => {
        if (!editingImage) return;
        const { id, type, propIndex } = editingImage;
        
        if (type === 'prop' && typeof propIndex === 'number') {
            const char = state.characters.find(c => c.id === id);
            if (char) {
                const newProps = [...char.props];
                newProps[propIndex] = { ...newProps[propIndex], image: newImage };
                updateCharacter(id, { props: newProps });
            }
        } else if (type === 'master') {
            updateCharacter(id, { masterImage: newImage });
        } else if (type === 'face') {
            updateCharacter(id, { faceImage: newImage });
        } else if (type === 'body') {
            updateCharacter(id, { bodyImage: newImage });
        }
    };
    
    // --- Scene Logic ---
    const addScene = () => {
        const defaultCharacter = state.characters.find(c => c.isDefault);
        const newScene: Scene = {
            id: generateId(),
            sceneNumber: `${state.scenes.length + 1}`,
            language1: '',
            vietnamese: '',
            promptName: '',
            contextDescription: '',
            characterIds: defaultCharacter ? [defaultCharacter.id] : [],
            generatedImage: null,
            veoPrompt: '',
            isGenerating: false,
            error: null,
        };
        updateStateAndRecord(s => ({...s, scenes: [...s.scenes, newScene]}));
    };

    const updateScene = (id: string, updates: Partial<Scene>) => {
        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === id ? { ...sc, ...updates } : sc)
        }));
    };
    
    const removeScene = (id: string) => {
        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.filter(sc => sc.id !== id)
        }));
    };

    const handleScriptUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (json.length <= 1) {
                    alert("File Excel trống hoặc chỉ có hàng tiêu đề.");
                    return;
                }

                const defaultCharacter = state.characters.find(c => c.isDefault);
                const newScenes: Scene[] = json.slice(1) 
                    .filter(row => row && row.length > 0 && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '')
                    .map(row => {
                        const sceneNumber = String(row[0] || '').trim();
                        let characterIds: string[] = [];

                        if (sceneNumber.toLowerCase().startsWith('c') && defaultCharacter) {
                            characterIds.push(defaultCharacter.id);
                        }

                        return {
                            id: generateId(),
                            sceneNumber: sceneNumber,
                            language1: String(row[1] || ''),
                            vietnamese: String(row[2] || ''),
                            promptName: String(row[3] || ''),
                            contextDescription: String(row[4] || ''),
                            characterIds: characterIds,
                            generatedImage: null,
                            veoPrompt: '',
                            isGenerating: false,
                            error: null,
                        };
                    });

                updateStateAndRecord(s => ({ ...s, scenes: newScenes }));
                alert(`Đã tải lên thành công ${newScenes.length} phân cảnh.`);
            } catch (error) {
                console.error("Lỗi khi xử lý file Excel:", error);
                alert("Đã xảy ra lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = ''; 
    };

    const triggerFileUpload = () => {
        document.getElementById('script-upload-input')?.click();
    };

    const handleGenerateScript = async (idea: string, count: number) => {
        const apiKey = userApiKey || process.env.API_KEY;
        if (!apiKey) {
            alert("Vui lòng nhập API Key để sử dụng tính năng này.");
            setApiKeyModalOpen(true);
            return;
        }

        setIsScriptGenerating(true);

        const availableCharacters = state.characters
            .filter(c => c.name.trim() !== '')
            .map(c => ({ name: c.name, id: c.id }));
        
        const characterListString = JSON.stringify(availableCharacters, null, 2);

        try {
            const ai = new GoogleGenAI({ apiKey });
            const prompt = `
            Act as a world-class Film Director. Create a strict storyboard script of EXACTLY ${count} scenes for this story: "${idea}".

            **CHARACTERS (ID):**
            ${characterListString}

            **DIRECTORIAL RULES (FILM GRAMMAR):**
            
            1.  **BLOCKING & SPATIAL RELATION:** 
                *   Define exactly where characters are standing relative to each other (e.g., "A stands left, B stands right").
                *   Maintain 180-degree rule logic.

            2.  **CAMERA ANGLES FOR DIALOGUE:**
                *   **MANDATORY:** If two characters are talking, you MUST use "Over-the-Shoulder (OTS) Shot" or "Shot-Reverse-Shot".
                *   Example: "OTS from behind [Character A], looking at [Character B]'s face."
                *   Never use generic "Medium shot" for intense dialogue; be specific.

            3.  **VISUAL CONTINUITY:**
                *   Explicitly describe the background in a way that allows reuse. 
                *   Example: "The SAME neon-lit alleyway from Scene 1, but looking towards the exit."

            4.  **SMART ASSIGNMENT:**
                *   Return 'character_ids' for who is VISIBLE in the shot.
                *   Cut-aways/Inserts = Empty ID list [].

            **OUTPUT FORMAT (JSON):**
                *   **scene_number**: "1", "2"
                *   **english_dialogue**: Dialogue text.
                *   **vietnamese_dialogue**: Translation.
                *   **prompt_name**: Scene title.
                *   **visual_context**: The Image Gen Prompt. Structure:
                    "[Shot Type: e.g. OTS, Wide, Low Angle] of [Subject + Blocking]. [Action]. [Lighting/Time]. [Lens/Focus]. [Environment details]. [Specific Props if needed]"
                    *Make sure 'Over-the-Shoulder' is explicitly written in visual_context for dialogue scenes.*
                *   **character_ids**: ["id_..."]

            Generate strict JSON array.
            `;

            const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                scene_number: { type: Type.STRING },
                                english_dialogue: { type: Type.STRING },
                                vietnamese_dialogue: { type: Type.STRING },
                                prompt_name: { type: Type.STRING },
                                visual_context: { type: Type.STRING },
                                character_ids: { 
                                    type: Type.ARRAY, 
                                    items: { type: Type.STRING } 
                                }
                            },
                            required: ["scene_number", "visual_context", "vietnamese_dialogue", "prompt_name", "character_ids"]
                        }
                    }
                }
            }));

            const generatedScenesRaw = JSON.parse(response.text || '[]');
            
            const newScenes: Scene[] = generatedScenesRaw.map((item: any) => ({
                id: generateId(),
                sceneNumber: item.scene_number || '',
                language1: item.english_dialogue || '',
                vietnamese: item.vietnamese_dialogue || '',
                promptName: item.prompt_name || '',
                contextDescription: item.visual_context || '',
                characterIds: item.character_ids || [], 
                generatedImage: null,
                veoPrompt: '',
                isGenerating: false,
                error: null,
            }));

            if (newScenes.length > 0) {
                 updateStateAndRecord(s => ({
                    ...s,
                    scenes: [...s.scenes, ...newScenes]
                }));
                alert(`Đạo diễn đã hoàn tất kịch bản với ${newScenes.length} phân cảnh chi tiết (Blocking, OTS)!`);
            } else {
                throw new Error("Không có dữ liệu phân cảnh nào được tạo.");
            }

        } catch (error) {
            console.error("Script generation failed:", error);
            alert("Tạo kịch bản thất bại. Vui lòng thử lại.");
        } finally {
            setIsScriptGenerating(false);
        }
    };
    
    // --- Image Generation Logic ---
    const performImageGeneration = async (sceneId: string, refinementPrompt?: string) => {
        const currentSceneIndex = state.scenes.findIndex(s => s.id === sceneId);
        const sceneToUpdate = state.scenes[currentSceneIndex];
        if (!sceneToUpdate) return;
        
        // --- 1. GET GLOBAL STYLE PROMPT ---
        const selectedStyle = GLOBAL_STYLES.find(s => s.value === state.stylePrompt);
        const styleInstruction = selectedStyle ? selectedStyle.prompt : '';
        
        // Construct basic prompt
        const finalPrompt = `${styleInstruction}. ${sceneToUpdate.contextDescription}`.trim();

        if (!finalPrompt && !refinementPrompt) {
             alert("Vui lòng nhập mô tả bối cảnh.");
            return;
        }

        const apiKey = userApiKey || process.env.API_KEY;
        if (!apiKey) {
            setApiKeyModalOpen(true);
            alert("Vui lòng cung cấp API key trong phần 'Quản lý API Key'.");
            return;
        }
        
        setState(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: true, error: null } : sc)
        }));

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            const parts: any[] = [];
            let promptText = '';

            const selectedChars = state.characters.filter(c => sceneToUpdate.characterIds.includes(c.id));
            
            for (const char of selectedChars) {
                if (char.faceImage) {
                    const [header, data] = char.faceImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `Reference for ${char.name}'s FACE (Strict Identity):` });
                    parts.push({ inlineData: { data, mimeType } });
                }
                
                if (char.bodyImage) {
                    const [header, data] = char.bodyImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `Reference for ${char.name}'s OUTFIT & BODY:` });
                    parts.push({ inlineData: { data, mimeType } });
                }

                for (const prop of char.props) {
                    if (prop.image && prop.name && finalPrompt.toLowerCase().includes(prop.name.toLowerCase())) {
                        const [header, data] = prop.image.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ text: `Reference for prop "${prop.name}":` });
                        parts.push({ inlineData: { data, mimeType } });
                    }
                }
            }

            if (isContinuityMode && currentSceneIndex > 0 && !refinementPrompt) {
                const prevScene = state.scenes[currentSceneIndex - 1];
                if (prevScene.generatedImage) {
                    const [header, data] = prevScene.generatedImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `Reference for PREVIOUS SCENE (Match Lighting/Environment):` });
                    parts.push({ inlineData: { data, mimeType } });
                }
            }

            if (refinementPrompt && sceneToUpdate.generatedImage) {
                const [header, data] = sceneToUpdate.generatedImage.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                parts.push({ inlineData: { data, mimeType } });
                promptText = `Using the provided image as a base, edit it according to the following instruction: "${refinementPrompt}". Preserve the overall style (${styleInstruction}) and composition, only applying the requested change.`;
            } 
            else {
                const characterInstructions = selectedChars.map((c, i) => {
                    let instructions = `- Character ${i+1} (${c.name}): ${c.description}. `;
                    return instructions;
                }).join('\n');
                
                const charNames = selectedChars.map(c => c.name).join(', ') || 'None';
                
                let continuityInstruction = "";
                if (isContinuityMode && currentSceneIndex > 0 && state.scenes[currentSceneIndex - 1].generatedImage) {
                    continuityInstruction = `
                    **CONTINUITY:** You MUST match the lighting, color grading, and environment of the labeled "PREVIOUS SCENE" image.
                    `;
                }

                promptText = `
**TASK:** Generate a cinematic movie frame.
${continuityInstruction}

**VISUAL STYLE (MANDATORY):** ${styleInstruction}

**SCENE DESCRIPTION:** "${sceneToUpdate.contextDescription}".
**CHARACTERS:** ${charNames}.

**STRICT REFERENCE INSTRUCTIONS:**
1.  **FACES:** Use images labeled "...FACE (Strict Identity)" to reconstruct facial features exactly.
2.  **OUTFITS (CRITICAL):** 
    - You MUST use the image labeled "...OUTFIT & BODY" as the absolute truth for clothing.
    - **Over-The-Shoulder (OTS) Logic:** If a character is seen from behind (foreground), their shoulder/back MUST match the fabric, color, and design of their "OUTFIT & BODY" reference. Do NOT invent new clothes.
3.  **PROPS:** Incorporate labeled props naturally.

**CHARACTER DETAILS:**
${characterInstructions}

**COMPOSITION:** Follow the specified camera angle (OTS, Wide, etc.) from the scene description.
`;
            }

            parts.push({ text: promptText });

            const model = state.imageModel || 'gemini-2.5-flash-image';
            const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
              model: model,
              contents: { parts },
              config: { 
                  // Removed responseModalities to fix Nano Banana API compatibility
                  imageConfig: {
                      aspectRatio: state.aspectRatio || "16:9"
                  }
              },
            }));
            
            if (response.promptFeedback?.blockReason) {
                throw new Error(`Bị chặn do ${response.promptFeedback.blockReason}. Vui lòng sửa lại prompt.`);
            }

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (imagePart?.inlineData) {
                const base64ImageBytes = imagePart.inlineData.data;
                const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${base64ImageBytes}`;
                 setState(s => ({
                    ...s,
                    scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, generatedImage: imageUrl, isGenerating: false, error: null } : sc)
                }));
            } else {
                 throw new Error("Không nhận được ảnh từ API.");
            }

        } catch (error) {
            console.error("Image generation failed:", error);
            let errorMessage = "Tạo ảnh thất bại.";
             if (error instanceof Error) {
                errorMessage = error.message;
            }
            setState(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: false, error: errorMessage } : sc)
            }));
        }
    };

    // --- Veo Prompt Generation ---
    const generateVeoPrompt = async (sceneId: string) => {
        const scene = state.scenes.find(s => s.id === sceneId);
        if (!scene || !scene.generatedImage) return;

        const apiKey = userApiKey || process.env.API_KEY;
        if (!apiKey) return;

        try {
             const ai = new GoogleGenAI({ apiKey });
             const [header, data] = scene.generatedImage.split(',');
             const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
             
             const scriptText = state.scriptLanguage === 'vietnamese' ? scene.vietnamese : scene.language1;
             const context = scene.contextDescription || '';
             const promptName = scene.promptName || '';
             
             const prompt = `
             Role: Expert Video Prompt Engineer for Google Veo 3.1.
             
             **INPUT DATA:**
             - Visual Reference: Keyframe Image provided.
             - Context: "${context}"
             - Scene Intent: "${promptName}"
             - Dialogue: "${scriptText}"
             
             **TASK:** 
             Analyze the scene and generate the OPTIMAL text-to-video prompt.
             Do NOT be rigid. Choose the best structure based on the scene content:
             
             1. **Timestamped Format** (Use for Dialogue/Complex Action):
                Structure: "(00:00-00:05) [Camera Movement] of [Subject] [Action]..."
                *Why?* Essential for lip-sync, precise acting, or timed events.
             
             2. **Narrative Format** (Use for Atmosphere/Scenery/B-Roll):
                Structure: "A cinematic [Shot Type] of [Subject]..."
                *Why?* Better for flowing, atmospheric, or establishing shots without rigid timing.
                
             3. **JSON Format** (Use ONLY if technical separation is critical):
                Structure: JSON with keys "camera", "subject", "lighting", "action".

             **VEO 3.1 OPTIMIZATION CHECKLIST:**
             - **Camera:** Use specific terms: "Truck Left", "Dolly In", "Rack Focus", "Low Angle", "Aerial Orbit".
             - **Lighting:** Define source: "Volumetric fog", "Rembrandt lighting", "Neon rim light".
             - **Micro-Movements (CRITICAL):**
                - If Dialogue exists ("${scriptText}"): MUST include "character talking", "lips moving naturally", "expressive face".
                - Background: "wind blowing hair", "dust particles", "flickering neon", "rain".
             - **Style:** "Photorealistic, 4k, High Fidelity, Cinematic Motion Blur".
             
             **OUTPUT:**
             Return ONLY the final prompt string (in English). Do not include explanations.
             `;

             const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                 model: 'gemini-2.5-flash',
                 contents: {
                     parts: [
                         { inlineData: { data, mimeType } },
                         { text: prompt }
                     ]
                 }
             }));
             
             const veoPrompt = response.text?.trim() || '';
             
             updateStateAndRecord(s => ({
                 ...s,
                 scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt } : sc)
             }));

        } catch (e) {
            console.error("Veo prompt gen failed", e);
        }
    };

    const handleGenerateAllVeoPrompts = async () => {
        const scenesToProcess = state.scenes.filter(s => s.generatedImage && !s.veoPrompt);
        if (scenesToProcess.length === 0) {
            return alert("Không có phân cảnh nào (đã có ảnh) cần tạo Veo prompt.");
        }
        
        setIsVeoGenerating(true);
        const apiKey = userApiKey || process.env.API_KEY;
        if (!apiKey) {
            setApiKeyModalOpen(true);
            setIsVeoGenerating(false);
            return;
        }

        try {
            for (const scene of scenesToProcess) {
                await generateVeoPrompt(scene.id);
                await new Promise(r => setTimeout(r, 200)); 
            }
        } finally {
            setIsVeoGenerating(false);
        }
    };

    const handleCopyAllVeoPrompts = () => {
        const validPrompts = state.scenes
            .filter(s => s.veoPrompt && s.veoPrompt.trim().length > 0)
            .map(s => s.veoPrompt.trim());

        if (validPrompts.length === 0) {
            alert("Chưa có Veo prompt nào để copy.");
            return;
        }

        const textToCopy = validPrompts.join('\n');
        navigator.clipboard.writeText(textToCopy);
        alert(`Đã copy ${validPrompts.length} prompts vào clipboard.`);
    };


    const CONCURRENCY_LIMIT = 1; // Reduced to 1 to prevent 429 errors
    const handleGenerateAllImages = async () => {
        if (isContinuityMode) {
             const scenesToGenerate = state.scenes.filter(s => !s.generatedImage && s.contextDescription);
             if (scenesToGenerate.length === 0) return alert("Đã đủ ảnh.");
             
             setIsBatchGenerating(true);
             try {
                 for (const scene of scenesToGenerate) {
                     await performImageGeneration(scene.id);
                     await new Promise(r => setTimeout(r, 500)); 
                 }
             } catch(e) {
                 console.error(e);
             } finally {
                 setIsBatchGenerating(false);
             }
        } else {
            const scenesToGenerate = state.scenes.filter(s => !s.generatedImage && s.contextDescription);
            if (scenesToGenerate.length === 0) {
                alert("Tất cả các phân cảnh có mô tả đã có ảnh.");
                return;
            }
            setIsBatchGenerating(true);
    
            const runWithConcurrency = async (tasks: (() => Promise<any>)[], limit: number) => {
                const results: Promise<any>[] = [];
                const executing: Promise<any>[] = [];
                for (const task of tasks) {
                    const p = task();
                    results.push(p);
    
                    if (limit <= tasks.length) {
                        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                        executing.push(e);
                        if (executing.length >= limit) {
                            await Promise.race(executing);
                        }
                    }
                }
                return Promise.all(results);
            };
    
            const generationTasks = scenesToGenerate.map(scene => () => performImageGeneration(scene.id));
    
            try {
                await runWithConcurrency(generationTasks, CONCURRENCY_LIMIT);
            } catch (error) {
                console.error("An error occurred during batch generation:", error);
            } finally {
                setIsBatchGenerating(false);
            }
        }
    };
    
    const handleDownloadAll = () => {
        const zip = new JSZip();
        const scenesWithImages = state.scenes.filter(s => s.generatedImage);
        
        if(scenesWithImages.length === 0) {
            alert("Không có ảnh nào để tải xuống.");
            return;
        }

        scenesWithImages.forEach((scene) => {
            const imgData = scene.generatedImage!.split(',')[1];
            zip.file(`${scene.sceneNumber}.png`, imgData, {base64: true});
        });
        
        zip.generateAsync({type:"blob"}).then(function(content) {
            const filename = state.projectName ? `${slugify(state.projectName)}.zip` : 'project-images.zip';
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
        });
    };

    const handleOpenImageViewer = (sceneIndex: number) => {
        setCurrentImageIndex(sceneIndex);
        setImageViewerOpen(true);
    };

    // --- Effect Hooks ---
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                setZoom(prev => Math.max(0.2, Math.min(3, prev - e.deltaY * 0.001)));
            }
        };
        const mainContent = mainContentRef.current;
        mainContent?.addEventListener('wheel', handleWheel, { passive: false });
        return () => mainContent?.removeEventListener('wheel', handleWheel);
    }, []);

    useEffect(() => {
      const handleScroll = () => {
        if(mainContentRef.current && mainContentRef.current.scrollTop > 50) {
          setHeaderSticky(true);
        } else {
          setHeaderSticky(false);
        }
      };
      const mainContent = mainContentRef.current;
      mainContent?.addEventListener('scroll', handleScroll);
      return () => mainContent?.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="h-screen w-screen bg-[#1C1214] text-gray-200 overflow-hidden relative font-[Inter]">
             <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-[#FF4655]/10 rounded-full filter blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-[#FF9F43]/5 rounded-full filter blur-3xl animate-pulse-slow delay-1000"></div>
            </div>

            <Header 
                isSticky={isHeaderSticky} 
                onApiKeyClick={() => setApiKeyModalOpen(true)} 
                onSave={handleSave} 
                onOpen={handleOpen}
                onDownloadAll={handleDownloadAll}
                canDownload={state.scenes.some(s => s.generatedImage)}
                isContinuityMode={isContinuityMode}
                toggleContinuityMode={() => setIsContinuityMode(!isContinuityMode)}
            />
            
            <main ref={mainContentRef} className="h-full w-full overflow-auto pt-20">
                <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                   <div className="container mx-auto px-6 pb-24">
                        <ProjectNameInput value={state.projectName} onChange={handleProjectNameChange} />
                        
                        <div className="my-16">
                            <SectionTitle>Quản lý Nhân vật (Model Sheets)</SectionTitle>
                            <div className="grid md:grid-cols-3 gap-6">
                                {state.characters.map((char, index) => (
                                    <CharacterCard 
                                        key={char.id} 
                                        character={char} 
                                        index={index}
                                        updateCharacter={updateCharacter}
                                        setDefault={setDefaultCharacter}
                                        onMasterUpload={handleMasterImageUpload}
                                        onEditImage={openEditor}
                                        onOpenCharGen={(id) => setCharGenState({ isOpen: true, charId: id })}
                                    />
                                ))}
                            </div>
                        </div>

                         <div className="my-16 p-6 bg-[#2D1E21] rounded-3xl border border-[#402020] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                            <SectionTitle>Kịch bản & Phong cách</SectionTitle>
                            <div className="grid md:grid-cols-3 gap-6 items-start">
                                <div className="md:col-span-2 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Phong cách Tổng thể (Global Style)</label>
                                            <select 
                                                value={state.stylePrompt}
                                                onChange={handleStylePromptChange}
                                                className="w-full bg-[#1C1214] text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4655] border border-[#402020] appearance-none"
                                            >
                                                {GLOBAL_STYLES.map(style => (
                                                    <option key={style.value} value={style.value}>{style.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                         <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Model tạo ảnh (Cho Scene)</label>
                                            <select 
                                                value={state.imageModel}
                                                onChange={handleImageModelChange}
                                                className="w-full bg-[#1C1214] text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4655] border border-[#402020] appearance-none"
                                            >
                                                {IMAGE_MODELS.map(model => (
                                                    <option key={model.value} value={model.value}>{model.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Áp dụng một "System Prompt" nhất quán cho toàn bộ dự án để tránh lệch tông màu/ánh sáng.</p>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Tỷ lệ ảnh (Aspect Ratio)</label>
                                            <select 
                                                value={state.aspectRatio}
                                                onChange={handleAspectRatioChange}
                                                className="w-full bg-[#1C1214] text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4655] border border-[#402020]"
                                            >
                                                {ASPECT_RATIOS.map(ratio => (
                                                    <option key={ratio.value} value={ratio.value}>{ratio.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">Ngôn ngữ nguồn cho Script</label>
                                            <select 
                                                value={state.scriptLanguage}
                                                onChange={handleScriptLanguageChange}
                                                className="w-full bg-[#1C1214] text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF4655] border border-[#402020]"
                                            >
                                                <option value="vietnamese">Tiếng Việt (Cột 3)</option>
                                                <option value="language1">Ngôn ngữ 1 (Cột 2)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center justify-center h-full space-y-3">
                                    <div className="w-full">
                                        <button onClick={() => setScriptModalOpen(true)} className={`w-full px-6 py-4 font-semibold text-white rounded-2xl bg-gradient-to-r from-[#FF4655] to-[#E03545] hover:from-[#E03545] hover:to-[#C02E3B] transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(255,70,85,0.3)]`}>
                                            <span className="text-lg">✨ Viết Kịch Bản AI</span>
                                            <span className="text-xs font-normal opacity-80 mt-1">Từ ý tưởng đến phân cảnh</span>
                                        </button>
                                    </div>
                                    <div className="w-full relative">
                                         <input type="file" id="script-upload-input" className="hidden" onChange={handleScriptUpload} accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                                         <button onClick={triggerFileUpload} className={`w-full px-6 py-2 font-semibold text-white rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-all duration-300`}>
                                            Upload Excel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="my-16">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-bold font-heading bg-clip-text text-transparent bg-gradient-to-r from-[#FF4655] to-[#FF9F43]">Bảng trình bày Kịch bản</h2>
                                <div className="flex items-center space-x-2">
                                     <button onClick={handleGenerateAllVeoPrompts} disabled={isVeoGenerating} className={`px-4 py-2 font-semibold text-white rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 transform hover:scale-105 disabled:opacity-50`}>
                                        {isVeoGenerating ? 'Đang tạo Prompt...' : '🎥 Tạo Veo Prompts'}
                                    </button>
                                    <button onClick={handleCopyAllVeoPrompts} className={`px-4 py-2 font-semibold text-white rounded-full bg-[#1C1214] border border-[#FF4655] hover:bg-[#FF4655] hover:text-white transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2`}>
                                        <span>📋</span> Copy Prompts
                                    </button>
                                     <button onClick={handleGenerateAllImages} disabled={isBatchGenerating} className={`px-4 py-2 font-semibold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,70,85,0.4)]`}>
                                        {isBatchGenerating ? 'Đang tạo (Tuần tự)...' : 'Tạo ảnh hàng loạt'}
                                    </button>
                                    <button onClick={addScene} className={`px-4 py-2 font-semibold text-white rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-all duration-300 transform hover:scale-105`}>+ Thêm Phân đoạn</button>
                                </div>
                            </div>
                            <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-2 text-sm font-bold text-gray-400 border-b-2 border-[#402020]">
                                <div className="col-span-1 text-center relative group">Scene <span className="text-[#FF4655]">(?)</span><Tooltip text="Số thứ tự phân cảnh. Tên file ảnh sẽ được đặt theo cột này."/></div>
                                <div className="col-span-2">Script (Lang 1/Viet)</div>
                                <div className="col-span-2">Tên/Bối cảnh</div>
                                <div className="col-span-3">Veo Video Prompt <span className="text-[#FF9F43]">(New)</span></div>
                                <div className="col-span-1">Nhân vật</div>
                                <div className="col-span-3 text-center">Ảnh</div>
                            </div>
                            <div className="space-y-4 mt-4">
                                {state.scenes.map((scene, index) => (
                                     <SceneRow 
                                         key={scene.id}
                                         scene={scene}
                                         index={index}
                                         characters={state.characters}
                                         updateScene={updateScene}
                                         removeScene={removeScene}
                                         generateImage={() => performImageGeneration(scene.id)}
                                         openImageViewer={() => handleOpenImageViewer(index)}
                                     />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="absolute bottom-0 left-0 right-0 p-4 text-center text-xs text-gray-500 z-10 border-t border-[#402020] bg-[#1C1214]">
                Created by <a href="https://ai.fibusvideo.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF4655] transition-colors">@Mrsonic30</a>
            </footer>

            {zoom !== 1 && (
                <button 
                    onClick={() => setZoom(1)} 
                    className={`absolute top-24 right-6 px-4 py-2 text-sm font-semibold text-white rounded-full bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all shadow-lg animate-fade-in`}
                >
                    Reset Zoom (100%)
                </button>
            )}
            
            <CoffeeButton onClick={() => setCoffeeModalOpen(true)} />
            
            <ApiKeyModal isOpen={isApiKeyModalOpen} onClose={() => setApiKeyModalOpen(false)} apiKey={userApiKey} setApiKey={setUserApiKey} />
            <CoffeeModal isOpen={isCoffeeModalOpen} onClose={() => setCoffeeModalOpen(false)} apiKey={userApiKey} />
            <ScriptGeneratorModal 
                isOpen={isScriptModalOpen} 
                onClose={() => setScriptModalOpen(false)}
                onGenerate={handleGenerateScript}
                isGenerating={isScriptGenerating}
            />
            <CharacterGeneratorModal 
                isOpen={charGenState.isOpen}
                onClose={() => setCharGenState({ isOpen: false, charId: null })}
                onSave={handleCharGenSave}
                apiKey={userApiKey || process.env.API_KEY || ''}
                model={state.imageModel || 'gemini-2.5-flash-image'}
            />
            <ImageEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                image={editingImage?.image || null}
                onSave={handleEditorSave}
                apiKey={userApiKey || process.env.API_KEY || ''}
                model={state.imageModel || 'gemini-2.5-flash-image'}
            />
            <ImageViewerModal 
                isOpen={isImageViewerOpen}
                onClose={() => setImageViewerOpen(false)}
                scenes={state.scenes}
                currentIndex={currentImageIndex}
                onNavigate={setCurrentImageIndex}
                onRegenerate={performImageGeneration}
            />
        </div>
    );
};

export default App;