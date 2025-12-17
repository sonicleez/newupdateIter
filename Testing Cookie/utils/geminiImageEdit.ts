
import { GoogleGenAI, Modality, Type } from "@google/genai";

const OUTPUT_MIME_TYPE = 'image/png';

const getAi = (apiKey: string) => {
    if (!apiKey) {
        throw new Error("API_KEY is required for Gemini Image Generation.");
    }
    return new GoogleGenAI({ apiKey });
};

export interface GeneratedImage {
    base64: string;
    mimeType: string;
}

export const editImageWithMask = async (
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    base64MaskData: string,
    editPrompt: string
): Promise<GeneratedImage> => {
    try {
        const ai = getAi(apiKey);
        console.log("Sending to Gemini - Image Length:", base64ImageData.length, "Mask Length:", base64MaskData.length);

        // Clean base64 strings if needed
        const cleanImage = base64ImageData.includes(',') ? base64ImageData.split(',')[1] : base64ImageData;
        const cleanMask = base64MaskData.includes(',') ? base64MaskData.split(',')[1] : base64MaskData;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                // The order for inpainting should be [original_image, mask_image, prompt]
                parts: [
                    {
                        inlineData: {
                            data: cleanImage,
                            mimeType: mimeType,
                        },
                    },
                    {
                        inlineData: {
                            data: cleanMask,
                            mimeType: 'image/png', // Masks must be PNG
                        },
                    },
                    {
                        text: editPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType: string = part.inlineData.mimeType;
                return { base64: base64ImageBytes, mimeType: newMimeType };
            }
        }

        throw new Error("No edited image was returned from the API.");
    } catch (error) {
        console.error("Error editing image with mask:", error);
        throw new Error(`Failed to edit image. ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const upscaleImage = async (apiKey: string, base64ImageData: string, mimeType: string): Promise<GeneratedImage> => {
    try {
        const ai = getAi(apiKey);
        const cleanImage = base64ImageData.includes(',') ? base64ImageData.split(',')[1] : base64ImageData;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: cleanImage,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: "Perform a 4x upscale on this image. Dramatically increase the resolution and clarity. Add intricate details to textures, sharpen the lines, and enhance the overall definition. The goal is a highly detailed, crisp, and high-resolution version of the original, while perfectly preserving the character's features and the existing art style.",
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType: string = part.inlineData.mimeType;
                return { base64: base64ImageBytes, mimeType: newMimeType };
            }
        }

        throw new Error("No upscaled image was returned from the API.");
    } catch (error) {
        console.error("Error upscaling image:", error);
        throw new Error(`Failed to upscale image. ${error instanceof Error ? error.message : String(error)}`);
    }
};

export const expandImage = async (
    apiKey: string,
    base64ImageData: string,
    mimeType: string,
    direction: 'up' | 'down' | 'left' | 'right'
): Promise<GeneratedImage> => {
    try {
        const ai = getAi(apiKey);
        const cleanImage = base64ImageData.includes(',') ? base64ImageData.split(',')[1] : base64ImageData;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: cleanImage,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: `Expand the image to the ${direction}, seamlessly filling in the new area with matching content and style (outpainting).`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType: string = part.inlineData.mimeType;
                return { base64: base64ImageBytes, mimeType: newMimeType };
            }
        }

        throw new Error("No expanded image was returned from the API.");
    } catch (error) {
        console.error("Error expanding image:", error);
        throw new Error(`Failed to expand image. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const applyStyleTransfer = async (
    apiKey: string,
    baseImage: GeneratedImage,
    styleImage: GeneratedImage,
    prompt: string
): Promise<GeneratedImage> => {
    try {
        const ai = getAi(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: baseImage.base64,
                            mimeType: baseImage.mimeType,
                        },
                    },
                    {
                        inlineData: {
                            data: styleImage.base64,
                            mimeType: styleImage.mimeType,
                        },
                    },
                    {
                        text: `Apply the artistic style from the second image to the first image. ${prompt}`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType: string = part.inlineData.mimeType;
                return { base64: base64ImageBytes, mimeType: newMimeType };
            }
        }

        throw new Error("No style-transferred image was returned from the API.");
    } catch (error) {
        console.error("Error applying style transfer:", error);
        throw new Error(`Failed to apply style transfer. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const compositeImages = async (
    apiKey: string,
    baseImage: GeneratedImage,
    objectImage: GeneratedImage,
    prompt: string
): Promise<GeneratedImage> => {
    try {
        const ai = getAi(apiKey);
        const fullPrompt = `Use the first image as the base/background. Take the main subject from the second image and composite it into the first image based on the following instructions: "${prompt}". Seamlessly blend the lighting, shadows, and art style to make the composition look natural.`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: baseImage.base64,
                            mimeType: baseImage.mimeType,
                        },
                    },
                    {
                        inlineData: {
                            data: objectImage.base64,
                            mimeType: objectImage.mimeType,
                        },
                    },
                    {
                        text: fullPrompt,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                const newMimeType: string = part.inlineData.mimeType;
                return { base64: base64ImageBytes, mimeType: newMimeType };
            }
        }

        throw new Error("No composited image was returned from the API.");
    } catch (error) {
        console.error("Error compositing images:", error);
        throw new Error(`Failed to composite images. ${error instanceof Error ? error.message : String(error)}`);
    }
}

export const analyzeImage = async (apiKey: string, image: GeneratedImage): Promise<string[]> => {
    try {
        const ai = getAi(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        text: "Analyze the image and identify all distinct objects, characters, and key visual elements. Return your findings as a JSON array of short, descriptive strings in English. For example: ['A wizard with a white beard', 'Glowing crystal staff', 'Pointy blue hat', 'Dark cave background'].",
                    },
                    {
                        inlineData: {
                            data: image.base64,
                            mimeType: image.mimeType,
                        },
                    },
                ],
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING
                    }
                }
            },
        });

        const text = response.text;
        const result = JSON.parse(text);
        if (!Array.isArray(result)) {
            throw new Error("API did not return a valid array.");
        }
        return result;
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw new Error(`Failed to analyze image. ${error instanceof Error ? error.message : String(error)}`);
    }
};
