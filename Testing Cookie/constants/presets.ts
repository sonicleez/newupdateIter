import type { ProjectState } from '../types';

export const APP_NAME = "Scene Director";
export const PRIMARY_GRADIENT = "from-orange-600 to-red-600";
export const PRIMARY_GRADIENT_HOVER = "from-orange-500 to-red-500";

export const GLOBAL_STYLES = [
    {
        value: 'cinematic-realistic',
        label: 'Cinematic Realistic (Phim điện ảnh)',
        prompt: 'Cinematic movie screengrab, shot on Arri Alexa, photorealistic, 8k, highly detailed texture, dramatic lighting, shallow depth of field, color graded, film grain, masterpiece, award winning, trending on artstation, aesthetics, highly detailed, sharp focus.'
    },
    {
        value: '3d-pixar',
        label: '3D Animation (Pixar/Disney)',
        prompt: '3D render style, Pixar animation style, octane render, unreal engine 5, cute, vibrant lighting, soft smooth textures, expressive, volumetric lighting, masterpiece, redshift, disney pixar style, high fidelity, 8k.'
    },
    {
        value: 'anime-makoto',
        label: 'Anime (Makoto Shinkai Style)',
        prompt: 'Anime style, Makoto Shinkai art style, high quality 2D animation, beautiful sky, detailed background, vibrant colors, emotional atmosphere, cell shading, masterpiece, best quality, official art, key visual, 4k, detailed illustration.'
    },
    {
        value: 'vintage-film',
        label: 'Vintage 1980s Film (Retro)',
        prompt: '1980s vintage movie look, film grain, retro aesthetic, warm tones, soft focus, kodak portra 400, nostalgia atmosphere, analog photography, grainy, nostalgic, classic movie.'
    },
    {
        value: 'cyberpunk',
        label: 'Cyberpunk / Sci-Fi',
        prompt: 'Cyberpunk aesthetic, neon lighting, dark atmosphere, futuristic, high contrast, wet streets, technological details, blade runner style, futuristic, glowing neon, high tech, intricate details, masterpiece.'
    },
    {
        value: 'watercolor',
        label: 'Watercolor / Artistic',
        prompt: 'Watercolor painting style, soft edges, artistic, painterly, dreamy atmosphere, paper texture, pastel colors, traditional medium, wet on wet, masterpiece, artistic, detailed.'
    },
    {
        value: 'dark-fantasy',
        label: 'Dark Fantasy (Game Style)',
        prompt: 'Dark fantasy art, elden ring style, gritty, atmospheric, ominous lighting, detailed armor and textures, epic scale, oil painting aesthetic, masterpiece, oil painting, intricate, ominous, highly detailed, trending on artstation.'
    }
];

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

export const VEO_MODES = [
    { value: 'image-to-video', label: '🎬 Image → Video', hint: 'Một ảnh tạo video' },
    { value: 'start-end-frame', label: '🎞️ Start/End Frame', hint: 'Hai ảnh làm điểm đầu & cuối' },
];

export const IMAGE_ROLES = [
    { value: 'single', label: '📷 Single Image', color: 'gray' },
    { value: 'start-frame', label: '🟢 Start Frame', color: 'green' },
    { value: 'end-frame', label: '🔴 End Frame', color: 'red' },
];

export const IMAGE_MODELS = [
    { value: 'gemini-2.5-flash-image', label: 'Google Nano Banana (Fast)' },
    { value: 'gemini-3-pro-image-preview', label: 'Google Nano Banana Pro (High Quality)' },
];

