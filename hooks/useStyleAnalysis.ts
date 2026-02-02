import { useState, useCallback } from 'react';
import { ProjectState } from '../types';
import { callGeminiVisionReasoning } from '../utils/geminiUtils';

export const useStyleAnalysis = (
    userApiKey: string,
    updateStateAndRecord: (fn: (s: ProjectState) => ProjectState) => void,
    setProfileModalOpen: (open: boolean) => void
) => {
    const [isAnalyzingStyle, setIsAnalyzingStyle] = useState(false);

    const analyzeStyleFromImage = useCallback(async (imageData: string) => {
        const rawApiKey = userApiKey;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;

        // Fallback allowed if no key
        if (!apiKey) {
            console.warn("[StyleAnalysis] No specific API key provided, will attempt fallback");
        }

        setIsAnalyzingStyle(true);

        try {
            // Note: GoogleGenAI removed, using smart utility

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

            // Use Smart Vision (prioritize Gemini 1.5 Flash -> Fallback Groq)
            const styleDescription = await callGeminiVisionReasoning(
                analyzePrompt,
                [{ data, mimeType }],
                'gemini-1.5-flash'
            );

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
