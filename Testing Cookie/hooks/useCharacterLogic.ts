import { useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProjectState, Character } from '../types';
import { generateId, cleanToken } from '../utils/helpers';
import { GLOBAL_STYLES } from '../constants/presets';
import { callGeminiAPI } from '../utils/geminiUtils';

export function useCharacterLogic(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
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

    const pollCharacterWorkflows = useCallback(async (
        charId: string,
        token: string,
        faceWorkflowId: string | null,
        bodyWorkflowId: string | null
    ) => {
        const cleanedToken = cleanToken(token);
        let faceUrl: string | null = null;
        let bodyUrl: string | null = null;
        let attempts = 0;
        const maxAttempts = 40;

        const pollWorkflow = async (workflowId: string): Promise<string | null> => {
            try {
                const res = await fetch('http://localhost:3001/api/proxy/google/workflow/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: cleanedToken, workflowId })
                });
                const data = await res.json();
                if (data.state === 'SUCCEEDED' && data.media && data.media.length > 0) {
                    const m = data.media[0];
                    return m.fifeUrl || m.url || m.image?.fifeUrl || null;
                }
                if (data.state === 'FAILED') return null;
                return 'pending';
            } catch (err) {
                console.error("Poll error:", err);
                return null;
            }
        };

        while (attempts < maxAttempts && (!faceUrl || !bodyUrl)) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
            if (faceWorkflowId && !faceUrl) {
                const result = await pollWorkflow(faceWorkflowId);
                if (result && result !== 'pending') faceUrl = result;
            }
            if (bodyWorkflowId && !bodyUrl) {
                const result = await pollWorkflow(bodyWorkflowId);
                if (result && result !== 'pending') bodyUrl = result;
            }
            if ((faceUrl && !bodyWorkflowId) || (bodyUrl && !faceWorkflowId) || (faceUrl && bodyUrl)) {
                updateStateAndRecord(s => ({
                    ...s,
                    characters: s.characters.map(c => c.id === charId ? {
                        ...c,
                        faceImage: faceUrl || c.faceImage,
                        bodyImage: bodyUrl || c.bodyImage,
                        workflowStatus: 'succeeded' as const,
                        faceWorkflowId: undefined,
                        bodyWorkflowId: undefined
                    } : c)
                }));
                return;
            }
        }

        if (attempts >= maxAttempts) {
            updateStateAndRecord(s => ({
                ...s,
                characters: s.characters.map(c => c.id === charId ? { ...c, workflowStatus: 'failed' as const } : c)
            }));
        }
    }, [updateStateAndRecord]);

    const handleMasterImageUpload = useCallback(async (id: string, image: string) => {
        const rawApiKey = userApiKey || (process.env as any).API_KEY;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;
        updateCharacter(id, { masterImage: image, isAnalyzing: true });

        if (!apiKey) {
            updateCharacter(id, { isAnalyzing: false });
            setApiKeyModalOpen(true);
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            let data: string;
            let mimeType: string = 'image/jpeg';

            if (image.startsWith('data:')) {
                const [header, base64Data] = image.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            } else {
                const proxyUrl = `http://localhost:3001/api/proxy/fetch-image?url=${encodeURIComponent(image)}`;
                const imgRes = await fetch(proxyUrl);
                if (!imgRes.ok) throw new Error(`Fetch failed`);
                const blob = await imgRes.blob();
                mimeType = blob.type;
                data = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            const analyzePrompt = `Analyze this character. Return JSON: {"name": "Suggest Name", "description": "Vietnamese description physical features, clothing, style, colors."}`;
            const analysisRes = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: analyzePrompt }] },
                config: { responseMimeType: "application/json" }
            });

            let json = { name: "", description: "" };
            try {
                json = JSON.parse(analysisRes.text.replace(/```json/g, '').replace(/```/g, '').trim());
            } catch (e) {
                console.error("JSON parse error", e);
            }

            updateCharacter(id, { name: json.name, description: json.description });

            const genyuToken = state.genyuToken;
            const currentStyle = GLOBAL_STYLES.find(s => s.value === state.stylePrompt)?.prompt || "Cinematic photorealistic, 8k, high quality";

            const consistencyInstruction = `
            **MANDATORY CONSISTENCY:** 
            - You MUST match the background tone, lighting (color temperature, shadows), and environment of the provided "Ảnh Gốc". 
            - The character's face, hair, and clothing MUST be exactly as seen in the reference.
            - Maintain the same cinematic style: ${currentStyle}.
            `.trim();

            const facePrompt = `${consistencyInstruction}\n\n(STRICT CAMERA: EXTREME CLOSE-UP - FACE ID) Generate a highly detailed Face ID close-up of this character: ${json.description}. Focus on capturing the exact facial features and expression from the reference.`;
            const bodyPrompt = `${consistencyInstruction}\n\n(STRICT CAMERA: FULL BODY WIDE SHOT) Generate a Full Body character design sheet (Front View, T-Pose or A-Pose) for: ${json.description}. The clothing must match the reference image's color and texture exactly.`;
            const sidePrompt = `${consistencyInstruction}\n\n(STRICT CAMERA: FULL BODY SIDE PROFILE) Generate a Full Body Side Profile for: ${json.description}. Maintain the same clothing and body proportions as the body view.`;
            const backPrompt = `${consistencyInstruction}\n\n(STRICT CAMERA: FULL BODY BACK VIEW) Generate a Full Body Back View for: ${json.description}. Ensure the back of the clothing reflects the design seen in the front.`;

            if (apiKey) {
                const model = state.imageModel || 'gemini-2.5-flash-image';
                const [faceUrl, bodyUrl, sideUrl, backUrl] = await Promise.all([
                    callGeminiAPI(apiKey, facePrompt, "1:1", model, image),
                    callGeminiAPI(apiKey, bodyPrompt, "9:16", model, image),
                    callGeminiAPI(apiKey, sidePrompt, "9:16", model, image),
                    callGeminiAPI(apiKey, backPrompt, "9:16", model, image)
                ]);

                updateCharacter(id, {
                    faceImage: faceUrl || undefined,
                    bodyImage: bodyUrl || undefined,
                    sideImage: sideUrl || undefined,
                    backImage: backUrl || undefined,
                    isAnalyzing: false,
                });
            } else if (genyuToken) {
                const callProxy = async (prompt: string, aspect: string): Promise<string | { workflowId: string } | null> => {
                    const res = await fetch('http://localhost:3001/api/proxy/genyu/image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: genyuToken,
                            recaptchaToken: state.recaptchaToken,
                            prompt,
                            aspect,
                            style: "3D Model / Character Sheet"
                        })
                    });
                    const d = await res.json();
                    if (!res.ok) return null;
                    if (d.media && d.media.length > 0) {
                        const m = d.media[0];
                        if (m.fifeUrl || m.url) return m.fifeUrl || m.url;
                        if (m.image?.generatedImage?.encodedImage) return `data:image/jpeg;base64,${m.image.generatedImage.encodedImage}`;
                        if (m.workflowId) return { workflowId: m.workflowId };
                    }
                    return null;
                };

                const [faceResult, bodyResult] = await Promise.all([
                    callProxy(facePrompt, "IMAGE_ASPECT_RATIO_SQUARE"),
                    callProxy(bodyPrompt, "IMAGE_ASPECT_RATIO_PORTRAIT")
                ]);

                const faceUrl = typeof faceResult === 'string' ? faceResult : null;
                const bodyUrl = typeof bodyResult === 'string' ? bodyResult : null;
                const faceWorkflowId = typeof faceResult === 'object' ? faceResult?.workflowId : null;
                const bodyWorkflowId = typeof bodyResult === 'object' ? bodyResult?.workflowId : null;

                if (faceWorkflowId || bodyWorkflowId) {
                    updateStateAndRecord(s => ({
                        ...s,
                        characters: s.characters.map(c => c.id === id ? {
                            ...c,
                            faceWorkflowId: faceWorkflowId || undefined,
                            bodyWorkflowId: bodyWorkflowId || undefined,
                            workflowStatus: 'active' as const,
                            isAnalyzing: false
                        } : c)
                    }));
                    pollCharacterWorkflows(id, genyuToken, faceWorkflowId, bodyWorkflowId);
                } else {
                    updateCharacter(id, { faceImage: faceUrl || undefined, bodyImage: bodyUrl || undefined, isAnalyzing: false });
                }
            }
        } catch (error: any) {
            console.error("Analysis Failed", error);
            updateCharacter(id, { isAnalyzing: false });
        }
    }, [userApiKey, updateCharacter, setApiKeyModalOpen, state.imageModel, state.genyuToken, state.stylePrompt, state.recaptchaToken, pollCharacterWorkflows]);

    return {
        updateCharacter,
        addCharacter,
        deleteCharacter,
        setDefaultCharacter,
        handleMasterImageUpload
    };
}
