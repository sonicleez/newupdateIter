

import { GoogleGenAI, Modality, Type, Chat } from "@google/genai";
import { GeneratedImage, AspectRatio, StoryboardReferences, HistoryImage } from '../types';

const OUTPUT_MIME_TYPE = 'image/png';

const getAi = () => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY is not set in the environment. This application requires a Google AI Studio API key to be configured.");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateImage = async (prompt: string, stylePrompt: string, aspectRatio: AspectRatio): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const fullPrompt = `${prompt}, ${stylePrompt}`;

    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: fullPrompt,
      config: {
        numberOfImages: 1,
        outputMimeType: OUTPUT_MIME_TYPE,
        aspectRatio: aspectRatio,
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No image was generated. The prompt may have been blocked.");
    }

    const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
    return { base64: base64ImageBytes, mimeType: OUTPUT_MIME_TYPE };
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error(`Failed to generate image. ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const editImage = async (base64ImageData: string, mimeType: string, editPrompt: string): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
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
    console.error("Error editing image:", error);
    throw new Error(`Failed to edit image. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const editImageWithMask = async (
  base64ImageData: string,
  mimeType: string,
  base64MaskData: string,
  editPrompt: string
): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        // The order for inpainting should be [original_image, mask_image, prompt]
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            inlineData: {
              data: base64MaskData,
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

export const upscaleImage = async (base64ImageData: string, mimeType: string): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
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
  base64ImageData: string,
  mimeType: string,
  direction: 'up' | 'down' | 'left' | 'right'
): Promise<GeneratedImage> => {
    try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
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
  baseImage: GeneratedImage,
  styleImage: GeneratedImage,
  prompt: string
): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
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
  baseImage: GeneratedImage,
  objectImage: GeneratedImage,
  prompt: string
): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
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

