import React, { useState, useCallback, useRef } from 'react';
import { 
    Upload, 
    Film, 
    Loader2, 
    FileVideo, 
    Download, 
    Trash2, 
    ExternalLink,
    Clock,
    StickyNote,
    CheckCircle2,
    AlertCircle,
    FolderOpen,
    Scissors
} from 'lucide-react';
import { FootageItem, SourcingProject } from './types';
import { FootageGrid } from './FootageGrid';
import { generateId } from '../../utils/helpers';

interface SourcingWorkspaceProps {
    serverUrl?: string;
}

export const SourcingWorkspace: React.FC<SourcingWorkspaceProps> = ({ 
    serverUrl = 'http://localhost:3333' 
}) => {
    const [project, setProject] = useState<SourcingProject | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [processingProgress, setProcessingProgress] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file upload
    const handleFileUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file');
            return;
        }

        const projectId = generateId();
        setProject({
            id: projectId,
            name: file.name.replace(/\.[^/.]+$/, ''),
            originalVideoPath: '',
            originalVideoName: file.name,
            footages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'uploading'
        });

        try {
            // Upload to server
            setProcessingProgress('Uploading video...');
            const formData = new FormData();
            formData.append('video', file);
            formData.append('projectId', projectId);

            const uploadRes = await fetch(`${serverUrl}/api/sourcing/upload`, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('Upload failed');
            }

            const uploadData = await uploadRes.json();
            
            setProject(prev => prev ? {
                ...prev,
                originalVideoPath: uploadData.videoPath,
                status: 'processing'
            } : null);

            // Trigger scene detection
            setProcessingProgress('Detecting scenes with FFmpeg...');
            const detectRes = await fetch(`${serverUrl}/api/sourcing/detect-scenes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectId, 
                    videoPath: uploadData.videoPath 
                })
            });

            if (!detectRes.ok) {
                throw new Error('Scene detection failed');
            }

            const detectData = await detectRes.json();
            setProcessingProgress(`Found ${detectData.totalScenes} scenes. Splitting...`);

            // Split video and capture frames
            const splitRes = await fetch(`${serverUrl}/api/sourcing/split-and-capture`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    projectId, 
                    videoPath: uploadData.videoPath,
                    scenes: detectData.scenes
                })
            });

            if (!splitRes.ok) {
                throw new Error('Splitting failed');
            }

            const splitData = await splitRes.json();

            // Create footage items
            const footages: FootageItem[] = splitData.footages.map((f: any, idx: number) => ({
                id: generateId(),
                filename: f.filename,
                videoPath: f.videoPath,
                thumbnailPath: f.thumbnailPath,
                thumbnailBase64: f.thumbnailBase64,
                sourceUrl: '',
                sourceStart: '',
                sourceEnd: '',
                note: '',
                duration: f.duration,
                sceneIndex: idx
            }));

            setProject(prev => prev ? {
                ...prev,
                footages,
                status: 'ready',
                updatedAt: new Date().toISOString()
            } : null);

            setProcessingProgress('');

        } catch (error: any) {
            console.error('[Sourcing] Error:', error);
            setProject(prev => prev ? {
                ...prev,
                status: 'error',
                error: error.message || 'Processing failed'
            } : null);
            setProcessingProgress('');
        }
    }, [serverUrl]);

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    // Update footage item
    const updateFootage = useCallback((id: string, updates: Partial<FootageItem>) => {
        setProject(prev => {
            if (!prev) return null;
            return {
                ...prev,
                footages: prev.footages.map(f => 
                    f.id === id ? { ...f, ...updates } : f
                ),
                updatedAt: new Date().toISOString()
            };
        });
    }, []);

    // Export to Excel
    const handleExportExcel = useCallback(async () => {
        if (!project || project.footages.length === 0) return;

        try {
            const response = await fetch(`${serverUrl}/api/sourcing/export-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: project.name,
                    footages: project.footages
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.name}_sourcing.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('[Sourcing] Export error:', error);
            alert('Failed to export Excel file');
        }
    }, [project, serverUrl]);

    // Reset project
    const handleReset = () => {
        if (confirm('Are you sure you want to clear this project?')) {
            setProject(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <Scissors size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Video Sourcing</h1>
                            <p className="text-xs text-white/40">Split, annotate, and export source footage</p>
                        </div>
                    </div>

                    {project && project.status === 'ready' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportExcel}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-all text-sm shadow-lg shadow-emerald-600/20"
                            >
                                <Download size={16} />
                                Export Excel
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-semibold transition-all text-sm border border-red-500/20"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
                {!project ? (
                    // Upload Zone
                    <div 
                        className={`h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-300 ${
                            isDragging 
                                ? 'border-emerald-500 bg-emerald-500/10' 
                                : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        <div className="text-center max-w-md">
                            <div 
                                className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <Upload size={32} className="text-emerald-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Upload Compilation Video
                            </h2>
                            <p className="text-white/50 text-sm mb-6">
                                Drag & drop your video file here, or click to browse.
                                <br />
                                <span className="text-white/30">Supported: MP4, MOV, AVI, MKV</span>
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 mx-auto"
                            >
                                <FolderOpen size={18} />
                                Choose File
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                ) : project.status === 'uploading' || project.status === 'processing' ? (
                    // Processing State
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                                <div className="absolute inset-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Film size={28} className="text-emerald-500" />
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Processing Video
                            </h2>
                            <p className="text-emerald-400 text-sm font-medium animate-pulse">
                                {processingProgress || 'Please wait...'}
                            </p>
                            <p className="text-white/40 text-xs mt-4">
                                {project.originalVideoName}
                            </p>
                        </div>
                    </div>
                ) : project.status === 'error' ? (
                    // Error State
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                Processing Failed
                            </h2>
                            <p className="text-red-400 text-sm mb-6">
                                {project.error || 'An unknown error occurred'}
                            </p>
                            <button
                                onClick={handleReset}
                                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                ) : (
                    // Ready - Show Grid
                    <FootageGrid
                        footages={project.footages}
                        projectName={project.name}
                        onUpdateFootage={updateFootage}
                    />
                )}
            </div>

            {/* Status Bar */}
            {project && project.status === 'ready' && (
                <div className="flex-shrink-0 px-6 py-3 bg-black/30 border-t border-white/5">
                    <div className="flex items-center justify-between text-xs text-white/40">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <Film size={12} />
                                {project.footages.length} clips
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Clock size={12} />
                                {project.footages.filter(f => f.sourceUrl).length} sourced
                            </span>
                        </div>
                        <span>
                            Project: {project.name}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SourcingWorkspace;
