/**
 * Utility functions for image handling and caching
 * Migrated from Google AI to Groq/Fal.ai - SDK removed
 * With Imperial Ultra API as premium provider (fallback enabled)
 */

import { GoogleGenAI } from "@google/genai";
import {
    isImperialUltraEnabled,
    callImperialText,
    callImperialVision,
    checkImperialHealth
} from './imperialUltraClient';

// ═══════════════════════════════════════════════════════════════
// IMAGE CACHE - Avoids re-fetching same images during generation
// ═══════════════════════════════════════════════════════════════
const imageCache = new Map<string, { data: string; mimeType: string }>();
const CACHE_MAX_SIZE = 100; // Increased from 50
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (was 5 min) - longer session support
const FETCH_TIMEOUT = 15000; // 15 second timeout for slow connections
let cacheTimestamp = Date.now();

// Clear cache if too old
const checkCacheExpiry = () => {
    if (Date.now() - cacheTimestamp > CACHE_TTL) {
        imageCache.clear();
        cacheTimestamp = Date.now();
        console.log('[ImageCache] 🗑️ Cache cleared (TTL expired)');
    }
};

/**
 * Fix MIME type for APIs that reject 'application/octet-stream'
 * Gemini AI and Veo require valid image MIME types
 * @param mimeType - The original MIME type from blob.type
 * @param urlOrFilename - Optional URL or filename to infer type from extension
 * @returns Valid image MIME type
 */
export const fixMimeType = (mimeType: string | undefined, urlOrFilename?: string): string => {
    // If valid MIME type, return as is
    if (mimeType && mimeType.startsWith('image/') && mimeType !== 'application/octet-stream') {
        return mimeType;
    }

    // Try to infer from URL/filename extension
    if (urlOrFilename) {
        const ext = urlOrFilename.split('?')[0].split('.').pop()?.toLowerCase();
        if (ext === 'png') return 'image/png';
        if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
        if (ext === 'webp') return 'image/webp';
        if (ext === 'gif') return 'image/gif';
    }

    // Default fallback
    console.warn(`[fixMimeType] ⚠️ Fixed invalid MIME: '${mimeType}' -> 'image/jpeg'`);
    return 'image/jpeg';
};

// Helper: Fetch with timeout
const fetchWithTimeout = async (url: string, timeout: number): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

// Helper function to safely extract base64 data from both URL and base64 images
// WITH CACHING to avoid duplicate fetches
export const safeGetImageData = async (imageStr: string): Promise<{ data: string; mimeType: string } | null> => {
    if (!imageStr) return null;

    // Check cache first
    checkCacheExpiry();
    if (imageCache.has(imageStr)) {
        console.log('[ImageCache] ⚡ Cache hit');
        return imageCache.get(imageStr)!;
    }

    try {
        let result: { data: string; mimeType: string } | null = null;

        if (imageStr.startsWith('data:')) {
            const mimeType = imageStr.substring(5, imageStr.indexOf(';'));
            const data = imageStr.split('base64,')[1];
            result = { data, mimeType };
        } else if (imageStr.startsWith('http')) {
            const startTime = Date.now();
            const response = await fetchWithTimeout(imageStr, FETCH_TIMEOUT);
            if (!response.ok) throw new Error('Failed to fetch image');
            const blob = await response.blob();
            let mimeType = blob.type;

            // [FIX] Gemini API rejects 'application/octet-stream'. We must enforce a valid image MIME type.
            if (!mimeType || mimeType === 'application/octet-stream') {
                // Try to infer from URL file extension
                const extension = imageStr.split('?')[0].split('.').pop()?.toLowerCase();
                if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
                else if (extension === 'webp') mimeType = 'image/webp';
                else mimeType = 'image/png'; // Default fallback

                console.warn(`[ImageCache] ⚠️ MIME type fix: '${blob.type}' -> '${mimeType}' for ${imageStr.substring(0, 50)}...`);
            }
            result = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({
                    data: (reader.result as string).split(',')[1],
                    mimeType
                });
                reader.readAsDataURL(blob);
            });
            console.log(`[ImageCache] 📥 Fetched in ${Date.now() - startTime}ms`);
        }

        // Store in cache
        if (result) {
            if (imageCache.size >= CACHE_MAX_SIZE) {
                // Remove oldest entry
                const firstKey = imageCache.keys().next().value;
                if (firstKey) imageCache.delete(firstKey);
            }
            imageCache.set(imageStr, result);
        }

        return result;
    } catch (error) {
        console.error('Error in safeGetImageData:', error);
        return null;
    }
};

