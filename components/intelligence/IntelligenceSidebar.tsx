import React from 'react';
import { Film, Search, ChevronLeft, ChevronRight, Zap, Clapperboard, Scissors } from 'lucide-react';

export type AppMode = 'production' | 'intelligence' | 'sourcing';

interface IntelligenceSidebarProps {
    currentMode: AppMode;
    onModeChange: (mode: AppMode) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

export const IntelligenceSidebar: React.FC<IntelligenceSidebarProps> = ({
    currentMode,
    onModeChange,
    isCollapsed,
    onToggleCollapse
}) => {
    const modes = [
        {
            id: 'production' as AppMode,
            label: 'Production',
            shortLabel: 'PROD',
            icon: Clapperboard,
            description: 'Storyboard & Generation',
            gradient: 'from-brand-orange to-brand-red',
            glowColor: 'rgba(242, 92, 5, 0.4)'
        },
        {
            id: 'sourcing' as AppMode,
            label: 'Sourcing',
            shortLabel: 'SRC',
            icon: Scissors,
            description: 'Video Split & Report',
            gradient: 'from-emerald-500 to-teal-600',
            glowColor: 'rgba(16, 185, 129, 0.4)'
        },
        {
            id: 'intelligence' as AppMode,
            label: 'Intelligence',
            shortLabel: 'INTEL',
            icon: Search,
            description: 'Video Source Finder',
            gradient: 'from-cyan-500 to-blue-600',
            glowColor: 'rgba(6, 182, 212, 0.4)'
        }
    ];

    return (
        <div
            className={`fixed left-0 top-0 h-full z-[60] transition-all duration-300 ease-in-out ${isCollapsed ? 'w-16' : 'w-56'
                }`}
            style={{
                background: 'linear-gradient(180deg, rgba(38, 5, 5, 0.98) 0%, rgba(20, 2, 2, 0.99) 100%)',
                borderRight: '1px solid rgba(242, 92, 5, 0.15)',
                backdropFilter: 'blur(20px)'
            }}
        >
            {/* Logo / Brand */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/5 ${isCollapsed ? 'justify-center' : ''}`}>
                <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                        background: 'linear-gradient(135deg, #F25C05 0%, #F24405 100%)',
                        boxShadow: '0 4px 15px rgba(242, 92, 5, 0.4)'
                    }}
                >
                    <Zap size={18} className="text-white" />
                </div>
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white tracking-wider">ITERA</span>
                        <span className="text-[10px] text-white/40 font-medium tracking-widest">STUDIO</span>
                    </div>
                )}
            </div>

            {/* Mode Selector */}
            <div className={`flex flex-col gap-2 p-3 mt-2`}>
                <span className={`text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1 ${isCollapsed ? 'text-center' : 'px-2'}`}>
                    {isCollapsed ? '—' : 'Workspace'}
                </span>

                {modes.map((mode) => {
                    const isActive = currentMode === mode.id;
                    const Icon = mode.icon;

                    return (
                        <button
                            key={mode.id}
                            onClick={() => onModeChange(mode.id)}
                            className={`relative group flex items-center gap-3 rounded-xl transition-all duration-300 ${isCollapsed ? 'p-3 justify-center' : 'px-4 py-3'
                                } ${isActive
                                    ? 'text-white'
                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                                }`}
                            style={isActive ? {
                                background: `linear-gradient(135deg, ${mode.gradient.split(' ')[1]} 0%, ${mode.gradient.split(' ')[3]} 100%)`,
                                boxShadow: `0 4px 20px ${mode.glowColor}, inset 0 1px 0 rgba(255,255,255,0.1)`
                            } : {}}
                        >
                            {/* Icon */}
                            <div className={`flex items-center justify-center ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`}>
                                <Icon size={isCollapsed ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
                            </div>

                            {/* Label */}
                            {!isCollapsed && (
                                <div className="flex flex-col items-start">
                                    <span className={`text-sm font-semibold ${isActive ? 'text-white' : ''}`}>
                                        {mode.label}
                                    </span>
                                    <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                                        {mode.description}
                                    </span>
                                </div>
                            )}

                            {/* Active Indicator Dot (collapsed mode) */}
                            {isCollapsed && isActive && (
                                <div
                                    className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white"
                                    style={{ boxShadow: '0 0 8px rgba(255,255,255,0.8)' }}
                                />
                            )}

                            {/* Tooltip for collapsed mode */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/10">
                                    {mode.label}
                                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45 border-l border-b border-white/10" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={onToggleCollapse}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-all border border-white/10"
            >
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Decorative Elements */}
            <div
                className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(242, 92, 5, 0.03) 100%)'
                }}
            />
        </div>
    );
};

export default IntelligenceSidebar;
