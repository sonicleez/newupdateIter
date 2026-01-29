import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { fal } from '@fal-ai/client';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

// Load environment variables from .env in current or parent directory
import fs from 'fs';
const envPath = fs.existsSync('./.env') ? './.env' : '../.env';
dotenv.config({ path: envPath });

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ADD REQUEST LOGGING FOR DEBUGGING
app.use((req, res, next) => {
    if (req.path.includes('/api/proxy/gommo/ai/generateImage')) {
        console.log(`[Gommo Proxy] 📥 Incoming Generation Request: ${req.method} ${req.path}`);
    } else if (req.path.includes('token') || req.path.includes('update')) {
        console.log(`[Extension] 📡 Incoming Extension Request: ${req.method} ${req.path}`);
    }
    next();
});

// ==================== GROQ CONFIGURATION ====================
const GROQ_API_KEY = process.env.GROQ_API_KEY;
let groqClient = null;
if (GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: GROQ_API_KEY });
    console.log('✅ [Groq] Client configured with GROQ_API_KEY');
} else {
    console.warn('⚠️ [Groq] GROQ_API_KEY not found in environment. Groq endpoints will not work.');
}

// ==================== FAL.AI CONFIGURATION ====================
// Configure Fal.ai client with API key from environment
const FAL_KEY = process.env.FAL_KEY;
if (FAL_KEY) {
    fal.config({
        credentials: FAL_KEY
    });
    console.log('✅ [Fal.ai] Client configured with FAL_KEY');
} else {
    console.warn('⚠️ [Fal.ai] FAL_KEY not found in environment. Fal.ai endpoint will not work.');
}

