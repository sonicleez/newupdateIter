import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProjectState } from '../types';
import { cleanToken } from '../utils/helpers';

export function useVideoGeneration(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
) {
    const [isVeoGenerating, setIsVeoGenerating] = useState(false);
    const [isVideoGenerating, setIsVideoGenerating] = useState(false);

    const generateVeoPrompt = useCallback(async (sceneId: string) => {
        const scene = state.scenes.find(s => s.id === sceneId);
        if (!scene || !scene.generatedImage) return;

        const apiKey = userApiKey || (process.env as any).API_KEY;
        if (!apiKey) return;

        try {
            const ai = new GoogleGenAI({ apiKey });
            let data: string;
            let mimeType: string = 'image/jpeg';

            if (scene.generatedImage.startsWith('data:')) {
                const [header, base64Data] = scene.generatedImage.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            } else {
                try {
                    const proxyUrl = `http://localhost:3001/api/proxy/fetch-image?url=${encodeURIComponent(scene.generatedImage)}`;
                    const imgRes = await fetch(proxyUrl);
                    const blob = await imgRes.blob();
                    mimeType = blob.type;
                    data = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                } catch (e) {
                    console.error("Fetch image failed", e);
                    return;
                }
            }

            const scriptText = state.scriptLanguage === 'vietnamese' ? scene.vietnamese : scene.language1;
            const context = scene.contextDescription || '';
            const promptName = scene.promptName || '';
            const sceneProducts = (state.products || []).filter(p => (scene.productIds || []).includes(p.id));
            const productContext = sceneProducts.map(p => `Product: ${p.name} (${p.description})`).join('; ');

            const promptText = `
             Role: Expert Video Prompt Engineer for Google Veo 3.1.
             
             **INPUT DATA:**
             - Visual Reference: Keyframe Image provided.
             - Context: "${context}"
             - Scene Intent: "${promptName}"
             - Dialogue: "${scriptText}"
             - Featured Products: "${productContext}"
             
             **TASK:** 
             Analyze the scene and generate the OPTIMAL text-to-video prompt.
             Do NOT be rigid. Choose the best structure based on the scene content.
             
             **VEO 3.1 OPTIMIZATION CHECKLIST:**
             - **Camera:** Use specific terms: "Truck Left", "Dolly In", "Rack Focus", "Low Angle", "Aerial Orbit".
             - **Lighting:** Define source: "Volumetric fog", "Rembrandt lighting", "Neon rim light".
             - **Micro-Movements (CRITICAL):**
                - If Dialogue exists ("${scriptText}"): MUST include "character talking", "lips moving naturally", "expressive face".
                - Background: "wind blowing hair", "dust particles", "flickering neon", "rain".
             - **Style:** "Photorealistic, 4k, High Fidelity, Cinematic Motion Blur".
             
             **OUTPUT:**
             Return ONLY the final prompt string (in English). Do not include explanations.
             `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: promptText }] }
            });

            const veoPrompt = response.text?.trim() || '';
            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, veoPrompt } : sc)
            }));
        } catch (e) {
            console.error("Veo prompt gen failed", e);
        }
    }, [state.scenes, state.scriptLanguage, state.products, updateStateAndRecord, userApiKey]);

    const handleGenerateAllVeoPrompts = useCallback(async () => {
        const scenesToProcess = state.scenes.filter(s => s.generatedImage && !s.veoPrompt);
        if (scenesToProcess.length === 0) return alert("Không có phân cảnh nào cần tạo Veo prompt.");

        setIsVeoGenerating(true);
        const apiKey = userApiKey || (process.env as any).API_KEY;
        if (!apiKey) {
            setApiKeyModalOpen(true);
            setIsVeoGenerating(false);
            return;
        }

        try {
            for (const scene of scenesToProcess) {
                await generateVeoPrompt(scene.id);
                await new Promise(r => setTimeout(r, 200));
            }
        } finally {
            setIsVeoGenerating(false);
        }
    }, [state.scenes, userApiKey, generateVeoPrompt, setApiKeyModalOpen]);

    const checkVideoStatus = useCallback(async (operationsToCheck: { sceneId: string, name: string }[], token: string) => {
        if (operationsToCheck.length === 0) {
            setIsVideoGenerating(false);
            return;
        }
        const cleanT = cleanToken(token);
        try {
            const payload = {
                token: cleanT,
                operations: operationsToCheck.map(op => ({
                    operation: { name: op.name },
                    sceneId: op.sceneId,
                    status: "MEDIA_GENERATION_STATUS_ACTIVE"
                }))
            };
            const response = await fetch('http://localhost:3001/api/proxy/google/video/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) return;
            const data = await response.json();
            const updates = data.operations;
            if (!updates || !Array.isArray(updates)) {
                setTimeout(() => checkVideoStatus(operationsToCheck, token), 5000);
                return;
            }
            let pendingOps: { sceneId: string, name: string }[] = [];
            const updateMap = new Map();
            updates.forEach((u: any) => { if (u.sceneId) updateMap.set(u.sceneId, u); });

            updateStateAndRecord(s => {
                const newScenes = s.scenes.map(scene => {
                    const op = operationsToCheck.find(o => o.sceneId === scene.id);
                    if (!op) return scene;
                    const update = updateMap.get(scene.id);
                    if (!update) { pendingOps.push(op); return scene; }
                    if (update.status === 'MEDIA_GENERATION_STATUS_SUCCEEDED') {
                        const vidUrl = update.result?.video?.video?.url || update.result?.video?.url || update.result?.url;
                        return { ...scene, generatedVideo: vidUrl, videoStatus: 'succeeded', isGenerating: false, videoOperationName: undefined };
                    } else if (update.status === 'MEDIA_GENERATION_STATUS_FAILED') {
                        return { ...scene, videoStatus: 'failed', isGenerating: false, error: "Gen Video Failed", videoOperationName: undefined };
                    } else {
                        pendingOps.push(op);
                        return { ...scene, videoStatus: 'active' };
                    }
                });
                return { ...s, scenes: newScenes };
            });
            if (pendingOps.length > 0) setTimeout(() => checkVideoStatus(pendingOps, token), 5000);
            else setIsVideoGenerating(false);
        } catch (e) {
            console.error("Poll Error", e);
            setIsVideoGenerating(false);
        }
    }, [updateStateAndRecord]);

    const handleGenerateAllVideos = useCallback(async () => {
        const rawToken = state.genyuToken;
        if (!rawToken) return alert("Cần Genyu Token để tạo Video.");
        const genyuTokenStr = cleanToken(rawToken);
        const scenesToProcess = state.scenes.filter(s => (s.mediaId || s.generatedImage) && s.veoPrompt && !s.generatedVideo);
        if (scenesToProcess.length === 0) return alert("Không tìm thấy phân cảnh nào đủ điều kiện!");

        setIsVideoGenerating(true);
        let startedOps: { sceneId: string, name: string }[] = [];
        let errorMsg = "";

        for (const scene of scenesToProcess) {
            updateStateAndRecord(s => ({
                ...s,
                scenes: s.scenes.map(sc => sc.id === scene.id ? { ...sc, isGenerating: true, videoStatus: 'starting' } : sc)
            }));
            try {
                let videoAspect = state.aspectRatio === "9:16" || state.aspectRatio === "3:4" ? "VIDEO_ASPECT_RATIO_PORTRAIT" : "VIDEO_ASPECT_RATIO_LANDSCAPE";
                let imageBase64 = !scene.mediaId && scene.generatedImage ? scene.generatedImage.replace(/^data:image\/\w+;base64,/, "") : null;

                const response = await fetch('http://localhost:3001/api/proxy/google/video/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: genyuTokenStr,
                        recaptchaToken: state.recaptchaToken,
                        prompt: scene.veoPrompt,
                        mediaId: scene.mediaId,
                        imageBase64: imageBase64,
                        aspectRatio: videoAspect
                    })
                });
                const data = await response.json();
                if (data.requests && data.requests.length > 0) {
                    const opName = data.requests[0].operation?.name;
                    if (opName) {
                        startedOps.push({ sceneId: scene.id, name: opName });
                        updateStateAndRecord(s => ({
                            ...s,
                            scenes: s.scenes.map(sc => sc.id === scene.id ? { ...sc, videoOperationName: opName, videoStatus: 'active' } : sc)
                        }));
                    }
                } else {
                    let details = data.details?.error?.message || data.error?.message || "Unknown Error";
                    errorMsg = details;
                    updateStateAndRecord(s => ({
                        ...s,
                        scenes: s.scenes.map(sc => sc.id === scene.id ? { ...sc, isGenerating: false, error: details } : sc)
                    }));
                }
                await new Promise(r => setTimeout(r, 500));
            } catch (e: any) {
                console.error("Start Video Error", e);
                errorMsg = e.message;
                updateStateAndRecord(s => ({
                    ...s,
                    scenes: s.scenes.map(sc => sc.id === scene.id ? { ...sc, isGenerating: false, error: "Req Error" } : sc)
                }));
            }
        }
        if (startedOps.length > 0) {
            alert(`Đã khởi tạo thành công ${startedOps.length} video.`);
            setTimeout(() => checkVideoStatus(startedOps, genyuTokenStr), 5000);
        } else {
            setIsVideoGenerating(false);
            alert(`Lỗi: ${errorMsg}`);
        }
    }, [state.genyuToken, state.scenes, state.aspectRatio, state.recaptchaToken, updateStateAndRecord, checkVideoStatus]);

    return {
        isVeoGenerating,
        isVideoGenerating,
        handleGenerateAllVeoPrompts,
        handleGenerateAllVideos
    };
}
