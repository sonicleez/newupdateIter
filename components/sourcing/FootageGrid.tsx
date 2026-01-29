import React, { useState } from 'react';
import { 
    ExternalLink, 
    Clock, 
    StickyNote, 
    CheckCircle2,
    Play,
    Image as ImageIcon
} from 'lucide-react';
import { FootageItem } from './types';

interface FootageGridProps {
    footages: FootageItem[];
    projectName: string;
    onUpdateFootage: (id: string, updates: Partial<FootageItem>) => void;
}

export const FootageGrid: React.FC<FootageGridProps> = ({
    footages,
    projectName,
    onUpdateFootage
}) => {
    const [expandedNote, setExpandedNote] = useState<string | null>(null);

    const formatTimecode = (value: string): string => {
        // Auto-format HH:MM:SS
        const nums = value.replace(/\D/g, '').slice(0, 6);
        if (nums.length <= 2) return nums;
        if (nums.length <= 4) return `${nums.slice(0, 2)}:${nums.slice(2)}`;
        return `${nums.slice(0, 2)}:${nums.slice(2, 4)}:${nums.slice(4)}`;
    };

    const isComplete = (f: FootageItem): boolean => {
        return !!(f.sourceUrl && f.sourceStart && f.sourceEnd);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-white">
                    Footage Data Entry
                </h2>
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/40">
                        {footages.filter(isComplete).length} / {footages.length} complete
                    </span>
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ 
                                width: `${(footages.filter(isComplete).length / footages.length) * 100}%` 
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5">
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider w-12">
                                STT
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider w-32">
                                Thumbnail
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider">
                                Source URL
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider w-32">
                                Start
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider w-32">
                                End
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-white/50 uppercase tracking-wider">
                                Note
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-white/50 uppercase tracking-wider w-16">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {footages.map((footage, index) => (
                            <tr 
                                key={footage.id}
                                className={`group transition-colors ${
                                    isComplete(footage) 
                                        ? 'bg-emerald-500/5' 
                                        : 'hover:bg-white/[0.02]'
                                }`}
                            >
                                {/* STT */}
                                <td className="px-4 py-3">
                                    <span className="text-sm font-mono text-white/60">
                                        {String(index + 1).padStart(3, '0')}
                                    </span>
                                </td>

                                {/* Thumbnail */}
                                <td className="px-4 py-3">
                                    <div className="relative w-24 h-14 rounded-lg overflow-hidden bg-white/5 group-hover:ring-2 ring-white/10 transition-all">
                                        {footage.thumbnailBase64 ? (
                                            <img 
                                                src={footage.thumbnailBase64}
                                                alt={footage.filename}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white/20">
                                                <ImageIcon size={20} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                                            <Play size={16} className="text-white" />
                                        </div>
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white/70 font-mono">
                                            {footage.duration ? `${footage.duration.toFixed(1)}s` : '--'}
                                        </div>
                                    </div>
                                </td>

                                {/* Source URL */}
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={footage.sourceUrl}
                                            onChange={(e) => onUpdateFootage(footage.id, { sourceUrl: e.target.value })}
                                            placeholder="https://youtube.com/..."
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
                                        />
                                        {footage.sourceUrl && (
                                            <a 
                                                href={footage.sourceUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-white/40 hover:text-emerald-400 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </div>
                                </td>

                                {/* Start Timecode */}
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            value={footage.sourceStart}
                                            onChange={(e) => onUpdateFootage(footage.id, { 
                                                sourceStart: formatTimecode(e.target.value) 
                                            })}
                                            placeholder="00:00:00"
                                            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
                                        />
                                    </div>
                                </td>

                                {/* End Timecode */}
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        <Clock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            value={footage.sourceEnd}
                                            onChange={(e) => onUpdateFootage(footage.id, { 
                                                sourceEnd: formatTimecode(e.target.value) 
                                            })}
                                            placeholder="00:00:00"
                                            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white font-mono placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all"
                                        />
                                    </div>
                                </td>

                                {/* Note */}
                                <td className="px-4 py-3">
                                    <div className="relative">
                                        <StickyNote size={12} className="absolute left-3 top-3 text-white/30" />
                                        <textarea
                                            value={footage.note}
                                            onChange={(e) => onUpdateFootage(footage.id, { note: e.target.value })}
                                            placeholder="Add notes..."
                                            rows={expandedNote === footage.id ? 3 : 1}
                                            onFocus={() => setExpandedNote(footage.id)}
                                            onBlur={() => setExpandedNote(null)}
                                            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.07] transition-all resize-none"
                                        />
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3 text-center">
                                    {isComplete(footage) ? (
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20">
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5">
                                            <div className="w-2 h-2 rounded-full bg-white/20" />
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {footages.length === 0 && (
                <div className="text-center py-12 text-white/40">
                    No footage clips detected
                </div>
            )}
        </div>
    );
};

export default FootageGrid;
