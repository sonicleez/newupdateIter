/**
 * Imperial Ultra API Client
 * 
 * Premium API proxy với Gemini 3 Pro + Claude 4.5
 * Hỗ trợ OpenAI-compatible protocol
 * 
 * Server: https://ag.itera102.cloud/
 * Fallback: Groq/Fal.ai via existing proxies
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const IMPERIAL_CONFIG = {
    baseUrl: 'https://ag.itera102.cloud',
    defaultApiKey: 'sk-imperial-ultra-vault-2026',
    timeout: 120000, // 120s as configured on server
    models: {
        // Text models
        textFast: 'gemini-3-flash',         // Flash Preview - fast responses
        textPro: 'gemini-3-pro-high',       // Best thinking
        textLight: 'gemini-3-pro-low',      // Fast & Light

        // Image models
        image: 'gemini-3-pro-image',        // Image generation (1:1)

        // Claude alternatives
        claudeSonnet: 'claude-sonnet-4-5',  // Claude 4.5 Sonnet
        claudeOpus: 'claude-opus-4-5-thinking', // Claude 4.5 Opus with thinking

        // Thinking models
        flashThinking: 'gemini-2.5-flash-thinking', // Chain of thought
    }
};

/**
 * Get API key source type for debugging
 */
export function getImperialKeySource(): 'admin' | 'user' | 'default' {
    if (typeof window === 'undefined') return 'default';

    if (localStorage.getItem('assignedImperialKey')) {
        return 'admin';
    }
    if (localStorage.getItem('imperialApiKey')) {
        return 'user';
    }
    return 'default';
}

/**
 * Get API key with priority:
 * 1. Admin-assigned key (from Supabase)
 * 2. User-input key (from localStorage)
 * 3. Default fallback key
 */
export function getImperialApiKey(): string {
    if (typeof window === 'undefined') return IMPERIAL_CONFIG.defaultApiKey;

    // Priority 1: Admin-assigned key (stored from Supabase profile)
    const assignedKey = localStorage.getItem('assignedImperialKey');
    if (assignedKey) {
        return assignedKey;
    }

    // Priority 2: User-input key
    const userKey = localStorage.getItem('imperialApiKey');
    if (userKey) {
        return userKey;
    }

    // Priority 3: Default fallback
    return IMPERIAL_CONFIG.defaultApiKey;
}

/**
 * Set user's Imperial API key
 */
export function setImperialApiKey(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('imperialApiKey', key);
    console.log('[Imperial Ultra] User API key saved');
}

/**
 * Set admin-assigned Imperial API key (called from App.tsx on login)
 */
export function setAssignedImperialKey(key: string | null): void {
    if (typeof window === 'undefined') return;
    if (key) {
        localStorage.setItem('assignedImperialKey', key);
        console.log('[Imperial Ultra] Admin-assigned key loaded');
    } else {
        localStorage.removeItem('assignedImperialKey');
    }
}

// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK & STATUS
// ═══════════════════════════════════════════════════════════════

let isHealthy = true;
let lastHealthCheck = 0;
let consecutiveFailures = 0;
const HEALTH_CHECK_INTERVAL = 60000; // 1 minute
const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Check if Imperial Ultra is enabled in settings
 */
export function isImperialUltraEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('imperialUltraEnabled') === 'true';
}

/**
 * Enable/disable Imperial Ultra
 */
export function setImperialUltraEnabled(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('imperialUltraEnabled', enabled ? 'true' : 'false');
    console.log(`[Imperial Ultra] ${enabled ? 'Enabled' : 'Disabled'}`);
}

/**
 * Check health of Imperial Ultra server
 */
