import { useCallback } from 'react';
import { ProjectState, Character } from '../types';
import { generateId } from '../utils/helpers';
import { GLOBAL_STYLES, CHARACTER_STYLES } from '../constants/presets';
import { getCharacterStyleById } from '../constants/characterStyles';
import { callGroqText, callGroqVision, callCharacterImageAPI } from '../utils/geminiUtils';
import { uploadImageToSupabase, syncUserStatsToCloud } from '../utils/storageUtils';
import { normalizePromptAsync, needsNormalization, containsVietnamese, formatNormalizationLog } from '../utils/promptNormalizer';
import { recordPrompt, approvePrompt, searchSimilarPrompts } from '../utils/dopLearning';
import { performQualityCheck, shouldAutoRetry, generateRefinedPrompt } from '../utils/qualityScoring';
import { analyzeAndEnhance, predictSuccess, getInsights } from '../utils/dopIntelligence';
import { incrementGlobalStats, recordGeneratedImage } from '../utils/userGlobalStats';

export function useCharacterLogic(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void,
    userId?: string,
    addToGallery?: (image: string, type: string, prompt?: string, sourceId?: string) => void,
    setAgentState?: (agent: 'director' | 'dop', status: any, message?: string, stage?: string) => void

) {
    const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
        updateStateAndRecord(s => ({
            ...s,
            characters: s.characters.map(c => c.id === id ? { ...c, ...updates } : c)
        }));
    }, [updateStateAndRecord]);

    const addCharacter = useCallback(() => {
        const newChar: Character = {
            id: generateId(),
            name: '',
            description: '',
            masterImage: null,
            faceImage: null,
            bodyImage: null,
            sideImage: null,
            backImage: null,
            props: [
                { id: generateId(), name: '', image: null },
                { id: generateId(), name: '', image: null },
                { id: generateId(), name: '', image: null },
            ],
            isDefault: false,
            isAnalyzing: false,
        };
        updateStateAndRecord(s => ({
            ...s,
            characters: [...s.characters, newChar]
        }));
    }, [updateStateAndRecord]);

    const deleteCharacter = useCallback((id: string) => {
        if (state.characters.length <= 1) {
            alert("Bạn cần ít nhất 1 nhân vật.");
            return;
        }
        setTimeout(() => {
            if (confirm("Bạn có chắc muốn xóa nhân vật này?")) {
                updateStateAndRecord(s => ({
                    ...s,
                    characters: s.characters.filter(c => c.id !== id)
                }));
            }
        }, 100);
    }, [state.characters.length, updateStateAndRecord]);

    const setDefaultCharacter = useCallback((id: string) => {
        updateStateAndRecord(s => ({
            ...s,
            characters: s.characters.map(c => ({
                ...c,
                isDefault: c.id === id
            }))
        }));
    }, [updateStateAndRecord]);

    const analyzeCharacterImage = useCallback(async (id: string, image: string) => {
        updateCharacter(id, { isAnalyzing: true, generationStartTime: Date.now() });

        try {
            let data: string;
            let mimeType: string = 'image/jpeg';
            let finalMasterUrl = image;

            if (image.startsWith('data:')) {
                const [header, base64Data] = image.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

                if (userId) {
                    try {
                        finalMasterUrl = await uploadImageToSupabase(image, 'project-assets', `${userId}/characters/${id}_master_${Date.now()}.jpg`);
                    } catch (e) {
                        console.error("Cloud upload failed for master image", e);
                    }
                }
            } else if (image.startsWith('http')) {
                // Handle URL images
                const imgRes = await fetch(image);
                if (!imgRes.ok) throw new Error(`Fetch failed`);
                const blob = await imgRes.blob();
                mimeType = blob.type || 'image/jpeg';
                data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                finalMasterUrl = image;
            } else {
                throw new Error("Invalid image format");
            }

            const analyzePrompt = `Analyze this character's main features. Return JSON: {"name": "Suggest a concise name", "description": "Short Vietnamese description (2-3 sentences) of key physical traits, clothing, and overall vibe. Focus on what makes them unique."}`;
            
            // Use Groq Vision for analysis
            const analysisText = await callGroqVision(analyzePrompt, [{ data, mimeType }]);

            let json = { name: "", description: "" };
            try {
                json = JSON.parse(analysisText.replace(/```json/g, '').replace(/```/g, '').trim());
            } catch (e) {
                console.error("JSON parse error", e);
            }

            updateCharacter(id, {
                masterImage: finalMasterUrl,
                name: json.name || "Unnamed Character",
                description: json.description || "",
                isAnalyzing: false
            });

        } catch (error: any) {
            console.error("Analysis Failed", error);
            updateCharacter(id, { isAnalyzing: false });
        }
    }, [updateCharacter, userId]);

    // Combined function: Analyze + Generate Face ID & Body in one step
    const analyzeAndGenerateSheets = useCallback(async (id: string, image: string, options?: { skipMetadata?: boolean }) => {
        updateCharacter(id, { isAnalyzing: true, generationStartTime: Date.now() });

        try {
            let data: string;
            let mimeType: string = 'image/jpeg';
            let finalMasterUrl = image;

            console.log('[Lora Gen] Starting image processing with Groq...', {
                isBase64: image.startsWith('data:'),
                isUrl: image.startsWith('http')
            });

            // Convert image to base64 if needed
            if (image.startsWith('data:')) {
                const [header, base64Data] = image.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

                if (userId) {
                    try {
                        finalMasterUrl = await uploadImageToSupabase(image, 'project-assets', `${userId}/characters/${id}_master_${Date.now()}.jpg`);
                    } catch (e) {
                        console.error("[Lora Gen] Cloud upload failed for master image", e);
                    }
                }
            } else if (image.startsWith('http')) {
                try {
                    const imgRes = await fetch(image, { mode: 'cors' });
                    if (!imgRes.ok) throw new Error(`Fetch failed: ${imgRes.status}`);
                    const blob = await imgRes.blob();
                    mimeType = blob.type || 'image/jpeg';

                    data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    finalMasterUrl = image;
                } catch (fetchError: any) {
                    throw new Error(`Cannot fetch image from URL: ${fetchError.message}`);
                }
            } else {
                throw new Error("Invalid image format");
            }

            // Step 1: Analyze the character with Groq Vision
            const analyzePrompt = `Analyze this character image carefully and provide accurate details.

**NAME RULES:**
- Suggest a SHORT, MEMORABLE English name (1-2 words max)

**DESCRIPTION RULES:**
- Write in Vietnamese
- Be SPECIFIC about physical traits: face shape, skin tone, hair color/style, eye shape
- Describe clothing/costume in detail

**ART STYLE DETECTION:**
- PHOTOREALISTIC, DIGITAL PAINTING, ANIME, or CARTOON

Return JSON:
{
    "name": "Short English name",
    "description": "Vietnamese description",
    "art_style": "Style description in English",
    "is_illustration": true/false
}`;

            const analysisText = await callGroqVision(analyzePrompt, [{ data, mimeType }]);

            let json = { name: "", description: "", art_style: "", is_illustration: false };
            try {
                json = JSON.parse(analysisText.replace(/```json/g, '').replace(/```/g, '').trim());
            } catch (e) {
                console.error("JSON parse error", e);
            }

            const charName = json.name || "Unnamed Character";
            const charDescription = json.description || "Character";
            let detectedStyle = json.art_style || "Digital illustration style";

            if (json.is_illustration) {
                detectedStyle = `ILLUSTRATION/PAINTED STYLE: ${detectedStyle}. This is NOT photorealistic.`;
            }

            const currentChar = state.characters.find(c => c.id === id);
            const finalName = options?.skipMetadata ? (currentChar?.name || charName) : charName;
            const finalDescription = options?.skipMetadata ? (currentChar?.description || charDescription) : charDescription;

            updateCharacter(id, {
                masterImage: finalMasterUrl,
                name: finalName,
                description: finalDescription
            });

            // Step 2: Generate Face ID and Body using selected image model
            const styleInstruction = `
**CRITICAL STYLE ENFORCEMENT:**
MATCH THE EXACT artistic style: "${detectedStyle}"
- BACKGROUND: Pure solid white (#FFFFFF) only.
- LIGHTING: Clean studio lighting.
`.trim();

            let characterStyleInstruction = '';
            if (state.globalCharacterStyleId) {
                const charStyle = getCharacterStyleById(state.globalCharacterStyleId, state.customCharacterStyles || []);
                if (charStyle) {
                    characterStyleInstruction = `\n**STYLE PRESET OVERRIDE:**\n${charStyle.promptInjection.global}\n`;
                }
            }

            const facePrompt = `${characterStyleInstruction}${styleInstruction}\n\n[TASK: FACE ID]\nGenerate an EXTREME CLOSE-UP portrait of this character's face on a pure white background.\nCharacter: ${finalDescription}\nSTYLE: ${detectedStyle}`;

            const bodyPrompt = `${characterStyleInstruction}${styleInstruction}\n\n[TASK: FULL BODY]\nGenerate a FULL BODY view of this character on a pure white background.\nCharacter: ${finalDescription}\nSTYLE: ${detectedStyle}`;

            const model = currentChar?.preferredModel || state.imageModel || 'fal-ai/flux-general';

            // Prepare Gommo credentials from state
            const gommoCredentials = state.gommoDomain && state.gommoAccessToken
                ? { domain: state.gommoDomain, accessToken: state.gommoAccessToken }
                : undefined;

            let [faceUrl, bodyUrl] = await Promise.all([
                callCharacterImageAPI(null, facePrompt, "1:1", model, image, gommoCredentials),
                callCharacterImageAPI(null, bodyPrompt, "9:16", model, image, gommoCredentials),
            ]);

            if (userId) {
                if (faceUrl?.startsWith('data:')) {
                    faceUrl = await uploadImageToSupabase(faceUrl, 'project-assets', `${userId}/characters/${id}_face_${Date.now()}.jpg`);
                }
                if (bodyUrl?.startsWith('data:')) {
                    bodyUrl = await uploadImageToSupabase(bodyUrl, 'project-assets', `${userId}/characters/${id}_body_${Date.now()}.jpg`);
                }
            }

            updateCharacter(id, {
                faceImage: faceUrl || undefined,
                bodyImage: bodyUrl || undefined,
                isAnalyzing: false
            });

        } catch (error: any) {
            console.error("[Lora Gen] ❌ Groq Analysis Failed", error);
            updateCharacter(id, { isAnalyzing: false });
        }
    }, [updateCharacter, userId, state.imageModel, state.characters, state.globalCharacterStyleId, state.customCharacterStyles, state.gommoDomain, state.gommoAccessToken]);

    const generateCharacterSheets = useCallback(async (id: string) => {
        const char = state.characters.find(c => c.id === id);
        if (!char || !char.masterImage) return;

        updateCharacter(id, { isAnalyzing: true, generationStartTime: Date.now() });

        try {
            const currentStyle = GLOBAL_STYLES.find(s => s.value === state.stylePrompt)?.prompt || "Cinematic photorealistic, 8k, high quality";

            const consistencyInstruction = `
            **MANDATORY CONSISTENCY:** 
            - BACKGROUND: Pure Solid White Studio Background. 
            - STYLE: "${currentStyle}".
            `.trim();

            const description = char.description || "Character";
            const facePrompt = `${consistencyInstruction}\n\n(STRICT CAMERA: EXTREME CLOSE-UP - FACE ID ON WHITE BACKGROUND) Generate a highly detailed Face ID close-up of this character: ${description}.`;

            const model = char.preferredModel || state.imageModel || 'fal-ai/flux-general';

            const gommoCredentials = state.gommoDomain && state.gommoAccessToken
                ? { domain: state.gommoDomain, accessToken: state.gommoAccessToken }
                : undefined;

            let faceUrl = await callCharacterImageAPI(null, facePrompt, "1:1", model, char.masterImage, gommoCredentials);

            if (userId && faceUrl?.startsWith('data:')) {
                faceUrl = await uploadImageToSupabase(faceUrl, 'project-assets', `${userId}/characters/${id}_face_${Date.now()}.jpg`);
            }

            updateCharacter(id, {
                faceImage: faceUrl || undefined,
                bodyImage: char.masterImage,
                isAnalyzing: false
            });

        } catch (e) {
            console.error("Generation Sheets Failed", e);
            updateCharacter(id, { isAnalyzing: false });
        }
    }, [state.imageModel, state.stylePrompt, updateCharacter, state.characters, userId, state.gommoDomain, state.gommoAccessToken]);

    const generateCharacterImage = useCallback(async (
        charId: string,
        params: {
            prompt: string,
            style: string,
            customStyle?: string,
            aspectRatio: string,
            resolution: string,
            model: string
        }
    ) => {
        const { prompt, style, customStyle, aspectRatio, model } = params;
        updateCharacter(charId, {
            isGenerating: true,
            generationStartTime: Date.now(),
            generationStatus: '🚀 Starting generation...'
        });

        try {
            const styleConfig = CHARACTER_STYLES.find(s => s.value === style);
            const stylePrompt = style === 'custom' ? customStyle : (styleConfig?.prompt || styleConfig?.label || style);

            const fullPrompt = `
!!! CRITICAL: SINGLE CHARACTER ONLY !!!
CHARACTER DESIGN TASK:
Create a professional character reference showing EXACTLY ONE PERSON:

STYLE PRESET:
${stylePrompt}

CHARACTER DESCRIPTION:
${prompt}

MANDATORY:
- SUBJECT: EXACTLY 1 PERSON.
- Background: Pure Solid White (#FFFFFF).
- Framing: FULL BODY HEAD-TO-TOE.
- Pose: Standard A-Pose or T-Pose.
- Quality: 8K, Ultra-Sharp.

CRITICAL: ONE SINGLE FULL-BODY IMAGE on solid white background.
            `.trim();

            const gommoCredentials = state.gommoDomain && state.gommoAccessToken
                ? { domain: state.gommoDomain, accessToken: state.gommoAccessToken }
                : undefined;

            // --- DOP INTELLIGENCE with Groq ---
            let dopDecision = null;
            if (userId) {
                try {
                    updateCharacter(charId, { generationStatus: '🧠 DOP analyzing (Groq)...' });
                    // analyzeAndEnhance already uses callGroqText internally if configured
                    dopDecision = await analyzeAndEnhance(prompt, model, 'character', aspectRatio, 'GROQ_MODE', userId);
                } catch (e) {
                    console.warn('[CharacterGen] DOP Intelligence failed:', e);
                }
            }

            let promptToSend = fullPrompt;
            if (dopDecision && dopDecision.enhancement.addedKeywords.length > 0) {
                promptToSend = `${fullPrompt}\n\n[DOP LEARNED]: ${dopDecision.enhancement.addedKeywords.join(', ')}`;
            }

            const requiresNormalization = needsNormalization(model);
            if (requiresNormalization) {
                updateCharacter(charId, { generationStatus: `🔧 Optimizing prompt for ${model}...` });
                try {
                    // normalizePromptAsync now uses Groq internally
                    const normalized = await normalizePromptAsync(fullPrompt, model, 'GROQ_MODE', aspectRatio, 'character');
                    promptToSend = normalized.normalized;
                } catch (normErr) {
                    console.warn('[CharacterGen] Normalization failed:', normErr);
                }
            }

            updateCharacter(charId, { generationStatus: `🎨 Generating with ${model}...` });

            // Use callCharacterImageAPI
            const imageUrl = await callCharacterImageAPI(
                null,
                promptToSend,
                aspectRatio,
                model,
                null,
                gommoCredentials
            );

            if (imageUrl) {
                let finalUrl = imageUrl;
                if (userId && imageUrl.startsWith('data:')) {
                    finalUrl = await uploadImageToSupabase(imageUrl, 'project-assets', `${userId}/characters/${charId}_gen_${Date.now()}.jpg`);
                }

                updateCharacter(charId, {
                    generatedImage: finalUrl,
                    isGenerating: false,
                    generationStartTime: undefined
                });
                if (addToGallery) addToGallery(finalUrl, 'character', prompt, charId);

                // Update usage stats
                updateStateAndRecord(s => {
                    const currentStats = s.usageStats || { '1K': 0, '2K': 0, '4K': 0, total: 0 };
                    return {
                        ...s,
                        usageStats: { ...currentStats, total: (currentStats.total || 0) + 1, characters: (currentStats.characters || 0) + 1 }
                    };
                });
            } else {
                throw new Error("AI không trả về ảnh.");
            }

        } catch (err: any) {
            console.error("Gen Error:", err);
            updateCharacter(charId, { isGenerating: false, generationStartTime: undefined });
            alert(`❌ Lỗi: ${err.message}`);
        }
    }, [updateCharacter, userId, state.gommoDomain, state.gommoAccessToken, state.usageStats, updateStateAndRecord, addToGallery]);

    return {
        updateCharacter,
        addCharacter,
        deleteCharacter,
        setDefaultCharacter,
        analyzeCharacterImage,
        analyzeAndGenerateSheets,
        generateCharacterSheets,
        generateCharacterImage
    };
}
