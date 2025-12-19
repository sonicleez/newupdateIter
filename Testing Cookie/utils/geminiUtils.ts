import { GoogleGenAI } from "@google/genai";

export const callGeminiAPI = async (
    apiKey: string,
    prompt: string,
    aspectRatio: string,
    imageModel: string = 'gemini-2.5-flash-image',
    imageContext: string | null = null
): Promise<string | null> => {
    if (!apiKey) return null;

    console.log('[Gemini Gen] 🎨 Calling Gemini API...');
    try {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [{ text: prompt }];

        if (imageContext) {
            console.log('[Gemini Gen] 📎 Using Reference Image...');
            const base64Data = imageContext.includes('base64,') ? imageContext.split('base64,')[1] : imageContext;
            const mimeType = imageContext.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
            parts.unshift({ inlineData: { data: base64Data, mimeType } });
        }

        const response = await ai.models.generateContent({
            model: imageModel,
            contents: { parts: parts },
            config: {
                imageConfig: {
                    aspectRatio: aspectRatio
                }
            }
        });

        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePart?.inlineData) {
            return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
        }
        return null;
    } catch (err: any) {
        console.error('[Gemini Gen] ❌ Error:', err.message);
        return null;
    }
};
