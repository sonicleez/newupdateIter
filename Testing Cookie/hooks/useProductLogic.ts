import { useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProjectState, Product } from '../types';
import { generateId } from '../utils/helpers';
import { callGeminiAPI } from '../utils/geminiUtils';

export function useProductLogic(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
) {
    const addProduct = useCallback(() => {
        const newProduct: Product = {
            id: generateId(),
            name: '',
            description: '',
            masterImage: null,
            views: { front: null, back: null, left: null, right: null, top: null },
            isAnalyzing: false
        };
        updateStateAndRecord(s => ({ ...s, products: [...(s.products || []), newProduct] }));
    }, [updateStateAndRecord]);

    const deleteProduct = useCallback((id: string) => {
        setTimeout(() => {
            if (window.confirm('Delete this product?')) {
                updateStateAndRecord(s => ({ ...s, products: s.products.filter(p => p.id !== id) }));
            }
        }, 100);
    }, [updateStateAndRecord]);

    const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
        updateStateAndRecord(s => ({
            ...s,
            products: (s.products || []).map(p => p.id === id ? { ...p, ...updates } : p)
        }));
    }, [updateStateAndRecord]);

    const handleProductMasterImageUpload = useCallback(async (id: string, image: string) => {
        const apiKey = userApiKey || (process.env as any).API_KEY;
        updateProduct(id, { masterImage: image, isAnalyzing: true });

        if (!apiKey && !state.genyuToken) {
            updateProduct(id, { isAnalyzing: false });
            setApiKeyModalOpen(true);
            return;
        }

        try {
            if (apiKey) {
                const ai = new GoogleGenAI({ apiKey });
                let data: string;
                let mimeType: string = 'image/jpeg';

                if (image.startsWith('data:')) {
                    const [header, b64] = image.split(',');
                    mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                    data = b64;
                } else {
                    const response = await fetch(image);
                    const blob = await response.blob();
                    mimeType = blob.type;
                    data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                        reader.readAsDataURL(blob);
                    });
                }

                const analyzePrompt = `Analyze this PRODUCT/PROP image. Return JSON: {"name": "Product Name", "description": "Detailed physical description."}`;
                const analysisRes = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: { parts: [{ inlineData: { data, mimeType } }, { text: analyzePrompt }] },
                    config: { responseMimeType: "application/json" }
                });

                let json = { name: "", description: "" };
                try {
                    json = JSON.parse(analysisRes.text.replace(/```json/g, '').replace(/```/g, '').trim());
                } catch (e) { console.error("JSON parse error", e); }

                updateProduct(id, { name: json.name, description: json.description });

                const referenceImage = `data:${mimeType};base64,${data}`;
                const promptTemplate = (viewInfo: string) => `(STRICT REFERENCE: EXACT REPLICA) Generate a ${viewInfo} of the product described: ${json.description}. BACKGROUND: Pure Solid White Studio Background. STYLE: Product Photography.`.trim();

                const [front, back, left, right, top] = await Promise.all([
                    callGeminiAPI(apiKey, promptTemplate('OFFICIAL FRONT VIEW (0 degrees)'), '1:1', 'gemini-2.5-flash-image', referenceImage),
                    callGeminiAPI(apiKey, promptTemplate('OFFICIAL BACK VIEW (180 degrees)'), '1:1', 'gemini-2.5-flash-image', referenceImage),
                    callGeminiAPI(apiKey, promptTemplate('OFFICIAL LEFT PROFILE VIEW (90 degrees)'), '1:1', 'gemini-2.5-flash-image', referenceImage),
                    callGeminiAPI(apiKey, promptTemplate('OFFICIAL RIGHT PROFILE VIEW (90 degrees)'), '1:1', 'gemini-2.5-flash-image', referenceImage),
                    callGeminiAPI(apiKey, promptTemplate('TOP-DOWN BIRD\'S EYE VIEW'), '1:1', 'gemini-2.5-flash-image', referenceImage),
                ]);

                updateProduct(id, { views: { front, back, left, right, top }, isAnalyzing: false });
                return;
            }

            const genyuToken = state.genyuToken;
            if (genyuToken) {
                const viewPrompts = [
                    { key: 'front', prompt: `Product photography, FRONT VIEW of this product. Studio lighting, white background.` },
                    { key: 'back', prompt: `Product photography, BACK VIEW of this product. Studio lighting, white background.` },
                    { key: 'left', prompt: `Product photography, LEFT SIDE VIEW of this product. Studio lighting, white background.` },
                    { key: 'right', prompt: `Product photography, RIGHT SIDE VIEW of this product. Studio lighting, white background.` },
                    { key: 'top', prompt: `Product photography, TOP-DOWN VIEW of this product. Studio lighting, white background.` },
                ];

                const callProxy = async (prompt: string): Promise<string | null> => {
                    const res = await fetch('http://localhost:3001/api/proxy/genyu/image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: genyuToken,
                            recaptchaToken: state.recaptchaToken,
                            prompt,
                            aspect: "IMAGE_ASPECT_RATIO_SQUARE",
                            style: "Product Photography"
                        })
                    });
                    const d = await res.json();
                    if (!res.ok) return null;
                    if (d.media && d.media.length > 0) {
                        const m = d.media[0];
                        let imgUrl = m.fifeUrl || m.url || m.image?.fifeUrl || m.image?.url;
                        if (!imgUrl && m.image?.generatedImage?.encodedImage) {
                            imgUrl = `data:image/jpeg;base64,${m.image.generatedImage.encodedImage}`;
                        }
                        return imgUrl;
                    }
                    return null;
                };

                const results = await Promise.all(viewPrompts.map(v => callProxy(v.prompt)));
                updateProduct(id, {
                    views: { front: results[0] || null, back: results[1] || null, left: results[2] || null, right: results[3] || null, top: results[4] || null },
                    isAnalyzing: false
                });
            } else {
                updateProduct(id, { isAnalyzing: false });
                alert("Cần Genyu Token để tạo các góc nhìn sản phẩm.");
            }
        } catch (error) {
            console.error("Product Analysis Error:", error);
            updateProduct(id, { isAnalyzing: false });
        }
    }, [userApiKey, updateProduct, state.genyuToken, setApiKeyModalOpen, state.recaptchaToken]);

    const handleGenerateProductFromPrompt = useCallback(async (id: string, description: string) => {
        if (!description.trim()) {
            alert("Vui lòng nhập mô tả sản phẩm trước.");
            return;
        }

        updateProduct(id, { isAnalyzing: true });
        const apiKey = userApiKey || (process.env as any).API_KEY;
        if (apiKey) {
            try {
                const masterPrompt = `Professional product photography of ${description}. Studio lighting, white background, 8K detail, centered, front view, high quality product shot.`;
                const masterImage = await callGeminiAPI(apiKey, masterPrompt, '1:1');
                if (masterImage) {
                    updateProduct(id, { masterImage: masterImage });
                    await handleProductMasterImageUpload(id, masterImage);
                    return;
                }
            } catch (err) {
                console.error("Gemini Product Gen Error:", err);
                updateProduct(id, { isAnalyzing: false });
            }
        }

        const genyuToken = state.genyuToken;
        if (!genyuToken) {
            updateProduct(id, { isAnalyzing: false });
            if (!apiKey) {
                alert("Cần API Key (Gemini) hoặc Token (Genyu) để tạo sản phẩm.");
                setApiKeyModalOpen(true);
            } else {
                alert("Không thể tạo ảnh sản phẩm bằng Gemini. Vui lòng thử lại.");
            }
            return;
        }

        updateProduct(id, { isAnalyzing: true });
        try {
            const masterPrompt = `Professional product photography of ${description}. Studio lighting, white background, 8K detail, centered, front view, high quality product shot.`;
            const res = await fetch('http://localhost:3001/api/proxy/genyu/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: genyuToken,
                    recaptchaToken: state.recaptchaToken,
                    prompt: masterPrompt,
                    aspect: "IMAGE_ASPECT_RATIO_SQUARE",
                    style: "Product Photography"
                })
            });
            const d = await res.json();
            let masterImage = null;
            if (d.media && d.media.length > 0) {
                const m = d.media[0];
                masterImage = m.fifeUrl || m.url || m.image?.fifeUrl || m.image?.url;
                if (!masterImage && m.image?.generatedImage?.encodedImage) {
                    masterImage = `data:image/jpeg;base64,${m.image.generatedImage.encodedImage}`;
                }
            }

            if (masterImage) {
                updateProduct(id, { masterImage: masterImage });
                await handleProductMasterImageUpload(id, masterImage);
            } else {
                updateProduct(id, { isAnalyzing: false });
                alert("Không thể tạo ảnh sản phẩm. Vui lòng thử lại.");
            }
        } catch (error) {
            console.error("Product Generation Error:", error);
            updateProduct(id, { isAnalyzing: false });
        }
    }, [userApiKey, state.genyuToken, updateProduct, handleProductMasterImageUpload, setApiKeyModalOpen, state.recaptchaToken]);

    return {
        addProduct,
        deleteProduct,
        updateProduct,
        handleProductMasterImageUpload,
        handleGenerateProductFromPrompt
    };
}
