import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, Scene } from '../types';
import { getPresetById } from '../utils/scriptPresets';
import { buildScriptPrompt } from '../utils/promptBuilder';
import { generateId } from '../utils/helpers';

export function useScriptGeneration(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
) {
    const [isScriptGenerating, setIsScriptGenerating] = useState(false);

    const handleGenerateScript = useCallback(async (idea: string, count: number, selectedCharacterIds: string[], selectedProductIds: string[]) => {
        const apiKey = userApiKey || (process.env as any).API_KEY;
        if (!apiKey) {
            alert("Vui lòng nhập API Key để sử dụng tính năng này.");
            setApiKeyModalOpen(true);
            return;
        }

        setIsScriptGenerating(true);

        try {
            const activePreset = getPresetById(state.activeScriptPreset, state.customScriptPresets);
            if (!activePreset) {
                throw new Error("Preset not found");
            }

            const activeCharacters = state.characters.filter(c => selectedCharacterIds.includes(c.id));
            const activeProducts = (state.products || []).filter(p => selectedProductIds.includes(p.id));

            const effectiveLanguage = state.scriptLanguage === 'custom'
                ? (state.customScriptLanguage || 'English')
                : (state.scriptLanguage === 'vietnamese' ? 'Vietnamese' : 'English');

            const prompt = buildScriptPrompt(idea, activePreset, activeCharacters, activeProducts, count, effectiveLanguage, state.customScriptInstruction);

            const ai = new GoogleGenAI({ apiKey });

            const schemaProperties: any = {
                scene_number: { type: Type.STRING },
                prompt_name: { type: Type.STRING },
                visual_description: { type: Type.STRING },
                character_ids: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            };

            if (activePreset.outputFormat.hasDialogue) {
                schemaProperties.dialogues = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            characterName: { type: Type.STRING },
                            line: { type: Type.STRING }
                        }
                    }
                };
            }

            if (activePreset.outputFormat.hasNarration) {
                schemaProperties.voiceover = { type: Type.STRING };
            }

            if (activePreset.outputFormat.hasCameraAngles) {
                schemaProperties.camera_angle = { type: Type.STRING };
            }

            schemaProperties.vietnamese_dialogue = { type: Type.STRING };
            schemaProperties.english_dialogue = { type: Type.STRING };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            detailed_story: { type: Type.STRING },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: schemaProperties,
                                    required: ["scene_number", "visual_description", "prompt_name", "character_ids"]
                                }
                            }
                        },
                        required: ["detailed_story", "scenes"]
                    }
                }
            });

            const rawText = response.text || '{}';
            const jsonResponse = JSON.parse(rawText);
            const generatedScenesRaw = Array.isArray(jsonResponse) ? jsonResponse : (jsonResponse.scenes || []);
            const detailedStory = jsonResponse.detailed_story || '';

            const newScenes: Scene[] = generatedScenesRaw.map((item: any) => ({
                id: generateId(),
                sceneNumber: item.scene_number || '',
                promptName: item.prompt_name || '',
                vietnamese: item.vietnamese_dialogue || item.voiceover || '',
                language1: item.english_dialogue || '',
                contextDescription: item.visual_description || item.visual_context,
                voiceover: item.voiceover,
                dialogues: item.dialogues || [],
                cameraAngle: item.camera_angle,
                visualDescription: item.visual_description || item.visual_context,
                characterIds: item.character_ids || [],
                productIds: item.product_ids || [],
                generatedImage: null,
                veoPrompt: '',
                isGenerating: false,
                error: null,
            }));

            if (newScenes.length > 0) {
                updateStateAndRecord(s => ({
                    ...s,
                    scenes: [...s.scenes, ...newScenes],
                    detailedScript: detailedStory || s.detailedScript
                }));
                alert(`✨ Đã tạo ${newScenes.length} cảnh với preset "${activePreset.name}"!`);
            } else {
                throw new Error("Không có dữ liệu phân cảnh nào được tạo.");
            }

        } catch (error) {
            console.error("Script generation failed:", error);
            alert("Tạo kịch bản thất bại. Vui lòng thử lại.");
        } finally {
            setIsScriptGenerating(false);
        }
    }, [state, updateStateAndRecord, userApiKey, setApiKeyModalOpen]);

    return {
        handleGenerateScript,
        isScriptGenerating
    };
}
