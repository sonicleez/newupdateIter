import React, { useState, useRef, useEffect } from 'react';
import { Type, GoogleGenAI } from "@google/genai";
import { X, Undo, Eraser, Brush, Download, Wand2, Image as ImageIcon, History, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Scan, Maximize, Layers, Palette, Search, Upload, LayoutGrid, List } from 'lucide-react';
import MaskCanvas, { MaskCanvasHandle } from '../MaskCanvas';
import { expandImage, upscaleImage, editImageWithMask, analyzeImage, compositeImages, applyStyleTransfer, GeneratedImage } from '../../utils/geminiImageEdit';

interface AdvancedImageEditorProps {
    isOpen: boolean;
    onClose: () => void;
    sourceImage: string;
    onSave: (editedImage: string, history: { id: string, image: string, prompt: string }[]) => void;
    apiKey: string;
    genyuToken?: string;
    initialHistory?: { id: string; image: string; prompt: string }[];
}

const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const AdvancedImageEditor: React.FC<AdvancedImageEditorProps> = ({
    isOpen,
    onClose,
    sourceImage,
    onSave,
    apiKey,
    genyuToken: genyuTokenProp,
    initialHistory
}) => {
    // Canvas State
    const canvasRef = useRef<MaskCanvasHandle>(null);
    const [brushSize, setBrushSize] = useState(20);
    const [isEraser, setIsEraser] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState<string>('');

    // Image State
    const [currentImage, setCurrentImage] = useState(sourceImage);
    const [history, setHistory] = useState<{ id: string, image: string, prompt: string }[]>(
        initialHistory && initialHistory.length > 0
            ? initialHistory
            : [{ id: generateId(), image: sourceImage, prompt: 'Original' }]
    );
    const [historyLayout, setHistoryLayout] = useState<'list' | 'grid'>('list');

    // Advanced Features State
    const [analysisTags, setAnalysisTags] = useState<string[] | null>(null);
    const [layerImage, setLayerImage] = useState<string | null>(null);
    const [styleRefImage, setStyleRefImage] = useState<string | null>(null);
    const layerInputRef = useRef<HTMLInputElement>(null);
    const styleInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'tools' | 'layers' | 'analysis'>('tools');

    // Dimensions for the canvas
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [genyuToken, setGenyuToken] = useState<string | null>(null);

    // Load Token from localStorage
    useEffect(() => {
        const t = localStorage.getItem('genyuToken');
        if (t) setGenyuToken(t);
    }, []);

    // Initial Load & CORS Handling
    useEffect(() => {
        if (isOpen && sourceImage) {
            if (!sourceImage.startsWith('data:')) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = sourceImage;
                img.onload = () => {
                    setCurrentImage(sourceImage);
                };
                img.onerror = () => {
                    console.log("Direct load failed, trying proxy for CORS...");
                    fetch(`http://localhost:3001/api/proxy/fetch-image?url=${encodeURIComponent(sourceImage)}`)
                        .then(res => res.blob())
                        .then(blob => {
                            const reader = new FileReader();
                            reader.onloadend = () => setCurrentImage(reader.result as string);
                            reader.readAsDataURL(blob);
                        })
                        .catch(err => console.error("Proxy fetch failed:", err));
                }
            } else {
                setCurrentImage(sourceImage);
            }
            if (initialHistory && initialHistory.length > 0) {
                setHistory(initialHistory);
            } else {
                setHistory([{ id: 'original', image: sourceImage, prompt: 'Original' }]);
            }
            setAnalysisTags(null);
            setLayerImage(null);
            setStyleRefImage(null);
        }
    }, [isOpen, sourceImage]);

    // Initial Load & Resize Handler
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const updateDimensions = () => {
                const { clientWidth, clientHeight } = containerRef.current!;
                const img = new Image();
                img.src = currentImage;
                img.onload = () => {
                    const aspect = img.width / img.height;
                    let newWidth = clientWidth;
                    let newHeight = clientWidth / aspect;

                    if (newHeight > clientHeight) {
                        newHeight = clientHeight;
                        newWidth = clientHeight * aspect;
                    }

                    setDimensions({ width: newWidth, height: newHeight });
                };
            };

            updateDimensions();
            window.addEventListener('resize', updateDimensions);
            return () => window.removeEventListener('resize', updateDimensions);
        }
    }, [isOpen, currentImage]);

    const addToHistory = (newImage: string, actionPrompt: string) => {
        setHistory(prev => [...prev, { id: generateId(), image: newImage, prompt: actionPrompt }]);
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        setError(null);
        setLoadingMessage('Generating...');

        try {
            // Check if we are doing Composition or Style Transfer first
            if (activeTab === 'layers' && layerImage) {
                setLoadingMessage('Compositing Images...');
                const baseBlob = await (await fetch(currentImage)).blob();
                const layerBlob = await (await fetch(layerImage)).blob();

                // Helper to convert blob to GeneratedImage
                const toGenImg = async (blob: Blob): Promise<GeneratedImage> => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({
                            base64: (reader.result as string).split(',')[1],
                            mimeType: blob.type
                        });
                        reader.readAsDataURL(blob);
                    });
                }

                const baseGen = await toGenImg(baseBlob);
                const layerGen = await toGenImg(layerBlob);

                const result = await compositeImages(apiKey, baseGen, layerGen, prompt);
                if (result.base64) {
                    const newImage = `data:${result.mimeType};base64,${result.base64}`;
                    setCurrentImage(newImage);
                    addToHistory(newImage, `Composite: ${prompt}`);
                }
                return;
            }

            if (activeTab === 'tools' && styleRefImage) { // Assuming Style is under Tools or its own
                // Actually let's put style in Layers or separate? Let's assume Style logic if styleRefImage is active
                // But wait, user might want to simple edit. Let's make it explicit.
            }

            // Default: Edit with Mask
            const maskBase64 = await canvasRef.current?.getMaskDataURL();
            if (!maskBase64) throw new Error("Failed to generate mask");

            // Explicitly handle Style Transfer if selected
            if (styleRefImage) {
                setLoadingMessage('Applying Style Transfer...');
                const baseBlob = await (await fetch(currentImage)).blob();
                const styleBlob = await (await fetch(styleRefImage)).blob();

                const toGenImg = async (blob: Blob): Promise<GeneratedImage> => {
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve({
                            base64: (reader.result as string).split(',')[1],
                            mimeType: blob.type
                        });
                        reader.readAsDataURL(blob);
                    });
                }

                const baseGen = await toGenImg(baseBlob);
                const styleGen = await toGenImg(styleBlob);

                const result = await applyStyleTransfer(apiKey, baseGen, styleGen, prompt);
                if (result.base64) {
                    const newImage = `data:${result.mimeType};base64,${result.base64}`;
                    setCurrentImage(newImage);
                    addToHistory(newImage, `Style Transfer: ${prompt}`);
                    setStyleRefImage(null); // Clear after use? Optional.
                }
                return;
            }

            // Normal Edit
            setLoadingMessage('Editing with Mask...');
            const result = await editImageWithMask(apiKey, currentImage, 'image/jpeg', maskBase64, prompt);

            if (result.base64) {
                const newImage = `data:${result.mimeType};base64,${result.base64}`;
                setCurrentImage(newImage);
                addToHistory(newImage, prompt);
                canvasRef.current?.clear();
            }

        } catch (err: any) {
            console.error("Operation failed:", err);
            setError(err.message || "Operation failed");
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleUpscale = async () => {
        setIsGenerating(true);
        setError(null);
        setLoadingMessage('Upscaling Image (4x)...');
        try {
            const result = await upscaleImage(apiKey, currentImage, 'image/jpeg');
            if (result.base64) {
                const newImage = `data:${result.mimeType};base64,${result.base64}`;
                setCurrentImage(newImage);
                addToHistory(newImage, "Upscaled (4x)");
            }
        } catch (err: any) {
            console.error("Upscale failed:", err);
            setError(err.message || "Upscale failed");
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleExpand = async (direction: 'up' | 'down' | 'left' | 'right') => {
        setIsGenerating(true);
        setError(null);
        setLoadingMessage(`Expanding ${direction}...`);
        try {
            const result = await expandImage(apiKey, currentImage, 'image/jpeg', direction);
            if (result.base64) {
                const newImage = `data:${result.mimeType};base64,${result.base64}`;
                setCurrentImage(newImage);
                addToHistory(newImage, `Expand ${direction}`);
            }
        } catch (err: any) {
            console.error("Expand failed:", err);
            setError(err.message || "Expand failed");
        } finally {
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleAnalyze = async () => {
        setIsGenerating(true);
        setLoadingMessage('Analyzing Image...');
        try {
            // Helper to convert current image to GeneratedImage structure
            const blob = await (await fetch(currentImage)).blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const result = await analyzeImage(apiKey, { base64, mimeType: blob.type });
                setAnalysisTags(result);
                setIsGenerating(false);
                setLoadingMessage('');
                setActiveTab('analysis');
            }
        } catch (err: any) {
            console.error("Analysis failed:", err);
            setError(err.message || "Analysis failed");
            setIsGenerating(false);
            setLoadingMessage('');
        }
    };

    const handleUndo = () => {
        canvasRef.current?.undo();
    };

    const handleRestoreHistory = (scan: typeof history[0]) => {
        setCurrentImage(scan.image);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string | null) => void) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setter(ev.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // UI Components for Expand Buttons
    const ExpandButton = ({ direction, className }: { direction: 'up' | 'down' | 'left' | 'right', className: string }) => {
        const icons = {
            up: ArrowUp,
            down: ArrowDown,
            left: ArrowLeft,
            right: ArrowRight
        };
        const Icon = icons[direction];

        return (
            <button
                onClick={() => handleExpand(direction)}
                disabled={isGenerating}
                className={`absolute ${className} bg-black/60 backdrop-blur-md p-2 rounded-full text-white border border-white/20 hover:bg-blue-600/80 hover:scale-110 transition-all z-40 disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl`}
                title={`Magic Expand ${direction}`}
            >
                <Icon size={20} className="group-hover:animate-pulse" />
            </button>
        )
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60]">
            <div className="bg-[#121212] w-full h-full md:w-[95vw] md:h-[90vh] md:rounded-2xl flex flex-col overflow-hidden relative shadow-2xl border border-gray-800">

                {/* Header */}
                <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#1a1a1a]">
                    <div className="flex items-center space-x-2 text-purple-400">
                        <Wand2 size={24} />
                        <span className="font-bold text-lg tracking-wide text-white">CyberMask Studio</span>
                        <div className="flex items-center space-x-1 ml-4">
                            <button
                                onClick={() => setActiveTab('tools')}
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'tools' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >Tools</button>
                            <button
                                onClick={() => setActiveTab('layers')}
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'layers' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >Layers</button>
                            <button
                                onClick={() => setActiveTab('analysis')}
                                className={`px-3 py-1 rounded text-sm ${activeTab === 'analysis' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >Analysis</button>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={handleAnalyze} disabled={isGenerating} className="p-2 text-blue-400 hover:text-blue-300 transition-colors" title="Analyze Image">
                            <Search size={20} />
                        </button>
                        <button onClick={handleUpscale} disabled={isGenerating} className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/40 text-green-400 px-3 py-1.5 rounded-lg border border-green-600/50 transition-colors text-sm font-medium disabled:opacity-50">
                            <Scan size={16} />
                            Upscale
                        </button>
                        <div className="h-6 w-px bg-gray-700 mx-2"></div>
                        <button onClick={handleUndo} className="p-2 text-gray-400 hover:text-white transition-colors" title="Undo Mask (Ctrl+Z)">
                            <Undo size={20} />
                        </button>
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: History */}
                    <div className={`bg-[#151515] border-r border-gray-800 flex flex-col transition-all ${historyLayout === 'grid' ? 'w-64' : 'w-24'}`}>
                        <div className="p-3 border-b border-gray-800 flex justify-between items-center">
                            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">History</span>
                            <button onClick={() => setHistoryLayout(prev => prev === 'list' ? 'grid' : 'list')} className="text-gray-500 hover:text-white">
                                {historyLayout === 'list' ? <LayoutGrid size={16} /> : <List size={16} />}
                            </button>
                        </div>
                        <div className={`flex-1 overflow-y-auto p-2 ${historyLayout === 'grid' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}`}>
                            {history.map((scan, i) => (
                                <div
                                    key={scan.id}
                                    onClick={() => handleRestoreHistory(scan)}
                                    className={`relative p-1 rounded-lg cursor-pointer transition-all border group ${currentImage === scan.image ? 'border-purple-500 bg-purple-500/10' : 'border-transparent hover:bg-gray-800'}`}
                                >
                                    <img src={scan.image} className="w-full h-16 object-cover rounded bg-black" />
                                    {historyLayout === 'list' && <div className="hidden md:block text-[10px] text-gray-400 truncate mt-1">{i === 0 ? 'Original' : scan.prompt}</div>}
                                    {/* Drag to layer button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setLayerImage(scan.image); setActiveTab('layers'); }}
                                        className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Use as Layer"
                                    >
                                        <Layers size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Center: Canvas */}
                    <div className="flex-1 bg-[#0a0a0a] flex flex-col relative">

                        {/* Floating Toolbar (Only on Tools Tab) */}
                        {activeTab === 'tools' && (
                            <div className="absolute top-4 right-4 bg-[#1a1a1a]/90 backdrop-blur border border-gray-700 rounded-full px-6 py-3 flex items-center space-x-6 shadow-2xl z-30">
                                <button
                                    onClick={() => setIsEraser(false)}
                                    className={`flex flex-col items-center space-y-1 ${!isEraser ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    <Brush size={20} />
                                    <span className="text-[10px] font-bold">Brush</span>
                                </button>
                                <button
                                    onClick={() => canvasRef.current?.clear()}
                                    className="flex flex-col items-center space-y-1 text-gray-500 hover:text-red-400"
                                >
                                    <Eraser size={20} />
                                    <span className="text-[10px] font-bold">Clear</span>
                                </button>
                                <div className="w-px h-8 bg-gray-700"></div>
                                <div className="flex items-center space-x-3">
                                    <span className="text-xs text-gray-400">Size</span>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        value={brushSize}
                                        onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                        className="w-24 accent-purple-500"
                                    />
                                    <span className="text-xs w-6 text-right text-gray-500">{brushSize}</span>
                                </div>
                            </div>
                        )}


                        {/* Canvas Container */}
                        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden group/canvas" ref={containerRef}>
                            <div className="relative shadow-2xl border border-gray-800">
                                {/* Expand Buttons */}
                                <div className="absolute inset-0 pointer-events-none z-20 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-300">
                                    <ExpandButton direction="up" className="top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto" />
                                    <ExpandButton direction="down" className="bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-auto" />
                                    <ExpandButton direction="left" className="left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto" />
                                    <ExpandButton direction="right" className="right-0 top-1/2 translate-x-1/2 -translate-y-1/2 pointer-events-auto" />
                                </div>

                                <MaskCanvas
                                    ref={canvasRef}
                                    image={currentImage}
                                    width={dimensions.width}
                                    height={dimensions.height}
                                    brushRadius={brushSize / 2}
                                    brushColor={isEraser ? "#00000000" : "rgba(168, 85, 247, 0.6)"}
                                />
                                {layerImage && activeTab === 'layers' && (
                                    <div className="absolute top-2 right-2 bg-black/60 text-xs text-white px-2 py-1 rounded pointer-events-none border border-white/20">
                                        Layer Active
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Active Tab Content */}
                    <div className="w-72 bg-[#151515] border-l border-gray-800 flex flex-col">

                        {/* Analysis Content */}
                        {activeTab === 'analysis' && (
                            <div className="p-4 space-y-4">
                                <h3 className="text-white font-bold flex items-center gap-2"><Search size={16} /> Image Analysis</h3>
                                {!analysisTags ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500 text-sm mb-4">Identify objects and styles in your image.</p>
                                        <button onClick={handleAnalyze} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm w-full">Start Analysis</button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex flex-wrap gap-2">
                                            {analysisTags.map((tag, i) => (
                                                <span
                                                    key={i}
                                                    className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded cursor-pointer border border-gray-700"
                                                    onClick={() => setPrompt(prev => prev + (prev ? ', ' : '') + tag)}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <button onClick={() => setAnalysisTags(null)} className="mt-4 text-xs text-red-400 hover:text-red-300 w-full text-center">Clear Results</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Layers & Compositing Content */}
                        {activeTab === 'layers' && (
                            <div className="p-4 space-y-6">
                                {/* Layer Upload */}
                                <div>
                                    <h3 className="text-white font-bold flex items-center gap-2 mb-2"><Layers size={16} /> Composite Layer</h3>
                                    <p className="text-xs text-gray-500 mb-3">Add a subject to your scene.</p>

                                    {!layerImage ? (
                                        <button onClick={() => layerInputRef.current?.click()} className="border border-dashed border-gray-600 hover:border-gray-400 rounded-lg h-32 w-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-colors bg-gray-900/50">
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs">Upload Layer Image</span>
                                        </button>
                                    ) : (
                                        <div className="relative group">
                                            <img src={layerImage} className="w-full h-32 object-cover rounded-lg border border-gray-700" />
                                            <button onClick={() => setLayerImage(null)} className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:bg-red-500"><X size={14} /></button>
                                        </div>
                                    )}
                                    <input type="file" ref={layerInputRef} onChange={(e) => handleFileUpload(e, setLayerImage)} className="hidden" accept="image/*" />
                                </div>

                                <div className="h-px bg-gray-800"></div>

                                {/* Style Upload */}
                                <div>
                                    <h3 className="text-white font-bold flex items-center gap-2 mb-2"><Palette size={16} /> Style Reference</h3>
                                    <p className="text-xs text-gray-500 mb-3">Transfer style from another image.</p>

                                    {!styleRefImage ? (
                                        <button onClick={() => styleInputRef.current?.click()} className="border border-dashed border-gray-600 hover:border-gray-400 rounded-lg h-32 w-full flex flex-col items-center justify-center text-gray-500 hover:text-gray-300 transition-colors bg-gray-900/50">
                                            <Upload size={24} className="mb-2" />
                                            <span className="text-xs">Upload Style Image</span>
                                        </button>
                                    ) : (
                                        <div className="relative group">
                                            <img src={styleRefImage} className="w-full h-32 object-cover rounded-lg border border-gray-700" />
                                            <button onClick={() => setStyleRefImage(null)} className="absolute top-2 right-2 bg-black/60 p-1 rounded-full text-white hover:bg-red-500"><X size={14} /></button>
                                        </div>
                                    )}
                                    <input type="file" ref={styleInputRef} onChange={(e) => handleFileUpload(e, setStyleRefImage)} className="hidden" accept="image/*" />
                                </div>
                            </div>
                        )}

                        {/* Tools (Standard Mask Edit) Content - Empty here as it overlays canvas */}
                        {activeTab === 'tools' && (
                            <div className="p-4">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-4"><Brush size={16} /> Standard Edit</h3>
                                <p className="text-xs text-gray-400">
                                    Use the Brush and Eraser tools on the canvas to mask areas you want to change, then describe the changes below.
                                </p>
                                <div className="mt-4 p-3 bg-gray-900 rounded-lg text-xs text-gray-500 border border-gray-800">
                                    <span className="text-purple-400 font-bold">Tip:</span> You can also use "Expand" arrows on the canvas edges to extend your image.
                                </div>
                            </div>
                        )}

                    </div>

                </div>

                {/* Bottom Bar: Prompt */}
                <div className="p-6 bg-[#1a1a1a] border-t border-gray-800 flex items-center justify-center space-x-4 z-40">
                    <div className="max-w-3xl w-full relative">
                        <input
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                            placeholder={
                                activeTab === 'layers' && layerImage ? "Describe how to composite the layer..." :
                                    activeTab === 'layers' && styleRefImage ? "Describe style adjustments..." :
                                        "Describe what to change..."
                            }
                            className="w-full bg-[#0d0d0d] border border-gray-700 rounded-lg py-4 pl-6 pr-32 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-inner text-lg"
                        />
                        <div className="absolute right-2 top-2 bottom-2">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt}
                                className="h-full px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-md shadow-lg transform transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={18} />
                                        <span>Generate</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <button
                        onClick={() => { onSave(currentImage, history); onClose(); }}
                        className="h-14 px-6 bg-brand-orange hover:bg-brand-red text-brand-cream font-bold rounded-lg shadow flex items-center space-x-2"
                    >
                        <Download size={20} />
                        <span>Save</span>
                    </button>
                </div>

                {isGenerating && loadingMessage && (
                    <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur text-white px-8 py-4 rounded-full shadow-2xl z-50 flex items-center space-x-4 border border-purple-500/50">
                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-r-2 border-purple-500"></div>
                        <span className="font-medium tracking-wide animate-pulse">{loadingMessage}</span>
                    </div>
                )}

                {error && (
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-full shadow-xl animate-bounce z-50">
                        ⚠️ {error}
                    </div>
                )}
            </div>
        </div>
    );
};
