import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useHotkeys } from './hooks/useHotkeys';
import { Header } from './components/common/Header';
import { ProjectNameInput } from './components/common/ProjectNameInput';
import { ApiKeyModal } from './components/modals/ApiKeyModal';
import { GenyuTokenModal } from './components/modals/GenyuTokenModal';
import { CharacterGeneratorModal } from './components/modals/CharacterGeneratorModal';
import { ScriptGeneratorModal } from './components/modals/ScriptGeneratorModal';
import { ImageViewerModal } from './components/modals/ImageViewerModal';
import { CharactersConsistencySection } from './components/sections/CharactersConsistencySection';
import { WeaponProductPropsSection } from './components/sections/WeaponProductPropsSection';
import { StyleSettingsSection } from './components/sections/StyleSettingsSection';
import { ScenesMapSection } from './components/sections/ScenesMapSection';
import { CharacterDetailModal } from './components/modals/CharacterDetailModal';
import { ProductDetailModal } from "./components/ProductDetailModal";
import { AdvancedImageEditor } from './components/modals/AdvancedImageEditor';
import { ScreenplayModal } from './components/modals/ScreenplayModal';
import { APP_NAME, PRIMARY_GRADIENT, PRIMARY_GRADIENT_HOVER } from './constants/presets';
import { handleDownloadAll } from './utils/zipUtils';

// Import Hooks
import { useStateManager } from './hooks/useStateManager';
import { useImageGeneration } from './hooks/useImageGeneration';
import { useScriptGeneration } from './hooks/useScriptGeneration';
import { useCharacterLogic } from './hooks/useCharacterLogic';
import { useProductLogic } from './hooks/useProductLogic';
import { useSceneLogic } from './hooks/useSceneLogic';
import { useVideoGeneration } from './hooks/useVideoGeneration';