export const generateConsistentCharacter = async (
  referenceImage: GeneratedImage,
  newScenePrompt: string,
  stylePrompt: string,
): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const fullPrompt = `Use the provided image as a strict character reference. Create a new image of this exact same character, maintaining their specific facial features, hair, clothing, and overall identity. The character's appearance, including what they are wearing, must be identical to the reference image. Place this character in the following new scene: '${newScenePrompt}'. The art style should be ${stylePrompt}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: referenceImage.base64,
              mimeType: referenceImage.mimeType,
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
    
    throw new Error("No consistent character image was returned from the API.");
  } catch (error) {
    console.error("Error generating consistent character:", error);
    throw new Error(`Failed to generate consistent character. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const refinePrompt = async (
  userInput: string,
  styleModifier: string,
): Promise<string> => {
  try {
    const ai = getAi();
    const systemInstruction = `You are an expert prompt engineer for an AI image generation model. Your task is to take a user's simple, natural language description and expand it into a detailed, structured, and vivid prompt. 
    Incorporate professional photographic and cinematic terms. Focus on these key elements:
    - Subject: Who or what is the main focus?
    - Action: What is the subject doing?
    - Setting/Background: Where are they? What is the environment?
    - Shot Type: (e.g., full-shot, medium-shot, close-up, portrait).
    - Camera Angle: (e.g., low-angle, high-angle, eye-level, dutch angle).
    - Lighting: (e.g., cinematic lighting, soft light, neon, rim lighting, dramatic lighting).
    - Details: Add specific, interesting details about clothing, mood, colors, and textures.
    - Art Style: You MUST incorporate the provided art style.

    Example:
    User Input: "a knight, make him look heroic from below"
    Art Style: "epic fantasy art, dramatic lighting"
    Your Output: "Epic fantasy art, dramatic lighting, dynamic low-angle shot of a heroic knight in intricately detailed shining armor, standing valiantly on a cliffside, overlooking a misty valley at sunrise."

    Now, refine the following user prompt. Return ONLY the refined prompt, with no extra text or explanation.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User Input: "${userInput}"\nArt Style: "${styleModifier}"`,
        config: {
          systemInstruction,
        }
    });
    
    return response.text.trim();

  } catch (error) {
    console.error("Error refining prompt:", error);
    throw new Error(`Failed to refine prompt. ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateImageWithReferences = async (
  prompt: string,
  references: StoryboardReferences
): Promise<GeneratedImage> => {
  try {
    const ai = getAi();
    const parts: any[] = [];
    let textPrompt = prompt;

    // Add references and build a more descriptive text prompt
    let referenceDescriptions = [];
    if (references.character) {
      parts.push({ inlineData: { data: references.character.base64, mimeType: references.character.mimeType } });
      referenceDescriptions.push("Use the first image as the main character reference.");
    }
    if (references.setting) {
      parts.push({ inlineData: { data: references.setting.base64, mimeType: references.setting.mimeType } });
      referenceDescriptions.push("Use the next image as the setting/background reference.");
    }
    if (references.prop) {
      parts.push({ inlineData: { data: references.prop.base64, mimeType: references.prop.mimeType } });
      referenceDescriptions.push("Use the next image as a key prop or object reference.");
    }
    if (references.style) {
      parts.push({ inlineData: { data: references.style.base64, mimeType: references.style.mimeType } });
      referenceDescriptions.push("Use the final image as the art style and mood reference.");
    }
    
    if (referenceDescriptions.length > 0) {
        textPrompt = `${referenceDescriptions.join(' ')}\n\nScene prompt: ${prompt}`;
    }

    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }

    throw new Error("No image was returned from the API with the given references.");
  } catch (error) {
    console.error("Error generating image with references:", error);
    throw new Error(`Failed to generate image with references. ${error instanceof Error ? error.message : String(error)}`);
  }
};


export const generateStoryboardAuto = async (
  mainPrompt: string,
  sceneCount: number,
  references: StoryboardReferences
): Promise<GeneratedImage[]> => {
    const ai = getAi();
    
    // 1. Plan the scenes with a text model
    const planningSystemInstruction = `You are a storyboard director. A user will provide a story idea, a number of scenes, and describe up to four reference images (character, setting, prop, style). Your task is to break the story down into a series of distinct, descriptive image generation prompts, one for each scene. Ensure a logical progression of action and maintain consistency based on the references. Output ONLY a JSON array of strings, where each string is a self-contained prompt for one scene. Do not include any other text or markdown.`;

    const planningResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ text: `Story idea: "${mainPrompt}".\nNumber of scenes: ${sceneCount}.` }] },
        config: {
            systemInstruction: planningSystemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        },
    });

    let scenePrompts: string[];
    try {
        scenePrompts = JSON.parse(planningResponse.text);
        if (!Array.isArray(scenePrompts) || scenePrompts.length === 0) {
            throw new Error("AI planner did not return a valid array of prompts.");
        }
    } catch (e) {
        console.error("Failed to parse storyboard plan:", e);
        throw new Error("The AI failed to create a valid story plan. Please try rephrasing your prompt.");
    }

    // 2. Generate images for each scene prompt
    const generatedImages: GeneratedImage[] = [];
    for (const scenePrompt of scenePrompts) {
        const image = await generateImageWithReferences(scenePrompt, references);
        generatedImages.push(image);
    }

    return generatedImages;
};

export const createCinematographyChat = (): Chat => {
  const ai = getAi();
  const systemInstruction = `You are an expert in cinematography, casting, and photography. Your name is Cine-Bot. You assist users in creating detailed prompts for an AI image generator. 
  When a user describes a scene, pose, or camera movement, your primary goal is to translate their request into a concise, effective, and single-paragraph prompt. 
  Use professional terminology like 'dutch angle', 'low-angle shot', 'pan from left to right', 'dolly zoom', 'golden hour lighting', 'rim light', etc. 
  Break down complex requests into clear instructions for the AI. Always provide the final prompt in a distinct block that is easy to copy.
  For example, if the user says "I want the camera to move from behind the character to their left side", you should suggest a prompt like: "A tracking shot that starts from behind the character, orbits smoothly to their left side, revealing their profile against the background."
  Be helpful, creative, and maintain a professional yet approachable tone.`;

  const chat = ai.chats.create({
    model: 'gemini-2.5-pro',
    config: {
      systemInstruction,
      thinkingConfig: {
        thinkingBudget: 32768,
      }
    },
  });
  return chat;
};

export const analyzeImage = async (image: HistoryImage): Promise<string[]> => {
  try {
    const ai = getAi();
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
            type: Type.STRING,
            description: 'A short, descriptive string of an object or character feature.'
          }
        }
      },
    });

    const result = JSON.parse(response.text);
    if (!Array.isArray(result)) {
      throw new Error("API did not return a valid array.");
    }
    return result;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error(`Failed to analyze image. ${error instanceof Error ? error.message : String(error)}`);
  }
};
