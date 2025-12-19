import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import { Character, Product, ScriptPreset } from '../../types';
import { PresetSelector } from '../PresetSelector';
import { createCustomPreset } from '../../utils/scriptPresets';
import { PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER, CREATIVE_PRESETS } from '../../constants/presets';

export interface ScriptGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (idea: string, count: number, selectedCharacterIds: string[], selectedProductIds: string[]) => Promise<void>;
    isGenerating: boolean;
    activePresetId: string;
    customPresets: ScriptPreset[];
    onPresetChange: (presetId: string) => void;
    characters: Character[];
    products: Product[];
    customInstruction?: string;
    onCustomInstructionChange?: (val: string) => void;
    onAddPreset: (preset: ScriptPreset) => void;
}

export const ScriptGeneratorModal: React.FC<ScriptGeneratorModalProps> = ({
    isOpen,
    onClose,
    onGenerate,
    isGenerating,
    activePresetId,
    customPresets,
    onPresetChange,
    characters,
    products,
    customInstruction,
    onCustomInstructionChange,
    onAddPreset
}) => {
    const [idea, setIdea] = useState('');
    const [sceneCount, setSceneCount] = useState(5);
    const [isCreatingPreset, setIsCreatingPreset] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetDesc, setNewPresetDesc] = useState('');
    const [newPresetSystemPrompt, setNewPresetSystemPrompt] = useState('');
    const [newPresetTone, setNewPresetTone] = useState('');
    const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen && characters.length > 0) {
            setSelectedCharacterIds(characters.map(c => c.id));
        }
        if (isOpen && products.length > 0) {
            setSelectedProductIds(products.map(p => p.id));
        }
    }, [isOpen, characters.length, products.length]);

    const handlePresetSelect = (id: string) => {
        if (id === 'create_custom') {
            setIsCreatingPreset(true);
            setNewPresetName('');
            setNewPresetDesc('');
            setNewPresetSystemPrompt('');
            setNewPresetTone('');
        } else {
            onPresetChange(id);
        }
    };

    const handleSaveNewPreset = () => {
        if (!newPresetName.trim() || !newPresetSystemPrompt.trim()) {
            alert("Tên và System Prompt là bắt buộc!");
            return;
        }
        const newPreset = createCustomPreset({
            name: newPresetName,
            description: newPresetDesc,
            category: 'custom',
            icon: '✨',
            systemPrompt: newPresetSystemPrompt,
            outputFormat: { hasDialogue: true, hasNarration: true, hasCameraAngles: true, sceneStructure: 'custom' },
            toneKeywords: newPresetTone.split(/[,;]/).map(s => s.trim()).filter(Boolean),
            sceneGuidelines: 'Tự do sáng tạo theo System Prompt.',
            exampleOutput: 'Không có ví dụ (Custom).'
        });
        onAddPreset(newPreset);
        onPresetChange(newPreset.id);
        setIsCreatingPreset(false);
    };

    const toggleCharacter = (id: string) => {
        setSelectedCharacterIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const toggleProduct = (id: string) => {
        setSelectedProductIds(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const handleSubmit = () => {
        if (!idea.trim()) return alert("Vui lòng nhập ý tưởng.");
        onClose();
        setIdea('');
        onGenerate(idea, sceneCount, selectedCharacterIds, selectedProductIds);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Viết Kịch Bản AI - Cinematic Pro" maxWidth="max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                {/* Left Column: Input and Configuration (3/5 width) */}
                <div className="lg:col-span-3 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                            📝 Ý tưởng câu chuyện
                        </label>
                        <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="VD: Một cuộc rượt đuổi nghẹt thở dưới mưa neon, nhân vật chính bị thương và đang lẩn trốn trong một con hẻm chật hẹp..."
                            className="w-full h-48 px-4 py-3 bg-gray-800 border border-brand-green/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent resize-none shadow-inner text-lg"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-bold text-gray-300 flex items-center gap-2">
                            ✨ Hướng dẫn bổ sung cho AI (Meta Tokens)
                        </label>
                        <div className="text-[10px] text-gray-500 italic bg-gray-900/50 p-2 rounded border border-gray-800 mb-1">
                            Mẹo: AI sẽ ưu tiên các từ khóa kỹ thuật này để áp dụng ánh sáng, ống kính và nhịp điệu.
                        </div>
                        <textarea
                            value={customInstruction || ''}
                            onChange={(e) => onCustomInstructionChange?.(e.target.value)}
                            placeholder="VD: Viết theo phong cách hài hước, dồn dập, tập trung vào thoại..."
                            className="w-full h-32 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-500 resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-300">Số lượng phân cảnh ước lượng:</span>
                            <div className="flex items-center bg-gray-950 rounded-lg p-1 border border-gray-700">
                                <button onClick={() => setSceneCount(Math.max(1, sceneCount - 1))} className="w-8 h-8 text-gray-400 hover:text-white transition-colors">-</button>
                                <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={sceneCount}
                                    onChange={(e) => setSceneCount(parseInt(e.target.value) || 1)}
                                    className="w-12 bg-transparent text-center text-white text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button onClick={() => setSceneCount(Math.min(50, sceneCount + 1))} className="w-8 h-8 text-gray-400 hover:text-white transition-colors">+</button>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isGenerating}
                            className={`px-8 py-3 font-bold text-white rounded-xl bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all disabled:opacity-50 flex items-center gap-3 shadow-lg shadow-orange-950/20 active:scale-95`}
                        >
                            {isGenerating ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Đang phân cảnh...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">🎬</span>
                                    <span>Tạo Kịch Bản Điện Ảnh</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Column: Selectors and Cinematic Tags (2/5 width) */}
                <div className="lg:col-span-2 flex flex-col space-y-6">

                    {/* Preset Section */}
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Thể loại kịch bản</label>
                        {!isCreatingPreset ? (
                            <PresetSelector
                                activePresetId={activePresetId}
                                customPresets={customPresets}
                                onSelect={handlePresetSelect}
                            />
                        ) : (
                            <div className="bg-gray-800/80 p-4 rounded-lg border border-brand-orange/50 animate-fade-in space-y-3">
                                <div className="flex justify-between items-center text-brand-orange font-bold text-sm">
                                    <span>✨ Tạo Thể Loại Mới</span>
                                    <button onClick={() => setIsCreatingPreset(false)} className="text-gray-400 hover:text-white">✕</button>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Tên thể loại"
                                    value={newPresetName}
                                    onChange={e => setNewPresetName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-brand-orange focus:outline-none"
                                />
                                <textarea
                                    placeholder="Hướng dẫn AI viết (System Prompt)"
                                    value={newPresetSystemPrompt}
                                    onChange={e => setNewPresetSystemPrompt(e.target.value)}
                                    rows={2}
                                    className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-brand-orange focus:outline-none"
                                />
                                <div className="flex justify-end gap-2 pt-1">
                                    <button onClick={handleSaveNewPreset} className="px-3 py-1 text-xs font-bold text-white bg-brand-orange rounded hover:bg-orange-600">Lưu</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Character & Product Selectors */}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                <span>👤 Nhân vật ({selectedCharacterIds.length}/{characters.length})</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                                {characters.map(char => (
                                    <label key={char.id} className={`flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer ${selectedCharacterIds.includes(char.id) ? 'bg-green-500/10 border-green-500/50' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCharacterIds.includes(char.id)}
                                            onChange={() => toggleCharacter(char.id)}
                                            className="rounded border-gray-600 text-green-500 focus:ring-green-500 bg-gray-700 w-3 h-3"
                                        />
                                        <div className="flex items-center space-x-1.5 truncate">
                                            {char.masterImage ? (
                                                <img src={char.masterImage} alt="" className="w-5 h-5 rounded-full object-cover" />
                                            ) : (
                                                <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[8px]">{char.name.charAt(0) || '?'}</div>
                                            )}
                                            <span className="text-[10px] text-gray-300 truncate">{char.name || 'Unnamed'}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                <span>📦 Sản phẩm/Đạo cụ ({selectedProductIds.length})</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-2 custom-scrollbar">
                                {products.map(prod => (
                                    <label key={prod.id} className={`flex items-center space-x-2 p-1.5 rounded-lg border transition-all cursor-pointer ${selectedProductIds.includes(prod.id) ? 'bg-brand-orange/10 border-brand-orange/50' : 'bg-gray-900/50 border-gray-800 hover:border-gray-600'}`}>
                                        <input
                                            type="checkbox"
                                            checked={selectedProductIds.includes(prod.id)}
                                            onChange={() => toggleProduct(prod.id)}
                                            className="rounded border-gray-600 text-brand-orange focus:ring-brand-orange bg-gray-700 w-3 h-3"
                                        />
                                        <div className="flex items-center space-x-1.5 truncate">
                                            {prod.masterImage ? (
                                                <img src={prod.masterImage} alt="" className="w-5 h-5 rounded object-cover" />
                                            ) : (
                                                <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center text-[10px]">📦</div>
                                            )}
                                            <span className="text-[10px] text-gray-300 truncate">{prod.name || 'Unnamed'}</span>
                                        </div>
                                    </label>
                                ))}
                                {products.length === 0 && <div className="col-span-2 text-[10px] text-gray-600 text-center py-2 italic border border-dashed border-gray-800 rounded">Chưa có sản phẩm</div>}
                            </div>
                        </div>
                    </div>

                    {/* Cinematic Tags Group */}
                    <div className="flex-1 bg-gray-800/30 p-4 rounded-xl border border-gray-700 overflow-y-auto max-h-80 custom-scrollbar">
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">🏷️ Thẻ Cinematic Nhanh</label>
                        <div className="space-y-4">
                            {CREATIVE_PRESETS.map((cat) => (
                                <div key={cat.category}>
                                    <label className="block text-[9px] uppercase tracking-widest font-bold text-gray-600 mb-2">{cat.category}</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {cat.items.map((item: any) => {
                                            const isSelected = (customInstruction || '').includes(item.value);
                                            return (
                                                <button
                                                    key={item.label}
                                                    onClick={() => {
                                                        const current = customInstruction || '';
                                                        if (isSelected) {
                                                            const updated = current.replace(`${item.value}, `, '').replace(item.value, '').trim();
                                                            onCustomInstructionChange?.(updated.endsWith(',') ? updated.slice(0, -1) : updated);
                                                        } else {
                                                            onCustomInstructionChange?.(current ? `${current}, ${item.value}` : item.value);
                                                        }
                                                    }}
                                                    className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition-all border shadow-sm ${isSelected
                                                        ? 'bg-brand-orange text-white border-brand-orange shadow-brand-orange/20 scale-105'
                                                        : 'bg-gray-900 text-gray-500 border-gray-700 hover:border-brand-orange/50 hover:text-gray-300'
                                                        }`}
                                                >
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
