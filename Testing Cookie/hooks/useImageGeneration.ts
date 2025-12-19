import { useState, useCallback } from 'react';
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
    setState: React.Dispatch<React.SetStateAction<ProjectState>>,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void,
    isContinuityMode: boolean,
    concurrencyLimit: number
) {
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);

    const performImageGeneration = useCallback(async (sceneId: string, refinementPrompt?: string, isEndFrame: boolean = false) => {
        const currentState = stateRef.current;
        const currentSceneIndex = currentState.scenes.findIndex(s => s.id === sceneId);
        const sceneToUpdate = currentState.scenes[currentSceneIndex];
        if (!sceneToUpdate) return;

        // --- 1. GET GLOBAL STYLE PROMPT ---
        let styleInstruction = '';
        if (currentState.stylePrompt === 'custom') {
            styleInstruction = currentState.customStyleInstruction || '';
        } else {
            const selectedStyle = GLOBAL_STYLES.find(s => s.value === currentState.stylePrompt);
            styleInstruction = selectedStyle ? selectedStyle.prompt : '';
        }

        // --- 2. GET CINEMATOGRAPHY SETTINGS ---
        let cameraPrompt = '';
        if (currentState.cameraModel === 'custom') {
            cameraPrompt = currentState.customCameraModel ? `Shot on ${currentState.customCameraModel}` : '';
        } else {
            const cameraModelInfo = CAMERA_MODELS.find(c => c.value === currentState.cameraModel);
            cameraPrompt = cameraModelInfo?.prompt || '';
        }

        const effectiveLens = sceneToUpdate.lensOverride || currentState.defaultLens || '';
        let lensPrompt = '';
        if (sceneToUpdate.lensOverride === 'custom') {
            lensPrompt = sceneToUpdate.customLensOverride ? `Lens: ${sceneToUpdate.customLensOverride}` : '';
        } else if (effectiveLens === 'custom' || (effectiveLens === '' && currentState.defaultLens === 'custom')) {
            const customLens = currentState.customDefaultLens || '';
            lensPrompt = customLens ? `Lens: ${customLens}` : '';
        } else {
            const lensInfo = LENS_OPTIONS.find(l => l.value === effectiveLens);
            lensPrompt = lensInfo?.prompt || '';
        }

        const effectiveAngle = sceneToUpdate.cameraAngleOverride || '';
        let anglePrompt = '';
        if (effectiveAngle === 'custom') {
            anglePrompt = sceneToUpdate.customCameraAngle || '';
        } else {
            const angleInfo = CAMERA_ANGLES.find(a => a.value === effectiveAngle);
            anglePrompt = angleInfo ? angleInfo.label : '';
        }

        const activePreset = getPresetById(currentState.activeScriptPreset, currentState.customScriptPresets);
        const presetCategory = activePreset?.category || 'custom';
        const metaTokens = currentState.customMetaTokens || DEFAULT_META_TOKENS[presetCategory] || DEFAULT_META_TOKENS['custom'];

        let cinematographyParts: string[] = [];
        if (cameraPrompt) cinematographyParts.push(cameraPrompt);
        if (lensPrompt) cinematographyParts.push(lensPrompt);
        if (anglePrompt) cinematographyParts.push(anglePrompt);

        const cinematographyPrompt = cinematographyParts.length > 0
            ? cinematographyParts.join(', ') + '.'
            : '';

        let finalPrompt = `(STRICT CAMERA: ${cinematographyPrompt}) ${styleInstruction} ${metaTokens}. ${sceneToUpdate.contextDescription}`.trim();

        const selectedCharsForPrompt = currentState.characters.filter(c => sceneToUpdate.characterIds.includes(c.id));
        if (selectedCharsForPrompt.length > 0) {
            const charDesc = selectedCharsForPrompt.map((c) => {
                const propsText = c.props?.filter(p => p.image).map((p, idx) => p.name || `Accessory #${idx + 1}`).join(', ');
                return `[${c.name}: ${c.description}${propsText ? `. WITH PROPS: ${propsText}` : ''}]`;
            }).join(' ');
            finalPrompt += `\n\nAppearing Characters: ${charDesc}`;
        }

        const selectedProdsForPrompt = (currentState.products || []).filter(p => (sceneToUpdate.productIds || []).includes(p.id));
        if (selectedProdsForPrompt.length > 0) {
            const prodDesc = selectedProdsForPrompt.map(p => `[Product: ${p.name} - ${p.description}]`).join(' ');
            finalPrompt += `\n\nFeatured Products: ${prodDesc}. STRICTLY FOLLOW REFERENCE IMAGES FOR THESE PRODUCTS. DO NOT hallucinate details.`;
        }

        const previousSceneIndex = currentSceneIndex - 1;
        if (previousSceneIndex >= 0) {
            const previousScene = currentState.scenes[previousSceneIndex];
            if (previousScene && previousScene.contextDescription) {
                let transitionHint = 'smooth visual continuity';
                if (previousScene.transitionType === 'custom') {
                    transitionHint = previousScene.customTransitionType || transitionHint;
                } else if (previousScene.transitionType) {
                    const transitionInfo = TRANSITION_TYPES.find(t => t.value === previousScene.transitionType);
                    transitionHint = transitionInfo?.hint || transitionHint;
                }
                const continuityPrompt = `\n\n[FILM CONTINUITY: Previous scene "${previousScene.promptName || 'Scene ' + previousSceneIndex}" showed: ${previousScene.contextDescription.slice(0, 150)}... Transition: ${transitionHint}. Ensure visual coherence and narrative flow.]`;
                finalPrompt += continuityPrompt;
            }
        }

        if (!finalPrompt && !refinementPrompt) {
            alert("Vui lòng nhập mô tả bối cảnh.");
            return;
        }

        const apiKey = userApiKey || (process.env as any).API_KEY;
        const genyuToken = currentState.genyuToken;

        if (!apiKey && !genyuToken) {
            setApiKeyModalOpen(true);
            alert("Vui lòng nhập API Key (Gemini) hoặc Token (Genyu) để tiếp tục.");
            return;
        }

        setState(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: true, error: null } : sc)
        }));

        try {
            let finalImagePrompt = finalPrompt;

            if (apiKey) {
                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const selectedChars = currentState.characters.filter(c => sceneToUpdate.characterIds.includes(c.id));
                    const characterInstructions = selectedChars.map((c, i) => {
                        const propsText = c.props?.filter(p => p.image).map((p, idx) => p.name || `Accessory #${idx + 1}`).join(', ');
                        const propsSegment = propsText ? `\n  - equipped with PROPS: ${propsText}` : '';
                        return `- Character ${i + 1} (${c.name}): ${c.description}.${propsSegment}`;
                    }).join('\n');
                    const charNames = selectedChars.map(c => c.name).join(', ') || 'None';

                    let continuityInstruction = "";
                    if (isContinuityMode && currentSceneIndex > 0 && currentState.scenes[currentSceneIndex - 1].generatedImage) {
                        continuityInstruction = "CONTINUITY: Match lighting and environment of the previous scene.";
                    }

                    const directorPrompt = `
                    Act as a Film Director / Cinematographer.
                    Rewrite this scene description into a detailed Image Generation Prompt.
                    
                    SCENE: "${sceneToUpdate.contextDescription}"
                    STYLE: ${styleInstruction} ${metaTokens}
                    CAMERA \u0026 LENS (HIGHEST PRIORITY): ${cinematographyPrompt}
                    CHARACTERS: ${charNames}
                    DETAILS:
                    ${characterInstructions}
                    ${continuityInstruction}
                    ${refinementPrompt ? `REFINEMENT REQUEST: ${refinementPrompt}` : ''}

                    CRITICAL INSTRUCTION: 
                    I have provided visual references for the characters and their props. 
                    Look at the images provided (Face, Body, Props). 
                    describe the PROPS in extreme detail based on the visual reference. 
                    Ensure the prompt enforces the presence of these specific props.

                    OUTPUT: A single, high-quality, descriptive English prompt.
                    `;

                    const directorParts: any[] = [{ text: directorPrompt }];

                    const safeAddImage = (img: string | undefined | null, label: string) => {
                        if (img && img.startsWith('data:') && img.includes(',')) {
                            try {
                                const [h, d] = img.split(',');
                                const m = h.match(/:(.*?);/)?.[1] || 'image/jpeg';
                                if (d && d.length > 100) {
                                    directorParts.push({ text: label });
                                    directorParts.push({ inlineData: { data: d, mimeType: m } });
                                }
                            } catch (e) {
                                console.warn("Could not process image:", label);
                            }
                        }
                    };

                    selectedChars.forEach((c) => {
                        safeAddImage(c.faceImage, `[Visual Ref: ${c.name} Face]`);
                        safeAddImage(c.bodyImage, `[Visual Ref: ${c.name} Outfit]`);
                        if (c.props) {
                            c.props.forEach(p => {
                                safeAddImage(p.image, `[Visual Ref: ${c.name} Prop - ${p.name}]`);
                            });
                        }
                    });

                    if (isContinuityMode && currentSceneIndex > 0) {
                        const prevImg = currentState.scenes[currentSceneIndex - 1].generatedImage;
                        if (prevImg && prevImg.startsWith('data:') && prevImg.includes(',')) {
                            try {
                                const [h, d] = prevImg.split(',');
                                const m = h.match(/:(.*?);/)?.[1] || 'image/jpeg';
                                if (d && d.length > 100) {
                                    directorParts.push({ text: `[Visual Ref: Previous Scene Context]` });
                                    directorParts.push({ inlineData: { data: d, mimeType: m } });
                                }
                            } catch (imgErr) {
                                console.warn("Could not add previous scene image to prompt");
                            }
                        }
                    }

                    const enhancementResp = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: directorParts }
                    });
                    finalImagePrompt = enhancementResp.text || finalPrompt;
                } catch (e) {
                    console.warn("Prompt enhancement failed, using raw prompt", e);
                }
            }

            let imageUrl = "";
            const currentResolution = currentState.resolution || '1K';
            const isHighRes = currentResolution === '2K' || currentResolution === '4K';

            if (apiKey) {
                const ai = new GoogleGenAI({ apiKey });
                const parts: any[] = [];

                const selectedChars = currentState.characters.filter(c => sceneToUpdate.characterIds.includes(c.id));
                for (const char of selectedChars) {
                    if (char.faceImage) {
                        const [header, data] = char.faceImage.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ text: `STRICT Character Reference for ${char.name}'s FACE:` });
                        parts.push({ inlineData: { data, mimeType } });
                    }
                    if (char.bodyImage) {
                        const [header, data] = char.bodyImage.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ text: `STRICT Character Reference for ${char.name}'s OUTFIT/BODY:` });
                        parts.push({ inlineData: { data, mimeType } });
                    }
                    if (char.props) {
                        for (const prop of char.props) {
                            if (prop.image) {
                                const [header, data] = prop.image.split(',');
                                const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                                parts.push({ text: `STRICT Prop Reference for ${char.name}'s ${prop.name || 'Accessory'}:` });
                                parts.push({ inlineData: { data, mimeType } });
                            }
                        }
                    }
                }

                const selectedProducts = currentState.products.filter(p => (sceneToUpdate.productIds || []).includes(p.id));
                for (const prod of selectedProducts) {
                    if (prod.masterImage) {
                        const [header, data] = prod.masterImage.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ text: `STRICT Product Reference for ${prod.name} (EXACT REPLICA):` });
                        parts.push({ inlineData: { data, mimeType } });
                    }
                }

                if (isContinuityMode && currentSceneIndex > 0 && !refinementPrompt) {
                    const prevScene = currentState.scenes[currentSceneIndex - 1];
                    if (prevScene.generatedImage) {
                        const [header, data] = prevScene.generatedImage.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        parts.push({ text: `[Continuity Reference: Lighting and Environment from Previous Scene]` });
                        parts.push({ inlineData: { data, mimeType } });
                    }
                }

                if (refinementPrompt && sceneToUpdate.generatedImage) {
                    const [header, data] = sceneToUpdate.generatedImage.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    parts.push({ text: `[Source for refinement]` });
                    parts.push({ inlineData: { data, mimeType } });
                }

                const styledPrompt = `${finalImagePrompt}\n\nSTRICT VISUAL STYLE: ${styleInstruction}`.trim();
                parts.push({ text: styledPrompt });

                let modelToUse = currentState.imageModel || 'gemini-2.5-flash-image';
                if (isHighRes && modelToUse === 'gemini-2.5-flash-image') {
                    modelToUse = 'gemini-3-pro-image-preview';
                }

                const response = await ai.models.generateContent({
                    model: modelToUse,
                    contents: { parts },
                    config: {
                        imageConfig: {
                            aspectRatio: currentState.aspectRatio || "16:9",
                            imageSize: currentResolution
                        }
                    },
                });

                const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
                if (imagePart?.inlineData) {
                    imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                } else {
                    throw new Error("Không nhận được ảnh từ API.");
                }

            } else if (genyuToken && !isHighRes) {
                let genyuAspect = "IMAGE_ASPECT_RATIO_LANDSCAPE";
                if (currentState.aspectRatio === "9:16") genyuAspect = "IMAGE_ASPECT_RATIO_PORTRAIT";
                if (currentState.aspectRatio === "3:4") genyuAspect = "IMAGE_ASPECT_RATIO_PORTRAIT";
                if (currentState.aspectRatio === "1:1") genyuAspect = "IMAGE_ASPECT_RATIO_SQUARE";
                if (currentState.aspectRatio === "4:3") genyuAspect = "IMAGE_ASPECT_RATIO_LANDSCAPE";

                const requestBody: any = {
                    token: genyuToken,
                    prompt: finalImagePrompt,
                    aspect: genyuAspect,
                    style: styleInstruction
                };

                if (currentState.recaptchaToken) {
                    requestBody.recaptchaToken = currentState.recaptchaToken;
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
                let genyuImage = null;
                let extractedMediaId = null;

                if (data.submissionResults && data.submissionResults.length > 0) {
                    const submission = data.submissionResults[0]?.submission;
                    const result = submission?.result || data.submissionResults[0]?.result;
                    genyuImage = result?.fifeUrl || result?.media?.fifeUrl;
                    extractedMediaId = result?.mediaGenerationId || result?.media?.mediaGenerationId;
                    if (!extractedMediaId && data.workflows && data.workflows.length > 0) {
                        extractedMediaId = data.workflows[0].primaryMediaKey;
                    }
                } else if (data.media && data.media.length > 0) {
                    const mediaItem = data.media[0];
                    genyuImage = mediaItem.fifeUrl || mediaItem.url;
                    extractedMediaId = mediaItem.id || mediaItem.mediaId || mediaItem.mediaGenerationId;
                    if (!genyuImage && mediaItem.image) {
                        const img = mediaItem.image;
                        genyuImage = img.fifeUrl || img.url;
                        if (!genyuImage && img.generatedImage) {
                            const genImg = img.generatedImage;
                            genyuImage = genImg.fifeUrl || genImg.url || (typeof genImg === 'string' ? genImg : null);
                        }
                    }
                    if (!extractedMediaId && data.workflows && data.workflows.length > 0) {
                        extractedMediaId = data.workflows[0].primaryMediaKey;
                    }
                }

                if (!genyuImage) {
                    genyuImage = data.data?.images?.[0]?.url || data.data?.url || data.url || data.imageUrl;
                }

                if (genyuImage) {
                    imageUrl = genyuImage;
                } else {
                    throw new Error(`Cannot find image URL.`);
                }

                setState(s => ({
                    ...s,
                    scenes: s.scenes.map(sc => sc.id === sceneId ? {
                        ...sc,
                        ...(isEndFrame
                            ? { endFrameImage: imageUrl }
                            : { generatedImage: imageUrl, imageRole: sc.veoMode === 'start-end-frame' ? 'start-frame' : 'single' }
                        ),
                        mediaId: isEndFrame ? sc.mediaId : extractedMediaId,
                        error: null,
                        isGenerating: false
                    } : sc)
                }));
                return;
            } else {
                throw new Error("Missing Credentials (API Key or Genyu Token)");
            }

            setState(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? {
                    ...sc,
                    ...(isEndFrame
                        ? { endFrameImage: imageUrl }
                        : { generatedImage: imageUrl, imageRole: sc.veoMode === 'start-end-frame' ? 'start-frame' : 'single' }
                    ),
                    isGenerating: false,
                    error: null
                } : sc)
            }));

        } catch (error) {
            console.error("Image generation failed:", error);
            let errorMessage = "Tạo ảnh thất bại.";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            setState(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, isGenerating: false, error: errorMessage } : sc)
            }));
        }
    }, [stateRef, userApiKey, isContinuityMode, setState, setApiKeyModalOpen]);

    const handleGenerateAllImages = useCallback(async () => {
        const scenesToGenerate = state.scenes.filter(s => !s.generatedImage && s.contextDescription);
        if (scenesToGenerate.length === 0) {
            alert("Tất cả các phân cảnh có mô tả đã có ảnh.");
            return;
        }

        setIsBatchGenerating(true);

        if (isContinuityMode) {
            try {
                for (const scene of scenesToGenerate) {
                    await performImageGeneration(scene.id);
                    await new Promise(r => setTimeout(r, 500));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setIsBatchGenerating(false);
            }
        } else {
            const runWithConcurrency = async (tasks: (() => Promise<any>)[], limit: number) => {
                const results: Promise<any>[] = [];
                const executing: Promise<any>[] = [];
                for (const task of tasks) {
                    const p = task();
                    results.push(p);
                    if (limit <= tasks.length) {
                        const e = p.then(() => executing.splice(executing.indexOf(e), 1));
                        executing.push(e);
                        if (executing.length >= limit) {
                            await Promise.race(executing);
                        }
                    }
                }
                return Promise.all(results);
            };

            const generationTasks = scenesToGenerate.map(scene => () => performImageGeneration(scene.id));
            try {
                await runWithConcurrency(generationTasks, concurrencyLimit);
            } catch (error) {
                console.error("An error occurred during batch generation:", error);
            } finally {
                setIsBatchGenerating(false);
            }
        }
    }, [isContinuityMode, state.scenes, performImageGeneration, concurrencyLimit]);

    return {
        performImageGeneration,
        handleGenerateAllImages,
        isBatchGenerating
    };
}
