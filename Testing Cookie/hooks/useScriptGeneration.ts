import { useState, useCallback } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectState, Scene } from '../types';
import { getPresetById } from '../utils/scriptPresets';
import { buildScriptPrompt, buildGroupRegenerationPrompt } from '../utils/promptBuilder';
import { generateId } from '../utils/helpers';

export function useScriptGeneration(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
) {
    const [isScriptGenerating, setIsScriptGenerating] = useState(false);

    const handleGenerateScript = useCallback(async (idea: string, count: number, selectedCharacterIds: string[], selectedProductIds: string[]) => {
        const rawApiKey = userApiKey || (process.env as any).API_KEY;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;
        if (!apiKey) {
            alert("Vui lòng nhập API Key để sử dụng tính năng này.");
            setApiKeyModalOpen(true);
            return null;
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

            const sceneProperties: any = {
                scene_number: { type: Type.STRING },
                group_id: { type: Type.STRING },
                prompt_name: { type: Type.STRING },
                visual_context: { type: Type.STRING },
                character_ids: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                product_ids: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            };

            if (activePreset.outputFormat.hasDialogue) {
                sceneProperties.dialogues = {
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
                sceneProperties.voiceover = { type: Type.STRING };
            }

            if (activePreset.outputFormat.hasCameraAngles) {
                sceneProperties.camera_angle = { type: Type.STRING };
            }

            const response = await ai.models.generateContent({
                model: state.scriptModel || 'gemini-3-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            detailed_story: { type: Type.STRING },
                            scene_groups: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        name: { type: Type.STRING },
                                        description: { type: Type.STRING },
                                        continuity_reference_group_id: { type: Type.STRING }
                                    },
                                    required: ["id", "name", "description"]
                                }
                            },
                            scenes: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: sceneProperties,
                                    required: ["scene_number", "visual_context", "prompt_name", "character_ids", "group_id"]
                                }
                            }
                        },
                        required: ["detailed_story", "scene_groups", "scenes"]
                    }
                }
            });

            const rawText = response.text || '{}';
            const jsonResponse = JSON.parse(rawText);

            return {
                detailedStory: jsonResponse.detailed_story || '',
                groups: jsonResponse.scene_groups || [],
                scenes: jsonResponse.scenes || []
            };

        } catch (error) {
            console.error("Script generation failed:", error);
            alert("Tạo kịch bản thất bại. Vui lòng thử lại.");
            return null;
        } finally {
            setIsScriptGenerating(false);
        }
    }, [state, updateStateAndRecord, userApiKey, setApiKeyModalOpen]);

    const handleRegenerateGroup = useCallback(async (detailedStory: string, groupToRegen: any, allGroups: any[]) => {
        const rawApiKey = userApiKey || (process.env as any).API_KEY;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;
        if (!apiKey) {
            setApiKeyModalOpen(true);
            return null;
        }

        setIsScriptGenerating(true);

        try {
            const activePreset = getPresetById(state.activeScriptPreset, state.customScriptPresets);
            if (!activePreset) throw new Error("Preset not found");

            const effectiveLanguage = state.scriptLanguage === 'custom'
                ? (state.customScriptLanguage || 'English')
                : (state.scriptLanguage === 'vietnamese' ? 'Vietnamese' : 'English');

            const prompt = buildGroupRegenerationPrompt(
                detailedStory,
                groupToRegen,
                allGroups,
                activePreset,
                state.characters,
                state.products || [],
                effectiveLanguage,
                state.customScriptInstruction,
                groupToRegen.pacing
            );

            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: state.scriptModel || 'gemini-3-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                }
            });

            const rawText = response.text || '{}';
            const jsonResponse = JSON.parse(rawText);

            return jsonResponse.scenes || [];
        } catch (error) {
            console.error("Group regeneration failed:", error);
            alert("Tái tạo nhóm kịch bản thất bại.");
            return null;
        } finally {
            setIsScriptGenerating(false);
        }
    }, [state, userApiKey, setApiKeyModalOpen]);

    return {
        handleGenerateScript,
        handleRegenerateGroup,
        isScriptGenerating
    };
}
