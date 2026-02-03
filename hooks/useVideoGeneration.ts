import { useState, useCallback, useRef } from 'react';
import { ProjectState, AgentStatus } from '../types';

import { CAMERA_ANGLES, LENS_OPTIONS, VEO_PRESETS, VEO_CAMERA_MOTIONS } from '../constants/presets';
import { DIRECTOR_PRESETS, DirectorPreset } from '../constants/directors';
import { Scene } from '../types';
import { fixMimeType, callGeminiText, callSmartVision } from '../utils/geminiUtils';

export function useVideoGeneration(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void,
    setAgentState?: (agent: 'director' | 'dop', status: AgentStatus, message?: string, stage?: string) => void,
    addProductionLog?: (sender: 'director' | 'dop' | 'user' | 'system', message: string, type?: string, stage?: string) => void
) {

    const [isVeoGenerating, setIsVeoGenerating] = useState(false);
    const [isVeoStopping, setIsVeoStopping] = useState(false);
    const [isVideoGenerating, setIsVideoGenerating] = useState(false);
    const stopVeoRef = useRef(false);




    const stopVeoGeneration = useCallback(() => {
        if (isVeoGenerating) {
            stopVeoRef.current = true;
            setIsVeoStopping(true);
        }
    }, [isVeoGenerating]);

    const generateVeoPrompt = useCallback(async (sceneId: string) => {
        const scene = state.scenes.find(s => s.id === sceneId);
        if (!scene) {
            console.warn('[Veo] Scene not found:', sceneId);
            return;
        }
        if (!scene.generatedImage) {
            alert('Vui lòng tạo ảnh cho scene này trước khi tạo Veo prompt.');
            console.warn('[Veo] No generated image for scene:', sceneId);
            return;
        }

        // No strict API key check - callSmartVision handles fallback

        // Mark scene as generating (for UI feedback)
        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt: '⏳ Đang tạo...' } : sc)
        }));

        try {
            console.log('[Veo] Starting prompt generation for scene:', sceneId);
            let data: string;
            let mimeType: string = 'image/jpeg';

            if (scene.generatedImage.startsWith('data:')) {
                const [header, base64Data] = scene.generatedImage.split(',');
                data = base64Data;
                // Extract and validate MIME type from base64 header
                const extractedMime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                mimeType = fixMimeType(extractedMime, scene.generatedImage);
                console.log('[Veo] Base64 image, MIME:', mimeType);
            } else {
                // Try to fetch image - first direct, then via proxy if CORS fails
                let blob: Blob | null = null;
                const imageUrl = scene.generatedImage;

                try {
                    // Try direct fetch first (works for same-origin or CORS-enabled URLs)
                    const directRes = await fetch(imageUrl);
                    if (directRes.ok) {
                        blob = await directRes.blob();
                        console.log('[Veo] Direct fetch successful');
                    }
                } catch (directError) {
                    console.log('[Veo] Direct fetch failed, trying proxy...');
                }

                // If direct fetch failed, try proxy (for development)
                if (!blob) {
                    try {
                        const proxyUrl = `http://localhost:3001/api/proxy/fetch-image?url=${encodeURIComponent(imageUrl)}`;
                        const proxyRes = await fetch(proxyUrl);
                        if (proxyRes.ok) {
                            blob = await proxyRes.blob();
                            console.log('[Veo] Proxy fetch successful');
                        }
                    } catch (proxyError) {
                        console.error('[Veo] Proxy fetch also failed:', proxyError);
                    }
                }

                if (!blob) {
                    updateStateAndRecord(s => ({
                        ...s,
                        scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt: '❌ Lỗi tải ảnh' } : sc)
                    }));
                    alert('Không thể tải ảnh từ URL. Vui lòng thử lại hoặc convert ảnh sang base64.');
                    return;
                }

                // [FIX] Use fixMimeType helper to ensure valid MIME type
                mimeType = fixMimeType(blob.type, imageUrl);
                console.log('[Veo] Fetched image, MIME:', mimeType);

                data = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            // Determine effective language for script text
            const languageNames: Record<string, string> = {
                'vietnamese': 'Vietnamese',
                'language1': 'English',
                'spanish': 'Spanish',
                'chinese': 'Chinese (Mandarin)',
                'hindi': 'Hindi',
                'arabic': 'Arabic',
                'custom': state.customScriptLanguage || 'English'
            };
            const effectiveLanguage = languageNames[state.scriptLanguage] || 'English';

            // Get script text based on language setting
            // Vietnamese uses 'vietnamese' field, all others use 'language1' field
            const dialogueText = state.scriptLanguage === 'vietnamese'
                ? scene.vietnamese
                : scene.language1;

            // Voice Over (narration/commentary - not spoken by characters in scene)
            const voiceOverText = scene.voiceOverText || scene.voiceover || '';

            // Dialogue (spoken by characters in scene)
            // CRITICAL FIX: Only use dialogueText if this is ACTUALLY a dialogue scene
            // Previously, Voice-Over was being incorrectly treated as dialogue
            const dialoguesFromArray = scene.dialogues?.map(d => `${d.characterName}: "${d.line}"`).join('; ') || '';

            // Only consider dialogueText as real dialogue if:
            // 1. Scene is explicitly marked as dialogue scene, OR
            // 2. dialogueText contains speaker prefix (e.g., "John: Hello")
            const isActualDialogue = scene.isDialogueScene ||
                (dialogueText && dialogueText.includes(':') && !dialogueText.startsWith('Scene'));

            const finalDialogue = dialoguesFromArray || (isActualDialogue ? dialogueText : '');

            const context = scene.contextDescription || '';
            const promptName = scene.promptName || '';
            const sceneProducts = (state.products || []).filter(p => (scene.productIds || []).includes(p.id));
            const productContext = sceneProducts.map(p => `Product: ${p.name} (${p.description})`).join('; ');

            // === CHARACTER IDENTITY FOR ACTION DIRECTION ===
            // Get selected characters for this scene to properly identify WHO does WHAT to WHOM
            const selectedCharacters = (state.characters || []).filter(
                c => (scene.characterIds || []).includes(c.id)
            );

            // Build character identity string with visual descriptions for AI to match
            let characterIdentityContext = '';
            if (selectedCharacters.length > 0) {
                const charDescriptions = selectedCharacters.map((char) => {
                    // Provide visual cues for AI to identify each character in the image
                    return `- ${char.name}: ${char.description || 'No description'} (identify by their unique appearance/clothing)`;
                });

                const charNames = selectedCharacters.map(c => c.name).join(', ');

                characterIdentityContext = `
**CHARACTERS TO IDENTIFY IN THIS IMAGE (CRITICAL):**
${charDescriptions.join('\n')}

🔍 **STEP 1 - ANALYZE THE IMAGE:**
- Look at the provided image carefully
- Identify each character by their appearance/clothing from descriptions above
- Note their positions: LEFT, CENTER, RIGHT, FOREGROUND, BACKGROUND

📌 **STEP 2 - MAP POSITIONS FOR ACTION:**
Characters in this scene: ${charNames}
- If script mentions "A gives to B" or "A does X to B", identify:
  1. WHO is A (the actor/giver) based on their visual appearance
  2. WHO is B (the receiver) based on their visual appearance
  3. WHERE each is positioned in the image

⚠️ **STEP 3 - ACTION DIRECTION RULES:**
- Action flows FROM the initiator TO the receiver (as written in script)
- Do NOT reverse the action
- Do NOT show recipient giving back
- MATCH character names to their VISUAL appearance in the image, not assumed positions
`;
                console.log('[Veo] Character context added:', charNames);
            }

            // Build Scene Intelligence context
            const hasDialogue = Boolean(finalDialogue);
            const hasVoiceOver = Boolean(voiceOverText);
            const characterCount = scene.characterIds?.length || 0;

            // NOTE: Emotion detection REMOVED - it was causing unwanted character acting influence
            // Character acting should be determined by the AI based on the image and scene description

            const selectedPreset = VEO_PRESETS.find(p => p.value === scene.veoPreset) || VEO_PRESETS[0];

            // Get selected camera motion
            const selectedCameraMotion = VEO_CAMERA_MOTIONS.find(m => m.value === scene.veoCameraMotion);
            const cameraMotionPrompt = selectedCameraMotion?.prompt || '';
            const cameraMotionLabel = selectedCameraMotion?.label || 'Auto';

            // ========== DIRECTOR DNA INJECTION ==========
            // Find active director and get signature camera style
            let activeDirector: DirectorPreset | undefined;
            const activeDirectorId = state.activeDirectorId;

            if (activeDirectorId) {
                // Search through all director categories
                for (const category of Object.values(DIRECTOR_PRESETS)) {
                    const found = category.find(d => d.id === activeDirectorId);
                    if (found) {
                        activeDirector = found;
                        break;
                    }
                }
                // Also check custom directors
                if (!activeDirector && state.customDirectors) {
                    activeDirector = state.customDirectors.find(d => d.id === activeDirectorId);
                }
            }

            const directorName = activeDirector?.name || 'Default';
            const directorDNA = activeDirector?.dna || '';
            const directorSignatureCameraStyle = activeDirector?.signatureCameraStyle || '';

            // Check if Documentary mode
            const isDocumentaryMode = scene.veoPreset === 'documentary-natural';

            // DOCUMENTARY MODE: Ultra-simplified prompt
            const documentaryPromptText = `
Role: Documentary Video Prompt Generator (MINIMAL mode)

**YOU HAVE AN IMAGE. DO NOT DESCRIBE IT.**

**YOUR ONLY JOB:** Write a SHORT prompt describing CHARACTER ACTION only.

**SCENE CONTEXT (for action reference):**
- Story: "${context}"
- Intent: "${promptName}"
${directorSignatureCameraStyle ? `- DIRECTOR STYLE (${directorName}): Apply these signature camera techniques: ${directorSignatureCameraStyle}` : ''}
${cameraMotionPrompt ? `- USER SELECTED CAMERA MOTION: ${cameraMotionPrompt}` : '- Camera Motion: Choose from Director signature techniques above, or default to handheld/observational'}

${characterIdentityContext}

**STRICT OUTPUT FORMAT:**
"[Camera: ${cameraMotionPrompt || 'choose from Director signature style'}], [subject action verb], [natural body movement]. SFX: [real ambient sound]."

**EXAMPLE OUTPUTS:**
- "Handheld medium shot, subject exhales slowly, shoulders relax. SFX: distant traffic hum."
- "Observational wide shot, figure walks toward door, pauses briefly. SFX: footsteps on concrete, wind."
- "Steady close-up, hands reach for object, gentle touch. SFX: fabric rustle, room tone."

**FORBIDDEN (STRICTLY ENFORCED):**
- ❌ NO character appearance description (clothes, hair, face, body)
- ❌ NO environment description (setting, lighting, colors, location)
- ❌ NO background music, score, or orchestral sounds
- ❌ NO VFX, effects, or cinematic style keywords
- ❌ NO emotions/mood words (only show through action)

**REQUIRED:**
- ✅ Keep under 50 words
- ✅ Only action verbs: walks, turns, reaches, looks, breathes, pauses, sits, opens
- ✅ Only real SFX: wind, footsteps, breath, traffic, nature, room tone
- ✅ PRIORITIZE Director's signature camera style when choosing movement
`;

            // STANDARD MODE: Full cinematic prompt
            const standardPromptText = `
Role: You are a Veo 3.1 Video Prompt Generator. You MUST analyze the provided image and generate a VIDEO MOTION prompt.

**DIRECTOR STYLE: ${directorName}**
${directorDNA ? `Visual DNA: ${directorDNA}` : ''}
${directorSignatureCameraStyle ? `Signature Camera Style: ${directorSignatureCameraStyle}` : ''}

**IMPORTANT - VEO 3.1 BEST PRACTICES:**
1. DO NOT describe what's already visible in the image (clothing, setting, lighting, colors)
2. ONLY describe CHARACTER ACTIONS and CAMERA MOVEMENTS that should happen
3. Keep prompts SHORT and ACTION-focused (ideal: 30-50 words)
4. Use present tense verbs: "walks", "turns", "reaches", "looks at"
5. Focus on MOTION, not appearance

${characterIdentityContext}

**SCENE CONTEXT:**
- Story Context: "${context}"
- Scene Intent: "${promptName}"
${hasVoiceOver ? `- Voice-Over: "${voiceOverText}"` : ''}
${hasDialogue ? `- Dialogue: "${finalDialogue}"` : ''}
${productContext ? `- Products: ${productContext}` : ''}

**CAMERA MOTION:**
${cameraMotionPrompt ? `User Selected: ${cameraMotionPrompt}` : `Auto-suggest based on Director style (${directorName}): ${directorSignatureCameraStyle || 'Cinematic smooth movements'}`}

**PRESET MODE: ${selectedPreset.label}**
${selectedPreset.prompt}

**GENERATION RULES FOR IMAGE-TO-VIDEO:**
1. START by analyzing the keyframe image - describe its visual elements
2. Animate characters with NATURAL movement based on what you see in the image
3. APPLY the Director's camera techniques for cinematic feel
4. The [Subject] in your prompt = the subject VISIBLE in the image
5. The [Context] = the environment VISIBLE in the image  
6. The [Style] = match the lighting, colors, and aesthetic of the image
7. Add MOTION that makes sense for what's in the image
8. Include appropriate SFX for the scene

**AUDIO RULES (CRITICAL - STRICTLY ENFORCED):**
- ⛔ ABSOLUTELY NO BACKGROUND MUSIC - No orchestral, no ambient music, no soundtrack, no score
- ⛔ ZERO MUSICAL ELEMENTS - No piano, guitar, strings, or any instruments
- ✅ ONLY SOUND EFFECTS (SFX): footsteps, water, wind, impacts, doors, machines, etc.
- ✅ ONLY DIALOGUE if finalDialogue exists above (otherwise characters are SILENT)
- ⛔ NO VOICEOVER - Voice Over is handled by pre-recorded audio track, not VEO
- ✅ Ambient NOISE only: city hum, forest sounds, room tone, traffic, rain

**PRESET-SPECIFIC RULES:**
- If "Single Shot": One continuous 6-second animation of the image, subtle camera movement
- If "Dialogue/Multi-Shot": Describe the character from the image speaking, use shot/reverse if applicable
- If "Action": Animate dynamic movement FROM the pose visible in the image
- If "Mood": Slow, atmospheric animation with emphasis on lighting from the image
- If "Macro": Animate subtle micro-movements of the focused element in the image
- If "Epic": Add camera reveal movement starting from the image's composition

**OUTPUT FORMAT:**
Return ONLY the video prompt string. NO explanations, NO markdown.
`;

            // Use documentary or standard prompt based on preset
            const promptText = isDocumentaryMode ? documentaryPromptText : standardPromptText;

            console.log('[Veo] Calling SmartVision API to generate prompt...');

            // Use callSmartVision with fallback (prioritizes Gemini, falls back to Groq Vision)
            const veoPrompt = await callSmartVision(
                promptText,
                [{ data, mimeType }],
                'gemini-1.5-flash'
            );

            if (!veoPrompt) {
                console.error('[Veo] Empty response from Vision API');
                updateStateAndRecord(s => ({
                    ...s,
                    scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt: '❌ Không nhận được prompt' } : sc)
                }));
                return;
            }

            console.log('[Veo] Generated prompt:', veoPrompt.substring(0, 100) + '...');
            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt: veoPrompt.trim() } : sc)
            }));
        } catch (e: any) {
            console.error("[Veo] Prompt generation failed:", e);
            const errorMsg = e?.message || 'Unknown error';
            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt: `❌ Lỗi: ${errorMsg.substring(0, 50)}` } : sc)
            }));
        }
    }, [state.scenes, state.scriptLanguage, state.products, updateStateAndRecord, userApiKey]);

    const handleGenerateAllVeoPrompts = useCallback(async () => {
        const scenesToProcess = state.scenes.filter(s => s.generatedImage);
        if (scenesToProcess.length === 0) return alert("Không có phân cảnh nào có ảnh để tạo Veo prompt.");

        setIsVeoGenerating(true);
        setAgentState('director', 'thinking', 'Đang phân tích kịch bản để tối ưu Prompt cho Veo 3.1...');
        setAgentState('dop', 'idle', '');

        try {
            // STEP 0: Check if we have at least one valid key (Gemini or Groq)
            const hasGeminiKey = userApiKey || (typeof window !== 'undefined' && (localStorage.getItem('geminiApiKey') || localStorage.getItem('googleApiKey')));
            const hasGroqKey = typeof window !== 'undefined' && localStorage.getItem('groqApiKey');

            if (!hasGeminiKey && !hasGroqKey) {
                console.warn('[Veo] No API keys found for generation.');
                alert("Vui lòng cung cấp Gemini API Key hoặc Groq API Key trong phần Profile để sử dụng tính năng này.");
                setApiKeyModalOpen(true);
                setIsVeoGenerating(false);
                return;
            }

            console.log(`[Veo] Starting generation with keys: Gemini=${!!hasGeminiKey}, Groq=${!!hasGroqKey}`);
            // STEP 1: DOP Auto-Suggest Presets for scenes without preset
            const scenesNeedingPreset = scenesToProcess.filter(s => !s.veoPreset);
            if (scenesNeedingPreset.length > 0) {
                setAgentState('dop', 'thinking', 'Đang tự động đề xuất phong cách (Presets) dựa trên phân tích hình ảnh...');
                console.log('[DOP Veo] Auto-suggesting presets for', scenesNeedingPreset.length, 'scenes...');

                const scenesInfo = scenesNeedingPreset.map(s =>
                    `ID: ${s.id}, Context: ${s.contextDescription}, Script: ${s.vietnamese || s.language1}, Angle: ${s.cameraAngleOverride || 'auto'}`
                ).join('\n');
                const presetsInfo = VEO_PRESETS.map(p => `${p.value}: ${p.label}`).join('\n');

                const dopPrompt = `
                Role: You are a DOP (Director of Photography) analyzing scenes to suggest the optimal Veo 3.1 preset.
                
                **PRESET SELECTION RULES:**
                - "action-sequence": Scenes with running, fighting, chasing, explosions, quick movements
                - "storytelling-multi": Dialogue heavy scenes, emotional beats, character interactions
                - "cinematic-master": Establishing shots, artistic compositions, slow reveals, single steady shots
                - "macro-detail": Product showcases, texture details, extreme close-ups
                - "emotional-focus": Emotional character moments, crying, laughing, reactions
                - "ambient-mood": Atmosphere building, environmental shots, mood pieces
                
                Available Presets:
                ${presetsInfo}
                
                Scenes to analyze:
                ${scenesInfo}
                
                Return ONLY a JSON object: {"scene_id": "preset_value", ...}
                `;

                // Use callGeminiText with fallback
                try {
                    const text = await callGeminiText(dopPrompt, 'You are a DOP expert.', true, 'gemini-1.5-flash');
                    const mapping = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
                    console.log('[DOP Veo] Preset suggestions:', mapping);

                    updateStateAndRecord(s => ({
                        ...s,
                        scenes: s.scenes.map(scene => ({
                            ...scene,
                            veoPreset: mapping[scene.id] || scene.veoPreset || 'cinematic-master'
                        }))
                    }));

                    // Wait for state update
                    await new Promise(r => setTimeout(r, 300));
                } catch (parseError) {
                    console.error('[DOP Veo] Failed to parse preset suggestions:', parseError);
                }
            }

            // STEP 2: Generate Veo prompts for all scenes
            console.log('[Veo] Generating prompts for', scenesToProcess.length, 'scenes...');
            for (const scene of scenesToProcess) {
                if (stopVeoRef.current) {
                    setAgentState('director', 'idle', 'Đã dừng theo yêu cầu người dùng.');
                    console.log('[Veo] Stopped by user');
                    break;
                }
                setAgentState('director', 'speaking', `Đang tối ưu Veo Prompt cho Phân cảnh ${scene.sceneNumber}...`);
                await generateVeoPrompt(scene.id);
                const veoDelay = state.generationConfig?.veoDelay || 200;
                await new Promise(r => setTimeout(r, veoDelay));
            }
            setAgentState('director', 'success', 'Hoàn tất tối ưu toàn bộ Veo Prompts!');

        } finally {
            setIsVeoGenerating(false);
            setIsVeoStopping(false);
            stopVeoRef.current = false;
            setAgentState('director', 'idle', '');
            setAgentState('dop', 'idle', '');
        }
    }, [state.scenes, userApiKey, generateVeoPrompt, setApiKeyModalOpen, updateStateAndRecord, setAgentState]);


    const handleGenerateAllVideos = useCallback(async () => {
        alert("Video generation currently requires an external integration and is disabled in this version.");
    }, []);

    const suggestVeoPresets = useCallback(async () => {
        // No strict API key check - callGeminiText handles fallback

        try {
            const scenesInfo = state.scenes.map(s => `ID: ${s.id}, Context: ${s.contextDescription}, Script: ${s.vietnamese || s.language1}`).join('\n');
            const presetsInfo = VEO_PRESETS.map(p => `${p.value}: ${p.label} - ${p.prompt}`).join('\n');

            const suggestionPrompt = `
            Task: Assign the best Veo 3.1 Video Preset for each scene based on the context and script.
            
            **PRESET SELECTION STRATEGY:**
            - Use "action-sequence" (Multi-Shot) for scenes with physical movement, chases, or high energy.
            - Use "storytelling-multi" (Multi-Shot) for scenes with dialogue or character interactions.
            - Use "cinematic-master" (Single Shot) for artistic, steady, or high-production single-shot scenes.
            - Use "macro-detail" for products or close-up textures.
            
            Available Presets:
            ${presetsInfo}
            
            Scenes:
            ${scenesInfo}
            
            Return ONLY a JSON object mapping scene ID to preset value: {"scene_id": "preset_value", ...}
            `;

            // Use callGeminiText with fallback
            const text = await callGeminiText(suggestionPrompt, 'You are a video production expert.', true, 'gemini-1.5-flash');
            const mapping = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(scene => ({
                    ...scene,
                    veoPreset: mapping[scene.id] || scene.veoPreset || 'cinematic-master'
                }))
            }));
        } catch (e) {
            console.error("Suggest Veo Presets failed", e);
        }
    }, [state.scenes, userApiKey, setApiKeyModalOpen, updateStateAndRecord]);

    const applyPresetToAll = useCallback((presetValue: string) => {
        updateStateAndRecord(s => ({
            ...s,
            scenes: s.scenes.map(scene => ({ ...scene, veoPreset: presetValue }))
        }));
    }, [updateStateAndRecord]);

    return {
        isVeoGenerating,
        isVeoStopping,
        isVideoGenerating,
        generateVeoPrompt,
        handleGenerateAllVeoPrompts,
        handleGenerateAllVideos,
        suggestVeoPresets,
        applyPresetToAll,
        stopVeoGeneration
    };
}