// Pre-warm cache with multiple images in parallel
// Call this when loading a project to speed up first generation
export const preWarmImageCache = async (imageUrls: string[]): Promise<number> => {
    const startTime = Date.now();
    const uniqueUrls = [...new Set(imageUrls.filter(Boolean))];

    if (uniqueUrls.length === 0) return 0;

    console.log(`[ImageCache] 🔥 Pre-warming cache with ${uniqueUrls.length} images...`);

    const results = await Promise.allSettled(
        uniqueUrls.map(url => safeGetImageData(url))
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
    console.log(`[ImageCache] ✅ Pre-warmed ${successCount}/${uniqueUrls.length} images in ${Date.now() - startTime}ms`);

    return successCount;
};

// Export cache clear function for manual clearing
export const clearImageCache = () => {
    imageCache.clear();
    cacheTimestamp = Date.now();
    console.log('[ImageCache] 🗑️ Cache manually cleared');
};

// Get cache stats for debugging
export const getCacheStats = () => ({
    size: imageCache.size,
    maxSize: CACHE_MAX_SIZE,
    ttlMinutes: CACHE_TTL / 60000,
    ageMinutes: Math.round((Date.now() - cacheTimestamp) / 60000)
});

// ═══════════════════════════════════════════════════════════════
// GROQ API HELPERS (Replacing Gemini SDK calls)
// ═══════════════════════════════════════════════════════════════

/**
 * Call Groq Chat API for text generation via proxy
 */
export const callGroqText = async (
    promptOrApiKey: string,
    systemPromptOrPrompt: string = '',
    jsonModeOrSystemPrompt: boolean | string = false,
    modelId?: string,
    jsonMode?: boolean
): Promise<string> => {
    // Detect which signature is being used
    let prompt: string;
    let systemPrompt: string;
    let isJsonMode: boolean;
    let modelToUse = modelId || 'llama-3.3-70b-versatile';
    let apiKey: string | null = null;

    if (modelId !== undefined && typeof promptOrApiKey === 'string' && typeof systemPromptOrPrompt === 'string') {
        // Old 5-argument signature: (apiKey, prompt, systemPrompt, model, jsonMode)
        // OR (prompt, systemPrompt, isJsonMode, modelId) ??

        if (typeof jsonModeOrSystemPrompt === 'boolean') {
            // Signature: (prompt, systemPrompt, isJsonMode, modelId)
            prompt = promptOrApiKey;
            systemPrompt = systemPromptOrPrompt;
            isJsonMode = jsonModeOrSystemPrompt;
        } else {
            // Signature: (apiKey, prompt, systemPrompt, modelId, isJsonMode)
            apiKey = promptOrApiKey;
            prompt = systemPromptOrPrompt;
            systemPrompt = typeof jsonModeOrSystemPrompt === 'string' ? jsonModeOrSystemPrompt : '';
            isJsonMode = jsonMode ?? false;
        }
    } else {
        // New 3-argument signature: (prompt, systemPrompt, jsonMode)
        // Or sometimes just (prompt)
        prompt = promptOrApiKey;
        systemPrompt = systemPromptOrPrompt;
        isJsonMode = typeof jsonModeOrSystemPrompt === 'boolean' ? jsonModeOrSystemPrompt : false;
        if (jsonMode !== undefined) isJsonMode = jsonMode;
    }

    // ═══════════════════════════════════════════════════════════════
    // DETECT PROVIDER FROM SELECTED MODEL
    // ═══════════════════════════════════════════════════════════════
    // Route based on model prefix, not auto-priority
    const getTextProvider = (model: string): 'imperial' | 'gemini' | 'groq' => {
        // Imperial Ultra models (gemini-3-*)
        if (model.startsWith('gemini-3-')) return 'imperial';
        // Gemini Native models (gemini-1.5-*, gemini-2-*)
        if (model.includes('gemini')) return 'gemini';
        // Everything else goes to Groq
        return 'groq';
    };

    const provider = getTextProvider(modelToUse);
    console.log(`[SmartAI] Provider detected: ${provider} for model: ${modelToUse}`);

    // ═══════════════════════════════════════════════════════════════
    // 👑 IMPERIAL ULTRA PATH (Explicit model selection)
    // ═══════════════════════════════════════════════════════════════
    if (provider === 'imperial') {
        console.log('[SmartAI] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[SmartAI] 👑 Imperial Ultra MODEL SELECTED');

        // Check if Imperial is enabled and healthy
        if (!isImperialUltraEnabled()) {
            console.warn('[SmartAI] ⚠️ Imperial Ultra model selected but DISABLED in settings!');
            console.warn('[SmartAI] 📉 Fallback to Groq (enable Imperial in Profile to use)');
            // Fall through to Groq
        } else {
            try {
                const isHealthy = await checkImperialHealth();
                if (!isHealthy) {
                    console.warn('[SmartAI] ⚠️ Imperial Ultra unhealthy, falling back to Groq...');
                } else {
                    console.log(`[SmartAI] 👑 Routing to Imperial Ultra: ${modelToUse}`);
                    console.log(`  └─ Prompt: ${prompt.substring(0, 80)}...`);

                    const result = await callImperialText(prompt, {
                        systemPrompt,
                        jsonMode: isJsonMode,
                        model: modelToUse
                    });
                    console.log('[SmartAI] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    return result;
                }
            } catch (error: any) {
                console.warn('[SmartAI] ⚠️ Imperial Ultra failed:', error.message);
                console.log('[SmartAI] 📉 Fallback to Groq');
            }
        }
        console.log('[SmartAI] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // Fall through to Groq below
    }

    // ═══════════════════════════════════════════════════════════════
    // 🔵 GEMINI NATIVE PATH (Direct Google API)
    // ═══════════════════════════════════════════════════════════════
    if (provider === 'gemini') {
        console.log(`[SmartAI] 🔵 Gemini Native MODEL SELECTED: ${modelToUse}`);

        // Resolve API Key
        const effectiveKey = apiKey ||
            (typeof window !== 'undefined' ? (localStorage.getItem('geminiApiKey') || localStorage.getItem('googleApiKey')) : null) ||
            (process.env as any).GEMINI_API_KEY;

        if (!effectiveKey) {
            console.warn('[SmartAI] ⚠️ No Gemini API Key found. Falling back to Groq...');
        } else {
            try {
                const client = new GoogleGenAI({ apiKey: effectiveKey });

                // Map our model IDs to Google's actual model names
                const googleModelName = modelToUse.includes('gemini-1.5-pro') ? 'gemini-1.5-pro' : 'gemini-1.5-flash';

                // Construct prompt
                const contentParts = [];
                if (systemPrompt) {
                    contentParts.push(`SYSTEM INSTRUCTION:\n${systemPrompt}\n\n`);
                }
                contentParts.push(prompt);

                const response = await client.models.generateContent({
                    model: googleModelName,
                    contents: [{ role: 'user', parts: [{ text: contentParts.join('') }] }],
                    config: {
                        maxOutputTokens: 8192,
                        temperature: 0.7,
                        responseMimeType: isJsonMode ? "application/json" : "text/plain"
                    }
                });

                const text = response.text;

                if (!text) {
                    throw new Error("Empty response from Gemini");
                }

                console.log(`✅ [Gemini] Response received (${text.length} chars)`);
                return text;

            } catch (error: any) {
                console.error('[Gemini] Error detailed:', error);
                console.warn(`[SmartAI] ⚠️ Gemini failed. Falling back to Groq...`);
            }
        }
        // Fall through to Groq below
    }

    // ═══════════════════════════════════════════════════════════════
    // GROQ PATH (DEFAULT)
    // ═══════════════════════════════════════════════════════════════

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    console.log(`[Groq] Calling ${modelToUse} (JSON: ${isJsonMode})`);

    // Retrieve Groq API Key from localStorage (User Setting)
    const customGroqKey = typeof window !== 'undefined' ? localStorage.getItem('groqApiKey') : null;

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customGroqKey) {
        headers['x-groq-api-key'] = customGroqKey;
    }

    const response = await fetch('/api/proxy/groq/chat', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            messages,
            model: modelToUse,
            temperature: 0.5,
            max_tokens: 8192,
            ...(isJsonMode && { response_format: { type: 'json_object' } })
        })
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Groq API call failed');
    }
    return data.text;
};