export const SCRIPT_MODELS = [
    { value: 'gemini-3-pro-high', label: 'Gemini 3 Pro (High)' },
    { value: 'gemini-3-pro-low', label: 'Gemini 3 Pro (Low)' },
    { value: 'gemini-3-flash', label: 'Gemini 3 Flash (New)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default)' },
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
        prompt: 'STRICT STYLE: 3D rendered character in Pixar/Disney animation style. MUST have: soft rounded features, smooth gradient shading, large expressive eyes, glossy reflections. ENVIRONMENTAL CONSISTENCY: Match the background atmosphere, soft ambient lighting (rim lights), and lighting temperature from the "Ảnh Gốc". No hard edges, clean subsurface scattering.'
    },
    {
        value: 'anime',
        label: 'Anime / Manga',
        prompt: 'STRICT STYLE: Japanese anime/manga illustration. MUST have: large detailed eyes, sharp clean lineart, cel-shaded coloring with minimal gradients. ENVIRONMENTAL CONSISTENCY: Replicate the background color palette, sky/lighting conditions, and overall atmospheric mood from the "Ảnh Gốc".'
    },
    {
        value: 'cinematic',
        label: 'Realistic Cinematic',
        prompt: 'STRICT STYLE: Photorealistic cinematic rendering. MUST have: realistic skin texture, accurate anatomy, natural hair. ENVIRONMENTAL CONSISTENCY: Strictly match the lighting (key/fill/rim light), color grading (LUT/tint), field depth (bokeh), and background location environment seen in the "Ảnh Gốc".'
    },
    {
        value: 'comic',
        label: 'American Comic Book',
        prompt: 'STRICT STYLE: American comic book illustration. MUST have: bold black ink outlines, strong contrast shadows, halftone dots. ENVIRONMENTAL CONSISTENCY: Use the same background color scheme and dramatic lighting contrast provided in the "Ảnh Gốc".'
    },
    {
        value: 'fantasy',
        label: 'Digital Fantasy Art',
        prompt: 'STRICT STYLE: Epic fantasy digital painting. MUST have: painterly brush strokes, rich atmospheric lighting, detailed costumes. ENVIRONMENTAL CONSISTENCY: Preserve the magical glows, atmospheric fog, and background architecture/landscape style from the "Ảnh Gốc".'
    },
    {
        value: 'clay',
        label: 'Claymation / Stop Motion',
        prompt: 'STRICT STYLE: Claymation/stop-motion puppet style. MUST have: fingerprint textures on clay, handmade appearance, matte finish. ENVIRONMENTAL CONSISTENCY: Match the physical set lighting, studio shadows, and miniature background style from the "Ảnh Gốc".'
    },
];

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const INITIAL_STATE: ProjectState = {
    projectName: '',
    stylePrompt: 'cinematic-realistic',
    imageModel: 'gemini-2.5-flash-image',
    scriptModel: 'gemini-2.5-flash',
    aspectRatio: '16:9',
    genyuToken: '',
    resolution: '1K',
    scriptLanguage: 'vietnamese',
    activeScriptPreset: 'film-animation',
    customScriptPresets: [],
    characters: Array.from({ length: 1 }).map(() => ({
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
    products: [
        {
            id: generateId(),
            name: '',
            description: '',
            masterImage: null,
            views: {
                front: null,
                back: null,
                left: null,
                right: null,
                top: null,
            },
            isAnalyzing: false,
        }
    ],
    scenes: [],
    sceneGroups: [],
};

export const CREATIVE_PRESETS = [
    {
        category: 'Genre/Thể loại',
        items: [
            { label: 'Cyberpunk', value: 'cyberpunk aesthetic, neon lighting, dark urban atmosphere' },
            { label: 'Western', value: 'western style, dusty desert, cinematic sun flares, gritty' },
            { label: 'Noir', value: 'film noir, high contrast, black and white, dramatic shadows' },
            { label: 'Sci-Fi', value: 'futuristic technology, sleek design, ethereal lighting' },
            { label: 'Horror', value: 'horror atmosphere, tense lighting, dark shadows' },
            { label: 'Slice of Life', value: 'natural lighting, realistic atmosphere, everyday moments' }
        ]
    },
    {
        category: 'Filming Style/Kiểu quay',
        items: [
            { label: 'Handheld', value: 'handheld camera feel, raw, authentic' },
            { label: 'Steadicam', value: 'smooth steadicam motion, fluid movement' },
            { label: 'Drone/Aerial', value: 'stunning aerial view, drone shot, sweeping landscape' },
            { label: 'Static/Classic', value: 'static camera, stable composition, classic framing' },
            { label: 'Long Take', value: 'continuous long take, immersive movement' }
        ]
    },
    {
        category: 'Shot Type/Đặc tả',
        items: [
            { label: 'POV', value: 'POV shot, first-person perspective, immersive' },
            { label: 'Extreme CU', value: 'extreme close-up, sharp macro details' },
            { label: 'Bird\'s Eye', value: 'bird\'s eye view, top-down perspective' },
            { label: 'Low Angle', value: 'heroic low angle shot, powerful perspective' },
            { label: 'High Angle', value: 'vulnerable high angle shot' },
            { label: 'Dutch Angle', value: 'unsettling dutch angle, tilted frame' }
        ]
    }
];