const App: React.FC = () => {
    // Core State & History
    const {
        state,
        updateStateAndRecord,
        undo,
        redo,
        handleSave,
        handleOpen,
        handleNewProject,
        stateRef,
        history
    } = useStateManager();

    // UI State
    const [zoom, setZoom] = useState(1);
    const [isApiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [isScriptModalOpen, setScriptModalOpen] = useState(false);
    const [genyuModalOpen, setGenyuModalOpen] = useState(false);
    const [editingCharacterId, setEditingCharacterId] = useState<string | null>(null);
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [userApiKey, setUserApiKey] = useState(() => localStorage.getItem('geminiApiKey') || '');
    const [isHeaderSticky, setHeaderSticky] = useState(false);
    const [isContinuityMode, setIsContinuityMode] = useState(true);
    const [isImageViewerOpen, setImageViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'table' | 'storyboard'>('table');
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingImage, setEditingImage] = useState<any>(null);
    const [charGenState, setCharGenState] = useState<{ isOpen: boolean; charId: string | null }>({ isOpen: false, charId: null });
    const [isScreenplayModalOpen, setScreenplayModalOpen] = useState(false);
    const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const mainContentRef = useRef<HTMLDivElement>(null);

    // Functional Hooks
    const {
        isBatchGenerating,
        isStopping,
        performImageGeneration,
        generateGroupConcept,
        handleGenerateAllImages,
        stopBatchGeneration
    } = useImageGeneration(state, stateRef, updateStateAndRecord, userApiKey, setApiKeyModalOpen, isContinuityMode);

    const {
        isScriptGenerating,
        handleGenerateScript,
        handleRegenerateGroup
    } = useScriptGeneration(state, updateStateAndRecord, userApiKey, setApiKeyModalOpen);

    const {
        updateCharacter,
        addCharacter,
        deleteCharacter,
        setDefaultCharacter,
        handleMasterImageUpload
    } = useCharacterLogic(state, updateStateAndRecord, userApiKey, setApiKeyModalOpen);

    const {
        addProduct,
        deleteProduct,
        updateProduct,
        handleProductMasterImageUpload,
        handleGenerateProductFromPrompt
    } = useProductLogic(state, updateStateAndRecord, userApiKey, setApiKeyModalOpen);

    const {
        addScene,
        updateScene,
        removeScene,
        insertScene,
        moveScene,
        handleScriptUpload,
        triggerFileUpload,
        createGroup: addSceneGroup,
        updateGroup: updateSceneGroup,
        deleteGroup: deleteSceneGroup,
        assignSceneToGroup,
        applyGeneratedScript
    } = useSceneLogic(state, updateStateAndRecord);

    const {
        isVeoGenerating,
        isVideoGenerating,
        handleGenerateAllVeoPrompts,
        handleGenerateAllVideos
    } = useVideoGeneration(state, updateStateAndRecord, userApiKey, setApiKeyModalOpen);

    // Hotkeys
    useHotkeys([
        { keys: 'ctrl+s', callback: handleSave },
        { keys: 'ctrl+o', callback: handleOpen },
        { keys: 'ctrl+z', callback: undo },
        { keys: 'ctrl+y', callback: redo },
        { keys: 'ctrl+shift+z', callback: redo },
    ]);

    // Sticky Header Scroll Listener
    useEffect(() => {
        const handleScroll = () => {
            if (mainContentRef.current) setHeaderSticky(mainContentRef.current.scrollTop > 50);
        };
        const mainContent = mainContentRef.current;
        mainContent?.addEventListener('scroll', handleScroll);
        return () => mainContent?.removeEventListener('scroll', handleScroll);
    }, []);

    // State Hydration
    useEffect(() => {
        const genyuToken = localStorage.getItem('genyuToken');
        const recaptchaToken = localStorage.getItem('recaptchaToken');
        if (genyuToken || recaptchaToken) {
            updateStateAndRecord(s => ({
                ...s,
                genyuToken: genyuToken || s.genyuToken,
                recaptchaToken: recaptchaToken || s.recaptchaToken
            }));
        }
    }, [updateStateAndRecord]);

    // Derived Handlers
    const handleProjectNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateStateAndRecord(s => ({ ...s, projectName: e.target.value.toUpperCase() }));
    };

    const handleStylePromptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateStateAndRecord(s => ({ ...s, stylePrompt: e.target.value }));
    };

    const handleImageModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateStateAndRecord(s => ({ ...s, imageModel: e.target.value }));
    };

    const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateStateAndRecord(s => ({ ...s, aspectRatio: e.target.value }));
    };

    const handleScriptLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateStateAndRecord(s => ({ ...s, scriptLanguage: e.target.value as any }));
    };

    const closeEditor = useCallback(() => {
        setIsEditorOpen(false);
    }, []);

    const openEditor = (id: string, image: string, type: any, propIndex?: number, viewKey?: string) => {
        // ... (existing logic to find history if it exists)
        let editorHistory = undefined;
        if (type === 'scene') {
            editorHistory = state.scenes.find(s => s.id === id)?.editHistory;
        } else if (['master', 'face', 'body', 'side', 'back'].includes(type) || viewKey) {
            editorHistory = state.characters.find(c => c.id === id)?.editHistory;
        }

        setEditingImage({ id, image, type, propIndex, viewKey, history: editorHistory });
        setIsEditorOpen(true);
    };

    const handleEditorSave = (newImage: string, history: any[], savedViewKey?: string) => {
        if (!editingImage) return;
        const { id, type, propIndex, viewKey: initialViewKey } = editingImage;
        const viewKey = savedViewKey || initialViewKey;

        if (type === 'prop' && typeof propIndex === 'number') {
            const char = state.characters.find(c => c.id === id);
            if (char) {
                const newProps = [...char.props];
                newProps[propIndex] = { ...newProps[propIndex], image: newImage };
                updateCharacter(id, { props: newProps });
            }
        } else if (type === 'master' || viewKey === 'master') updateCharacter(id, { masterImage: newImage, editHistory: history });
        else if (type === 'face' || viewKey === 'face') updateCharacter(id, { faceImage: newImage, editHistory: history });
        else if (type === 'body' || viewKey === 'body') updateCharacter(id, { bodyImage: newImage, editHistory: history });
        else if (type === 'side' || viewKey === 'side') updateCharacter(id, { sideImage: newImage, editHistory: history });
        else if (type === 'back' || viewKey === 'back') updateCharacter(id, { backImage: newImage, editHistory: history });
        else if (type === 'scene') updateScene(id, { generatedImage: newImage, editHistory: history });
        else if (type === 'product') {
            if (viewKey) {
                const product = state.products.find(p => p.id === id);
                if (product) updateProduct(id, { views: { ...product.views, [viewKey]: newImage } });
            } else updateProduct(id, { masterImage: newImage, editHistory: history });
        }
    };

    const handleCharGenSave = (image: string) => {
        if (charGenState.charId) updateCharacter(charGenState.charId, { masterImage: image });
    };

    const handleOpenImageViewer = (index: number) => {
        setCurrentImageIndex(index);
        setImageViewerOpen(true);
    };

    return (
        <div className="h-screen w-screen bg-brand-dark text-brand-cream overflow-hidden relative">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-1/2 h-1/2 bg-brand-orange/20 rounded-full filter blur-3xl animate-pulse-slow"></div>
                <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-brand-red/10 rounded-full filter blur-3xl animate-pulse-slow delay-1000"></div>
            </div>

            <Header
                isSticky={isHeaderSticky}
                onApiKeyClick={() => setApiKeyModalOpen(true)}
                onSave={handleSave}
                onOpen={handleOpen}
                onNewProject={handleNewProject}
                onDownloadAll={() => handleDownloadAll(state)}
                canDownload={state.scenes.some(s => s.generatedImage) || state.characters.some(c => c.masterImage) || state.products.some(p => p.masterImage)}
                isContinuityMode={isContinuityMode}
                toggleContinuityMode={() => setIsContinuityMode(!isContinuityMode)}
                onGenyuClick={() => setGenyuModalOpen(true)}
                onUndo={undo}
                onRedo={redo}
                canUndo={history.past.length > 0}
                canRedo={history.future.length > 0}
                appName={APP_NAME}
            />

            <main ref={mainContentRef} className="h-full w-full overflow-auto pt-20">
                <div className="transition-transform duration-200 ease-out" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
                    <div className="container mx-auto px-6 pb-24">
                        <ProjectNameInput value={state.projectName} onChange={handleProjectNameChange} />

                        <CharactersConsistencySection
                            characters={state.characters}
                            onSetDefaultCharacter={setDefaultCharacter}
                            onDeleteCharacter={deleteCharacter}
                            onUpdateCharacter={updateCharacter}
                            onSetEditingCharacterId={setEditingCharacterId}
                            onAddCharacter={addCharacter}
                        />

                        <WeaponProductPropsSection
                            products={state.products}
                            onEditProduct={setEditingProductId}
                            onDeleteProduct={deleteProduct}
                            onAddProduct={addProduct}
                        />

                        <StyleSettingsSection
                            stylePrompt={state.stylePrompt}
                            onStylePromptChange={handleStylePromptChange}
                            customStyleInstruction={state.customStyleInstruction || ''}
                            onCustomStyleInstructionChange={(val) => updateStateAndRecord(s => ({ ...s, customStyleInstruction: val }))}
                            imageModel={state.imageModel}
                            onImageModelChange={handleImageModelChange}
                            scriptModel={state.scriptModel || 'gemini-2.5-flash'}
                            onScriptModelChange={(e) => updateStateAndRecord(s => ({ ...s, scriptModel: e.target.value }))}
                            resolution={state.resolution}
                            onResolutionChange={(val) => updateStateAndRecord(s => ({ ...s, resolution: val }))}
                            aspectRatio={state.aspectRatio}
                            onAspectRatioChange={handleAspectRatioChange}
                            scriptLanguage={state.scriptLanguage}
                            onScriptLanguageChange={handleScriptLanguageChange}
                            customScriptLanguage={state.customScriptLanguage || ''}
                            onCustomScriptLanguageChange={(val) => updateStateAndRecord(s => ({ ...s, customScriptLanguage: val }))}
                            cameraModel={state.cameraModel || 'auto'}
                            onCameraModelChange={(val) => updateStateAndRecord(s => ({ ...s, cameraModel: val }))}
                            customCameraModel={state.customCameraModel || ''}
                            onCustomCameraModelChange={(val) => updateStateAndRecord(s => ({ ...s, customCameraModel: val }))}
                            defaultLens={state.defaultLens || 'auto'}
                            onDefaultLensChange={(val) => updateStateAndRecord(s => ({ ...s, defaultLens: val }))}
                            customDefaultLens={state.customDefaultLens || ''}
                            onCustomDefaultLensChange={(val) => updateStateAndRecord(s => ({ ...s, customDefaultLens: val }))}
                            customMetaTokens={state.customMetaTokens || ''}
                            onCustomMetaTokensChange={(val) => updateStateAndRecord(s => ({ ...s, customMetaTokens: val }))}
                            onOpenScriptGenerator={() => setScriptModalOpen(true)}
                            isScriptGenerating={isScriptGenerating}
                            onTriggerFileUpload={triggerFileUpload}
                        />

                        <ScenesMapSection
                            scenes={state.scenes}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            characters={state.characters}
                            products={state.products || []}
                            updateScene={updateScene}
                            removeScene={removeScene}
                            insertScene={insertScene}
                            moveScene={moveScene}
                            performImageGeneration={performImageGeneration}
                            handleOpenImageViewer={handleOpenImageViewer}
                            handleGenerateAllImages={handleGenerateAllImages}
                            isBatchGenerating={isBatchGenerating}
                            isStopping={isStopping}
                            stopBatchGeneration={stopBatchGeneration}
                            handleGenerateAllVeoPrompts={handleGenerateAllVeoPrompts}
                            isVeoGenerating={isVeoGenerating}
                            handleGenerateAllVideos={handleGenerateAllVideos}
                            isVideoGenerating={isVideoGenerating}
                            addScene={addScene}
                            detailedScript={state.detailedScript || ''}
                            onDetailedScriptChange={(val) => updateStateAndRecord(s => ({ ...s, detailedScript: val }))}
                            onCleanAll={() => {
                                if (confirm('⚠️ Bạn có chắc muốn xóa toàn bộ kịch bản?')) {
                                    updateStateAndRecord(s => ({ ...s, scenes: [], detailedScript: '' }));
                                }
                            }}
                            createGroup={addSceneGroup} // Assuming these might be renamed or available via hook
                            updateGroup={updateSceneGroup}
                            deleteGroup={deleteSceneGroup}
                            assignSceneToGroup={assignSceneToGroup}
                            sceneGroups={state.sceneGroups}
                            draggedSceneIndex={draggedSceneIndex}
                            setDraggedSceneIndex={setDraggedSceneIndex}
                            dragOverIndex={dragOverIndex}
                            setDragOverIndex={setDragOverIndex}
                        />
                        <div className="flex justify-end mt-8 gap-4">
                            <button
                                onClick={() => setScreenplayModalOpen(true)}
                                className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg flex items-center gap-2 border border-purple-500/30 transition-all active:scale-95 text-xs font-bold"
                            >
                                📄 XUẤT KỊCH BẢN
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {zoom !== 1 && (
                <button
                    onClick={() => setZoom(1)}
                    className={`absolute top-24 right-6 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r ${PRIMARY_GRADIENT} hover:${PRIMARY_GRADIENT_HOVER} transition-all shadow-lg animate-fade-in`}
                >
                    Reset Zoom (100%)
                </button>
            )}

            <ApiKeyModal
                isOpen={isApiKeyModalOpen}
                onClose={() => setApiKeyModalOpen(false)}
                apiKey={userApiKey}
                setApiKey={(key: string) => {
                    setUserApiKey(key);
                    localStorage.setItem('geminiApiKey', key);
                }}
            />

            <GenyuTokenModal
                isOpen={genyuModalOpen}
                onClose={() => setGenyuModalOpen(false)}
                token={state.genyuToken || ''}
                setToken={(token) => {
                    updateStateAndRecord(s => ({ ...s, genyuToken: token }));
                    localStorage.setItem('genyuToken', token);
                }}
                recaptchaToken={state.recaptchaToken || ''}
                setRecaptchaToken={(token) => {
                    updateStateAndRecord(s => ({ ...s, recaptchaToken: token }));
                    localStorage.setItem('recaptchaToken', token);
                }}
            />

            <ScriptGeneratorModal
                isOpen={isScriptModalOpen}
                onClose={() => setScriptModalOpen(false)}
                onGenerate={handleGenerateScript}
                isGenerating={isScriptGenerating}
                activePresetId={state.activeScriptPreset}
                customPresets={state.customScriptPresets}
                onPresetChange={(id) => updateStateAndRecord(s => ({ ...s, activeScriptPreset: id }))}
                characters={state.characters}
                products={state.products || []}
                customInstruction={state.customScriptInstruction}
                onCustomInstructionChange={(val) => updateStateAndRecord(s => ({ ...s, customScriptInstruction: val }))}
                onAddPreset={(p) => updateStateAndRecord(s => ({ ...s, customScriptPresets: [...s.customScriptPresets, p] }))}
                onApplyGenerated={applyGeneratedScript}
                onRegenerateGroup={handleRegenerateGroup}
                onGenerateMoodboard={generateGroupConcept}
                scriptModel={state.scriptModel || 'gemini-2.5-flash'}
                onScriptModelChange={(e) => updateStateAndRecord(s => ({ ...s, scriptModel: e.target.value }))}
            />

            <ScreenplayModal
                isOpen={isScreenplayModalOpen}
                onClose={() => setScreenplayModalOpen(false)}
                state={state}
            />

            <CharacterDetailModal
                isOpen={!!editingCharacterId}
                onClose={() => setEditingCharacterId(null)}
                character={state.characters.find(c => c.id === editingCharacterId) || null}
                updateCharacter={updateCharacter}
                setDefault={setDefaultCharacter}
                onMasterUpload={handleMasterImageUpload}
                onEditImage={openEditor}
                onOpenCharGen={(id) => setCharGenState({ isOpen: true, charId: id })}
                onDelete={deleteCharacter}
            />

            <CharacterGeneratorModal
                isOpen={charGenState.isOpen}
                onClose={() => setCharGenState({ isOpen: false, charId: null })}
                onSave={handleCharGenSave}
                apiKey={userApiKey}
                genyuToken={state.genyuToken}
                model={state.imageModel}
                charId={charGenState.charId}
                updateCharacter={updateCharacter}
            />

            <AdvancedImageEditor
                isOpen={isEditorOpen}
                onClose={closeEditor}
                sourceImage={editingImage?.image || ''}
                onSave={handleEditorSave}
                apiKey={userApiKey}
                genyuToken={state.genyuToken}
                initialHistory={editingImage?.history}
                character={editingImage?.type && ['master', 'face', 'body', 'side', 'back', 'prop'].includes(editingImage.type) ? state.characters.find(c => c.id === editingImage.id) : undefined}
                product={editingImage?.type === 'product' ? state.products.find(p => p.id === editingImage.id) : undefined}
                activeView={editingImage?.viewKey || editingImage?.type}
            />

            <ImageViewerModal
                isOpen={isImageViewerOpen}
                onClose={() => setImageViewerOpen(false)}
                scenes={state.scenes}
                currentIndex={currentImageIndex}
                onNavigate={setCurrentImageIndex}
                onRegenerate={performImageGeneration}
                onEdit={(id, img) => openEditor(id, img, 'scene')}
            />

            <ProductDetailModal
                isOpen={!!editingProductId}
                onClose={() => setEditingProductId(null)}
                product={state.products?.find(p => p.id === editingProductId) || null}
                updateProduct={updateProduct}
                onMasterImageUpload={handleProductMasterImageUpload}
                onDelete={deleteProduct}
                onGenerateProduct={handleGenerateProductFromPrompt}
                onEdit={(id, img, view) => openEditor(id, img, 'product', undefined, view)}
            />

            <input
                id="script-upload-input"
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleScriptUpload}
            />
        </div>
    );
};

export default App;