/**
 * Call Groq Vision API for image analysis via proxy
 */
/**
 * Call Vision API (Gemini with Fallback to Groq)
 */
export const callSmartVision = async (
    prompt: string,
    images: { data: string; mimeType: string }[],
    modelId: string = 'gemini-1.5-flash'
): Promise<string> => {
    // ═══════════════════════════════════════════════════════════════
    // IMPERIAL ULTRA PATH (Premium) - TRY FIRST
    // ═══════════════════════════════════════════════════════════════
    if (isImperialUltraEnabled()) {
        console.log('[SmartVision] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[SmartVision] 👑 Imperial Ultra ENABLED - Checking health...');
        try {
            const isHealthy = await checkImperialHealth();
            if (isHealthy) {
                console.log(`[SmartVision] 👑 Routing to Imperial Ultra Vision:`);
                console.log(`  ├─ Images: ${images.length}`);
                console.log(`  └─ Prompt: ${prompt.substring(0, 60)}...`);

                const result = await callImperialVision(prompt, images, 'gemini-3-flash');
                console.log('[SmartVision] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                return result;
            } else {
                console.warn('[SmartVision] ⚠️ Imperial Ultra unhealthy, falling back...');
            }
        } catch (error: any) {
            console.warn('[SmartVision] ⚠️ Imperial Ultra Vision failed:', error.message);
            console.log('[SmartVision] 📉 Fallback chain: Imperial → Gemini → Groq');
        }
    } else {
        console.log('[SmartVision] Imperial Ultra: DISABLED');
    }

    // ═══════════════════════════════════════════════════════════════
    // GEMINI PATH (Fallback 1)
    // ═══════════════════════════════════════════════════════════════
    console.log(`[SmartVision] 💎 Routing to Google Gemini: ${modelId}`);

    const apiKey = typeof window !== 'undefined' ? (localStorage.getItem('geminiApiKey') || localStorage.getItem('googleApiKey')) : (process.env as any).GEMINI_API_KEY;
    let shouldUseGemini = true;

    if (!apiKey) {
        console.warn('[SmartVision] ⚠️ No Gemini API Key found. Falling back to Groq Vision...');
        shouldUseGemini = false;
    }

    if (shouldUseGemini && apiKey) {
        try {
            const client = new GoogleGenAI({ apiKey });

            // Construct parts: images then text
            const parts: any[] = images.map(img => ({
                inlineData: { data: img.data, mimeType: img.mimeType }
            }));
            parts.push({ text: prompt });

            const response = await client.models.generateContent({
                model: modelId, // e.g. gemini-1.5-flash
                contents: [{ role: 'user', parts }],
            });

            const text = response.text;
            if (!text) throw new Error("Empty response from Gemini Vision");

            console.log(`✅ [Gemini Vision] Success (${text.length} chars)`);
            return text;

        } catch (error: any) {
            console.error('[Gemini Vision] Error:', error);
            console.warn('[SmartVision] ⚠️ Gemini failed. Falling back to Groq Vision...');
            // Fall through to Groq
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GROQ VISION PATH (Fallback/Default)
    // ═══════════════════════════════════════════════════════════════
    console.log(`[SmartVision] ⚡ Routing to Groq Vision (v2.1 - Llama 4 Scout)`);

    // Retrieve Groq API Key from localStorage (User Setting)
    const customGroqKey = typeof window !== 'undefined' ? localStorage.getItem('groqApiKey') : null;

    // Convert to data URLs for Groq Proxy
    const imageUrls = images.map(img => `data:${img.mimeType};base64,${img.data}`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customGroqKey) {
        headers['x-groq-api-key'] = customGroqKey;
    }

    const response = await fetch('/api/proxy/groq/vision', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            prompt,
            images: imageUrls,
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            temperature: 0.5,
            max_tokens: 2048
        })
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Groq Vision API call failed');
    }
    return data.text;
};

// Legacy compatibility exports
export const callGroqVision = callSmartVision;
export const callGeminiText = callGroqText;
export const callGeminiVisionReasoning = callSmartVision;

// GommoAI import for character generation
import { GommoAI, urlToBase64 } from './gommoAI';
import { IMAGE_MODELS } from './appConstants';

/**
 * Character Image API with Gommo/Fal routing
 * Used for Lora generation (Face ID, Body sheets)
 * Note: This now routes to Gommo or Fal.ai, not Gemini
 */
export const callCharacterImageAPI = async (
    apiKey: string | null, // kept for backward compatibility
    prompt: string,
    aspectRatio: string,
    imageModel: string = 'fal-ai/flux-general',
    imageContext: string | null = null,
    gommoCredentials?: { domain: string; accessToken: string }
): Promise<string | null> => {
    // Determine provider from model
    const modelInfo = IMAGE_MODELS.find(m => m.value === imageModel);
    let provider = modelInfo?.provider || 'fal';

    // If it's a Google model being used via Gommo Proxy
    if (provider === 'google' && gommoCredentials?.domain && gommoCredentials?.accessToken) {
        provider = 'gommo';
    }

    console.log(`[CharacterGen] Provider: ${provider}, Model: ${imageModel}`);

    // ═══════════════════════════════════════════════════════════════
    // 👑 IMPERIAL ULTRA PATH - Premium Character Generation
    // ═══════════════════════════════════════════════════════════════
    if (provider === 'imperial') {
        console.log('[CharacterGen] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[CharacterGen] 👑 Using IMPERIAL ULTRA provider');

        const { callImperialImage, isImperialUltraEnabled, checkImperialHealth, getImperialKeySource } = await import('./imperialUltraClient');

        if (isImperialUltraEnabled()) {
            const isHealthy = await checkImperialHealth();
            if (isHealthy) {
                try {
                    const keySource = getImperialKeySource();
                    console.log(`[CharacterGen] 👑 Imperial Character Request:`);
                    console.log(`  ├─ Model: ${imageModel}`);
                    console.log(`  ├─ Key Source: ${keySource.toUpperCase()}`);
                    console.log(`  ├─ Aspect Ratio: ${aspectRatio}`);
                    console.log(`  └─ Prompt: ${prompt.substring(0, 60)}...`);

                    const result = await callImperialImage(prompt, {
                        model: imageModel,
                        aspectRatio: aspectRatio
                    });

                    if (result.base64) {
                        console.log('[CharacterGen] 👑 ✅ Imperial character generated (base64)');
                        console.log('[CharacterGen] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return result.base64;
                    } else if (result.url) {
                        console.log('[CharacterGen] 👑 ✅ Imperial character generated (URL)');
                        const base64 = await urlToBase64(result.url);
                        console.log('[CharacterGen] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return base64;
                    }
                    throw new Error('No image in Imperial response');
                } catch (error: any) {
                    console.error('[CharacterGen] 👑 ❌ Imperial failed:', error.message);
                    console.log('[CharacterGen] 📉 Fallback: Imperial → Fal.ai');
                }
            } else {
                console.warn('[CharacterGen] ⚠️ Imperial Ultra unhealthy, falling back...');
            }
        } else {
            console.warn('[CharacterGen] ⚠️ Imperial Ultra disabled, falling back...');
        }
        console.log('[CharacterGen] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        // Fall through to other providers below
    }

    // ═══════════════════════════════════════════════════════════════
    // GOMMO PATH
    // ═══════════════════════════════════════════════════════════════
    if (provider === 'gommo') {
        if (gommoCredentials?.domain && gommoCredentials?.accessToken) {
            console.log('[CharacterGen] 🟡 Using GOMMO provider');
            try {
                const client = new GommoAI(gommoCredentials.domain, gommoCredentials.accessToken);
                const gommoRatio = GommoAI.convertRatio(aspectRatio);

                // Prepare subjects if imageContext provided
                const subjects: Array<{ data?: string }> = [];
                if (imageContext) {
                    let base64Data = '';
                    if (imageContext.startsWith('data:')) {
                        base64Data = imageContext.split(',')[1] || '';
                    } else if (imageContext.startsWith('http')) {
                        const fetched = await urlToBase64(imageContext);
                        base64Data = fetched.split(',')[1] || '';
                    }
                    if (base64Data) {
                        subjects.push({ data: base64Data });
                    }
                }

                console.log(`[CharacterGen] 🚀 Calling Gommo generateImage with params:`, JSON.stringify({
                    prompt,
                    ratio: gommoRatio,
                    model: imageModel,
                    subjects: subjects.map(s => ({ ...s, data: s.data ? 'base64...' : undefined }))
                }));

                const cdnUrl = await client.generateImage(prompt, {
                    ratio: gommoRatio,
                    model: imageModel,
                    subjects: subjects.length > 0 ? subjects : undefined,
                    onProgress: (status, attempt) => {
                        console.log(`[CharacterGen] Polling ${attempt}/60: ${status}`);
                    }
                });

                // Convert CDN URL to base64
                const base64Image = await urlToBase64(cdnUrl);
                console.log('[CharacterGen] ✅ Gommo image generated successfully');
                return base64Image;
            } catch (error: any) {
                console.error('[CharacterGen] ❌ Gommo error:', error.message);
                throw error;
            }
        } else {
            console.error('[CharacterGen] ❌ Gommo model selected but credentials missing!');
            throw new Error('Gommo credentials chưa được cấu hình. Vào Profile → Gommo AI để nhập Domain và Access Token.');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FAL.AI PATH (Default or Fallback)
    // ═══════════════════════════════════════════════════════════════
    console.log('[CharacterGen] 🚀 Using FAL.AI provider');
    try {
        const response = await fetch('/api/proxy/fal/flux', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                image_url: imageContext || undefined,
                aspect_ratio: aspectRatio === '16:9' ? 'landscape_16_9' :
                    aspectRatio === '9:16' ? 'portrait_16_9' : 'square'
            })
        });

        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Fal.ai generation failed');

        // Convert URL to base64 for consistency
        const base64Image = await urlToBase64(data.url || data.imageUrl);
        console.log('[CharacterGen] ✅ Fal.ai image generated successfully');
        return base64Image;
    } catch (error: any) {
        console.error('[CharacterGen] ❌ Fal.ai error:', error.message);
        // If it was supposed to be Google but failed, try last-ditch fallback
        throw error;
    }
};

// Legacy alias for backward compatibility
export const callGeminiAPI = callCharacterImageAPI;