// ==================== GROQ CHAT PROXY (Director - Script Generation) ====================
// Uses llama-3.3-70b-versatile for script generation
app.post('/api/proxy/groq/chat', async (req, res) => {
    try {
        if (!groqClient) {
            return res.status(500).json({ error: 'Groq client not configured. Check GROQ_API_KEY.' });
        }

        const { messages, model = 'llama-3.3-70b-versatile', temperature = 0.7, max_tokens = 8192, response_format } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        console.log(`🎬 [Groq Chat] Request with model: ${model}, messages: ${messages.length}`);

        const chatCompletion = await groqClient.chat.completions.create({
            messages,
            model,
            temperature,
            max_tokens,
            ...(response_format && { response_format })
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '';
        console.log(`✅ [Groq Chat] Response received, length: ${responseText.length}`);

        res.json({
            success: true,
            text: responseText,
            usage: chatCompletion.usage
        });

    } catch (error) {
        console.error('[Groq Chat] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GROQ VISION PROXY (DOP - Raccord Validation) ====================
// Uses meta-llama/llama-4-scout-17b-16e-instruct for image analysis
app.post('/api/proxy/groq/vision', async (req, res) => {
    try {
        if (!groqClient) {
            return res.status(500).json({ error: 'Groq client not configured. Check GROQ_API_KEY.' });
        }

        const { prompt, images, model = 'meta-llama/llama-4-scout-17b-16e-instruct', temperature = 0.5, max_tokens = 2048 } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        console.log(`👁️ [Groq Vision] Request with model: ${model}, images: ${images?.length || 0}`);

        // Build content array with text and images
        const content = [{ type: 'text', text: prompt }];

        // Add images if provided (expecting base64 data URLs or URLs)
        if (images && Array.isArray(images)) {
            for (const img of images) {
                if (img.startsWith('data:')) {
                    // Base64 data URL
                    content.push({
                        type: 'image_url',
                        image_url: { url: img }
                    });
                } else if (img.startsWith('http')) {
                    // Remote URL
                    content.push({
                        type: 'image_url',
                        image_url: { url: img }
                    });
                }
            }
        }

        const chatCompletion = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content
                }
            ],
            model,
            temperature,
            max_tokens
        });

        const responseText = chatCompletion.choices[0]?.message?.content || '';
        console.log(`✅ [Groq Vision] Response received, length: ${responseText.length}`);

        res.json({
            success: true,
            text: responseText,
            usage: chatCompletion.usage
        });

    } catch (error) {
        console.error('[Groq Vision] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PI STRATEGIC DISPATCHER (Intelligence Service) ====================
// This endpoint analyzes the request and optimizes it for the specific model
// PRIORITY: Groq (Fast) -> FALLBACK: Local (if configured/needed)
app.post('/api/proxy/pi/analyze', async (req, res) => {
    try {
        const { prompt, modelId, mode, aspectRatio, isMannequinMode } = req.body;

        if (!prompt || !modelId) {
            return res.status(400).json({ error: 'Prompt and modelId are required' });
        }

        console.log(`🧠 [Pi Dispatcher] Analyzing prompt for model: ${modelId}`);

        // 1. Identify Model Strategy
        const isFlux = modelId.toLowerCase().includes('flux');
        const isZImage = modelId.toLowerCase().includes('z_image') || modelId.toLowerCase().includes('alibaba');
        const isNano = modelId.toLowerCase().includes('banana') || modelId.toLowerCase().includes('3_5') || modelId.toLowerCase().includes('imagen');

        let strategicRules = "";
        if (isFlux) {
            // Flux weakness: "Too clean/plastic". Strategy: Inject heavy texture & grain anchors.
            strategicRules = `
            - CRITICAL: Avoid "plastic" or "too clean" render look.
            - ACTION: Inject realism anchors: 'raw photo', 'analog film grain', 'fujifilm xt4', 'overexposed highlights', 'highly detailed fabric texture', '8k uhd'.
            - STRUCTURE: Descriptive cinematic paragraph.`;
        } else if (isZImage) {
            // Z-Image strength: Physical textures. Strategy: Technical comma-separated keywords.
            strategicRules = `
            - CRITICAL: Emphasize physical material details.
            - ACTION: Use technical tags: 'weathered wood grain', 'suede fabric texture', 'matte resin', 'soft shadows', 'raytraced lighting'.
            - STRUCTURE: Comma-separated keyword string.`;
        } else if (isNano) {
            // Nano strength: Photorealism. Strategy: Photography specs.
            strategicRules = `
            - CRITICAL: Maximize photorealistic output.
            - ACTION: Focus on camera specs: 'ARRI Alexa 35', '35mm lens', 'T1.8 aperture', 'volumetric lighting', 'cinematic color grading'.
            - STRUCTURE: Concise, photography-first description.`;
        }

        if (isMannequinMode || prompt.toUpperCase().includes('MANNEQUIN')) {
            strategicRules += `
            - SPECIAL: Faceless Mannequin Protocol ACTIVE.
            - ACTION: Enforce 'matte white resin material', 'smooth humanoid shape', 'ABSOLUTELY NO EYES', 'featureless face'.`;
        }

        const systemPrompt = `You are Itera's Strategic AI Advisor (Pi). 
        Your task is to REWRITE and OPTIMIZE the user's prompt for the ${modelId} image model to ensure maximum realism and material depth.
        
        STRATEGIC RULES FOR THIS REQUEST:
        ${strategicRules}
        
        - Preserve the user's core subject and intent.
        - Translate to English if the input is Vietnamese.
        - Output ONLY the optimized prompt. No conversation.`;

        // 2. TRY GROQ FIRST (High Speed path)
        try {
            if (!groqClient) throw new Error("Groq not configured");

            const chatCompletion = await groqClient.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Original Prompt: "${prompt}"` }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.4,
                max_tokens: 1000
            });

            const optimized = chatCompletion.choices[0]?.message?.content?.trim();
            if (optimized) {
                console.log(`✅ [Pi Dispatcher] Optimized via Groq (${optimized.length} chars)`);
                return res.json({ 
                    success: true, 
                    optimizedPrompt: optimized, 
                    source: 'groq',
                    modelUsed: 'llama-3.3-70b-versatile'
                });
            }
        } catch (groqErr) {
            console.warn("⚠️ [Pi Dispatcher] Groq failed or congested. Checking local fallback...");
        }

        // 3. FALLBACK: Return original with basic cleanup if AI fails
        res.json({ 
            success: true, 
            optimizedPrompt: prompt, 
            source: 'fallback',
            error: 'AI optimization failed, using original' 
        });

    } catch (error) {
        console.error('[Pi Dispatcher] Critical Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== EXTENSION TOKEN STORAGE ====================
const EXTENSION_TOKENS = {
    recaptchaToken: null,
    projectId: null,
    sessionToken: null,
    oauthToken: null,
    lastUpdated: null
};

// Token Pool from Extension
const TOKEN_POOL = [];

// Endpoint: Update token pool from Extension
app.post('/api/update-token-pool', (req, res) => {
    const { tokens, token } = req.body;

    if (!tokens && !token) {
        console.warn(`[Extension] ⚠️ Received empty token update:`, req.body);
        return res.status(400).json({ error: 'Missing tokens or token field' });
    }

    if (tokens && Array.isArray(tokens)) {
        // Replace pool with new tokens
        TOKEN_POOL.length = 0;
        TOKEN_POOL.push(...tokens);
        console.log(`📥 Token pool updated via 'tokens' array: ${TOKEN_POOL.length} tokens`);
    } else if (token) {
        // Handle single token in 'token' field
        TOKEN_POOL.push(token);
        console.log(`📥 Token added to pool via 'token' field (Pool size: ${TOKEN_POOL.length})`);
    }

    res.json({ success: true, poolSize: TOKEN_POOL.length });
});

// Endpoint: Consume tokens from pool (get and remove)
app.post('/api/consume-tokens', (req, res) => {
    const { count = 1 } = req.body;

    if (TOKEN_POOL.length < count) {
        return res.status(400).json({
            error: 'Not enough tokens in pool',
            available: TOKEN_POOL.length,
            requested: count
        });
    }

    // Remove and return tokens from pool
    const consumedTokens = TOKEN_POOL.splice(0, count);

    console.log(`🔥 Consumed ${count} tokens, ${TOKEN_POOL.length} remaining`);

    res.json({
        success: true,
        tokens: consumedTokens,
        remaining: TOKEN_POOL.length
    });
});

// ==================== PENDING TOKEN REQUESTS ====================
const PENDING_REQUESTS = new Map(); // requestId -> {status, token, timestamp}

// Endpoint: Create a pending token request
app.post('/api/genyu/request-fresh-token', (req, res) => {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    PENDING_REQUESTS.set(requestId, {
        status: 'pending',
        token: null,
        timestamp: Date.now()
    });

    console.log(`[Token Request] Created: ${requestId}`);

    res.json({
        success: true,
        requestId: requestId,
        message: 'Extension will generate token shortly'
    });
});

// Endpoint: Extension checks for pending requests
app.get('/api/genyu/check-pending-requests', (req, res) => {
    const pendingIds = [];

    for (const [id, data] of PENDING_REQUESTS.entries()) {
        if (data.status === 'pending') {
            // Only return requests < 30s old
            if (Date.now() - data.timestamp < 30000) {
                pendingIds.push(id);
            } else {
                // Timeout old requests
                PENDING_REQUESTS.delete(id);
            }
        }
    }

    res.json({
        hasPending: pendingIds.length > 0,
        requests: pendingIds
    });
});

// Endpoint: Extension submits fresh token
app.post('/api/genyu/submit-fresh-token', (req, res) => {
    const { requestId, token } = req.body;

    if (!requestId || !token) {
        return res.status(400).json({ error: 'Missing requestId or token' });
    }

    const request = PENDING_REQUESTS.get(requestId);
    if (!request) {
        return res.status(404).json({ error: 'Request not found' });
    }

    request.status = 'completed';
    request.token = token;
    PENDING_REQUESTS.set(requestId, request);

    console.log(`[Token Request] ✅ Completed: ${requestId}, token length: ${token.length}`);

    res.json({ success: true });
});

// Endpoint: Server waits for token
app.get('/api/genyu/wait-for-token/:requestId', async (req, res) => {
    const { requestId } = req.params;
    const maxWaitTime = 15000; // 15 seconds
    const checkInterval = 500; // Check every 500ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const request = PENDING_REQUESTS.get(requestId);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status === 'completed' && request.token) {
            PENDING_REQUESTS.delete(requestId); // Cleanup
            return res.json({
                success: true,
                token: request.token
            });
        }

        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    // Timeout
    PENDING_REQUESTS.delete(requestId);
    res.status(408).json({ error: 'Token generation timeout' });
});

// ==================== EXTENSION TOKEN UPDATE (OLD) ====================
app.post('/api/update-tokens', (req, res) => {
    const received = Object.keys(req.body);
    console.log('[Extension] 📥 Received update-tokens request:', received);

    // Support multiple field names for the captcha token
    const token = req.body.recaptchaToken || req.body.token || req.body.captchaToken;

    if (token) {
        EXTENSION_TOKENS.recaptchaToken = token;
        EXTENSION_TOKENS.lastUpdated = Date.now();
        
        // Also add to pool for consistency
        if (!TOKEN_POOL.includes(token)) {
            TOKEN_POOL.push(token);
        }
        
        console.log(`✅ [Extension] Token updated in memory (${token.length} chars)`);
    }

    if (req.body.projectId) {
        EXTENSION_TOKENS.projectId = req.body.projectId;
    }

    if (req.body.sessionToken) {
        EXTENSION_TOKENS.sessionToken = req.body.sessionToken;
    }

    if (req.body.oauthToken) {
        EXTENSION_TOKENS.oauthToken = req.body.oauthToken;
    }

    res.json({ success: true, message: 'Tokens updated' });
});

// Endpoint: Get token status
app.get('/api/tokens', (req, res) => {
    const tokenAge = EXTENSION_TOKENS.lastUpdated
        ? Math.floor((Date.now() - EXTENSION_TOKENS.lastUpdated) / 1000)
        : null;

    res.json({
        hasRecaptcha: !!EXTENSION_TOKENS.recaptchaToken,
        recaptchaLength: EXTENSION_TOKENS.recaptchaToken?.length || 0,
        projectId: EXTENSION_TOKENS.projectId,
        lastUpdated: EXTENSION_TOKENS.lastUpdated,
        tokenAgeSeconds: tokenAge,
        extensionActive: TOKEN_POOL.length > 0, // Check pool instead of token age
        recaptchaToken: EXTENSION_TOKENS.recaptchaToken,
        sessionToken: EXTENSION_TOKENS.sessionToken,
        oauthToken: EXTENSION_TOKENS.oauthToken,
        // Token Pool
        tokenPool: TOKEN_POOL,
        poolSize: TOKEN_POOL.length
    });
});

// Endpoint: Get fresh reCAPTCHA from Extension Pool
app.get('/api/get-pooled-token', async (req, res) => {
    try {
        // This would need to communicate with Extension
        // For now, return the stored token or null
        if (EXTENSION_TOKENS.recaptchaToken) {
            const token = EXTENSION_TOKENS.recaptchaToken;
            // Clear after use
            EXTENSION_TOKENS.recaptchaToken = null;
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: 'No token available in pool' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// ==================== PUPPETEER AUTO-GENERATE ====================
import { saveCookies, autoGenerate } from './puppeteer-genyu.js';

app.post('/api/save-cookies', saveCookies);
app.post('/api/genyu/auto-generate', autoGenerate);

// ==================== FAL.AI FLUX PROXY ====================
// POST /api/proxy/fal/flux
// Supports: prompt, image_url (sequential reference), face_id_url (character master), aspect_ratio, model
app.post('/api/proxy/fal/flux', async (req, res) => {
    try {
        const { prompt, image_url, face_id_url, aspect_ratio, model = 'fal-ai/flux-general' } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!FAL_KEY) {
            return res.status(500).json({ error: 'FAL_KEY not configured on server' });
        }

        console.log(`[Fal.ai] 🎨 Starting Flux generation with model: ${model}`);
        console.log(`[Fal.ai] Prompt: ${prompt.substring(0, 100)}...`);
        console.log(`[Fal.ai] Has image_url (sequential ref): ${!!image_url}`);
        console.log(`[Fal.ai] Has face_id_url (character master): ${!!face_id_url}`);
        console.log(`[Fal.ai] Aspect ratio: ${aspect_ratio || '16:9'}`);

        // Map aspect ratio to Fal.ai format
        const aspectMap = {
            '16:9': 'landscape_16_9',
            '9:16': 'portrait_16_9',
            '1:1': 'square',
            '4:3': 'landscape_4_3',
            '3:4': 'portrait_4_3',
            '21:9': 'landscape_21_9',
            '9:21': 'portrait_21_9'
        };
        const image_size = aspectMap[aspect_ratio] || 'landscape_16_9';

        // Build the input for the specific model
        const input = {
            prompt: prompt,
            image_size: image_size,
            num_images: 1,
            enable_safety_checker: false,
            output_format: 'jpeg'
        };

        // Handle control/reference images
        if (model.includes('flux-general')) {
            const controlImages = [];
            if (image_url) {
                controlImages.push({ image_url: image_url, control_strength: 0.5 });
            }
            if (face_id_url) {
                controlImages.push({ image_url: face_id_url, control_strength: 0.7 });
            }
            if (controlImages.length > 0) {
                input.control_images = controlImages;
            }
        } else {
            // Standard Flux Pro or other models might use direct image_url parameters
            if (image_url) input.image_url = image_url;
            if (face_id_url) input.face_id_url = face_id_url;
        }

        // Call Fal.ai model
        const result = await fal.subscribe(model, {
            input: input,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === 'IN_PROGRESS') {
                    console.log(`[Fal.ai] 🔄 Progress: ${update.logs?.map(l => l.message).join(', ') || 'generating...'}`);
                }
            }
        });

        console.log(`[Fal.ai] ✅ Generation complete!`);

        // Extract image URL from result
        const imageUrl = result.data?.images?.[0]?.url;
        
        if (!imageUrl) {
            console.error('[Fal.ai] No image in response:', result);
            return res.status(500).json({ error: 'No image generated', details: result });
        }

        console.log(`[Fal.ai] 📸 Image URL: ${imageUrl.substring(0, 60)}...`);

        res.json({
            success: true,
            url: imageUrl,
            imageUrl: imageUrl,
            seed: result.data?.seed,
            timings: result.data?.timings,
            requestId: result.requestId
        });

    } catch (error) {
        console.error('[Fal.ai] ❌ Generation error:', error);
        res.status(500).json({ 
            error: error.message || 'Fal.ai generation failed',
            details: error.body || error
        });
    }
});

// ==================== GOOGLE LABS PROXY ====================
app.post('/api/proxy/genyu/image', async (req, res) => {
    try {
        const { token, recaptchaToken, prompt, aspect } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        const projectId = '62c5b3fe-4cf4-42fe-b1b2-f621903e7e23';
        const apiUrl = `https://aisandbox-pa.googleapis.com/v1/projects/${projectId}/flowMedia:batchGenerateImages`;

        const payload = {
            "clientContext": {
                ...(recaptchaToken && { "recaptchaToken": recaptchaToken }),
                "sessionId": `;${Date.now()}`,
                "projectId": projectId,
                "tool": "PINHOLE"
            },
            "requests": [
                {
                    "clientContext": {
                        ...(recaptchaToken && { "recaptchaToken": recaptchaToken }),
                        "sessionId": `;${Date.now()}`,
                        "projectId": projectId,
                        "tool": "PINHOLE"
                    },
                    "seed": Math.floor(Math.random() * 1000000),
                    "imageModelName": "GEM_PIX_2",
                    "imageAspectRatio": aspect || "IMAGE_ASPECT_RATIO_LANDSCAPE",
                    "prompt": prompt,
                    "imageInputs": []
                }
            ]
        };

        const headers = {
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'origin': 'https://labs.google.com',
            'x-browser-channel': 'stable',
            'x-browser-year': '2025'
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Google Labs API Error:', data);
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GOOGLE VEO VIDEO PROXY ====================
app.post('/api/proxy/google/video/start', async (req, res) => {
    try {
        const { token, recaptchaToken, prompt, mediaId, aspectRatio } = req.body;
        console.log(`[Video] Starting gen... ID: ${mediaId?.substring(0, 10)}`);

        if (!token) return res.status(400).json({ error: 'Token required' });
        if (!mediaId) return res.status(400).json({ error: 'Media ID required for I2V' });

        const projectId = '07c3d6ef-3305-4196-bcc2-7db5294be436'; // Standard for VideoFX
        const apiUrl = `https://aisandbox-pa.googleapis.com/v1/projects/${projectId}/flowMedia:batchGenerateImages`;

        const payload = {
            "clientContext": {
                "recaptchaToken": recaptchaToken,
                "sessionId": `;${Date.now()}`,
                "projectId": projectId,
                "tool": "PINHOLE",
                "userPaygateTier": "PAYGATE_TIER_TWO"
            },
            "requests": [{
                "aspectRatio": aspectRatio || "VIDEO_ASPECT_RATIO_LANDSCAPE",
                "seed": Math.floor(Math.random() * 1000000),
                "textInput": { "prompt": prompt },
                "videoModelKey": "veo_3_1_i2v_s_fast_ultra",
                "startImage": mediaId ? { "mediaId": mediaId } : { "image": { "content": req.body.imageBase64 } },
                // "metadata": { "sceneId": "proxy-request" } // Optional
            }]
        };

        const headers = {
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'origin': 'https://labs.google.com',
            'x-browser-channel': 'stable',
            'x-browser-year': '2025'
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Veo Start Error:', data);
            return res.status(response.status).json(data);
        }

        console.log('[Video] Started OK:', data.requests?.[0]?.operation?.name);
        res.json(data);
    } catch (error) {
        console.error('Video Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/proxy/google/video/status', async (req, res) => {
    try {
        const { token, operations } = req.body;
        if (!token || !operations) return res.status(400).json({ error: 'Invalid payload' });

        // Retrieve status for each operation
        // Labs API uses individual GETs usually, or batchGet if supported.
        // Assuming we iterate or use a batch endpoint if known.
        // Since we don't know the exact batch status endpoint for Veo, 
        // we can try `google.longrunning.Operations.GetOperation` for each.
        // URL: https://aisandbox-pa.googleapis.com/v1/{name}

        const headers = {
            'authorization': `Bearer ${token}`,
            'content-type': 'application/json',
            'origin': 'https://labs.google.com'
        };

        const results = await Promise.all(operations.map(async (op) => {
            const opName = op.operation.name;
            const url = `https://aisandbox-pa.googleapis.com/v1/${opName}`;

            try {
                const r = await fetch(url, { headers });
                const d = await r.json();

                // Map to frontend expected format
                // App.tsx expects: { status: 'MEDIA_GENERATION_STATUS_SUCCEEDED', result: { video: { url: ... } } }
                // Labs usually returns: { name: ..., done: true, response: { result: ... } } OR metadata: { status: ... }

                // Helper to normalize Labs response to our App format
                let status = 'MEDIA_GENERATION_STATUS_ACTIVE';
                let result = null;

                if (d.done) {
                    if (d.error) {
                        status = 'MEDIA_GENERATION_STATUS_FAILED';
                    } else {
                        status = 'MEDIA_GENERATION_STATUS_SUCCEEDED';
                        // Extract video URL
                        // Look inside d.response or d.metadata
                        const media = d.response?.result?.video || d.metadata?.result?.video;
                        /* 
                           Warning: Veo response structure might differ.
                           Commonly: d.response['@type'] ... 
                           Let's dump the whole thing into 'result' so App.tsx can find it.
                        */
                        result = d.response?.result || d.metadata?.result;

                        // If still not found, check top level text/image fields
                        if (!result && d.response) result = d.response;
                    }
                }

                return {
                    sceneId: op.sceneId,
                    status: status,
                    result: result,
                    original: d
                };

            } catch (e) {
                console.error("Status fetch fail:", e);
                return { sceneId: op.sceneId, status: 'MEDIA_GENERATION_STATUS_FAILED' };
            }
        }));

        res.json({ operations: results });

    } catch (error) {
        console.error('Video Status Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== GOMMO AI PROXY ====================
// Generic proxy for Gommo API to avoid CORS issues and handle authentication
app.post(/^\/api\/proxy\/gommo\/(.*)/, async (req, res) => {
    try {
        const path = req.params[0];
        const { domain, access_token, ...rest } = req.body;

        if (!domain || !access_token) {
            return res.status(400).json({ error: 'Domain and Access Token are required' });
        }

        console.log(`[Gommo Proxy] 🚀 Request to: ${path}`);
        
        // AUTO-INJECT TOKEN FROM POOL IF MISSING (for generation)
        const isGen = path.includes('generateImage');
        let injectedToken = null;
        
        if (isGen && !req.body.token) {
            // Check pool first
            if (TOKEN_POOL.length > 0) {
                injectedToken = TOKEN_POOL.shift();
                console.log(`[Gommo Proxy] 🔑 Injected fresh token from pool (Remaining: ${TOKEN_POOL.length})`);
            } 
            // Check if we have a single token
            else if (EXTENSION_TOKENS.recaptchaToken) {
                injectedToken = EXTENSION_TOKENS.recaptchaToken;
                console.log(`[Gommo Proxy] 🔑 Injected token from EXTENSION_TOKENS`);
            } 
            // SMART WAIT: If no token available, try to wait for a few seconds
            // This handles cases where the extension hasn't pushed yet
            else {
                console.log(`[Gommo Proxy] ⌛ Pool empty. Waiting up to 10s for token...`);
                const startTime = Date.now();
                while (Date.now() - startTime < 10000) {
                    if (TOKEN_POOL.length > 0) {
                        injectedToken = TOKEN_POOL.shift();
                        console.log(`[Gommo Proxy] 🔑 Got token after wait!`);
                        break;
                    }
                    if (EXTENSION_TOKENS.recaptchaToken) {
                        injectedToken = EXTENSION_TOKENS.recaptchaToken;
                        console.log(`[Gommo Proxy] 🔑 Got EXTENSION_TOKEN after wait!`);
                        break;
                    }
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }

            if (!injectedToken) {
                console.warn(`[Gommo Proxy] ⚠️ Warning: Generation request missing 'token' and NO TOKENS AVAILABLE after wait!`);
            }
        }

        // STRICT ADHERENCE TO GOMMO DOCS: Use application/x-www-form-urlencoded
        const formData = new URLSearchParams();
        
        // Add basic auth/routing fields
        formData.append('domain', domain);
        formData.append('access_token', access_token);
        if (injectedToken) formData.append('token', injectedToken);

        // Process all other fields from request body
        for (const [key, value] of Object.entries(req.body)) {
            // Skip fields we already handled or that are metadata
            if (key === 'domain' || key === 'access_token' || key === 'token') continue;

            if (value !== null && value !== undefined) {
                if (Array.isArray(value) || typeof value === 'object') {
                    // DOC REQUIREMENT: array/object parameters should be JSON stringified
                    formData.append(key, JSON.stringify(value));
                } else {
                    formData.append(key, String(value));
                }
            }
        }

        const response = await fetch(`https://api.gommo.net/${path}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: formData.toString()
        });

        const data = await response.json();
        
        if (data.error || !response.ok) {
            console.error(`[Gommo Proxy] ❌ API Error (${response.status}) on path ${path}:`, JSON.stringify(data));
        } else {
            console.log(`[Gommo Proxy] ✅ Success on path ${path}`);
        }

        return res.status(response.status).json(data);

    } catch (error) {
        console.error('[Gommo Proxy] ❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== IMAGE FETCH PROXY (CORS BYPASS) ====================
// Fetches an external image and returns it as base64 to avoid browser CORS issues
app.get('/api/proxy/fetch-image', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) return res.status(400).json({ error: 'URL is required' });

        console.log(`[Image Proxy] 📸 Fetching: ${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        const base64 = `data:${blob.type};base64,${buffer.toString('base64')}`;

        res.json({ success: true, base64 });
    } catch (error) {
        console.error('[Image Proxy] ❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PI STRATEGIC DISPATCHER (Intelligence Service) ====================
// This endpoint analyzes the request and optimizes it for the specific model
// PRIORITY: Groq (Fast) -> FALLBACK: Local (if configured/needed)
app.post('/api/proxy/pi/analyze', async (req, res) => {
    try {
        const { prompt, modelId, mode, aspectRatio, isMannequinMode } = req.body;

        if (!prompt || !modelId) {
            return res.status(400).json({ error: 'Prompt and modelId are required' });
        }

        console.log(`🧠 [Pi Dispatcher] Analyzing prompt for model: ${modelId}`);

        // 1. Identify Model Strategy
        const isFlux = modelId.toLowerCase().includes('flux');
        const isZImage = modelId.toLowerCase().includes('z_image') || modelId.toLowerCase().includes('alibaba');
        const isNano = modelId.toLowerCase().includes('banana') || modelId.toLowerCase().includes('3_5') || modelId.toLowerCase().includes('imagen');

        let strategicRules = "";
        if (isFlux) {
            // Flux weakness: "Too clean/plastic". Strategy: Inject heavy texture & grain anchors.
            strategicRules = `
            - CRITICAL: Avoid "plastic" or "too clean" render look.
            - ACTION: Inject realism anchors: 'raw photo', 'analog film grain', 'fujifilm xt4', 'overexposed highlights', 'highly detailed fabric texture', '8k uhd'.
            - STRUCTURE: Descriptive cinematic paragraph.`;
        } else if (isZImage) {
            // Z-Image strength: Physical textures. Strategy: Technical comma-separated keywords.
            strategicRules = `
            - CRITICAL: Emphasize physical material details.
            - ACTION: Use technical tags: 'weathered wood grain', 'suede fabric texture', 'matte resin', 'soft shadows', 'raytraced lighting'.
            - STRUCTURE: Comma-separated keyword string.`;
        } else if (isNano) {
            // Nano strength: Photorealism. Strategy: Photography specs.
            strategicRules = `
            - CRITICAL: Maximize photorealistic output.
            - ACTION: Focus on camera specs: 'ARRI Alexa 35', '35mm lens', 'T1.8 aperture', 'volumetric lighting', 'cinematic color grading'.
            - STRUCTURE: Concise, photography-first description.`;
        }

        if (isMannequinMode || prompt.toUpperCase().includes('MANNEQUIN')) {
            strategicRules += `
            - SPECIAL: Faceless Mannequin Protocol ACTIVE.
            - ACTION: Enforce 'matte white resin material', 'smooth humanoid shape', 'ABSOLUTELY NO EYES', 'featureless face'.`;
        }

        const systemPrompt = `You are Itera's Strategic AI Advisor (Pi). 
        Your task is to REWRITE and OPTIMIZE the user's prompt for the ${modelId} image model to ensure maximum realism and material depth.
        
        STRATEGIC RULES FOR THIS REQUEST:
        ${strategicRules}
        
        - Preserve the user's core subject and intent.
        - Translate to English if the input is Vietnamese.
        - Output ONLY the optimized prompt. No conversation.`;

        // 2. TRY GROQ FIRST (High Speed path)
        try {
            if (!groqClient) throw new Error("Groq not configured");

            const chatCompletion = await groqClient.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Original Prompt: "${prompt}"` }
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.4,
                max_tokens: 1000
            });

            const optimized = chatCompletion.choices[0]?.message?.content?.trim();
            if (optimized) {
                console.log(`✅ [Pi Dispatcher] Optimized via Groq (${optimized.length} chars)`);
                return res.json({ 
                    success: true, 
                    optimizedPrompt: optimized, 
                    source: 'groq',
                    modelUsed: 'llama-3.3-70b-versatile'
                });
            }
        } catch (groqErr) {
            console.warn("⚠️ [Pi Dispatcher] Groq failed or congested. Checking local fallback...");
        }

        // 3. FALLBACK: Return original with basic cleanup if AI fails
        res.json({ 
            success: true, 
            optimizedPrompt: prompt, 
            source: 'fallback',
            error: 'AI optimization failed, using original' 
        });

    } catch (error) {
        console.error('[Pi Dispatcher] Critical Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== INTELLIGENCE MODULE ====================
// Video processing for source finding

import multer from 'multer';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for video uploads
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync('./uploads/frames')) fs.mkdirSync('./uploads/frames', { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});
const upload = multer({ 
    storage, 
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) cb(null, true);
        else cb(new Error('Only video files allowed'));
    }
});

// POST /api/intelligence/process-video
// Uploads video, runs FFmpeg scene detection, extracts frames
app.post('/api/intelligence/process-video', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file uploaded' });
        }

        const videoPath = req.file.path;
        const threshold = parseFloat(req.body.threshold) || 0.3;
        const minDuration = parseFloat(req.body.minDuration) || 1.0;
        const projectId = uuidv4();
        const framesDir = `./uploads/frames/${projectId}`;
        
        fs.mkdirSync(framesDir, { recursive: true });

        console.log(`🎬 [Intelligence] Processing video: ${req.file.originalname}`);
        console.log(`   Threshold: ${threshold}, Min Duration: ${minDuration}s`);

        // Step 1: Get video duration
        const duration = await new Promise((resolve, reject) => {
            const ffprobe = spawn('ffprobe', [
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'csv=p=0',
                videoPath
            ]);
            
            let output = '';
            ffprobe.stdout.on('data', (data) => output += data.toString());
            ffprobe.on('close', (code) => {
                if (code === 0) resolve(parseFloat(output.trim()));
                else reject(new Error('Failed to get video duration'));
            });
        });

        console.log(`   Duration: ${duration}s`);

        // Step 2: Detect scenes using FFmpeg scene filter
        const sceneTimestamps = await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-i', videoPath,
                '-vf', `select='gt(scene,${threshold})',showinfo`,
                '-f', 'null',
                '-'
            ]);

            let stderr = '';
            ffmpeg.stderr.on('data', (data) => stderr += data.toString());
            
            ffmpeg.on('close', (code) => {
                // Parse scene detection output
                const timestamps = [0]; // Always start with 0
                const regex = /pts_time:([0-9.]+)/g;
                let match;
                
                while ((match = regex.exec(stderr)) !== null) {
                    const time = parseFloat(match[1]);
                    const lastTime = timestamps[timestamps.length - 1];
                    
                    // Only add if gap is >= minDuration
                    if (time - lastTime >= minDuration) {
                        timestamps.push(time);
                    }
                }
                
                // Add video end
                timestamps.push(duration);
                resolve(timestamps);
            });
        });

        console.log(`   Detected ${sceneTimestamps.length - 1} scene changes`);

        // Step 3: Extract representative frame for each scene
        const scenes = [];
        
        for (let i = 0; i < sceneTimestamps.length - 1; i++) {
            const startTime = sceneTimestamps[i];
            const endTime = sceneTimestamps[i + 1];
            const midTime = startTime + (endTime - startTime) / 2; // Get middle frame
            const framePath = path.join(framesDir, `scene_${i.toString().padStart(3, '0')}.jpg`);

            await new Promise((resolve, reject) => {
                const ffmpeg = spawn('ffmpeg', [
                    '-ss', midTime.toString(),
                    '-i', videoPath,
                    '-vframes', '1',
                    '-q:v', '2',
                    '-y',
                    framePath
                ]);
                
                ffmpeg.on('close', (code) => {
                    if (code === 0) resolve();
                    else reject(new Error(`Failed to extract frame ${i}`));
                });
            });

            // Read frame as base64
            const frameBuffer = fs.readFileSync(framePath);
            const thumbnailBase64 = `data:image/jpeg;base64,${frameBuffer.toString('base64')}`;

            scenes.push({
                index: i,
                thumbnailPath: framePath,
                thumbnailBase64,
                startTime,
                endTime,
                duration: endTime - startTime
            });
        }

        console.log(`✅ [Intelligence] Extracted ${scenes.length} scene frames`);

        res.json({
            success: true,
            projectId,
            videoPath,
            duration,
            scenes
        });

    } catch (error) {
        console.error('[Intelligence] Process video error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/intelligence/analyze-frame
// Uses Groq Vision to analyze a frame and extract description
app.post('/api/intelligence/analyze-frame', async (req, res) => {
    try {
        if (!groqClient) {
            return res.status(500).json({ error: 'Groq client not configured' });
        }

        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Image base64 required' });
        }

        console.log(`👁️ [Intelligence] Analyzing frame with Groq Vision`);

        const prompt = `Analyze this video frame and provide:
1. A detailed description of the scene (2-3 sentences)
2. Any recognizable characters, actors, or people (list names if identifiable from movies/shows)
3. Location/setting (e.g., "office interior", "beach sunset", "New York street")
4. The main action or emotion captured
5. If recognizable, the likely source movie/TV show/video

Respond in this exact JSON format:
{
    "description": "detailed scene description",
    "characters": ["character or actor name 1", "character 2"],
    "locations": ["location description"],
    "actions": ["main action happening"],
    "mood": "emotional tone",
    "possibleSource": "movie/show name if recognizable, or null"
}`;

        const response = await groqClient.chat.completions.create({
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageBase64 } }
                    ]
                }
            ],
            model: 'llama-3.2-11b-vision-preview',
            temperature: 0.3,
            max_tokens: 1000
        });

        const responseText = response.choices[0]?.message?.content || '{}';
        
        // Try to parse JSON from response
        let parsed = {};
        try {
            // Extract JSON from response (might have markdown code blocks)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('[Intelligence] Failed to parse JSON, using raw text');
            parsed = { description: responseText };
        }

        console.log(`✅ [Intelligence] Frame analyzed: ${parsed.description?.substring(0, 50)}...`);

        res.json({
            success: true,
            ...parsed
        });

    } catch (error) {
        console.error('[Intelligence] Analyze frame error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/intelligence/find-source
// Uses Perplexity API to find original source based on description
app.post('/api/intelligence/find-source', async (req, res) => {
    try {
        const { description, characters, locations, possibleSource } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description required' });
        }

        // Perplexity API configuration
        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
        const PERPLEXITY_MODEL = 'sonar'; // Using sonar model for web search

        console.log(`🔍 [Intelligence] Finding source for scene`);

        // Build search query
        let searchQuery = description;
        if (characters?.length) {
            searchQuery += ` featuring ${characters.join(', ')}`;
        }
        if (locations?.length) {
            searchQuery += ` at ${locations.join(', ')}`;
        }
        if (possibleSource) {
            searchQuery += ` from "${possibleSource}"`;
        }

        const prompt = `Find the original source video/movie/TV show for this scene:

Scene description: ${description}
${characters?.length ? `Characters/Actors: ${characters.join(', ')}` : ''}
${locations?.length ? `Location: ${locations.join(', ')}` : ''}
${possibleSource ? `Possibly from: ${possibleSource}` : ''}

Search for the original source and provide:
1. The exact title of the movie/TV show/video
2. A URL to watch or find this content (YouTube, IMDb, streaming service)
3. The approximate timecode if known
4. Your confidence level (0-100)

Respond in this exact JSON format only:
{
    "title": "Movie/Show Title (Year)",
    "url": "https://...",
    "timecode": "HH:MM:SS or 'unknown'",
    "confidence": 85,
    "source_type": "movie|tv_show|youtube|other"
}`;

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: PERPLEXITY_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a video source identification expert. Find the original source of video scenes based on descriptions. Always respond with valid JSON only.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.2,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('[Intelligence] Perplexity API error:', errorData);
            throw new Error(`Perplexity API error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices?.[0]?.message?.content || '{}';

        // Parse JSON response
        let parsed = {};
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            console.warn('[Intelligence] Failed to parse Perplexity JSON');
            parsed = { title: 'Unknown', confidence: 0 };
        }

        console.log(`✅ [Intelligence] Source found: ${parsed.title} (${parsed.confidence}% confidence)`);

        res.json({
            success: true,
            title: parsed.title,
            url: parsed.url,
            timecode: parsed.timecode,
            confidence: parsed.confidence,
            sourceType: parsed.source_type
        });

    } catch (error) {
        console.error('[Intelligence] Find source error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/proxy/perplexity - Generic Perplexity proxy for other uses
app.post('/api/proxy/perplexity', async (req, res) => {
    try {
        const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
        
        const { messages, model = 'sonar', temperature = 0.7, max_tokens = 1000 } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array required' });
        }

        console.log(`🔮 [Perplexity] Proxy request with model: ${model}`);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        res.json({
            success: true,
            text: data.choices?.[0]?.message?.content || '',
            usage: data.usage
        });

    } catch (error) {
        console.error('[Perplexity] Proxy error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== VIDEO SOURCING MODULE ====================
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import ExcelJS from 'exceljs';

const execAsync = promisify(execCallback);

// Configure multer for sourcing video uploads
const SOURCING_UPLOADS_DIR = path.join(process.cwd(), 'sourcing_uploads');
const SOURCING_OUTPUTS_DIR = path.join(process.cwd(), 'sourcing_outputs');

// Ensure directories exist
if (!fs.existsSync(SOURCING_UPLOADS_DIR)) fs.mkdirSync(SOURCING_UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(SOURCING_OUTPUTS_DIR)) fs.mkdirSync(SOURCING_OUTPUTS_DIR, { recursive: true });

const sourcingStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const projectDir = path.join(SOURCING_UPLOADS_DIR, req.body.projectId || 'default');
        if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });
        cb(null, projectDir);
    },
    filename: (req, file, cb) => {
        cb(null, `source_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const sourcingUpload = multer({ 
    storage: sourcingStorage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'), false);
        }
    }
});

// Upload video endpoint
app.post('/api/sourcing/upload', sourcingUpload.single('video'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }
        
        console.log(`📤 [Sourcing] Video uploaded: ${req.file.path}`);
        
        res.json({
            success: true,
            videoPath: req.file.path,
            filename: req.file.filename,
            size: req.file.size
        });
    } catch (error) {
        console.error('[Sourcing] Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Scene detection using FFmpeg
app.post('/api/sourcing/detect-scenes', async (req, res) => {
    try {
        const { projectId, videoPath } = req.body;
        
        if (!videoPath || !fs.existsSync(videoPath)) {
            return res.status(400).json({ error: 'Invalid video path' });
        }

        console.log(`🎬 [Sourcing] Detecting scenes in: ${videoPath}`);

        // Use FFmpeg scene detection filter
        // Threshold 0.3 is a good balance between detecting too many and too few scenes
        const ffmpegCmd = `ffmpeg -i "${videoPath}" -filter:v "select='gt(scene,0.3)',showinfo" -f null - 2>&1`;
        
        const { stdout, stderr } = await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });
        const output = stdout + stderr;

        // Parse scene timestamps from FFmpeg output
        const scenes = [];
        const regex = /pts_time:([0-9.]+)/g;
        let match;
        let prevTime = 0;

        while ((match = regex.exec(output)) !== null) {
            const time = parseFloat(match[1]);
            if (time > prevTime) {
                scenes.push({
                    index: scenes.length,
                    startTime: prevTime,
                    endTime: time,
                    duration: time - prevTime
                });
                prevTime = time;
            }
        }

        // Get video duration for the last scene
        const durationMatch = output.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
            const totalDuration = 
                parseInt(durationMatch[1]) * 3600 + 
                parseInt(durationMatch[2]) * 60 + 
                parseFloat(durationMatch[3]);
            
            if (prevTime < totalDuration) {
                scenes.push({
                    index: scenes.length,
                    startTime: prevTime,
                    endTime: totalDuration,
                    duration: totalDuration - prevTime
                });
            }
        }

        // If no scenes detected, create one scene for entire video
        if (scenes.length === 0) {
            const durationCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
            const { stdout: durationOut } = await execAsync(durationCmd);
            const duration = parseFloat(durationOut.trim());
            scenes.push({
                index: 0,
                startTime: 0,
                endTime: duration,
                duration: duration
            });
        }

        console.log(`✅ [Sourcing] Detected ${scenes.length} scenes`);

        res.json({
            success: true,
            scenes,
            totalScenes: scenes.length
        });

    } catch (error) {
        console.error('[Sourcing] Scene detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Split video and capture frames
app.post('/api/sourcing/split-and-capture', async (req, res) => {
    try {
        const { projectId, videoPath, scenes } = req.body;

        if (!videoPath || !scenes || !Array.isArray(scenes)) {
            return res.status(400).json({ error: 'Invalid request data' });
        }

        const outputDir = path.join(SOURCING_OUTPUTS_DIR, projectId);
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        console.log(`✂️ [Sourcing] Splitting ${scenes.length} scenes...`);

        const footages = [];

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const padded = String(i + 1).padStart(3, '0');
            const clipName = `F${padded}.mp4`;
            const thumbName = `F${padded}.jpg`;
            const clipPath = path.join(outputDir, clipName);
            const thumbPath = path.join(outputDir, thumbName);

            // Split clip using FFmpeg
            const duration = scene.endTime - scene.startTime;
            const splitCmd = `ffmpeg -y -ss ${scene.startTime} -i "${videoPath}" -t ${duration} -c copy "${clipPath}"`;
            
            try {
                await execAsync(splitCmd, { maxBuffer: 50 * 1024 * 1024 });
            } catch (splitErr) {
                // If stream copy fails, try re-encoding
                const reencodeCmd = `ffmpeg -y -ss ${scene.startTime} -i "${videoPath}" -t ${duration} -c:v libx264 -c:a aac "${clipPath}"`;
                await execAsync(reencodeCmd, { maxBuffer: 50 * 1024 * 1024 });
            }

            // Extract middle frame as thumbnail
            const midTime = duration / 2;
            const thumbCmd = `ffmpeg -y -ss ${midTime} -i "${clipPath}" -vframes 1 -q:v 2 "${thumbPath}"`;
            await execAsync(thumbCmd, { maxBuffer: 10 * 1024 * 1024 });

            // Read thumbnail as base64
            let thumbnailBase64 = '';
            if (fs.existsSync(thumbPath)) {
                const thumbBuffer = fs.readFileSync(thumbPath);
                thumbnailBase64 = `data:image/jpeg;base64,${thumbBuffer.toString('base64')}`;
            }

            footages.push({
                filename: clipName,
                videoPath: clipPath,
                thumbnailPath: thumbPath,
                thumbnailBase64,
                duration
            });

            console.log(`   ✅ Created ${clipName} (${duration.toFixed(1)}s)`);
        }

        console.log(`✅ [Sourcing] Split complete: ${footages.length} clips`);

        res.json({
            success: true,
            footages,
            outputDir
        });

    } catch (error) {
        console.error('[Sourcing] Split error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Export to Excel with embedded images
app.post('/api/sourcing/export-excel', async (req, res) => {
    try {
        const { projectName, footages } = req.body;

        if (!footages || !Array.isArray(footages)) {
            return res.status(400).json({ error: 'Invalid footages data' });
        }

        console.log(`📊 [Sourcing] Generating Excel for ${footages.length} items...`);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'ITERA Studio';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('Sourcing Report', {
            views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
        });

        // Define columns
        sheet.columns = [
            { header: 'STT', key: 'stt', width: 8 },
            { header: 'Image', key: 'image', width: 20 },
            { header: 'Source URL', key: 'sourceUrl', width: 50 },
            { header: 'Start', key: 'sourceStart', width: 12 },
            { header: 'End', key: 'sourceEnd', width: 12 },
            { header: 'Note', key: 'note', width: 40 }
        ];

        // Style header row
        const headerRow = sheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2D3748' }
        };
        headerRow.height = 30;
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data rows with images
        for (let i = 0; i < footages.length; i++) {
            const footage = footages[i];
            const rowNum = i + 2;

            // Set row height for image
            const row = sheet.getRow(rowNum);
            row.height = 60;

            // Add data
            row.getCell('stt').value = i + 1;
            row.getCell('sourceUrl').value = footage.sourceUrl || '';
            row.getCell('sourceStart').value = footage.sourceStart || '';
            row.getCell('sourceEnd').value = footage.sourceEnd || '';
            row.getCell('note').value = footage.note || '';

            // Style cells
            row.alignment = { vertical: 'middle', wrapText: true };
            row.getCell('stt').alignment = { vertical: 'middle', horizontal: 'center' };

            // Add image if available
            if (footage.thumbnailBase64) {
                try {
                    // Extract base64 data
                    const base64Data = footage.thumbnailBase64.replace(/^data:image\/\w+;base64,/, '');
                    
                    const imageId = workbook.addImage({
                        base64: base64Data,
                        extension: 'jpeg'
                    });

                    sheet.addImage(imageId, {
                        tl: { col: 1, row: rowNum - 1 },
                        ext: { width: 120, height: 68 }
                    });
                } catch (imgErr) {
                    console.warn(`[Excel] Failed to embed image for row ${rowNum}:`, imgErr.message);
                }
            }

            // Alternate row colors
            if (i % 2 === 1) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF7FAFC' }
                };
            }
        }

        // Add borders
        sheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        console.log(`✅ [Sourcing] Excel generated successfully`);

        // Send as downloadable file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${projectName || 'sourcing'}_report.xlsx"`);
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error('[Sourcing] Excel export error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Cleanup endpoint
app.delete('/api/sourcing/cleanup/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const uploadDir = path.join(UPLOADS_DIR, projectId);
        const outputDir = path.join(OUTPUTS_DIR, projectId);

        if (fs.existsSync(uploadDir)) {
            fs.rmSync(uploadDir, { recursive: true, force: true });
        }
        if (fs.existsSync(outputDir)) {
            fs.rmSync(outputDir, { recursive: true, force: true });
        }

        console.log(`🗑️ [Sourcing] Cleaned up project: ${projectId}`);
        res.json({ success: true });

    } catch (error) {
        console.error('[Sourcing] Cleanup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== SERVER START ====================
const PORT = process.env.PORT || 3001;

// SERVE FRONTEND (in production)
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    // SPA Routing
    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`✅ [Static] Serving frontend from ${distPath}`);
} else {
    console.warn(`⚠️ [Static] Frontend 'dist' folder not found at ${distPath}. Server will only run API.`);
}

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 Fresh token request endpoint ready`);
    console.log(`🧠 Intelligence module ready (FFmpeg + Groq Vision + Perplexity)`);
});

server.setTimeout(300000);
