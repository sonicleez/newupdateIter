import React, { useCallback } from 'react';
import { ProjectState, Scene } from '../types';
import { generateId } from '../utils/helpers';

export function useSceneLogic(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void
) {
    const addScene = useCallback(() => {
        const defaultCharacter = state.characters.find(c => c.isDefault);
        const newScene: Scene = {
            id: generateId(),
            sceneNumber: `${state.scenes.length + 1}`,
            language1: '',
            vietnamese: '',
            promptName: '',
            contextDescription: '',
            characterIds: defaultCharacter ? [defaultCharacter.id] : [],
            productIds: [],
            generatedImage: null,
            veoPrompt: '',
            isGenerating: false,
            error: null,
        };
        updateStateAndRecord(s => ({ ...s, scenes: [...s.scenes, newScene] }));
    }, [state.characters, state.scenes.length, updateStateAndRecord]);

    const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === id ? { ...sc, ...updates } : sc)
        }));
    }, [updateStateAndRecord]);

    const removeScene = useCallback((id: string) => {
        updateStateAndRecord(s => {
            const newScenes = s.scenes.filter(sc => sc.id !== id);
            const renumbered = newScenes.map((sc, idx) => ({
                ...sc,
                sceneNumber: `${idx + 1}`
            }));
            return { ...s, scenes: renumbered };
        });
    }, [updateStateAndRecord]);

    const insertScene = useCallback((index: number) => {
        const defaultCharacter = state.characters.find(c => c.isDefault);
        const newScene: Scene = {
            id: generateId(),
            sceneNumber: `${index + 1}`,
            language1: '',
            vietnamese: '',
            promptName: '',
            contextDescription: '',
            characterIds: defaultCharacter ? [defaultCharacter.id] : [],
            productIds: [],
            generatedImage: null,
            veoPrompt: '',
            isGenerating: false,
            error: null,
        };

        updateStateAndRecord(s => {
            const newScenes = [...s.scenes];
            newScenes.splice(index, 0, newScene);
            const renumbered = newScenes.map((sc, idx) => ({
                ...sc,
                sceneNumber: `${idx + 1}`
            }));
            return { ...s, scenes: renumbered };
        });
    }, [state.characters, updateStateAndRecord]);

    const moveScene = useCallback((fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        updateStateAndRecord(s => {
            const newScenes = [...s.scenes];
            const [movedItem] = newScenes.splice(fromIndex, 1);
            newScenes.splice(toIndex, 0, movedItem);
            const renumbered = newScenes.map((sc, idx) => ({
                ...sc,
                sceneNumber: `${idx + 1}`
            }));
            return { ...s, scenes: renumbered };
        });
    }, [updateStateAndRecord]);

    const handleScriptUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                // @ts-ignore
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                // @ts-ignore
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // @ts-ignore
                const json: (string | number)[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (json.length <= 1) {
                    alert("File Excel trống hoặc chỉ có hàng tiêu đề.");
                    return;
                }

                const defaultCharacter = state.characters.find(c => c.isDefault);
                const newScenes: Scene[] = json.slice(1)
                    .filter(row => row && row.length > 0 && row[0] !== undefined && row[0] !== null && String(row[0]).trim() !== '')
                    .map(row => {
                        const sceneNumber = String(row[0] || '').trim();
                        let characterIds: string[] = [];

                        if (sceneNumber.toLowerCase().startsWith('c') && defaultCharacter) {
                            characterIds.push(defaultCharacter.id);
                        }

                        return {
                            id: generateId(),
                            sceneNumber: sceneNumber,
                            language1: String(row[1] || ''),
                            vietnamese: String(row[2] || ''),
                            promptName: String(row[3] || ''),
                            contextDescription: String(row[4] || ''),
                            characterIds: characterIds,
                            productIds: [],
                            generatedImage: null,
                            veoPrompt: '',
                            isGenerating: false,
                            error: null,
                        };
                    });

                updateStateAndRecord(s => ({ ...s, scenes: newScenes }));
                alert(`Đã tải lên thành công ${newScenes.length} phân cảnh.`);
            } catch (error) {
                console.error("Lỗi khi xử lý file Excel:", error);
                alert("Đã xảy ra lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.");
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    }, [state.characters, updateStateAndRecord]);

    const triggerFileUpload = useCallback(() => {
        document.getElementById('script-upload-input')?.click();
    }, []);

    return {
        addScene,
        updateScene,
        removeScene,
        insertScene,
        moveScene,
        handleScriptUpload,
        triggerFileUpload
    };
}
