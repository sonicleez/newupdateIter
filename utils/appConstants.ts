/**
 * Application Constants
 * Centralized configuration for styles, camera settings, and defaults
 */

import type { ProjectState, Character, CharacterProp } from '../types';

// --- App Metadata ---
export const APP_NAME = "Khung Ứng Dụng";
export const PRIMARY_GRADIENT = "from-orange-600 to-red-600";
export const PRIMARY_GRADIENT_HOVER = "from-orange-500 to-red-500";

// --- Helper Functions ---
export const slugify = (text: string): string => {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
};

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// --- DEFINED GLOBAL STYLES ---
export const GLOBAL_STYLES = [
    {
        value: 'cinematic-realistic',
        label: 'Cinematic Realistic (Phim điện ảnh)',
        prompt: 'Cinematic movie screengrab, shot on Arri Alexa, photorealistic, 8k, highly detailed texture, dramatic lighting, shallow depth of field, color graded, film grain.'
    },
    {
        value: '3d-pixar',
        label: '3D Animation (Pixar/Disney)',
        prompt: '3D render style, Pixar animation style, octane render, unreal engine 5, cute, vibrant lighting, soft smooth textures, expressive, volumetric lighting, masterpiece.'
    },
    {
        value: 'anime-makoto',
        label: 'Anime (Makoto Shinkai Style)',
        prompt: 'Anime style, Makoto Shinkai art style, high quality 2D animation, beautiful sky, detailed background, vibrant colors, emotional atmosphere, cell shading.'
    },
    {
        value: 'vintage-film',
        label: 'Vintage 1980s Film (Retro)',
        prompt: '1980s vintage movie look, film grain, retro aesthetic, warm tones, soft focus, kodak portra 400, nostalgia atmosphere.'
    },
    {
        value: 'cyberpunk',
        label: 'Cyberpunk / Sci-Fi',
        prompt: 'Cyberpunk aesthetic, neon lighting, dark atmosphere, futuristic, high contrast, wet streets, technological details, blade runner style.'
    },
    {
        value: 'watercolor',
        label: 'Watercolor / Artistic',
        prompt: 'Watercolor painting style, soft edges, artistic, painterly, dreamy atmosphere, paper texture, pastel colors.'
    },
    {
        value: 'dark-fantasy',
        label: 'Dark Fantasy (Game Style)',
        prompt: 'Dark fantasy art, elden ring style, gritty, atmospheric, ominous lighting, detailed armor and textures, epic scale, oil painting aesthetic.'
    }
];

// ========== CINEMATOGRAPHY OPTIONS ==========
export const CAMERA_MODELS = [
    { value: '', label: 'Auto (AI chọn)', prompt: '' },
    { value: 'arri-alexa-35', label: 'ARRI Alexa 35', prompt: 'Shot on ARRI Alexa 35, rich cinematic colors, natural skin tones, wide dynamic range' },
    { value: 'red-v-raptor', label: 'RED V-Raptor', prompt: 'Shot on RED V-Raptor 8K, high contrast, razor sharp details, vivid colors' },
    { value: 'sony-venice-2', label: 'Sony Venice 2', prompt: 'Shot on Sony Venice 2, natural color science, beautiful skin tones, filmic look' },
    { value: 'blackmagic-ursa', label: 'Blackmagic URSA', prompt: 'Shot on Blackmagic URSA, organic film-like texture, Blackmagic color science' },
    { value: 'canon-c70', label: 'Canon C70', prompt: 'Shot on Canon C70, documentary style, natural colors, versatile look' },
    { value: 'panasonic-s1h', label: 'Panasonic S1H', prompt: 'Shot on Panasonic S1H, natural tones, subtle film grain, professional video look' },
];

