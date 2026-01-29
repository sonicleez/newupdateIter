/**
 * Utility functions for image handling and caching
 * Migrated from Google AI to Groq/Fal.ai - SDK removed
 */

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
    
    if (modelId !== undefined) {
        // Old 5-argument signature: (apiKey, prompt, systemPrompt, model, jsonMode)
        prompt = systemPromptOrPrompt;
        systemPrompt = typeof jsonModeOrSystemPrompt === 'string' ? jsonModeOrSystemPrompt : '';
        isJsonMode = jsonMode ?? false;
    } else {
        // New 3-argument signature: (prompt, systemPrompt, jsonMode)
        prompt = promptOrApiKey;
        systemPrompt = systemPromptOrPrompt;
        isJsonMode = typeof jsonModeOrSystemPrompt === 'boolean' ? jsonModeOrSystemPrompt : false;
    }

    const messages: Array<{ role: string; content: string }> = [];
    
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch('/api/proxy/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
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
export const callGroqVision = async (
    prompt: string,
    images: { data: string; mimeType: string }[]
): Promise<string> => {
    // Convert to data URLs
    const imageUrls = images.map(img => `data:${img.mimeType};base64,${img.data}`);

    const response = await fetch('/api/proxy/groq/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            prompt,
            images: imageUrls,
            model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Groq recommendation
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

// Legacy compatibility exports (for code that still references these)
export const callGeminiText = callGroqText;
export const callGeminiVisionReasoning = callGroqVision;

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
