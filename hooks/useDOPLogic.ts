import { useCallback } from 'react';
import { ProjectState, Scene, Product } from '../types';

export interface RaccordInsight {
    type: 'prop' | 'environment' | 'character' | 'flow';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestion?: string;
    affectedIds?: string[];
}

// DOP Decision Agent Types
export interface DopError {
    type: string;
    description: string;
}

export interface DecisionResult {
    action: 'retry' | 'skip' | 'try_once';
    reason: string;
    enhancedPrompt?: string;
    confidence: number; // 0-1
}

// Error classification for credit optimization
const UNFIXABLE_KEYWORDS = [
    'face', 'identity', 'completely different', 'wrong person',
    'different character', 'unrecognizable', 'different face',
    'facial features', 'different human', 'another person'
];

const FIXABLE_ERROR_TYPES = ['prop', 'lighting', 'spatial', 'position'];

export function useDOPLogic(state: ProjectState) {

    /**
     * Analyzes continuity between a scene and its predecessor
     */
    const analyzeRaccord = useCallback((sceneId: string): RaccordInsight[] => {
        const insights: RaccordInsight[] = [];
        const scenes = state.scenes;
        const currentIndex = scenes.findIndex(s => s.id === sceneId);

        if (currentIndex <= 0) return insights; // No predecessor to compare with

        const currentScene = scenes[currentIndex];
        const prevScene = scenes[currentIndex - 1];

        // 1. PROJECT/LOCATION CONTINUITY
        if (currentScene.groupId === prevScene.groupId) {
            // Same group: environment should be strictly consistent
            insights.push({
                type: 'environment',
                severity: 'info',
                message: 'Bối cảnh đồng bộ: Cả hai cảnh đều nằm trong cùng một khu vực.',
                suggestion: 'Đảm bảo các chi tiết nền như tranh treo tường, vị trí đồ nội thất không thay đổi.'
            });
        } else {
            // Transitioning groups
            insights.push({
                type: 'flow',
                severity: 'info',
                message: `Chuyển cảnh: Từ "${state.sceneGroups?.find(g => g.id === prevScene.groupId)?.name}" sang "${state.sceneGroups?.find(g => g.id === currentScene.groupId)?.name}".`,
                suggestion: 'Cần một cú máy rõ ràng để giới thiệu không gian mới.'
            });
        }

        // 2. PROP CONTINUITY (Raccord de Prop)
        const prevProps = prevScene.productIds || [];
        const currentProps = currentScene.productIds || [];

        // Find props that "disappeared"
        const disappearingProps = prevProps.filter(pId => !currentProps.includes(pId));
        if (disappearingProps.length > 0) {
            const propNames = disappearingProps.map(id => state.products.find(p => p.id === id)?.name || 'Đạo cụ');
            insights.push({
                type: 'prop',
                severity: 'warning',
                message: `Đạo cụ biến mất: ${propNames.join(', ')} xuất hiện ở cảnh trước nhưng không có ở cảnh này.`,
                suggestion: 'Nếu nhân vật vẫn đang cầm vật này, hãy nhấn thêm vào "Product IDs" của cảnh hiện tại.',
                affectedIds: disappearingProps
            });
        }

        // Find props that "suddenly appeared" (Prop Jump)
        const newlyAppearedProps = currentProps.filter(pId => !prevProps.includes(pId));
        if (newlyAppearedProps.length > 0) {
            const propNames = newlyAppearedProps.map(id => state.products.find(p => p.id === id)?.name || 'Đạo cụ');
            const prevContext = (prevScene.contextDescription || '').toLowerCase();
            const pickupAction = ['nhặt', 'lấy', 'cầm', 'pick up', 'take', 'grab', 'receive'].some(v => prevContext.includes(v));

            if (!pickupAction) {
                insights.push({
                    type: 'prop',
                    severity: 'critical',
                    message: `Đạo cụ "nhảy": ${propNames.join(', ')} bỗng dưng xuất hiện.`,
                    suggestion: 'Cảnh trước thiếu hành động nhân vật nhặt hoặc lấy vật này. Hãy thêm một cảnh "Mồi" hoặc sửa Script cảnh trước.',
                    affectedIds: newlyAppearedProps
                });
            }
        }

        // 3. CHARACTER CONTINUITY
        const prevChars = prevScene.characterIds || [];
        const currentChars = currentScene.characterIds || [];

        const charactersLeft = prevChars.filter(cId => !currentChars.includes(cId));
        if (charactersLeft.length > 0) {
            const charNames = charactersLeft.map(id => state.characters.find(c => c.id === id)?.name || 'Nhân vật');
            insights.push({
                type: 'character',
                severity: 'info',
                message: `${charNames.join(', ')} đã rời khỏi khung hình hoặc không còn là tiêu điểm.`,
            });
        }

        // 4. PHYSICAL STATE & ORIENTATION
        const prevAction = (prevScene.contextDescription || '').toLowerCase();
        const currentAction = (currentScene.contextDescription || '').toLowerCase();

        const states = ['ngồi', 'đứng', 'nằm', 'chạy', 'đi bộ', 'sitting', 'standing', 'lying', 'running', 'walking'];
        const prevState = states.find(s => prevAction.includes(s));
        const currentStateMatch = states.find(s => currentAction.includes(s));

        if (prevState && currentStateMatch && prevState !== currentStateMatch) {
            insights.push({
                type: 'flow',
                severity: 'info',
                message: `Thay đổi trạng thái: Nhân vật chuyển từ ${prevState} sang ${currentStateMatch}.`,
                suggestion: 'Hãy đảm bảo có một hành động chuyển đổi (transition action) mượt mà giữa hai trạng thái này.'
            });
        }

        return insights;
    }, [state.scenes, state.sceneGroups, state.products, state.characters]);

    /**
     * Suggests cinematic flow for the next scene
     */
    const suggestNextShot = useCallback((lastSceneId: string) => {
        const scene = state.scenes.find(s => s.id === lastSceneId);
        if (!scene) return null;

        const currentAngle = scene.cameraAngle?.toLowerCase() || scene.cameraAngleOverride?.toLowerCase() || '';

        const suggestions = [
            { label: 'Cận cảnh (Close-up)', angle: 'close-up', reason: 'Để nhấn mạnh cảm xúc hoặc chi tiết đạo cụ sau hành động trước.' },
            { label: 'Góc rộng (Wide Shot)', angle: 'wide-shot', reason: 'Để thiết lập lại không gian và vị trí nhân vật trong bối cảnh.' },
            { label: 'Điểm nhìn (POV)', angle: 'pov', reason: 'Cho người xem thấy chính xác những gì nhân vật đang nhìn (ví dụ: nhìn vào đạo cụ).' },
            { label: 'Góc nghiêng (OTS)', angle: 'over-the-shoulder', reason: 'Tạo chiều sâu và sự kết nối giữa nhân vật với đối tượng/vật thể.' },
            { label: 'Cảnh phản ứng (Reaction)', angle: 'medium-shot', reason: 'Ghi lại phản ứng của nhân vật ngay sau một sự kiện quan trọng.' }
        ];

        if (currentAngle.includes('wide')) {
            return {
                title: 'Lời khuyên từ DOP',
                action: 'Tiến gần hơn hoặc POV',
                recommendation: Math.random() > 0.5 ? suggestions[0] : suggestions[2]
            };
        }

        if (scene.productIds && scene.productIds.length > 0) {
            return {
                title: 'Lời khuyên từ DOP',
                action: 'Nhấn mạnh đạo cụ',
                recommendation: suggestions[2] // Suggest POV when props are involved
            };
        }

        return {
            title: 'Lời khuyên từ DOP',
            action: 'Thay đổi nhịp điệu',
            recommendation: suggestions[Math.floor(Math.random() * 2) + 1]
        };
    }, [state.scenes]);

    /**
    /**
     * Quick Win: Classify errors as fixable or unfixable
     * Saves credits by not retrying unfixable errors
     */
    const classifyErrors = useCallback((errors: DopError[]): {
        fixable: DopError[];
        unfixable: DopError[];
        decision: 'retry' | 'skip' | 'try_once';
    } => {
        const fixable: DopError[] = [];
        const unfixable: DopError[] = [];

        errors.forEach(e => {
            const isFixable = FIXABLE_ERROR_TYPES.includes(e.type) ||
                (!UNFIXABLE_KEYWORDS.some(k => e.description.toLowerCase().includes(k)) &&
                    !e.type.includes('identity') && !e.type.includes('face'));

            if (isFixable) fixable.push(e);
            else unfixable.push(e);
        });

        // Fail Fast Strategy:
        // If ANY unfixable error exists (e.g. Identity Mismatch), DO NOT RETRY.
        if (unfixable.length > 0) {
            return { fixable, unfixable, decision: 'skip' };
        } else if (fixable.length > 0) {
            return { fixable, unfixable, decision: 'retry' };
        }

        return { fixable, unfixable, decision: 'skip' };
    }, []);

    /**
     * AI Vision-powered raccord validation
     * Compares two consecutive images to detect continuity errors
     */
    const validateRaccordWithVision = useCallback(async (
        currentImage: string,
        prevImage: string,
        currentScene: Scene,
        prevScene: Scene,
        apiKey: string
    ): Promise<{
        isValid: boolean;
        errors: { type: string; description: string }[];
        correctionPrompt?: string;
        decision?: 'retry' | 'skip' | 'try_once';
    }> => {
        // Images required for comparison
        if (!currentImage || !prevImage) {
            return { isValid: true, errors: [] };
        }

        // API key check with graceful fallback
        // Try multiple sources: passed key, localStorage, env
        const effectiveApiKey = apiKey?.trim() ||
            (typeof window !== 'undefined' ? (localStorage.getItem('geminiApiKey') || localStorage.getItem('googleApiKey')) : null) ||
            (process.env as any).GEMINI_API_KEY;

        if (!effectiveApiKey) {
            console.warn('[DOP Vision] ⚠️ No Gemini API Key available - skipping raccord validation (no fallback for multi-image vision)');
            // Return valid = true to not block workflow, but this is a "skip" scenario
            return { isValid: true, errors: [], decision: 'skip' };
        }

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

            // Build context about what SHOULD be consistent
            const prevChars = (prevScene.characterIds || []).map(id =>
                state.characters.find(c => c.id === id)?.name
            ).filter(Boolean);
            const prevProps = (prevScene.productIds || []).map(id =>
                state.products.find(p => p.id === id)?.name
            ).filter(Boolean);
            const currentChars = (currentScene.characterIds || []).map(id =>
                state.characters.find(c => c.id === id)?.name
            ).filter(Boolean);
            const currentProps = (currentScene.productIds || []).map(id =>
                state.products.find(p => p.id === id)?.name
            ).filter(Boolean);

            const sameLocation = prevScene.groupId === currentScene.groupId;

            // Check if mannequin mode is enabled
            const isMannequinMode = state.globalCharacterStyleId?.includes('mannequin');
            const mannequinCheck = isMannequinMode ? `
5. MANNEQUIN MATERIAL (CRITICAL): ALL human figures MUST have:
   - Smooth cast resin material (like store display mannequin)
   - White/grey plastic surface with no skin texture
   - Egg-shaped featureless heads (NO eyes, nose, mouth, ears, hair)
   - Mannequin-style hands (hard plastic, no veins or wrinkles)
   If ANY human shows real skin texture, facial features, or non-plastic material, mark as ERROR.` : '';

            const dopPrompt = `You are a STRICT Director of Photography (DOP) checking for RACCORD (continuity) errors between two consecutive shots.

!!! CRITICAL: You must be VERY STRICT about character identity. Different face = ERROR, no exceptions !!!

SCENE CONTEXT:
- Previous Scene: "${prevScene.contextDescription || 'N/A'}"
- Characters in previous: ${prevChars.join(', ') || 'None'}
- Props in previous: ${prevProps.join(', ') || 'None'}

- Current Scene: "${currentScene.contextDescription || 'N/A'}"
- Characters expected: ${currentChars.join(', ') || 'None'}
- Props expected: ${currentProps.join(', ') || 'None'}

${sameLocation ? 'SAME LOCATION: Background must be strictly consistent.' : 'DIFFERENT LOCATION: Transition allowed.'}
${isMannequinMode ? 'STYLE: MANNEQUIN MODE ENABLED - All humans must be smooth plastic mannequins.' : ''}

CHECK FOR (IN ORDER OF IMPORTANCE):

1. ⚠️ CHARACTER IDENTITY (MOST CRITICAL - BE VERY STRICT):
   - Compare FACIAL BONE STRUCTURE: forehead shape, cheekbone position, jaw line
   - Compare FACIAL PROPORTIONS: eye spacing, nose length/width, mouth size
   - Compare SPECIFIC FEATURES: eye shape, eyebrow arch, nose bridge, lip fullness
   - Compare SKIN TONE and complexion
   - If the person in the current shot looks like a DIFFERENT PERSON than the previous shot, mark as ERROR TYPE="character"
   - DO NOT accept "similar looking" - it must be the EXACT SAME face
   - Different actor/face = isValid: false, even if costume is the same

2. COSTUME/OUTFIT CONTINUITY:
   - Same clothing colors, patterns, armor details, accessories
   - If outfit changed unexpectedly, mark as ERROR TYPE="character"

3. PROP CONTINUITY: Are props that should appear actually visible? Check position consistency.

4. LIGHTING (Relaxed): Only report CRITICAL failures (e.g. Day vs Night).

5. SPATIAL: Are background elements consistent?

6. STATIC BACKGROUND: If background is pixel-for-pixel identical, mark as warning.
${mannequinCheck}

RESPOND IN JSON ONLY:
{
  "isValid": true/false,
  "errors": [{"type": "character|prop|lighting|spatial|material", "description": "specific issue"}],
  "correctionPrompt": "If errors found, provide the EXACT instruction to add to the prompt to fix it"
}

IMPORTANT: If you see ANY difference in facial features between shots, set isValid=false and add a character error.
Do NOT say "hoàn hảo" (perfect) unless faces are IDENTICAL.`;

            // Prepare image parts
            const getImageData = async (img: string) => {
                if (img.startsWith('data:')) {
                    const [header, data] = img.split(',');
                    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    return { data, mimeType };
                } else if (img.startsWith('http')) {
                    const response = await fetch(img);
                    const blob = await response.blob();
                    const data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                    return { data, mimeType: blob.type || 'image/jpeg' };
                }
                return null;
            };

            const prevImgData = await getImageData(prevImage);
            const currImgData = await getImageData(currentImage);

            if (!prevImgData || !currImgData) {
                console.warn('[DOP Vision] Missing image data - fail-close');
                // FAIL-CLOSE: If can't get images, assume mismatch
                return {
                    isValid: false,
                    errors: [{ type: 'character', description: 'Could not load images for comparison' }],
                    decision: 'retry' as const
                };
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash', // Using 2.0 for better vision accuracy
                contents: [
                    { text: 'PREVIOUS SHOT:' },
                    { inlineData: { data: prevImgData.data, mimeType: prevImgData.mimeType } },
                    { text: 'CURRENT SHOT:' },
                    { inlineData: { data: currImgData.data, mimeType: currImgData.mimeType } },
                    { text: dopPrompt }
                ]
            });

            const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('[DOP Vision] Raw response:', text.substring(0, 200));

            const jsonMatch = text.match(/\{[\s\S]*\}/);

            try {
                // Use extracted JSON match, not raw text
                const jsonToParse = jsonMatch ? jsonMatch[0] : text;
                const result = JSON.parse(jsonToParse);
                console.log('[DOP Vision] Validation result:', result);

                // Quick Classification
                const { decision } = classifyErrors(result.errors || []);

                return {
                    isValid: result.isValid ?? false, // Default to FALSE (strict)
                    errors: result.errors || [],
                    correctionPrompt: result.correctionPrompt,
                    decision // Return classification decision
                };
            } catch (e) {
                console.error('[DOP Vision] JSON Parse Error:', e, 'Raw text:', text.substring(0, 300));
                // FAIL-CLOSE: If can't parse, assume faces don't match → trigger retry
                return {
                    isValid: false,
                    errors: [{ type: 'character', description: 'Could not validate - assuming mismatch' }],
                    decision: 'retry' as const
                };
            }
        } catch (error) {
            console.error('[DOP Vision] Error:', error);
            // FAIL-CLOSE: Don't silently approve on errors
            return {
                isValid: false,
                errors: [{ type: 'character', description: 'Validation failed - assuming mismatch' }],
                decision: 'retry' as const
            };
        }
    }, [state.characters, state.products, classifyErrors]);

    /**
     * Full Decision Agent: Analyze if retry will succeed before wasting credits
     * Uses Gemini to compare failed image with reference and decide
     */
    const makeRetryDecision = useCallback(async (
        failedImage: string,
        referenceImage: string,
        originalPrompt: string,
        errors: DopError[],
        apiKey: string
    ): Promise<DecisionResult> => {
        // Quick classification first
        const classification = classifyErrors(errors);

        if (classification.decision === 'skip') {
            console.log('[DOP Agent] Quick skip - errors are unfixable:', classification.unfixable);
            return {
                action: 'skip',
                reason: `Unfixable errors detected: ${classification.unfixable.map(e => e.description).join(', ')}`,
                confidence: 0.9
            };
        }

        // If we have API key, use AI for deeper analysis
        // Try multiple sources: passed key, localStorage, env
        const effectiveApiKey = apiKey?.trim() ||
            (typeof window !== 'undefined' ? (localStorage.getItem('geminiApiKey') || localStorage.getItem('googleApiKey')) : null) ||
            (process.env as any).GEMINI_API_KEY;

        if (effectiveApiKey && failedImage && referenceImage) {
            try {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

                // Prepare image data
                const getImageData = async (img: string) => {
                    if (img.startsWith('data:')) {
                        const [header, data] = img.split(',');
                        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                        return { data, mimeType };
                    }
                    return null;
                };

                const failedData = await getImageData(failedImage);
                const refData = await getImageData(referenceImage);

                if (failedData && refData) {
                    const agentPrompt = `You are a DOP Decision Agent. Analyze if retrying image generation will FIX the errors.

ERRORS DETECTED:
${errors.map(e => `- [${e.type}] ${e.description}`).join('\n')}

ORIGINAL PROMPT:
"${originalPrompt}"

ANALYSIS TASK:
1. Look at the FAILED IMAGE and the REFERENCE IMAGE
2. Determine if the errors are FIXABLE by modifying the prompt
3. Consider: Can text instructions fix face/identity issues? (Usually NO)
4. Consider: Can text instructions fix prop/lighting issues? (Usually YES)

RESPOND IN JSON ONLY:
{
  "action": "retry" | "skip" | "try_once",
  "reason": "brief explanation",
  "confidence": 0.0-1.0,
  "enhancedPrompt": "if action is retry, provide SPECIFIC additions to fix the errors"
}`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-1.5-flash',
                        contents: [
                            { text: 'FAILED IMAGE:' },
                            { inlineData: { data: failedData.data, mimeType: failedData.mimeType } },
                            { text: 'REFERENCE IMAGE (should match):' },
                            { inlineData: { data: refData.data, mimeType: refData.mimeType } },
                            { text: agentPrompt }
                        ]
                    });

                    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const jsonMatch = text.match(/\{[\s\S]*\}/);

                    if (jsonMatch) {
                        const result = JSON.parse(jsonMatch[0]);
                        console.log('[DOP Agent] AI Decision:', result);
                        return {
                            action: result.action || 'try_once',
                            reason: result.reason || 'AI analysis',
                            enhancedPrompt: result.enhancedPrompt,
                            confidence: result.confidence || 0.5
                        };
                    }
                }
            } catch (error) {
                console.error('[DOP Agent] AI analysis failed:', error);
            }
        }

        // Fallback to classification result
        return {
            action: classification.decision,
            reason: `Based on error classification: ${classification.fixable.length} fixable, ${classification.unfixable.length} unfixable`,
            confidence: 0.7
        };
    }, [classifyErrors]);

    return {
        analyzeRaccord,
        suggestNextShot,
        validateRaccordWithVision,
        classifyErrors,
        makeRetryDecision
    };
}
