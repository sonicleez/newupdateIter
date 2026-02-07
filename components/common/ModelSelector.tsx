import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface ModelOption {
    value: string;
    label: string;
    description?: string;
    provider?: string;
    isHeader?: boolean;
    color?: 'blue' | 'purple' | 'yellow' | 'green' | 'red' | string;
}

interface ModelSelectorProps {
    models: ModelOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
    models,
    value,
    onChange,
    className = '',
    size = 'md'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedModel = models.find(m => m.value === value);

    // Color mapping for borders/labels
    const colorClasses: Record<string, string> = {
        blue: 'border-blue-500 text-blue-400',
        purple: 'border-purple-500 text-purple-400',
        yellow: 'border-yellow-500 text-yellow-400',
        green: 'border-green-500 text-green-400',
        red: 'border-red-500 text-red-400',
        cyan: 'border-cyan-500 text-cyan-400',
    };

    const colorBgClasses: Record<string, string> = {
        blue: 'bg-blue-500/10',
        purple: 'bg-purple-500/10',
        yellow: 'bg-yellow-500/10',
        green: 'bg-green-500/10',
        red: 'bg-red-500/10',
        cyan: 'bg-cyan-500/10',
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    const activeColorClass = selectedModel?.color ? colorClasses[selectedModel.color] || '' : '';

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg border text-white transition-colors w-full justify-between ${sizeClasses[size]} ${activeColorClass ? `border-l-4 ${activeColorClass.split(' ')[0]}` : 'border-gray-600'}`}
            >
                <span className={`truncate font-bold ${activeColorClass.split(' ')[1] || ''}`}>
                    {selectedModel?.label || 'Select Model'}
                </span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-80 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[100] custom-scrollbar">
                    {models.map((model, idx) => {
                        if (model.isHeader) {
                            return (
                                <div
                                    key={model.value || idx}
                                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b border-gray-800 mt-2 first:mt-0 ${model.color ? colorClasses[model.color].split(' ')[1] : 'text-gray-500'}`}
                                >
                                    {model.label}
                                </div>
                            );
                        }

                        const isSelected = value === model.value;
                        const modelColorClass = model.color ? colorClasses[model.color] : '';
                        const modelBgClass = model.color ? colorBgClasses[model.color] : '';

                        return (
                            <button
                                key={model.value}
                                onClick={() => {
                                    onChange(model.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-all border-l-2 ${isSelected
                                    ? (model.color ? `${colorClasses[model.color].split(' ')[0]} ${modelBgClass}` : 'bg-purple-600/20 border-purple-500')
                                    : 'border-transparent'
                                    }`}
                            >
                                <div className={`font-bold text-sm ${isSelected ? (model.color ? colorClasses[model.color].split(' ')[1] : 'text-purple-300') : 'text-gray-200'}`}>
                                    {model.label}
                                </div>
                                {model.description && (
                                    <div className="text-[10px] text-gray-500 mt-0.5 line-clamp-1 italic">{model.description}</div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
