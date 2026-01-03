import { useState, useCallback } from 'react';
import { ProjectState } from '../types';

export const useStyleAnalysis = (
    userApiKey: string,
    updateStateAndRecord: (fn: (s: ProjectState) => ProjectState) => void,
    setProfileModalOpen: (open: boolean) => void
) => {
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

    const analyzeStyleFromImage = useCallback(async (imageData: string) => {
        const rawApiKey = userApiKey;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;

        if (!apiKey) {
            setProfileModalOpen(true);
            return;
        }

        setIsAnalyzingStyle(true);

        try {
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            let data: string;
            let mimeType: string = 'image/jpeg';

            if (imageData.startsWith('data:')) {
                const [header, base64Data] = imageData.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            } else {
                throw new Error('Invalid image format');
            }

            const analyzePrompt = `Analyze the artistic style of this image in detail. Provide a comprehensive prompt that could be used to generate images in the exact same style.

Return the style description in English, including:
1. Art style (photorealistic, anime, watercolor, oil painting, digital art, etc.)
2. Color palette and mood
3. Lighting characteristics
4. Texture and detail level
5. Composition tendencies
6. Any distinctive visual elements

Format as a single paragraph of style instructions, suitable for use as an AI image generation prompt. Be specific and detailed.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: { parts: [{ inlineData: { data, mimeType } }, { text: analyzePrompt }] }
            });

            // Extract text from Gemini response - handle multiple formats
            let styleDescription = '';
            try {
                // Try different ways to get the text
                const candidate = response.candidates?.[0];
                const textPart = candidate?.content?.parts?.find((p: any) => p.text);
                styleDescription = textPart?.text || '';
            } catch (e) {
                console.error('Failed to extract text from response:', e);
            }

            if (styleDescription) {
                updateStateAndRecord(s => ({
                    ...s,
                    stylePrompt: 'custom',
                    customStyleInstruction: styleDescription.trim(),
                    customStyleImage: imageData // Save the image itself for visual reference
                }));
            } else {
                throw new Error('Không nhận được kết quả từ AI');
            }


        } catch (error: any) {
            console.error('Style analysis failed:', error);
            alert(`❌ Không thể phân tích style: ${error.message}`);
        } finally {
            setIsAnalyzingStyle(false);
        }
    }, [userApiKey, updateStateAndRecord, setProfileModalOpen]);

    return { analyzeStyleFromImage, isAnalyzingStyle };
};
