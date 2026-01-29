import React, { useState, useCallback, useRef } from 'react';
import {
    Upload, Film, Play, Pause, Search, Download, ChevronRight,
    Loader2, AlertCircle, CheckCircle2, ExternalLink, Copy,
    Sparkles, Target, Clock, Zap, RefreshCw, ArrowRight, X, Settings
} from 'lucide-react';
import { DetectedScene, IntelligenceProject } from './types';
import { Character, Location, ProjectState } from '../../types';
import { generateId } from '../../constants/presets';

interface IntelligenceWorkspaceProps {
    onExportToProduction: (characters: Partial<Character>[], locations: Partial<Location>[]) => void;
    serverUrl?: string;
}

const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
    onExportToProduction,
    serverUrl = 'http://localhost:3001'
}) => {
    // State
    const [project, setProject] = useState<IntelligenceProject | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedScenes, setSelectedScenes] = useState<Set<string>>(new Set());
    const [expandedScene, setExpandedScene] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        sceneThreshold: 0.3,
        minSceneDuration: 1.0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Handle Video Upload
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }

        setIsUploading(true);

        try {
            // Create form data
            const formData = new FormData();
            formData.append('video', file);
            formData.append('threshold', settings.sceneThreshold.toString());
            formData.append('minDuration', settings.minSceneDuration.toString());

            // Upload and process
            const response = await fetch(`${serverUrl}/api/intelligence/process-video`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload video');
            }

            const data = await response.json();

            // Create project from response
            const newProject: IntelligenceProject = {
                id: generateId(),
                videoPath: data.videoPath,
                videoName: file.name,
                videoDuration: data.duration,
                uploadedAt: Date.now(),
                scenes: data.scenes.map((scene: any, index: number) => ({
                    id: generateId(),
                    index,
                    thumbnailPath: scene.thumbnailPath,
                    thumbnailBase64: scene.thumbnailBase64,
                    startTime: scene.startTime,
                    endTime: scene.endTime,
                    duration: scene.duration,
                    status: 'pending' as const
                })),
                status: 'processing',
                progress: 25
            };

            setProject(newProject);

            // Start AI analysis automatically
            await analyzeScenes(newProject);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to process video: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
        }
    }, [serverUrl, settings]);

    // Analyze scenes with Groq Vision
    const analyzeScenes = async (proj: IntelligenceProject) => {
        setIsProcessing(true);
        abortControllerRef.current = new AbortController();

        const updatedScenes = [...proj.scenes];

        for (let i = 0; i < updatedScenes.length; i++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const scene = updatedScenes[i];
            scene.status = 'analyzing';

            setProject(p => p ? {
                ...p,
                scenes: [...updatedScenes],
                progress: 25 + (i / updatedScenes.length) * 25,
                currentStep: `Analyzing scene ${i + 1}/${updatedScenes.length}`
            } : null);

            try {
                // Call Groq Vision API
                const response = await fetch(`${serverUrl}/api/intelligence/analyze-frame`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imageBase64: scene.thumbnailBase64
                    }),
                    signal: abortControllerRef.current?.signal
                });

                if (!response.ok) throw new Error('Analysis failed');

                const data = await response.json();
                scene.aiDescription = data.description;
                scene.detectedCharacters = data.characters || [];
                scene.detectedLocations = data.locations || [];
                scene.detectedActions = data.actions || [];
                scene.mood = data.mood;
                scene.status = 'sourcing';

            } catch (error) {
                if ((error as Error).name === 'AbortError') break;
                scene.status = 'error';
                scene.error = (error as Error).message;
            }

            updatedScenes[i] = scene;
        }

        // Now find sources using Perplexity
        await findSources(updatedScenes);

        setProject(p => p ? {
            ...p,
            scenes: updatedScenes,
            status: 'completed',
            progress: 100
        } : null);

        setIsProcessing(false);
    };

    // Find sources using Perplexity
    const findSources = async (scenes: DetectedScene[]) => {
        for (let i = 0; i < scenes.length; i++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const scene = scenes[i];
            if (scene.status === 'error' || !scene.aiDescription) continue;

            setProject(p => p ? {
                ...p,
                progress: 50 + (i / scenes.length) * 50,
                currentStep: `Finding source for scene ${i + 1}/${scenes.length}`
            } : null);

            try {
                const response = await fetch(`${serverUrl}/api/intelligence/find-source`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: scene.aiDescription,
                        characters: scene.detectedCharacters,
                        locations: scene.detectedLocations
                    }),
                    signal: abortControllerRef.current?.signal
                });

                if (!response.ok) throw new Error('Source finding failed');

                const data = await response.json();
                scene.sourceUrl = data.url;
                scene.sourceTitle = data.title;
                scene.sourceTimecode = data.timecode;
                scene.sourceConfidence = data.confidence;
                scene.status = 'completed';

            } catch (error) {
                if ((error as Error).name === 'AbortError') break;
                // Don't mark as error, just leave without source
                scene.status = 'completed';
            }
        }
    };

    // Stop processing
    const stopProcessing = () => {
        abortControllerRef.current?.abort();
        setIsProcessing(false);
    };

    // Toggle scene selection
    const toggleSceneSelection = (sceneId: string) => {
        setSelectedScenes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sceneId)) {
                newSet.delete(sceneId);
            } else {
                newSet.add(sceneId);
            }
            return newSet;
        });
    };

    // Export selected to Production
    const handleExport = () => {
        if (!project || selectedScenes.size === 0) return;

        const selectedSceneData = project.scenes.filter(s => selectedScenes.has(s.id));

        // Extract unique characters and locations
        const charactersSet = new Set<string>();
        const locationsSet = new Set<string>();

        selectedSceneData.forEach(scene => {
            scene.detectedCharacters?.forEach(c => charactersSet.add(c));
            scene.detectedLocations?.forEach(l => locationsSet.add(l));
        });

        const characters: Partial<Character>[] = Array.from(charactersSet).map(name => ({
            id: generateId(),
            name,
            description: `Detected from video: ${project.videoName}`,
            masterImage: null,
            faceImage: null,
            bodyImage: null,
            sideImage: null,
            backImage: null,
            props: [],
            isDefault: false,
            isAnalyzing: false
        }));

        const locations: Partial<Location>[] = Array.from(locationsSet).map(name => ({
            id: generateId(),
            name,
            description: `Location detected from video analysis`,
            keywords: [],
            createdAt: new Date().toISOString()
        }));

        onExportToProduction(characters, locations);

        // Mark as exported
        setProject(p => p ? {
            ...p,
            scenes: p.scenes.map(s => selectedScenes.has(s.id) ? { ...s, isExported: true } : s)
        } : null);

        setSelectedScenes(new Set());
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Copy to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="min-h-screen bg-brand-dark text-brand-cream">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-brand-dark/90 backdrop-blur-xl border-b border-cyan-500/20">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #06B6D4 0%, #3B82F6 100%)',
                                    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)'
                                }}
                            >
                                <Search size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Intelligence Mode</h1>
                                <p className="text-xs text-white/50">Video Source Finder & Analysis</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Settings */}
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
                            >
                                <Settings size={18} />
                            </button>

                            {/* Export Button */}
                            {selectedScenes.size > 0 && (
                                <button
                                    onClick={handleExport}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, #F25C05 0%, #F24405 100%)',
                                        boxShadow: '0 4px 15px rgba(242, 92, 5, 0.4)'
                                    }}
                                >
                                    <ArrowRight size={16} />
                                    Export {selectedScenes.size} to Production
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-white/50 block mb-1">Scene Detection Threshold</label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="0.5"
                                        step="0.05"
                                        value={settings.sceneThreshold}
                                        onChange={(e) => setSettings(s => ({ ...s, sceneThreshold: parseFloat(e.target.value) }))}
                                        className="w-full accent-cyan-500"
                                    />
                                    <span className="text-xs text-cyan-400">{settings.sceneThreshold}</span>
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 block mb-1">Min Scene Duration (s)</label>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="5"
                                        step="0.5"
                                        value={settings.minSceneDuration}
                                        onChange={(e) => setSettings(s => ({ ...s, minSceneDuration: parseFloat(e.target.value) }))}
                                        className="w-full accent-cyan-500"
                                    />
                                    <span className="text-xs text-cyan-400">{settings.minSceneDuration}s</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                {/* Upload Zone (when no project) */}
                {!project && (
                    <div
                        className="relative flex flex-col items-center justify-center min-h-[400px] rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-all cursor-pointer group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="hidden"
                        />

                        {isUploading ? (
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 size={48} className="text-cyan-400 animate-spin" />
                                <p className="text-white font-semibold">Processing video...</p>
                                <p className="text-white/50 text-sm">Detecting scenes and extracting frames</p>
                            </div>
                        ) : (
                            <>
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                                        border: '1px solid rgba(6, 182, 212, 0.3)'
                                    }}
                                >
                                    <Upload size={32} className="text-cyan-400" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">Upload Compilation Video</h2>
                                <p className="text-white/50 text-center max-w-md">
                                    Drop a video compilation here or click to browse.
                                    <br />
                                    <span className="text-cyan-400">AI will detect scenes, analyze content, and find original sources.</span>
                                </p>
                                <div className="flex gap-4 mt-6">
                                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs">MP4</span>
                                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs">MOV</span>
                                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs">WEBM</span>
                                    <span className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs">AVI</span>
                                </div>
                            </>
                        )}

                        {/* Animated Border */}
                        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                    background: 'conic-gradient(from 0deg, transparent 0%, rgba(6, 182, 212, 0.4) 10%, transparent 20%)',
                                    animation: 'spin 4s linear infinite'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Project View */}
                {project && (
                    <div className="space-y-6">
                        {/* Progress Bar */}
                        {project.status !== 'completed' && (
                            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={16} className="text-cyan-400 animate-spin" />
                                        <span className="text-sm text-white font-medium">{project.currentStep || 'Processing...'}</span>
                                    </div>
                                    <button
                                        onClick={stopProcessing}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Stop
                                    </button>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{
                                            width: `${project.progress}%`,
                                            background: 'linear-gradient(90deg, #06B6D4 0%, #3B82F6 100%)'
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Video Info */}
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-4">
                                <Film size={20} className="text-cyan-400" />
                                <div>
                                    <p className="text-white font-semibold">{project.videoName}</p>
                                    <p className="text-white/50 text-sm">
                                        {project.scenes.length} scenes detected • {formatTime(project.videoDuration)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setProject(null)}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Scenes Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {project.scenes.map((scene) => (
                                <div
                                    key={scene.id}
                                    className={`relative rounded-xl overflow-hidden border transition-all cursor-pointer group ${selectedScenes.has(scene.id)
                                            ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                                            : 'border-white/10 hover:border-white/20'
                                        } ${scene.isExported ? 'opacity-50' : ''}`}
                                    onClick={() => toggleSceneSelection(scene.id)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-video bg-black/50">
                                        {scene.thumbnailBase64 ? (
                                            <img
                                                src={scene.thumbnailBase64}
                                                alt={`Scene ${scene.index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Film size={32} className="text-white/20" />
                                            </div>
                                        )}

                                        {/* Timecode Badge */}
                                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 rounded text-xs text-white font-mono">
                                            {formatTime(scene.startTime)} - {formatTime(scene.endTime)}
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute top-2 right-2">
                                            {scene.status === 'pending' && (
                                                <span className="px-2 py-1 bg-gray-500/80 rounded text-xs text-white">Pending</span>
                                            )}
                                            {scene.status === 'analyzing' && (
                                                <span className="px-2 py-1 bg-cyan-500/80 rounded text-xs text-white flex items-center gap-1">
                                                    <Loader2 size={10} className="animate-spin" /> Analyzing
                                                </span>
                                            )}
                                            {scene.status === 'sourcing' && (
                                                <span className="px-2 py-1 bg-blue-500/80 rounded text-xs text-white flex items-center gap-1">
                                                    <Search size={10} /> Finding Source
                                                </span>
                                            )}
                                            {scene.status === 'completed' && (
                                                <span className="px-2 py-1 bg-green-500/80 rounded text-xs text-white flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Done
                                                </span>
                                            )}
                                            {scene.status === 'error' && (
                                                <span className="px-2 py-1 bg-red-500/80 rounded text-xs text-white flex items-center gap-1">
                                                    <AlertCircle size={10} /> Error
                                                </span>
                                            )}
                                        </div>

                                        {/* Selection Checkbox */}
                                        <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedScenes.has(scene.id)
                                                ? 'bg-cyan-500 border-cyan-500'
                                                : 'border-white/50 bg-black/30'
                                            }`}>
                                            {selectedScenes.has(scene.id) && (
                                                <CheckCircle2 size={12} className="text-white" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-3 bg-white/5">
                                        {/* AI Description */}
                                        <p className="text-sm text-white/80 line-clamp-2 mb-2">
                                            {scene.aiDescription || <span className="text-white/40 italic">Awaiting analysis...</span>}
                                        </p>

                                        {/* Detected Elements */}
                                        {(scene.detectedCharacters?.length || scene.detectedLocations?.length) && (
                                            <div className="flex flex-wrap gap-1 mb-2">
                                                {scene.detectedCharacters?.slice(0, 2).map((char, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                                                        👤 {char}
                                                    </span>
                                                ))}
                                                {scene.detectedLocations?.slice(0, 2).map((loc, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs">
                                                        📍 {loc}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Source Link */}
                                        {scene.sourceUrl && (
                                            <div className="flex items-center gap-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                                                <ExternalLink size={12} className="text-cyan-400 flex-shrink-0" />
                                                <a
                                                    href={scene.sourceUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-cyan-300 hover:text-cyan-200 truncate flex-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {scene.sourceTitle || scene.sourceUrl}
                                                </a>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        copyToClipboard(scene.sourceUrl!);
                                                    }}
                                                    className="p-1 hover:bg-white/10 rounded"
                                                >
                                                    <Copy size={12} className="text-white/50" />
                                                </button>
                                            </div>
                                        )}

                                        {scene.sourceTimecode && (
                                            <p className="text-xs text-white/40 mt-1">
                                                <Clock size={10} className="inline mr-1" />
                                                Original timecode: {scene.sourceTimecode}
                                            </p>
                                        )}
                                    </div>

                                    {/* Exported Badge */}
                                    {scene.isExported && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                            <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                                                ✓ Exported
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* New Video Button */}
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={() => {
                                    setProject(null);
                                    setSelectedScenes(new Set());
                                }}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all"
                            >
                                <RefreshCw size={16} />
                                Process Another Video
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Stats */}
            {project && project.status === 'completed' && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 bg-gray-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-2">
                        <Film size={16} className="text-cyan-400" />
                        <span className="text-sm text-white">{project.scenes.length} scenes</span>
                    </div>
                    <div className="w-px h-4 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <Target size={16} className="text-green-400" />
                        <span className="text-sm text-white">
                            {project.scenes.filter(s => s.sourceUrl).length} sources found
                        </span>
                    </div>
                    <div className="w-px h-4 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-purple-400" />
                        <span className="text-sm text-white">
                            {new Set(project.scenes.flatMap(s => s.detectedCharacters || [])).size} characters
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IntelligenceWorkspace;