export const LENS_OPTIONS = [
    { value: '', label: 'Auto (AI chọn)', prompt: '', useCase: 'AI decides based on scene' },
    { value: '16mm', label: '16mm Ultra Wide', prompt: '16mm ultra wide angle lens, expansive field of view, dramatic perspective', useCase: 'Epic landscapes, architecture' },
    { value: '24mm', label: '24mm Wide', prompt: '24mm wide angle lens, environmental context, slight distortion', useCase: 'Establishing shots, interiors' },
    { value: '35mm', label: '35mm Standard Wide', prompt: '35mm lens, natural perspective, slight wide angle', useCase: 'Walking shots, dialogue scenes' },
    { value: '50mm', label: '50mm Standard', prompt: '50mm lens, natural human perspective, minimal distortion', useCase: 'Dialogue, interviews, portraits' },
    { value: '85mm', label: '85mm Portrait', prompt: '85mm portrait lens, shallow depth of field, beautiful bokeh, flattering compression', useCase: 'Close-ups, beauty shots' },
    { value: '135mm', label: '135mm Telephoto', prompt: '135mm telephoto lens, compressed background, intimate feel, creamy bokeh', useCase: 'Emotional moments, isolation' },
    { value: '200mm', label: '200mm Long Tele', prompt: '200mm telephoto lens, extreme background compression, voyeuristic feel', useCase: 'Surveillance, nature' },
    { value: 'anamorphic', label: 'Anamorphic 2.39:1', prompt: 'anamorphic lens, horizontal lens flares, oval bokeh, cinematic widescreen 2.39:1 aspect ratio', useCase: 'Cinematic epic look' },
    { value: 'macro', label: 'Macro Lens', prompt: 'macro lens, extreme close-up, sharp details, shallow depth of field', useCase: 'Product details, textures' },
];

export const CAMERA_ANGLES = [
    { value: '', label: 'Auto (AI chọn)' },
    { value: 'wide-shot', label: 'Wide Shot (WS)' },
    { value: 'medium-shot', label: 'Medium Shot (MS)' },
    { value: 'close-up', label: 'Close-Up (CU)' },
    { value: 'extreme-cu', label: 'Extreme Close-Up (ECU)' },
    { value: 'ots', label: 'Over-the-Shoulder (OTS)' },
    { value: 'low-angle', label: 'Low Angle (Hero Shot)' },
    { value: 'high-angle', label: 'High Angle (Vulnerable)' },
    { value: 'dutch-angle', label: 'Dutch Angle (Tension)' },
    { value: 'pov', label: 'POV (First Person)' },
    { value: 'establishing', label: 'Establishing Shot' },
    { value: 'two-shot', label: 'Two Shot' },
    { value: 'insert', label: 'Insert / Detail Shot' },
];

export const DEFAULT_META_TOKENS: Record<string, string> = {
    'film': 'cinematic lighting, depth of field, film grain, anamorphic lens flare, color graded, atmospheric haze',
    'documentary': 'natural light, handheld camera feel, raw authentic look, observational style, candid moments',
    'commercial': 'product hero lighting, clean studio aesthetics, vibrant colors, high production value, aspirational mood',
    'music-video': 'dramatic lighting, high contrast, stylized color palette, dynamic angles, music video aesthetic',
    'custom': 'professional photography, detailed textures, balanced composition, thoughtful lighting'
};

export const TRANSITION_TYPES = [
    { value: '', label: 'Auto', hint: 'AI decides transition' },
    { value: 'cut', label: 'Cut', hint: 'Direct cut - instant change' },
    { value: 'match-cut', label: 'Match Cut', hint: 'Visual similarity between scenes' },
    { value: 'dissolve', label: 'Dissolve', hint: 'Gradual blend between scenes' },
    { value: 'fade-black', label: 'Fade to Black', hint: 'Scene ends with black' },
    { value: 'fade-white', label: 'Fade to White', hint: 'Scene ends with white' },
    { value: 'wipe', label: 'Wipe', hint: 'Directional reveal' },
    { value: 'jump-cut', label: 'Jump Cut', hint: 'Jarring time skip' },
    { value: 'smash-cut', label: 'Smash Cut', hint: 'Sudden dramatic contrast' },
    { value: 'l-cut', label: 'L-Cut', hint: 'Audio continues over next scene' },
    { value: 'j-cut', label: 'J-Cut', hint: 'Audio precedes visual' },
];

export const IMAGE_PROVIDERS = [
    { value: 'gemini', label: 'Gemini (Google AI Studio)', description: 'Direct API - requires Gemini API key' },
    { value: 'gommo', label: 'Gommo AI', description: 'Proxy API - requires Gommo credentials' },
    { value: 'fal', label: 'Fal.ai (Flux.1)', description: 'Fast and high quality open-source models' },
];

