/**
 * @google/genai Compatibility Shim
 * 
 * This module provides a compatibility layer after migrating from Google AI to Groq/Fal.ai.
 * It exports stub classes that match the original API surface.
 * 
 * Components using this shim should be gradually migrated to use the Groq proxy directly.
 */

import { callGroqText, callGroqVision, safeGetImageData } from '../geminiUtils';
import { urlToBase64 } from '../gommoAI';

// Type definitions to match original SDK
export interface Part {
    text?: string;
    inlineData?: {
        data: string;
        mimeType: string;
    };
}

export interface Content {
    role?: string;
    parts?: Part[];
    text?: string;
    inlineData?: {
        data: string;
        mimeType: string;
    };
}

export interface GenerateContentResponse {
    text?: string;
    candidates?: Array<{
        content?: {
            parts?: Part[];
        };
    }>;
    usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
    };
    promptFeedback?: {
        blockReason?: string;
    };
}

export interface GenerateContentConfig {
    responseMimeType?: string;
    responseSchema?: any;
    thinkingConfig?: { thinkingLevel?: string; thinkingBudget?: number };
    responseModalities?: string[];
    imageConfig?: {
        aspectRatio?: string;
        imageSize?: string;
    };
    temperature?: number;
    maxOutputTokens?: number;
    topK?: number;
    topP?: number;
}

export interface GenerateContentRequest {
    model: string;
    contents: string | Content | Content[];
    config?: GenerateContentConfig;
}

// Modality enum for compatibility
export const Modality = {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE'
} as const;

// Type enum for JSON schema (used in structured output)
export const Type = {
    STRING: 'STRING',
    NUMBER: 'NUMBER', 
    BOOLEAN: 'BOOLEAN',
    ARRAY: 'ARRAY',
    OBJECT: 'OBJECT'
} as const;

/**
 * GoogleGenAI compatibility class
 * Routes calls through Groq/Fal.ai proxies
 */
export class GoogleGenAI {
    private apiKey: string;

    constructor(config: { apiKey: string }) {
        this.apiKey = config.apiKey?.trim() || '';
        console.log('[GoogleGenAI Shim] Initialized (routing to Groq/Fal.ai)');
    }

    /**
     * Models namespace - provides generateContent method
     */
    get models() {
        const self = this;
        return {
            async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
                const { model, contents, config } = request;
                
                // Check if this is an image generation request
                const isImageRequest = config?.responseModalities?.includes('IMAGE');
                
                // Build messages from contents
                let prompt = '';
                let images: { data: string; mimeType: string }[] = [];
                
                if (typeof contents === 'string') {
                    prompt = contents;
                } else if (Array.isArray(contents)) {
                    for (const content of contents) {
                        if (content.text) prompt += content.text + '\n';
                        if (content.inlineData) {
                            images.push({
                                data: content.inlineData.data,
                                mimeType: content.inlineData.mimeType
                            });
                        }
                        for (const part of content.parts || []) {
                            if (part.text) prompt += part.text + '\n';
                            if (part.inlineData) {
                                images.push({
                                    data: part.inlineData.data,
                                    mimeType: part.inlineData.mimeType
                                });
                            }
                        }
                    }
                } else if (contents && typeof contents === 'object') {
                    const c = contents as Content;
                    if (c.text) prompt += c.text + '\n';
                    if (c.inlineData) {
                        images.push({
                            data: c.inlineData.data,
                            mimeType: c.inlineData.mimeType
                        });
                    }
                    for (const part of c.parts || []) {
                        if (part.text) prompt += part.text + '\n';
                        if (part.inlineData) {
                            images.push({
                                data: part.inlineData.data,
                                mimeType: part.inlineData.mimeType
                            });
                        }
                    }
                }

                prompt = prompt.trim();

                // Route to appropriate service
                if (isImageRequest) {
                    // Image generation - route to Fal.ai
                    console.log('[GoogleGenAI Shim] Image request -> Fal.ai proxy');
                    try {
                        const response = await fetch('/api/proxy/fal/flux', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                prompt,
                                aspect_ratio: config?.imageConfig?.aspectRatio || 'landscape_16_9'
                            })
                        });
                        const data = await response.json();
                        
                        if (data.success && (data.url || data.imageUrl)) {
                            // Convert URL to base64
                            const imageUrl = data.url || data.imageUrl;
                            const base64 = await urlToBase64(imageUrl);
                            const [header, b64Data] = base64.split(',');
                            const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
                            
                            return {
                                text: '',
                                candidates: [{
                                    content: {
                                        parts: [{
                                            inlineData: {
                                                data: b64Data,
                                                mimeType
                                            }
                                        }]
                                    }
                                }]
                            };
                        }
                        throw new Error(data.error || 'Image generation failed');
                    } catch (err: any) {
                        console.error('[GoogleGenAI Shim] Image generation error:', err);
                        throw err;
                    }
                } else if (images.length > 0) {
                    // Vision request - route to Groq Vision
                    console.log('[GoogleGenAI Shim] Vision request -> Groq Vision proxy');
                    const text = await callGroqVision(prompt, images);
                    return {
                        text,
                        candidates: [{
                            content: {
                                parts: [{ text }]
                            }
                        }]
                    };
                } else {
                    // Text request - route to Groq Chat
                    console.log('[GoogleGenAI Shim] Text request -> Groq Chat proxy');
                    const isJsonMode = config?.responseMimeType === 'application/json';
                    const text = await callGroqText(prompt, '', isJsonMode);
                    return {
                        text,
                        candidates: [{
                            content: {
                                parts: [{ text }]
                            }
                        }]
                    };
                }
            },

            async generateImages(request: { model: string; prompt: string; config?: any }): Promise<{ generatedImages?: Array<{ image: { imageBytes: string } }> }> {
                // Image generation via Fal.ai
                console.log('[GoogleGenAI Shim] generateImages -> Fal.ai proxy');
                try {
                    const response = await fetch('/api/proxy/fal/flux', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: request.prompt,
                            aspect_ratio: request.config?.aspectRatio || 'landscape_16_9'
                        })
                    });
                    const data = await response.json();
                    
                    if (data.success && (data.url || data.imageUrl)) {
                        const imageUrl = data.url || data.imageUrl;
                        const base64 = await urlToBase64(imageUrl);
                        const b64Data = base64.split(',')[1] || base64;
                        
                        return {
                            generatedImages: [{
                                image: { imageBytes: b64Data }
                            }]
                        };
                    }
                    throw new Error(data.error || 'Image generation failed');
                } catch (err: any) {
                    console.error('[GoogleGenAI Shim] generateImages error:', err);
                    throw err;
                }
            },

            async embedContent(request: { model: string; contents: Content[] }): Promise<{ embedding?: { values: number[] } }> {
                // Embedding not supported via Groq - return empty
                console.warn('[GoogleGenAI Shim] embedContent not supported (requires dedicated embedding API)');
                return { embedding: undefined };
            }
        };
    }
}

// Default export for ESM compatibility
export default { GoogleGenAI, Type, Modality };
