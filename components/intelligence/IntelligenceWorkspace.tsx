import React, { useState, useCallback, useRef } from 'react';
import {
    Upload, Film, Download, Loader2, AlertCircle, X, Settings,
    Link, Clock, FileText, Table, Trash2, RefreshCw
} from 'lucide-react';
import { FootageEntry, SourcingProject } from './types';

interface IntelligenceWorkspaceProps {
    serverUrl?: string;
}

const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
    serverUrl = 'http://localhost:3001'
}) => {
    const [project, setProject] = useState<SourcingProject | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [settings, setSettings] = useState({
        sceneThreshold: 0.3,
        minSceneDuration: 1.0
    });
    const [isExporting, setIsExporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate unique ID
    const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Format time display
    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle Video Upload
    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('video/')) {
            alert('Please select a valid video file');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('video', file);
            formData.append('threshold', settings.sceneThreshold.toString());
            formData.append('minDuration', settings.minSceneDuration.toString());

            const response = await fetch(`${serverUrl}/api/intelligence/process-video`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process video');
            }

            const data = await response.json();

            const newProject: SourcingProject = {
                id: generateId(),
                videoPath: data.videoPath,
                videoName: file.name,
                videoDuration: data.duration,
                uploadedAt: Date.now(),
                footages: data.footages.map((f: any, index: number) => ({
                    id: generateId(),
                    index,
                    videoPath: f.videoPath,
                    thumbnailPath: f.thumbnailPath,
                    thumbnailBase64: f.thumbnailBase64,
                    sourceUrl: '',
                    sourceStart: '',
                    sourceEnd: '',
                    note: '',
                    duration: f.duration,
                    startTime: f.startTime,
                    endTime: f.endTime
                })),
                status: 'ready',
                progress: 100
            };

            setProject(newProject);

        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to process video: ' + (error as Error).message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [serverUrl, settings]);

    // Update footage field
    const updateFootage = (id: string, field: keyof FootageEntry, value: string) => {
        if (!project) return;
        setProject({
            ...project,
            footages: project.footages.map(f =>
                f.id === id ? { ...f, [field]: value } : f
            )
        });
    };

    // Delete footage entry
    const deleteFootage = (id: string) => {
        if (!project) return;
        if (!confirm('Remove this footage entry?')) return;
        setProject({
            ...project,
            footages: project.footages.filter(f => f.id !== id)
        });
    };

    // Export to Excel
    const handleExportExcel = async () => {
        if (!project || project.footages.length === 0) return;

        setIsExporting(true);

        try {
            const response = await fetch(`${serverUrl}/api/intelligence/export-excel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectName: project.videoName.replace(/\.[^/.]+$/, ''),
                    footages: project.footages.map((f, i) => ({
                        stt: i + 1,
                        thumbnailBase64: f.thumbnailBase64,
                        sourceUrl: f.sourceUrl,
                        sourceStart: f.sourceStart,
                        sourceEnd: f.sourceEnd,
                        note: f.note
                    }))
                })
            });

            if (!response.ok) throw new Error('Export failed');

            // Download the file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.videoName.replace(/\.[^/.]+$/, '')}_sources.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

        } catch (error) {
            console.error('Export error:', error);
            alert('Failed to export: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-brand-cream">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-brand-dark/95 backdrop-blur-xl border-b border-cyan-500/20">
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
                                <Film size={20} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Intelligence Mode</h1>
                                <p className="text-xs text-white/50">Video Source Tracker</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-2 rounded-lg transition-all ${showSettings ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'}`}
                            >
                                <Settings size={18} />
                            </button>

                            {project && project.footages.length > 0 && (
                                <button
                                    onClick={handleExportExcel}
                                    disabled={isExporting}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                                    style={{
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)'
                                    }}
                                >
                                    {isExporting ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Download size={16} />
                                    )}
                                    Export Excel
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Settings Panel */}
                    {showSettings && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <h3 className="text-sm font-semibold text-white mb-3">Scene Detection Settings</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs text-white/50 block mb-2">Scene Detection Threshold</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="0.5"
                                            step="0.05"
                                            value={settings.sceneThreshold}
                                            onChange={(e) => setSettings(s => ({ ...s, sceneThreshold: parseFloat(e.target.value) }))}
                                            className="flex-1 accent-cyan-500"
                                        />
                                        <span className="text-sm text-cyan-400 font-mono w-10">{settings.sceneThreshold}</span>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-1">Lower = more scenes detected</p>
                                </div>
                                <div>
                                    <label className="text-xs text-white/50 block mb-2">Min Scene Duration (seconds)</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="5"
                                            step="0.5"
                                            value={settings.minSceneDuration}
                                            onChange={(e) => setSettings(s => ({ ...s, minSceneDuration: parseFloat(e.target.value) }))}
                                            className="flex-1 accent-cyan-500"
                                        />
                                        <span className="text-sm text-cyan-400 font-mono w-10">{settings.minSceneDuration}s</span>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-1">Ignore scenes shorter than this</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-6 py-8">
                {/* Upload Zone */}
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
                                    Drop a video file here or click to browse.
                                    <br />
                                    <span className="text-cyan-400">FFmpeg will detect and split scenes automatically.</span>
                                </p>
                                <div className="flex gap-3 mt-6">
                                    {['MP4', 'MOV', 'WEBM', 'AVI'].map(ext => (
                                        <span key={ext} className="px-3 py-1 rounded-full bg-white/5 text-white/40 text-xs font-medium">
                                            {ext}
                                        </span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Project View */}
                {project && (
                    <div className="space-y-6">
                        {/* Video Info Bar */}
                        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4 border border-white/10">
                            <div className="flex items-center gap-4">
                                <Film size={20} className="text-cyan-400" />
                                <div>
                                    <p className="text-white font-semibold">{project.videoName}</p>
                                    <p className="text-white/50 text-sm">
                                        {project.footages.length} footages • {formatTime(project.videoDuration)} total
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (confirm('Close this project? Unsaved changes will be lost.')) {
                                        setProject(null);
                                    }
                                }}
                                className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 transition-all"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Footage Table */}
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            {/* Table Header */}
                            <div className="grid grid-cols-12 gap-4 p-4 bg-white/5 border-b border-white/10 text-xs font-semibold text-white/50 uppercase tracking-wider">
                                <div className="col-span-1 text-center">#</div>
                                <div className="col-span-2">Thumbnail</div>
                                <div className="col-span-4">Source URL</div>
                                <div className="col-span-1">Start</div>
                                <div className="col-span-1">End</div>
                                <div className="col-span-2">Note</div>
                                <div className="col-span-1 text-center">Actions</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-white/5">
                                {project.footages.map((footage, index) => (
                                    <div
                                        key={footage.id}
                                        className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/[0.02] transition-colors"
                                    >
                                        {/* Index */}
                                        <div className="col-span-1 text-center">
                                            <span className="text-white/40 font-mono text-sm">
                                                {String(index + 1).padStart(3, '0')}
                                            </span>
                                        </div>

                                        {/* Thumbnail */}
                                        <div className="col-span-2">
                                            <div className="relative aspect-video bg-black/30 rounded-lg overflow-hidden group">
                                                {footage.thumbnailBase64 ? (
                                                    <img
                                                        src={footage.thumbnailBase64}
                                                        alt={`F${String(index + 1).padStart(3, '0')}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        <Film size={20} className="text-white/20" />
                                                    </div>
                                                )}
                                                {/* Duration Badge */}
                                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 rounded text-[10px] text-white font-mono">
                                                    {formatTime(footage.duration)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Source URL */}
                                        <div className="col-span-4">
                                            <div className="relative">
                                                <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                                <input
                                                    type="text"
                                                    value={footage.sourceUrl}
                                                    onChange={(e) => updateFootage(footage.id, 'sourceUrl', e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                                />
                                            </div>
                                        </div>

                                        {/* Source Start */}
                                        <div className="col-span-1">
                                            <input
                                                type="text"
                                                value={footage.sourceStart}
                                                onChange={(e) => updateFootage(footage.id, 'sourceStart', e.target.value)}
                                                placeholder="00:00"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-center font-mono"
                                            />
                                        </div>

                                        {/* Source End */}
                                        <div className="col-span-1">
                                            <input
                                                type="text"
                                                value={footage.sourceEnd}
                                                onChange={(e) => updateFootage(footage.id, 'sourceEnd', e.target.value)}
                                                placeholder="00:00"
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-center font-mono"
                                            />
                                        </div>

                                        {/* Note */}
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={footage.note}
                                                onChange={(e) => updateFootage(footage.id, 'note', e.target.value)}
                                                placeholder="Notes..."
                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                                            />
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-1 flex justify-center">
                                            <button
                                                onClick={() => deleteFootage(footage.id)}
                                                className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-all"
                                                title="Remove entry"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Empty State */}
                            {project.footages.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-white/40">
                                    <Table size={32} className="mb-2" />
                                    <p className="text-sm">No footages detected</p>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center pt-4">
                            <button
                                onClick={() => {
                                    setProject(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-all text-sm"
                            >
                                <RefreshCw size={14} />
                                Process Another Video
                            </button>

                            <div className="flex items-center gap-3 text-xs text-white/40">
                                <FileText size={14} />
                                <span>Fill in source URLs and timecodes, then export to Excel</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default IntelligenceWorkspace;
