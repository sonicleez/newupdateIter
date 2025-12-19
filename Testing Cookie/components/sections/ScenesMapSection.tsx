import React from 'react';
import { Table, LayoutGrid, Trash2, Plus } from 'lucide-react';
import { SceneRow } from '../scenes/SceneRow';
import { StoryBoardCard } from '../scenes/StoryBoardCard';
import { Tooltip } from '../common/Tooltip';
import { Scene, Character, Product } from '../../types';
import { PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from '../../constants/presets';

interface ScenesMapSectionProps {
    scenes: Scene[];
    viewMode: 'table' | 'storyboard';
    setViewMode: (mode: 'table' | 'storyboard') => void;
    characters: Character[];
    products: Product[];
    updateScene: (id: string, updates: Partial<Scene>) => void;
    removeScene: (id: string) => void;
    insertScene: (index: number) => void;
    moveScene: (fromIndex: number, toIndex: number) => void;
    performImageGeneration: (id: string, refinement?: string, isEndFrame?: boolean) => void;
    handleOpenImageViewer: (index: number) => void;
    handleGenerateAllImages: () => void;
    isBatchGenerating: boolean;
    handleGenerateAllVeoPrompts: () => void;
    isVeoGenerating: boolean;
    handleGenerateAllVideos: () => void;
    isVideoGenerating: boolean;
    addScene: () => void;
    detailedScript: string;
    onDetailedScriptChange: (val: string) => void;
    onCleanAll: () => void;
    draggedSceneIndex: number | null;
    setDraggedSceneIndex: (idx: number | null) => void;
    dragOverIndex: number | null;
    setDragOverIndex: (idx: number | null) => void;
}

export const ScenesMapSection: React.FC<ScenesMapSectionProps> = ({
    scenes,
    viewMode,
    setViewMode,
    characters,
    products,
    updateScene,
    removeScene,
    insertScene,
    moveScene,
    performImageGeneration,
    handleOpenImageViewer,
    handleGenerateAllImages,
    isBatchGenerating,
    handleGenerateAllVeoPrompts,
    isVeoGenerating,
    handleGenerateAllVideos,
    isVideoGenerating,
    addScene,
    detailedScript,
    onDetailedScriptChange,
    onCleanAll,
    draggedSceneIndex,
    setDraggedSceneIndex,
    dragOverIndex,
    setDragOverIndex
}) => {
    return (
        <div className="my-16">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-6">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-red">Scenes Maps</h2>
                    <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-700/50">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <Table size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Table</span>
                        </button>
                        <button
                            onClick={() => setViewMode('storyboard')}
                            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md transition-all ${viewMode === 'storyboard' ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <LayoutGrid size={14} />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Board</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleGenerateAllImages} disabled={isBatchGenerating} className={`px-4 py-2 font-semibold text-brand-cream rounded-lg bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} shadow-lg shadow-brand-orange/20 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}>
                        {isBatchGenerating ? 'Đang tạo (Tuần tự)...' : '1. Tạo ảnh hàng loạt'}
                    </button>
                    <button onClick={handleGenerateAllVeoPrompts} disabled={isVeoGenerating} className={`px-4 py-2 font-semibold text-brand-cream rounded-lg bg-gradient-to-r from-brand-red to-brand-brown hover:from-brand-orange hover:to-brand-red shadow-lg shadow-brand-red/20 transition-all duration-300 transform hover:scale-105 disabled:opacity-50`}>
                        {isVeoGenerating ? 'Đang tạo Prompt...' : '2. Tạo Veo Prompts'}
                    </button>
                    <button onClick={handleGenerateAllVideos} disabled={isVideoGenerating} className={`px-4 py-2 font-semibold text-brand-cream rounded-lg bg-gradient-to-r from-brand-brown to-brand-orange hover:from-brand-red hover:to-brand-orange shadow-lg shadow-brand-orange/20 transition-all duration-300 transform hover:scale-105 disabled:opacity-50`}>
                        {isVideoGenerating ? 'Đang tạo Video...' : '3. Tạo Video (Veo)'}
                    </button>
                    <button onClick={addScene} className={`px-4 py-2 font-semibold text-brand-cream rounded-lg bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} shadow-lg shadow-brand-orange/20 transition-all duration-300 transform hover:scale-105`}>+ Thêm Phân đoạn</button>
                </div>
            </div>

            {/* === DETAILED SCRIPT SECTION === */}
            <div className="mb-8 p-6 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-3">
                    <label className="flex items-center text-sm font-bold text-gray-200">
                        <span className="text-xl mr-2">📜</span> Kịch bản Chi tiết (Detailed Story)
                    </label>
                    <span className="text-xs text-brand-orange bg-brand-orange/10 px-2 py-1 rounded">Read-only / Reference</span>
                </div>
                <textarea
                    value={detailedScript}
                    onChange={(e) => onDetailedScriptChange(e.target.value)}
                    placeholder="Nội dung cốt truyện chi tiết sẽ được hiển thị ở đây giúp bạn nắm bắt mạch chuyện..."
                    className="w-full h-48 bg-gray-900/50 text-gray-300 px-4 py-3 rounded-lg border border-gray-700/50 focus:outline-none focus:ring-1 focus:ring-brand-orange text-sm leading-relaxed scrollbar-thin scrollbar-thumb-gray-600 font-mono"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={onCleanAll}
                        className="flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded border border-red-900/50 transition-colors"
                        title="Xóa toàn bộ kịch bản và scene để làm lại từ đầu"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa sạch & Làm mới (Clean All)</span>
                    </button>
                </div>
            </div>

            {viewMode === 'table' && (
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-2 text-sm font-bold text-gray-400 border-b-2 border-gray-700">
                    <div className="col-span-1 text-center relative group">Scene <span className="text-brand-orange">(?)</span><Tooltip text="Số thứ tự phân cảnh. Tên file ảnh sẽ được đặt theo cột này." /></div>
                    <div className="col-span-2">Script (Lang 1/Viet)</div>
                    <div className="col-span-2">Tên/Bối cảnh</div>
                    <div className="col-span-3">Veo Video Prompt <span className="text-blue-400">(New)</span></div>
                    <div className="col-span-1">Nhân vật</div>
                    <div className="col-span-3 text-center">Ảnh</div>
                </div>
            )}
            <div className={`mt-4 ${viewMode === 'storyboard' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6' : 'space-y-4'}`}>
                {scenes.map((scene, index) => (
                    <React.Fragment key={scene.id}>
                        {viewMode === 'table' && (
                            <>
                                {/* Insert Button Before each row */}
                                <div className="relative h-2 group/insert">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-brand-orange/0 group-hover/insert:border-brand-orange/30 transition-all"></div>
                                    <button
                                        onClick={() => insertScene(index)}
                                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/insert:opacity-100 transition-all shadow-xl z-20 hover:scale-125"
                                        title="Chèn phân cảnh mới vào đây"
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>

                                <SceneRow
                                    scene={scene}
                                    index={index}
                                    characters={characters}
                                    products={products}
                                    updateScene={updateScene}
                                    removeScene={removeScene}
                                    generateImage={() => performImageGeneration(scene.id)}
                                    generateEndFrame={() => performImageGeneration(scene.id, undefined, true)}
                                    openImageViewer={() => handleOpenImageViewer(index)}
                                    onDragStart={(idx) => setDraggedSceneIndex(idx)}
                                    onDragOver={(idx) => {
                                        if (dragOverIndex !== idx) {
                                            setDragOverIndex(idx);
                                            (window as any).dragOverIndex = idx;
                                        }
                                    }}
                                    onDrop={(targetIdx) => {
                                        if (draggedSceneIndex !== null) {
                                            moveScene(draggedSceneIndex, targetIdx);
                                        }
                                        setDraggedSceneIndex(null);
                                        setDragOverIndex(null);
                                        (window as any).dragOverIndex = null;
                                    }}
                                />

                                {/* Last Insert Button */}
                                {index === scenes.length - 1 && (
                                    <div className="relative h-2 group/insert">
                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-brand-orange/0 group-hover/insert:border-brand-orange/30 transition-all"></div>
                                        <button
                                            onClick={() => insertScene(index + 1)}
                                            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-orange text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover/insert:opacity-100 transition-all shadow-xl z-20 hover:scale-125"
                                            title="Thêm phân cảnh mới vào cuối"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {viewMode === 'storyboard' && (
                            <StoryBoardCard
                                scene={scene}
                                index={index}
                                characters={characters}
                                products={products}
                                updateScene={updateScene}
                                removeScene={removeScene}
                                generateImage={() => performImageGeneration(scene.id)}
                                generateEndFrame={() => performImageGeneration(scene.id, undefined, true)}
                                openImageViewer={() => handleOpenImageViewer(index)}
                                onDragStart={(idx) => setDraggedSceneIndex(idx)}
                                onDragOver={(idx) => {
                                    if (dragOverIndex !== idx) {
                                        setDragOverIndex(idx);
                                        (window as any).dragOverIndex = idx;
                                    }
                                }}
                                onDrop={(targetIdx) => {
                                    if (draggedSceneIndex !== null) {
                                        moveScene(draggedSceneIndex, targetIdx);
                                    }
                                    setDraggedSceneIndex(null);
                                    setDragOverIndex(null);
                                    (window as any).dragOverIndex = null;
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};