export async function checkImperialHealth(): Promise<boolean> {
    // Use cached result if recent
    if (Date.now() - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
        return isHealthy;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${IMPERIAL_CONFIG.baseUrl}/healthz`, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        isHealthy = response.ok;
        consecutiveFailures = isHealthy ? 0 : consecutiveFailures + 1;

        console.log(`[Imperial Ultra] Health check: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    } catch (error) {
        isHealthy = false;
        consecutiveFailures++;
        console.warn('[Imperial Ultra] Health check failed:', error);
    }

    lastHealthCheck = Date.now();

    // Auto-disable after too many failures
    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[Imperial Ultra] Too many failures (${consecutiveFailures}), temporarily disabled`);
    }

    return isHealthy && consecutiveFailures < MAX_CONSECUTIVE_FAILURES;
}

/**
 * Get current status
 */
export function getImperialStatus(): { enabled: boolean; healthy: boolean; failures: number } {
    return {
        enabled: isImperialUltraEnabled(),
        healthy: isHealthy,
        failures: consecutiveFailures
    };
}

// ═══════════════════════════════════════════════════════════════
// TEXT GENERATION
// ═══════════════════════════════════════════════════════════════

export interface ImperialTextOptions {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
}

/**
 * Call Imperial Ultra for text generation
 * Uses OpenAI-compatible /v1/chat/completions endpoint
 */
export async function callImperialText(
    prompt: string,
    options: ImperialTextOptions = {}
): Promise<string> {
    const {
        model = IMPERIAL_CONFIG.models.textFast,
        systemPrompt = '',
        temperature = 0.7,
        maxTokens = 4096,
        jsonMode = false
    } = options;

    const apiKey = getImperialApiKey();
    const keySource = getImperialKeySource();
    const keyPreview = apiKey.substring(0, 12) + '...' + apiKey.slice(-4);

    console.log(`[Imperial Ultra] 🚀 Text Request:`);
    console.log(`  ├─ Model: ${model}`);
    console.log(`  ├─ API Key: ${keyPreview} (${keySource.toUpperCase()})`);
    console.log(`  ├─ JSON Mode: ${jsonMode}`);
    console.log(`  └─ Prompt length: ${prompt.length} chars`);

    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const requestBody: Record<string, any> = {
        model,
        messages,
        temperature,
        max_tokens: maxTokens
    };

    if (jsonMode) {
        requestBody.response_format = { type: 'json_object' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMPERIAL_CONFIG.timeout);

    try {
        const response = await fetch(`${IMPERIAL_CONFIG.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getImperialApiKey()}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Imperial API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const usage = data.usage || {};

        console.log(`[Imperial Ultra] ✅ Text Response:`);
        console.log(`  ├─ Content: ${content.length} chars`);
        console.log(`  ├─ Prompt tokens: ${usage.prompt_tokens || 'N/A'}`);
        console.log(`  └─ Completion tokens: ${usage.completion_tokens || 'N/A'}`);
        consecutiveFailures = 0;

        return content;
    } catch (error: any) {
        clearTimeout(timeoutId);
        consecutiveFailures++;

        if (error.name === 'AbortError') {
            throw new Error('Imperial Ultra request timed out');
        }

        console.error('[Imperial Ultra] ❌ Text request failed:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE GENERATION  
// ═══════════════════════════════════════════════════════════════

export interface ImperialImageOptions {
    model?: string;
    aspectRatio?: string;
    size?: string;
}

/**
 * Call Imperial Ultra for image generation
 * Uses Gemini 3 Pro Image model via OpenAI-compatible endpoint
 * Same as Python: client.chat.completions.create(model="gemini-3-pro-image", extra_body={"size": "..."})
 */
export async function callImperialImage(
    prompt: string,
    options: ImperialImageOptions = {}
): Promise<{ url?: string; base64?: string }> {
    const {
        model = IMPERIAL_CONFIG.models.image,
        aspectRatio = '16:9'
    } = options;

    // Map aspect ratio to size (matching server expectations)
    const sizeMap: Record<string, string> = {
        '1:1': '1024x1024',
        '16:9': '1280x720',
        '9:16': '720x1280',
        '4:3': '1216x896',
        '3:4': '896x1216',
    };
    const size = sizeMap[aspectRatio] || '1024x1024';

    console.log(`[Imperial Ultra] 🎨 Image Request:`);
    console.log(`  ├─ Model: ${model}`);
    console.log(`  ├─ Aspect Ratio: ${aspectRatio} → Size: ${size}`);
    console.log(`  └─ Prompt: ${prompt.substring(0, 60)}...`);

    // OpenAI-compatible format (same as Python SDK)
    const requestBody = {
        model,
        messages: [
            { role: 'user', content: prompt }
        ],
        size  // This goes into the request body directly
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMPERIAL_CONFIG.timeout);

    try {
        const response = await fetch(`${IMPERIAL_CONFIG.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getImperialApiKey()}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Imperial Image API error (${response.status}): ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        console.log('[Imperial Ultra] Raw response:', JSON.stringify(data).substring(0, 200));

        // Extract image from response - content is the base64/URL string
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('Empty response from Imperial Ultra image API');
        }

        // Check if content is markdown image format: ![image](data:image/jpeg;base64,...)
        const markdownMatch = content.match(/!\[.*?\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/);
        if (markdownMatch) {
            console.log('[Imperial Ultra] ✅ Image received (markdown format)');
            consecutiveFailures = 0;
            return { base64: markdownMatch[1] };
        }

        // Check if content is base64 image data
        if (content.startsWith('data:image')) {
            console.log('[Imperial Ultra] ✅ Image received (base64 data URL)');
            consecutiveFailures = 0;
            return { base64: content };
        }

        // Check if content is raw base64 (without data: prefix)
        if (content.match(/^[A-Za-z0-9+/=]{100,}/)) {
            console.log('[Imperial Ultra] ✅ Image received (raw base64)');
            consecutiveFailures = 0;
            return { base64: `data:image/png;base64,${content}` };
        }

        // Check if content is a URL
        if (content.startsWith('http')) {
            console.log('[Imperial Ultra] ✅ Image received (URL)');
            consecutiveFailures = 0;
            return { url: content };
        }

        // Check for images array in response
        if (data.images?.[0]?.url) {
            console.log('[Imperial Ultra] ✅ Image received (images array)');
            consecutiveFailures = 0;
            return { url: data.images[0].url };
        }

        // Check for inline image in parts (Gemini format)
        const parts = data.choices?.[0]?.message?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData?.data) {
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    console.log('[Imperial Ultra] ✅ Image received (inline parts)');
                    consecutiveFailures = 0;
                    return { base64: `data:${mimeType};base64,${part.inlineData.data}` };
                }
            }
        }

        throw new Error(`Unexpected response format: ${content.substring(0, 100)}`);
    } catch (error: any) {
        clearTimeout(timeoutId);
        consecutiveFailures++;

        if (error.name === 'AbortError') {
            throw new Error('Imperial Ultra image request timed out');
        }

        console.error('[Imperial Ultra] ❌ Image request failed:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// VISION (Image Analysis)
// ═══════════════════════════════════════════════════════════════

/**
 * Call Imperial Ultra for vision/image analysis
 */
export async function callImperialVision(
    prompt: string,
    images: Array<{ data: string; mimeType: string }>,
    model: string = IMPERIAL_CONFIG.models.textFast
): Promise<string> {
    const apiKey = getImperialApiKey();
    const keySource = getImperialKeySource();
    const keyPreview = apiKey.substring(0, 12) + '...' + apiKey.slice(-4);

    console.log(`[Imperial Ultra] 🎨 Vision Request:`);
    console.log(`  ├─ Model: ${model}`);
    console.log(`  ├─ API Key: ${keyPreview} (${keySource.toUpperCase()})`);
    console.log(`  ├─ Images: ${images.length}`);
    console.log(`  └─ Prompt length: ${prompt.length} chars`);

    // Build content with images
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add images first
    for (const img of images) {
        content.push({
            type: 'image_url',
            image_url: {
                url: img.data.startsWith('data:') ? img.data : `data:${img.mimeType};base64,${img.data}`
            }
        });
    }

    // Add text prompt
    content.push({
        type: 'text',
        text: prompt
    });

    const requestBody = {
        model,
        messages: [
            { role: 'user', content }
        ],
        max_tokens: 4096
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMPERIAL_CONFIG.timeout);

    try {
        const response = await fetch(`${IMPERIAL_CONFIG.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getImperialApiKey()}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Imperial Vision API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        console.log(`[Imperial Ultra] ✅ Vision response received (${text.length} chars)`);
        consecutiveFailures = 0;

        return text;
    } catch (error: any) {
        clearTimeout(timeoutId);
        consecutiveFailures++;

        if (error.name === 'AbortError') {
            throw new Error('Imperial Ultra vision request timed out');
        }

        console.error('[Imperial Ultra] ❌ Vision request failed:', error.message);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// IMAGE EDITING (with mask support)
// ═══════════════════════════════════════════════════════════════

export interface ImperialImageEditOptions {
    model?: string;
    aspectRatio?: string;
}

/**
 * Call Imperial Ultra for image editing (with optional mask)
 * Used by Advanced Image Editor for edit workflows
 */
export async function callImperialImageEdit(
    sourceImage: string, // base64 without data: prefix
    sourceMimeType: string,
    prompt: string,
    maskImage?: string, // base64 without data: prefix (optional)
    options: ImperialImageEditOptions = {}
): Promise<{ url?: string; base64?: string; mimeType?: string }> {
    const {
        model = IMPERIAL_CONFIG.models.image, // gemini-3-pro-image
        aspectRatio = '1:1'
    } = options;

    // Map aspect ratio to size
    const sizeMap: Record<string, string> = {
        '1:1': '1024x1024',
        '16:9': '1280x720',
        '9:16': '720x1280',
        '4:3': '1216x896',
        '3:4': '896x1216',
    };
    const size = sizeMap[aspectRatio] || '1024x1024';

    console.log(`[Imperial Ultra] 🖼️ Image Edit Request:`);
    console.log(`  ├─ Model: ${model}`);
    console.log(`  ├─ Aspect Ratio: ${aspectRatio} → Size: ${size}`);
    console.log(`  ├─ Has Mask: ${maskImage ? 'Yes' : 'No'}`);
    console.log(`  └─ Prompt: ${prompt.substring(0, 60)}...`);

    // Build multi-part content message
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // Add source image
    const sourceDataUrl = sourceImage.startsWith('data:')
        ? sourceImage
        : `data:${sourceMimeType};base64,${sourceImage}`;
    content.push({
        type: 'image_url',
        image_url: { url: sourceDataUrl }
    });

    // Add mask if provided
    if (maskImage) {
        const maskDataUrl = maskImage.startsWith('data:')
            ? maskImage
            : `data:image/png;base64,${maskImage}`;
        content.push({
            type: 'image_url',
            image_url: { url: maskDataUrl }
        });
    }

    // Add text prompt
    content.push({
        type: 'text',
        text: prompt
    });

    const requestBody = {
        model,
        messages: [
            { role: 'user', content }
        ],
        size
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMPERIAL_CONFIG.timeout);

    try {
        const response = await fetch(`${IMPERIAL_CONFIG.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getImperialApiKey()}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Imperial Image Edit API error (${response.status}): ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        const contentStr = data.choices?.[0]?.message?.content;

        if (!contentStr) {
            throw new Error('Empty response from Imperial Ultra image edit API');
        }

        // Parse response (same logic as callImperialImage)
        // Check if content is markdown image format
        const markdownMatch = contentStr.match(/!\[.*?\]\((data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)\)/);
        if (markdownMatch) {
            console.log('[Imperial Ultra] ✅ Edited image received (markdown format)');
            consecutiveFailures = 0;
            return { base64: markdownMatch[1], mimeType: 'image/png' };
        }

        // Check if content is base64 image data
        if (contentStr.startsWith('data:image')) {
            console.log('[Imperial Ultra] ✅ Edited image received (base64 data URL)');
            consecutiveFailures = 0;
            return { base64: contentStr, mimeType: 'image/png' };
        }

        // Check if content is raw base64
        if (contentStr.match(/^[A-Za-z0-9+/=]{100,}/)) {
            console.log('[Imperial Ultra] ✅ Edited image received (raw base64)');
            consecutiveFailures = 0;
            return { base64: `data:image/png;base64,${contentStr}`, mimeType: 'image/png' };
        }

        // Check if content is a URL
        if (contentStr.startsWith('http')) {
            console.log('[Imperial Ultra] ✅ Edited image received (URL)');
            consecutiveFailures = 0;
            return { url: contentStr, mimeType: 'image/png' };
        }

        throw new Error('Unexpected response format from Imperial Ultra image edit API');
    } catch (error: any) {
        clearTimeout(timeoutId);
        consecutiveFailures++;

        if (error.name === 'AbortError') {
            throw new Error('Imperial Ultra image edit request timed out');
        }

        console.error('[Imperial Ultra] ❌ Image edit request failed:', error.message);
        throw error;
    }
}


// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export const IMPERIAL_MODELS = IMPERIAL_CONFIG.models;
export default {
    callImperialText,
    callImperialImage,
    callImperialImageEdit,
    callImperialVision,
    checkImperialHealth,
    isImperialUltraEnabled,
    setImperialUltraEnabled,
    getImperialStatus,
    IMPERIAL_MODELS
};
