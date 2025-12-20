import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProjectState, Scene } from '../types';
import {
    GLOBAL_STYLES, CAMERA_MODELS, LENS_OPTIONS, CAMERA_ANGLES,
    DEFAULT_META_TOKENS, TRANSITION_TYPES
} from '../constants/presets';
import { getPresetById } from '../utils/scriptPresets';

export function useImageGeneration(
    state: ProjectState,
    stateRef: React.MutableRefObject<ProjectState>,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void,
    isContinuityMode: boolean
) {
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const stopRef = useRef(false);

    const stopBatchGeneration = useCallback(() => {
        if (isBatchGenerating) {
            stopRef.current = true;
            setIsStopping(true);
        }
    }, [isBatchGenerating]);

    const callAIImageAPI = async (
        prompt: string,
        apiKey: string | null,
        genyuToken: string | null,
        model: string,
        aspectRatio: string,
        parts: any[] = []
    ): Promise<{ imageUrl: string; mediaId?: string }> => {
        const isHighRes = model === 'gemini-3-pro-image-preview';

        if (apiKey && isHighRes) {
            const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

            const fullParts = [...parts];
            if (prompt) fullParts.push({ text: prompt });

            const response = await ai.models.generateContent({
                model: model,
                contents: fullParts,
                config: {
                    imageConfig: { aspectRatio: aspectRatio || "16:9" }
                },
            });

            const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            if (imagePart?.inlineData) {
                return { imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` };
            } else {
                throw new Error("Không nhận được ảnh từ API.");
            }
        } else if (genyuToken) {
            let genyuAspect = "IMAGE_ASPECT_RATIO_LANDSCAPE";
            if (aspectRatio === "9:16" || aspectRatio === "3:4") genyuAspect = "IMAGE_ASPECT_RATIO_PORTRAIT";
            if (aspectRatio === "1:1") genyuAspect = "IMAGE_ASPECT_RATIO_SQUARE";

            const requestBody: any = {
                token: genyuToken,
                prompt: prompt,
                aspect: genyuAspect,
            };

            if (stateRef.current.recaptchaToken) {
                requestBody.recaptchaToken = stateRef.current.recaptchaToken;
            }

            const response = await fetch('http://localhost:3001/api/proxy/genyu/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errJson = await response.json();
                throw new Error(errJson.error || "Genyu Proxy Failed");
            }

            const data = await response.json();
            let imageUrl = null;
            let mediaId = null;

            if (data.submissionResults?.length > 0) {
                const submission = data.submissionResults[0]?.submission;
                const result = submission?.result || data.submissionResults[0]?.result;
                imageUrl = result?.fifeUrl || result?.media?.fifeUrl;
                mediaId = result?.mediaGenerationId || result?.media?.mediaGenerationId;
            } else if (data.media?.length > 0) {
                const mediaItem = data.media[0];
                imageUrl = mediaItem.fifeUrl || mediaItem.url;
                mediaId = mediaItem.id || mediaItem.mediaId || mediaItem.mediaGenerationId;
            }

            if (!imageUrl) imageUrl = data.url || data.imageUrl || data.data?.url;

            if (imageUrl) {
                return { imageUrl, mediaId };
            } else {
                throw new Error("Cannot find image URL.");
            }
        } else {
            throw new Error("Missing Credentials");
        }
    };

    const performImageGeneration = useCallback(async (sceneId: string, refinementPrompt?: string, isEndFrame: boolean = false) => {
        const currentState = stateRef.current;
        const currentSceneIndex = currentState.scenes.findIndex(s => s.id === sceneId);
        const sceneToUpdate = currentState.scenes[currentSceneIndex];
        if (!sceneToUpdate) return;

        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: true, error: null } : sc)
        }));

        try {
            // --- 1. GET STYLE PROMPT ---
            let styleInstruction = '';
            const currentGroupObj = currentState.sceneGroups?.find(g => g.id === sceneToUpdate.groupId);
            const effectiveStylePrompt = currentGroupObj?.stylePrompt || currentState.stylePrompt;
            const effectiveCustomStyle = currentGroupObj?.stylePrompt ? currentGroupObj.customStyleInstruction : currentState.customStyleInstruction;

            if (effectiveStylePrompt === 'custom') {
                styleInstruction = effectiveCustomStyle || '';
            } else {
                const selectedStyle = GLOBAL_STYLES.find(s => s.value === effectiveStylePrompt);
                styleInstruction = selectedStyle ? selectedStyle.prompt : '';
            }

            // --- 2. CINEMATOGRAPHY ---
            const cameraModelInfo = CAMERA_MODELS.find(c => c.value === currentState.cameraModel);
            const cameraPrompt = currentState.cameraModel === 'custom' ? (currentState.customCameraModel ? `Shot on ${currentState.customCameraModel}` : '') : (cameraModelInfo?.prompt || '');

            const effectiveLens = sceneToUpdate.lensOverride || currentState.defaultLens || '';
            const lensInfo = LENS_OPTIONS.find(l => l.value === effectiveLens);
            const lensPrompt = effectiveLens === 'custom' ? (sceneToUpdate.customLensOverride || currentState.customDefaultLens || '') : (lensInfo?.prompt || '');

            const angleInfo = CAMERA_ANGLES.find(a => a.value === (sceneToUpdate.cameraAngleOverride || ''));
            const anglePrompt = (sceneToUpdate.cameraAngleOverride === 'custom' ? sceneToUpdate.customCameraAngle : angleInfo?.label) || '';

            const activePreset = getPresetById(currentState.activeScriptPreset, currentState.customScriptPresets);
            const metaTokens = currentState.customMetaTokens || DEFAULT_META_TOKENS[activePreset?.category || 'custom'] || DEFAULT_META_TOKENS['custom'];

            const cinematographyPrompt = [cameraPrompt, lensPrompt, anglePrompt].filter(Boolean).join(', ');

            // Clean context from AI meta-instructions - broader regex
            let cleanedContext = (sceneToUpdate.contextDescription || '')
                .replace(/Referencing environment from.*?(consistency|logic|group|refgroup|nhất quán)\.?/gi, '')
                .replace(/Tham chiếu bối cảnh từ.*?(nhất quán|consistency)\.?/gi, '')
                .trim();

            // STRIP character names from context if they are NOT selected for this scene
            const unselectedChars = currentState.characters.filter(c => !sceneToUpdate.characterIds.includes(c.id));
            unselectedChars.forEach(c => {
                if (!c.name) return;
                const escapedName = c.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
                cleanedContext = cleanedContext.replace(regex, '');
            });
            cleanedContext = cleanedContext.replace(/\s+/g, ' ').trim();

            const isHighRes = (currentState.imageModel || 'gemini-3-pro-image-preview') === 'gemini-3-pro-image-preview';

            // --- 3. CHARACTERS & PRODUCTS ---
            const selectedChars = currentState.characters.filter(c => sceneToUpdate.characterIds.includes(c.id));
            let charPrompt = '';
            if (selectedChars.length > 0) {
                const charDesc = selectedChars.map(c => `[${c.name}: ${c.description}]`).join(' ');
                charPrompt = `Appearing Characters: ${charDesc}`;
            } else {
                // EXPLICIT NO CHARACTER for macro/landscape shots
                charPrompt = `STRICT NEGATIVE: NO PEOPLE, NO CHARACTERS, NO HUMANS, NO FACES, NO BODY PARTS. EXPLICITLY REMOVE ALL HUMAN ELEMENTS. FOCUS ONLY ON ${cleanedContext.toUpperCase() || 'ENVIRONMENT'}.`;
            }

            // --- 4. FINAL PROMPT CONSTRUCTION (Priority Order) ---
            // Shot Scale (Angle) is the ABSOLUTE PRIORITY, putting it at the very start
            const scaleCmd = anglePrompt ? `AUTHORITATIVE SHOT SCALE: ${anglePrompt.toUpperCase()}.` : 'CINEMATIC WIDE SHOT.';

            // GLOBAL ENVIRONMENT ANCHOR (To prevent drift within group)
            let groupEnvAnchor = '';
            if (sceneToUpdate.groupId) {
                const groupObj = currentState.sceneGroups?.find(g => g.id === sceneToUpdate.groupId);
                if (groupObj) {
                    groupEnvAnchor = `GLOBAL SETTING: ${groupObj.description.toUpperCase()}.`;
                }
            }

            let finalImagePrompt = `${scaleCmd} ${groupEnvAnchor} ${charPrompt} VISUALS: ${cleanedContext}. STYLE: ${styleInstruction} ${metaTokens}. TECHNICAL: (STRICT CAMERA: ${cinematographyPrompt ? cinematographyPrompt : 'High Quality'}).`.trim();

            if (refinementPrompt) {
                finalImagePrompt = `REFINEMENT: ${refinementPrompt}. BASE PROMPT: ${finalImagePrompt}`;
            }

            // --- 5. CONTINUITY & MULTI-IMAGE REFERENCES ---
            const parts: any[] = [];
            let continuityInstruction = '';

            // 5a. ENVIRONMENT CONTINUITY (Prioritize Recent Scene over Moodboard)
            if (sceneToUpdate.groupId) {
                const groupObj = currentState.sceneGroups?.find(g => g.id === sceneToUpdate.groupId);

                const precedingSceneInGroup = currentState.scenes
                    .slice(0, currentSceneIndex)
                    .filter(s => s.groupId === sceneToUpdate.groupId && s.generatedImage)
                    .reverse()[0];

                if (precedingSceneInGroup?.generatedImage) {
                    const [header, data] = precedingSceneInGroup.generatedImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `[ENV REFERENCE (Previous Scene)]: MATCH ENVIRONMENT ONLY. VARY CAMERA ANGLE.` });
                    parts.push({ inlineData: { data, mimeType } });
                    continuityInstruction += `ENV CONTINUITY: Match world-building from previous scene. `;
                } else if (groupObj?.conceptImage) {
                    const [header, data] = groupObj.conceptImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `[ENV REFERENCE (Moodboard)]: MATCH ENVIRONMENT/LIGHTING ONLY.` });
                    parts.push({ inlineData: { data, mimeType } });
                    continuityInstruction += `MOODBOARD CONTINUITY: Match lighting and world-building basics. `;
                }
            }

            // 5b. CHARACTER & PRODUCT REFERENCES (Strict Mapping)
            selectedChars.forEach((char, idx) => {
                if (char.masterImage) {
                    const [header, data] = char.masterImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const refLabel = `CHARACTER REF ${idx + 1}`;
                    parts.push({ text: `[${refLabel}]: Visual anchor for ${char.name}. Match face, hair, and clothing exactly as seen here. Description: ${char.description}` });
                    parts.push({ inlineData: { data, mimeType } });
                    finalImagePrompt += ` (MANDATORY: Follow face and clothing from ${refLabel} for ${char.name.toUpperCase()}).`;
                }
            });

            const selectedProducts = currentState.products.filter(p => sceneToUpdate.productIds.includes(p.id));
            selectedProducts.forEach((prod, idx) => {
                if (prod.masterImage) {
                    const [header, data] = prod.masterImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    const refLabel = `PRODUCT REF ${idx + 1}`;
                    parts.push({ text: `[${refLabel}]: Visual anchor for ${prod.name}. Match design and details exactly.` });
                    parts.push({ inlineData: { data, mimeType } });
                    finalImagePrompt += ` (MANDATORY: Follow ${refLabel} for ${prod.name.toUpperCase()}).`;
                }
            });

            if (continuityInstruction) finalImagePrompt = `${continuityInstruction} ${finalImagePrompt}`;

            const { imageUrl, mediaId } = await callAIImageAPI(
                finalImagePrompt,
                userApiKey,
                currentState.genyuToken || null,
                currentState.imageModel || 'gemini-3-pro-image-preview',
                currentState.aspectRatio,
                isHighRes ? parts : []
            );

            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? {
                    ...sc,
                    ...(isEndFrame ? { endFrameImage: imageUrl } : { generatedImage: imageUrl }),
                    mediaId: isEndFrame ? sc.mediaId : (mediaId || sc.mediaId),
                    isGenerating: false,
                    error: null
                } : sc)
            }));

        } catch (error) {
            console.error("Image generation failed:", error);
            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: false, error: (error as Error).message } : sc)
            }));
        }
    }, [stateRef, userApiKey, updateStateAndRecord, setApiKeyModalOpen]);

    const generateGroupConcept = useCallback(async (groupName: string, groupDescription: string, styleOverride?: string, customStyleOverride?: string) => {
        const currentState = stateRef.current;
        const apiKey = userApiKey || (process.env as any).API_KEY;
        const genyuToken = currentState.genyuToken;

        if (!apiKey && !genyuToken) {
            setApiKeyModalOpen(true);
            return null;
        }

        try {
            let styleInstruction = '';
            const effectiveStylePrompt = styleOverride || currentState.stylePrompt;
            const effectiveCustomStyle = styleOverride ? customStyleOverride : currentState.customStyleInstruction;

            if (effectiveStylePrompt === 'custom') {
                styleInstruction = effectiveCustomStyle || '';
            } else {
                const selectedStyle = GLOBAL_STYLES.find(s => s.value === effectiveStylePrompt);
                styleInstruction = selectedStyle ? selectedStyle.prompt : '';
            }

            const activePreset = getPresetById(currentState.activeScriptPreset, currentState.customScriptPresets);
            const metaTokens = currentState.customMetaTokens || DEFAULT_META_TOKENS[activePreset?.category || 'custom'] || DEFAULT_META_TOKENS['custom'];

            const conceptPrompt = `STRICT ENVIRONMENT CONCEPT ART: Location "${groupName}". DESCRIPTION: ${groupDescription}. STYLE: ${styleInstruction} ${metaTokens}. MANDATORY: Cinematic landscape/interior, architectural focus, atmospheric lighting. !!! ABSOLUTELY NO PEOPLE, NO HUMANS, NO CHARACTERS, NO FACES !!! focus purely on set design.`.trim();

            const { imageUrl } = await callAIImageAPI(
                conceptPrompt,
                userApiKey,
                genyuToken || null,
                currentState.imageModel || 'gemini-3-pro-image-preview',
                currentState.aspectRatio
            );

            return imageUrl;
        } catch (error) {
            console.error("Concept generation failed:", error);
            return null;
        }
    }, [stateRef, userApiKey, setApiKeyModalOpen]);

    const handleGenerateAllImages = useCallback(async () => {
        const scenesToGenerate = state.scenes.filter(s => !s.generatedImage && s.contextDescription);
        if (scenesToGenerate.length === 0) return alert("Tất cả các phân cảnh có mô tả đã có ảnh.");

        setIsBatchGenerating(true);
        setIsStopping(false);
        stopRef.current = false;

        try {
            for (const scene of scenesToGenerate) {
                if (stopRef.current) break;
                await performImageGeneration(scene.id);
                await new Promise(r => setTimeout(r, 500));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsBatchGenerating(false);
            setIsStopping(false);
        }
    }, [state.scenes, performImageGeneration]);

    return {
        isBatchGenerating,
        isStopping,
        performImageGeneration,
        generateGroupConcept,
        handleGenerateAllImages,
        stopBatchGeneration
    };
}