// IMAGE_MODELS - Reorganized by Provider with Colors (Real-time from Gommo API)
export const IMAGE_MODELS = [
    // ═══════════════════════════════════════════════════════════════════════════
    // 👑 IMPERIAL ULTRA - Premium Gemini 3 Access
    // ═══════════════════════════════════════════════════════════════════════════
    { value: '__header_imperial__', label: '─── 👑 IMPERIAL ULTRA ───', provider: 'imperial', isHeader: true, color: 'cyan' },
    { value: 'gemini-3-pro-image', label: '👑 Imperial Pro Image (Best)', provider: 'imperial', description: 'Gemini 3 Pro - Premium Quality', supportsEdit: true, supportsSubject: true, color: 'cyan' },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🔵 GOOGLE / GEMINI - Direct API
    // ═══════════════════════════════════════════════════════════════════════════
    { value: '__header_google__', label: '─── 🔵 GOOGLE / GEMINI ───', provider: 'google', isHeader: true, color: 'blue' },
    { value: 'gemini-3-pro-image-preview', label: '🔵 Nano Banana Pro (Direct)', provider: 'gemini', description: 'Gemini Direct - Highest intelligence', supportsEdit: true, supportsSubject: true, color: 'blue' },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🚀 FAL.AI - High-End Flux Models
    // ═══════════════════════════════════════════════════════════════════════════
    { value: '__header_fal__', label: '─── 🚀 FAL.AI (FLUX) ───', provider: 'fal', isHeader: true, color: 'purple' },
    { value: 'fal-ai/flux-general', label: '🚀 Flux.1 [Dev] Consistency', provider: 'fal', description: 'Fal.ai - Character Master', supportsEdit: true, supportsSubject: true, color: 'purple' },
    { value: 'fal-ai/flux-pro/v1.1-ultra', label: '🚀 Flux.1.1 Ultra', provider: 'fal', description: 'Fal.ai - 4K High Detail', supportsEdit: true, supportsSubject: true, color: 'purple' },
    { value: 'fal-ai/flux-pro/v1.1', label: '🚀 Flux.1.1 Pro', provider: 'fal', description: 'Fal.ai - Balanced Quality', supportsEdit: true, supportsSubject: true, color: 'purple' },
    { value: 'fal-ai/flux/schnell', label: '🚀 Flux Schnell (Fast)', provider: 'fal', description: 'Fal.ai - Instant Generation', supportsEdit: true, supportsSubject: true, color: 'purple' },

    // ═══════════════════════════════════════════════════════════════════════════
    // 🟡 GOMMO PROXY - Multi-Provider Hub
    // ═══════════════════════════════════════════════════════════════════════════
    { value: '__header_gommo__', label: '─── 🟡 GOMMO PROXY ───', provider: 'gommo', isHeader: true, color: 'yellow' },

    // Google via Gommo
    { value: 'google_image_gen_banana_pro', label: '🟡 Nano Banana Pro (4K)', provider: 'gommo', description: 'High Quality - 250 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'google_image_gen_banana_pro_reason', label: '🟡 Nano Banana Pro Reason', provider: 'gommo', description: 'AI Reasoning - 150 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'google_image_gen_4_5', label: '🟡 Imagen 4.5 (Fast)', provider: 'gommo', description: 'Smart & Fast - 70 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'google_image_gen_3_5', label: '🟡 Imagen 4 (Realism)', provider: 'gommo', description: 'Best Realism - 50 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'google_image_gen_banana', label: '🟡 Nano Banana (Edit)', provider: 'gommo', description: 'Best for Edit - 150 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'google_image_gen_banana_pro_cheap', label: '🟡 Nano Banana Pro Cheap', provider: 'gommo', description: 'Backup - 150 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },

    // ByteDance
    { value: 'seedream_4_5', label: '🟡 Seedream 4.5', provider: 'gommo', description: 'ByteDance 4K - 250 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'seedream_4_0', label: '🟡 Seedream 4.0 (Edit)', provider: 'gommo', description: 'Best for Edit - 200 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'dreamina_3_1', label: '🟡 Dreamina 3.1', provider: 'gommo', description: 'ByteDance - 150 credits', supportsEdit: true, supportsSubject: false, color: 'yellow' },

    // Kling AI
    { value: 'o1', label: '🟡 IMAGE O1 - Kling', provider: 'gommo', description: 'Consistency - 150 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'kling_colors_2_0', label: '🟡 COLORS 2.0', provider: 'gommo', description: 'Kling AI - 100 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'kling_colors_2_1', label: '🟡 COLORS 2.1', provider: 'gommo', description: 'Kling AI - 100 credits', supportsEdit: true, supportsSubject: false, color: 'yellow' },
    { value: 'kling_colors_1_5', label: '🟡 COLORS 1.5 (Face)', provider: 'gommo', description: 'Face Focus - 100 credits', supportsEdit: true, supportsSubject: false, color: 'yellow' },

    // Others
    { value: 'z_image', label: '🟡 Z-Image Realism', provider: 'gommo', description: 'Alibaba Wanx - 100 credits', supportsEdit: true, supportsSubject: false, color: 'yellow' },
    { value: 'hailuo_image_1', label: '🟡 Image-01 (Hailuo)', provider: 'gommo', description: 'High Detail - 50 credits', supportsEdit: true, supportsSubject: true, color: 'yellow' },
    { value: 'midjourney_7_0', label: '🟡 Midjourney 7.0', provider: 'gommo', description: '4 images/req - 400 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'midjourney_6_1', label: '🟡 Midjourney 6.1', provider: 'gommo', description: '300 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'ideogram_v3', label: '🟡 Ideogram V3', provider: 'gommo', description: 'Best for Text - 150 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'ideogram_v2_turbo', label: '🟡 Ideogram V2 Turbo', provider: 'gommo', description: '100 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'recraft_v3', label: '🟡 Recraft V3', provider: 'gommo', description: 'Vector Art - 150 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'flux_1_1_ultra', label: '🟡 FLUX 1.1 Ultra (Gommo)', provider: 'gommo', description: '200 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'flux_1_1_pro', label: '🟡 FLUX 1.1 Pro (Gommo)', provider: 'gommo', description: '150 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'flux_dev', label: '🟡 FLUX Dev (Gommo)', provider: 'gommo', description: '50 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'flux_schnell', label: '🟡 FLUX Schnell (Gommo)', provider: 'gommo', description: 'FREE', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'sd_3_5_large', label: '🟡 SD 3.5 Large', provider: 'gommo', description: 'Stability AI - 100 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'sd_3_5_medium', label: '🟡 SD 3.5 Medium', provider: 'gommo', description: '50 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'dalle_3', label: '🟡 DALL-E 3', provider: 'gommo', description: 'OpenAI - 200 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'playground_v3', label: '🟡 Playground V3', provider: 'gommo', description: 'Creative - 100 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
];

// CHARACTER_MODELS - Models for character/lora generation
// Fixed to include all models that support consistency
export const CHARACTER_MODELS = [
    // Imperial Ultra (Premium)
    { value: 'gemini-3-pro-image', label: '👑 Imperial Pro Image', provider: 'imperial', supportsLora: true },

    // Fal.ai Flux (Recommended)
    { value: 'fal-ai/flux-general', label: '🚀 Flux.1 [Dev] Consistency', provider: 'fal', supportsLora: true },
    { value: 'fal-ai/flux-pro/v1.1-ultra', label: '🚀 Flux.1.1 Ultra', provider: 'fal', supportsLora: true },

    // Google/Gemini Direct
    { value: 'gemini-3-pro-image-preview', label: '🔵 Nano Banana Pro', provider: 'gemini', supportsLora: true },

    // Gommo
    { value: 'seedream_4_0', label: '🟡 Seedream 4.0 (9 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'google_image_gen_banana', label: '🟡 Nano Banana (9 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'google_image_gen_banana_pro_reason', label: '🟡 Nano Banana Pro Reason (8 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'google_image_gen_banana_pro', label: '🟡 Nano Banana Pro (6 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'seedream_4_5', label: '🟡 Seedream 4.5 (6 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'o1', label: '🟡 IMAGE O1 (6 subjects)', provider: 'gommo', supportsLora: true },
    { value: 'google_image_gen_4_5', label: '🟡 Imagen 4.5 (3 subjects)', provider: 'gommo', supportsLora: true },
];

// EDIT_MODELS - Models that support image editing (mask, upscale, expand)
export const EDIT_MODELS = IMAGE_MODELS.filter(m => m.supportsEdit && !m.isHeader);

// NOEDIT_MODELS - Text-to-image only models
export const NOEDIT_MODELS = IMAGE_MODELS.filter(m => !m.supportsEdit && !m.isHeader);

// Get selectable models (exclude headers)
export const SELECTABLE_IMAGE_MODELS = IMAGE_MODELS.filter(m => !m.isHeader);

// SCRIPT_MODELS - Updated decommissioned models
export const SCRIPT_MODELS = [
    { value: 'llama-3.3-70b-versatile', label: '🚀 Llama 3.3 70B (Groq) - Recommended' },
    { value: 'llama-3.1-8b-instant', label: '🚀 Llama 3.1 8B Fast (Groq)' },
    { value: 'mixtral-8x7b-32768', label: '🚀 Mixtral 8x7B (Groq)' },
];

export const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 (Landscape - Cinematic)' },
    { value: '9:16', label: '9:16 (Portrait - Mobile/Reels)' },
    { value: '1:1', label: '1:1 (Square - Social)' },
    { value: '4:3', label: '4:3 (Classic TV)' },
    { value: '3:4', label: '3:4 (Portrait)' },
];

export const CHARACTER_STYLES = [
    {
        value: 'pixar',
        label: '3D Animation (Pixar/Disney Style)',
        prompt: 'STRICT STYLE: 3D rendered character in Pixar/Disney animation style. MUST have: soft rounded features, smooth gradient shading, large expressive eyes with glossy reflections, exaggerated proportions (big head, small body for cute characters), vibrant saturated colors, soft ambient lighting with rim lights, no hard edges, clean subsurface scattering on skin. Art style: Toy Story, Inside Out, Zootopia aesthetic. Render engine style: Arnold/RenderMan quality.'
    },
    {
        value: 'anime',
        label: 'Anime / Manga',
        prompt: 'STRICT STYLE: Japanese anime/manga illustration. MUST have: large detailed eyes with highlights and sparkles, sharp clean lineart, cel-shaded coloring with minimal gradients, vibrant hair colors with chunky highlights, sharp angular shadows, exaggerated facial expressions, simplified nose (small dots or lines), detailed clothing folds. Art style: Studio Ghibli, Makoto Shinkai, modern anime aesthetic. NO realistic shading, NO western cartoon style.'
    },
    {
        value: 'cinematic',
        label: 'Realistic Cinematic',
        prompt: 'STRICT STYLE: Photorealistic cinematic rendering. MUST have: realistic skin texture with pores and subsurface scattering, accurate anatomy and proportions, natural hair strands with physics, realistic fabric materials with wrinkles, professional studio lighting (key light + fill + rim), shallow depth of field, film grain texture, color grading like Hollywood movies. Photography style: 85mm portrait lens, f/2.8 aperture, cinematic color palette. NO cartoon features, NO stylization.'
    },
    {
        value: 'comic',
        label: 'American Comic Book',
        prompt: 'STRICT STYLE: American comic book illustration. MUST have: bold black ink outlines (thick outer lines, thinner inner details), strong contrast with dramatic shadows, halftone dot shading, dynamic poses with motion lines, exaggerated anatomy (muscular heroes, curvy females), vibrant primary colors (red, blue, yellow dominance), Ben-Day dots texture. Art style: Marvel/DC comics, Jack Kirby, Jim Lee aesthetic. NO soft gradients, NO realistic rendering.'
    },
    {
        value: 'fantasy',
        label: 'Digital Fantasy Art',
        prompt: 'STRICT STYLE: Epic fantasy digital painting. MUST have: painterly brush strokes visible, rich atmospheric lighting (magical glows, dramatic backlighting), detailed costume design with ornate patterns, fantasy elements (armor, robes, magical effects), semi-realistic proportions with idealized features, rich color palette with jewel tones, ethereal atmosphere with particles/mist. Art style: concept art for games like World of Warcraft, League of Legends, Magic: The Gathering. Medium: digital painting with visible brush work.'
    },
    {
        value: 'clay',
        label: 'Claymation / Stop Motion',
        prompt: 'STRICT STYLE: Claymation/stop-motion puppet style. MUST have: visible fingerprint textures on clay surface, slightly lumpy handmade appearance, matte finish with no glossy shine, simple geometric shapes, visible wire armature bumps, exaggerated simplified features, chunky proportions, soft pastel or earthy colors, slight imperfections showing handcrafted quality. Art style: Wallace & Gromit, Coraline, Kubo aesthetic. NO smooth 3D rendering, NO clean digital look.'
    },
];

// --- Helper: Create Initial State ---
export const createInitialState = (): ProjectState => ({
    projectName: '',
    stylePrompt: 'cinematic-realistic',
    imageModel: 'fal-ai/flux-general', // Default to Fal.ai Flux for best consistency
    scriptModel: 'llama-3.3-70b-versatile', // Default to Groq Llama 3.3
    aspectRatio: '16:9',
    genyuToken: '',
    resolution: '1K',
    scriptLanguage: 'vietnamese',
    activeScriptPreset: 'film-animation',
    customScriptPresets: [],
    characters: Array.from({ length: 3 }).map(() => ({
        id: generateId(),
        name: '',
        description: '',
        masterImage: null,
        faceImage: null,
        bodyImage: null,
        sideImage: null,
        backImage: null,
        props: [
            { id: generateId(), name: '', image: null },
            { id: generateId(), name: '', image: null },
            { id: generateId(), name: '', image: null },
        ],
        isDefault: false,
        isAnalyzing: false,
    })),
    products: [],
    scenes: [],
});

// --- Helper: Download Image ---
export const downloadImage = (base64Image: string, filename: string) => {
    if (!base64Image) return;
    const link = document.createElement('a');
    link.href = base64Image;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
