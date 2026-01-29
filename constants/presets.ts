import type { ProjectState } from '../types';

export const APP_NAME = "Scene Director";
export const PRIMARY_GRADIENT = "from-orange-600 to-red-600";
export const PRIMARY_GRADIENT_HOVER = "from-orange-500 to-red-500";

export const GLOBAL_STYLES = [
    {
        value: 'cinematic-realistic',
        label: 'Cinematic Realistic (Phim điện ảnh)',
        prompt: 'LIVE-ACTION MOVIE SCREENGRAB, shot on Arri Alexa, 35mm film, hyper-realistic, photorealistic, 8k, highly detailed skin texture, pores, dramatic natural lighting, shallow depth of field, color graded, film grain, masterpiece. NEGATIVE: (STRICT NO ANIME, NO CARTOON, NO 2D, NO DRAWING, NO ILLUSTRATION, NO PAINTING).'
    },
    {
        value: '3d-pixar',
        label: '3D Animation (Pixar/Disney)',
        prompt: '3D RENDER STYLE, Pixar animation style, octane render, unreal engine 5, cute, vibrant lighting, soft smooth textures, expressive, volumetric lighting, masterpiece, high fidelity, 8k. NEGATIVE: (STRICT NO PHOTOREALISM, NO REAL-LIFE, NO 2D, NO SKETCH).'
    },
    {
        value: 'anime-makoto',
        label: 'Anime (Makoto Shinkai Style)',
        prompt: 'ANIME STYLE, Makoto Shinkai art style, high quality 2D animation, beautiful sky, detailed background, vibrant colors, emotional atmosphere, cell shading, masterpiece, official art, 4k. NEGATIVE: (STRICT NO PHOTOREALISM, NO 3D RENDER, NO REAL-LIFE).'
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

// Camera Motion options for Veo 3 - matches Veo official documentation
export const VEO_CAMERA_MOTIONS = [
    // Auto
    { value: '', label: 'Auto (AI chọn)', prompt: '', category: 'auto' },

    // Static/Steady
    { value: 'static', label: '📍 Static (Tripod)', prompt: 'static locked-off camera, no movement, stable tripod shot', category: 'static' },
    { value: 'steady', label: '🎯 Steady (Minimal)', prompt: 'steady camera, minimal subtle movement, stable shot', category: 'static' },

    // Orbit/Arc (Circular movement)
    { value: 'orbit-left', label: '↪️ Orbit Left', prompt: 'smooth orbit left around subject, circular arc movement', category: 'orbit' },
    { value: 'orbit-right', label: '↩️ Orbit Right', prompt: 'smooth orbit right around subject, circular arc movement', category: 'orbit' },
    { value: 'orbit-full', label: '🔄 Orbit 360°', prompt: 'full 360-degree orbit around subject, complete circular arc', category: 'orbit' },

    // Pan (Horizontal rotation on fixed point)
    { value: 'pan-left', label: '⬅️ Pan Left', prompt: 'horizontal pan left, camera rotates left on tripod axis', category: 'pan' },
    { value: 'pan-right', label: '➡️ Pan Right', prompt: 'horizontal pan right, camera rotates right on tripod axis', category: 'pan' },
    { value: 'pan-follow', label: '👁️ Pan Follow', prompt: 'pan following subject movement, smooth horizontal tracking', category: 'pan' },

    // Tilt (Vertical rotation on fixed point)  
    { value: 'tilt-up', label: '⬆️ Tilt Up', prompt: 'tilt up, camera rotates upward revealing higher elements', category: 'tilt' },
    { value: 'tilt-down', label: '⬇️ Tilt Down', prompt: 'tilt down, camera rotates downward revealing lower elements', category: 'tilt' },

    // Dolly (Move camera forward/backward)
    { value: 'dolly-in', label: '🔍 Dolly In (Push)', prompt: 'dolly in toward subject, camera physically moves forward, push in', category: 'dolly' },
    { value: 'dolly-out', label: '🔎 Dolly Out (Pull)', prompt: 'dolly out from subject, camera physically moves backward, pull out', category: 'dolly' },
    { value: 'dolly-zoom', label: '🎬 Dolly Zoom (Vertigo)', prompt: 'dolly zoom vertigo effect, dolly in while zooming out, disorienting perspective shift', category: 'dolly' },

    // Tracking (Move alongside subject)
    { value: 'track-left', label: '⏪ Track Left', prompt: 'tracking shot moving left parallel to action, lateral dolly left', category: 'track' },
    { value: 'track-right', label: '⏩ Track Right', prompt: 'tracking shot moving right parallel to action, lateral dolly right', category: 'track' },
    { value: 'track-follow', label: '🏃 Track Follow', prompt: 'tracking shot following subject from behind, steadicam follow', category: 'track' },
    { value: 'track-lead', label: '👤 Track Lead', prompt: 'tracking shot leading subject from front, walking backward tracking', category: 'track' },

    // Crane/Jib (Vertical movement)
    { value: 'crane-up', label: '🏗️ Crane Up', prompt: 'crane shot rising up, vertical ascent revealing wide view, jib up', category: 'crane' },
    { value: 'crane-down', label: '⬇️ Crane Down', prompt: 'crane shot descending down, vertical descent into scene, jib down', category: 'crane' },
    { value: 'crane-boom', label: '🎢 Boom (Up & Over)', prompt: 'boom shot rising up and over subject, arc crane movement', category: 'crane' },

    // Handheld (Authentic/Documentary feel)
    { value: 'handheld-subtle', label: '✋ Handheld (Subtle)', prompt: 'subtle handheld camera, natural slight shake, documentary feel', category: 'handheld' },
    { value: 'handheld-dynamic', label: '🎥 Handheld (Dynamic)', prompt: 'dynamic handheld camera, energetic movement, action documentary style', category: 'handheld' },
    { value: 'handheld-pov', label: '👁️ Handheld POV', prompt: 'handheld POV first-person perspective, immersive documentary style', category: 'handheld' },

    // Zoom (Lens movement, not camera)
    { value: 'zoom-in', label: '🔍 Zoom In (Lens)', prompt: 'zoom in using lens, focal length increase, no camera movement', category: 'zoom' },
    { value: 'zoom-out', label: '🔎 Zoom Out (Lens)', prompt: 'zoom out using lens, focal length decrease, wide reveal', category: 'zoom' },
    { value: 'zoom-crash', label: '💥 Crash Zoom', prompt: 'rapid crash zoom in for impact, dramatic fast zoom', category: 'zoom' },

    // Aerial/Drone
    { value: 'aerial-rise', label: '🚁 Aerial Rise', prompt: 'aerial drone shot rising upward, bird eye view reveal', category: 'aerial' },
    { value: 'aerial-descend', label: '🚁 Aerial Descend', prompt: 'aerial drone shot descending into scene, top-down approach', category: 'aerial' },
    { value: 'aerial-flyby', label: '✈️ Aerial Flyby', prompt: 'aerial flyby shot, drone passing by subject horizontally', category: 'aerial' },
    { value: 'aerial-circle', label: '🌀 Aerial Circle', prompt: 'aerial circling shot, drone orbiting subject from above', category: 'aerial' },

    // Special/Stylized
    { value: 'whip-pan', label: '💨 Whip Pan', prompt: 'fast whip pan with motion blur, quick head turn feel', category: 'special' },
    { value: 'roll', label: '🔃 Roll (Dutch)', prompt: 'camera roll rotating on axis, dutch angle transition', category: 'special' },
    { value: 'rack-focus', label: '🎯 Rack Focus', prompt: 'rack focus shift between foreground and background, depth pull', category: 'special' },
];

export const VEO_PRESETS = [
    {
        value: 'cinematic-master',
        label: '🎬 Cinematic Single Shot',
        // Official Veo 3.1 formula: [Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]
        prompt: `Generate a SINGLE SHOT video (6 seconds) following the official Veo 3.1 formula:
[Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]

OUTPUT FORMAT EXAMPLE:
"Medium shot with steady cam, [Subject description], [specific action happening], [environment details], [lighting and mood]. Professional Arri Alexa look, cinematic color grading."

MANDATORY ELEMENTS:
- One continuous shot, no cuts
- Camera: Dolly, tracking, or slow pan only
- Add SFX tag for ambient sound
- Add Emotion tag for mood`,
        keywords: 'steady cam, professional look, single take, cinematic, Arri Alexa'
    },
    {
        value: 'storytelling-multi',
        label: '🗣️ Dialogue Scene (Multi-Shot)',
        // Multi-shot with dialogue using quotation marks
        prompt: `Generate a MULTI-SHOT dialogue scene using timestamps. Focus on character interaction with synchronized speech.

STRICT FORMAT - Use exactly this structure:
[00:00-00:02] Medium shot of [character], [action]. [Character] says, "[dialogue line]".
[00:02-00:04] Reverse shot of [other character], [reaction]. [Character] replies, "[response]".
[00:04-00:06] Two-shot showing both characters, [interaction]. SFX: [ambient sound].

MANDATORY ELEMENTS:
- Use quotation marks for ALL dialogue
- Alternate between characters (shot/reverse shot)
- Include facial expressions and reactions
- End with SFX or Ambient noise tag`,
        keywords: 'dialogue, character interaction, shot/reverse shot, conversation, synchronized speech'
    },
    {
        value: 'action-sequence',
        label: '⚡ Action Sequence (4-Shot)',
        // High-energy multi-shot with dynamic camera
        prompt: `Generate a HIGH-ENERGY 4-SHOT action sequence (8 seconds total). Each shot must have DIFFERENT camera movement.

STRICT FORMAT:
[00:00-00:02] [Wide/Tracking shot], [subject] [dynamic action 1]. Motion blur effect.
[00:02-00:04] [Close-up/POV shot], [intense detail moment]. SFX: [impact sound].
[00:04-00:06] [Dolly/Arc shot], [subject] [dynamic action 2], [environment reaction].
[00:06-00:08] [Crane/High-angle], [establishing the aftermath or climax]. Emotion: [intensity].

MANDATORY CAMERA FOR EACH SHOT:
- Shot 1: Wide tracking or dolly
- Shot 2: Close-up or POV
- Shot 3: Arc or circling movement
- Shot 4: Crane or aerial reveal`,
        keywords: 'rapid cuts, kinetic energy, motion blur, dynamic camera, action climax'
    },
    {
        value: 'mood-atmosphere',
        label: '☁️ Mood & Atmosphere',
        // Slow, emotional single shot with heavy SFX and Emotion tags
        prompt: `Generate a SLOW, ATMOSPHERIC single shot (6 seconds) emphasizing mood and emotion.

OUTPUT FORMAT:
[Slow dolly/pan], [subject with emotional state], [subtle contemplative action], [richly detailed environment with atmospheric elements], [specific lighting: volumetric, golden hour, or neon]. Emotion: [specific emotion]. Ambient noise: [soundscape]. SFX: [subtle environmental sounds].

MANDATORY ELEMENTS:
- Slow, deliberate camera movement only
- Heavy emphasis on lighting description (volumetric, rays, fog, reflections)
- MUST include Emotion: tag
- MUST include Ambient noise: tag
- Color palette specification (cool blues, warm oranges, etc.)`,
        keywords: 'atmospheric, volumetric lighting, emotional, slow movement, mood piece'
    },
    {
        value: 'macro-detail',
        label: '🔭 Macro / Detail Shot',
        // Extreme close-up with shallow DOF
        prompt: `Generate an EXTREME CLOSE-UP macro shot (6 seconds) showcasing textures and micro-movements.

OUTPUT FORMAT:
"Close-up with very shallow depth of field, macro lens, [specific object/texture in extreme detail], [subtle micro-movement or interaction], [blurred background context], [specific lighting on textures]. Sharp focus on [key detail]. SFX: [subtle close-range sound]."

MANDATORY ELEMENTS:
- Specify "macro lens" or "extreme close-up"
- Describe textures in detail (glistening, rough, metallic, organic)
- Shallow depth of field with bokeh background
- Focus on one key element
- Minimal or no camera movement`,
        keywords: 'macro lens, extreme close-up, shallow DOF, texture details, bokeh'
    },
    {
        value: 'epic-establishment',
        label: '🚁 Epic Establishment Shot',
        // Wide aerial/crane reveal shot
        prompt: `Generate an EPIC WIDE establishing shot (6-8 seconds) revealing vast scale.

OUTPUT FORMAT:
"[Crane shot/Aerial view] starting [low/close position] on [small subject], [camera movement: ascending/pulling back/circling], revealing [vast environment scale], [atmospheric elements: mist, clouds, light rays]. Epic cinematic style, awe-inspiring. SFX: [orchestral swell or environmental ambiance]."

MANDATORY ELEMENTS:
- Camera MUST move to reveal scale (ascend, pull back, or circle)
- Wide-angle lens specification
- Include atmospheric elements (fog, mist, clouds, light rays)
- End with vast environment visible
- Epic/cinematic style keywords`,
        keywords: 'aerial view, crane shot, wide-angle, epic reveal, vast scale, establishing'
    },
    {
        value: 'documentary-natural',
        label: '📹 Documentary (Natural/Simple)',
        // Documentary style - action-focused, minimal prompt, natural sound only
        prompt: `Generate a DOCUMENTARY-STYLE video (6 seconds) with MINIMAL description.

**CRITICAL RULES FOR DOCUMENTARY:**
- DO NOT describe character appearance (already in image)
- DO NOT describe environment/setting (already in image)
- ONLY describe the ACTION happening
- Keep prompt SHORT and FOCUSED

**OUTPUT FORMAT (STRICT):**
"[Camera movement], [character action verbs only - no physical description], [natural movement]. SFX: [real-world ambient sounds only]."

**EXAMPLE OUTPUT:**
"Handheld medium shot, subject turns head slowly and exhales, slight body shift. SFX: wind rustle, distant traffic."

**MANDATORY CONSTRAINTS:**
- ⛔ NO background music, NO orchestral, NO score
- ⛔ NO VFX, NO effects, NO color grading mentions
- ⛔ NO character description (clothes, face, body)
- ⛔ NO environment description (already visible in image)
- ✅ ONLY real-world natural sounds (wind, footsteps, breath, nature, city ambiance)
- ✅ ONLY action verbs: walks, turns, reaches, looks, sits, stands, breathes
- ✅ Camera: handheld, observational, natural movement`,
        keywords: 'documentary, natural, observational, realistic, candid, raw footage, handheld'
    }
];

export const IMAGE_ROLES = [
    { value: 'single', label: '📷 Single Image', color: 'gray' },
    { value: 'start-frame', label: '🟢 Start Frame', color: 'green' },
    { value: 'end-frame', label: '🔴 End Frame', color: 'red' },
];

export const IMAGE_MODELS = [
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
    { value: 'recraft_v3', label: '🟡 Recraft V3', provider: 'gommo', description: 'Vector Art - 150 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'flux_1_1_ultra', label: '🟡 FLUX 1.1 Ultra (Gommo)', provider: 'gommo', description: '200 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
    { value: 'dalle_3', label: '🟡 DALL-E 3', provider: 'gommo', description: 'OpenAI - 200 credits', supportsEdit: false, supportsSubject: false, color: 'yellow' },
];

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
        prompt: 'STRICT STYLE: High-end 3D character render (Pixar/Disney style). TECHNICAL TOKENS: [Volumetric Subsurface Scattering, PBR Materials, Ray-traced Reflections, Octane Render quality, 8k resolution]. SIGNATURE: Soft rounded features, highly expressive eyes with glossy iris reflections, realistic fabric textures on stylized clothing. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255). LIGHTING: Global illumination, soft rim lights for 3D depth.'
    },
    {
        value: 'anime',
        label: 'Anime / Manga',
        prompt: 'STRICT STYLE: Masterpiece Japanese Anime illustration. TECHNICAL TOKENS: [Sharp Vector Lineart, Dynamic Cell Shading, Cinematic Atmospheric Perspective, High-detail IRIS lighting]. SIGNATURE: Crisp edges, vibrant hair highlights, clean gradients, expressive facial topology. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255). LIGHTING: Clean studio key lighting.'
    },
    {
        value: 'cinematic',
        label: 'Realistic Cinematic',
        prompt: 'STRICT STYLE: Hyper-realistic cinematic portrait. META TOKENS: [Ultra-detailed skin pores, Hyper-fine hair strands, Subsurface Scattering (SSS) on skin, Natural skin variations/freckles, Micro-displacement textures, NO-PLASTIC-LOOK]. SIGNATURE: Biological realism, accurate anatomical light occlusion, realistic eye moisture. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255). LIGHTING: High-end professional studio lighting (Key, Fill, Rim) for maximal skin texture definition.'
    },
    {
        value: 'comic',
        label: 'American Comic Book',
        prompt: 'STRICT STYLE: Modern American Comic Book art. TECHNICAL TOKENS: [Hand-drawn Hatching, Ben-Day dot shading, High-contrast Inkwork, dynamic silhouette]. SIGNATURE: Bold outlines, graphic shadows, vibrant primary color palettes, dramatic composition. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255).'
    },
    {
        value: 'fantasy',
        label: 'Digital Fantasy Art',
        prompt: 'STRICT STYLE: High-fantasy digital concept art. TECHNICAL TOKENS: [Intricate armor engravings, ethereal magical glow, layered painterly textures, sharp rim highlights]. SIGNATURE: Majestic presence, highly detailed costume materials (leather, steel, silk), atmospheric particles. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255).'
    },
    {
        value: 'clay',
        label: 'Claymation / Stop Motion',
        prompt: 'STRICT STYLE: Professional Claymation puppet style. TECHNICAL TOKENS: [Visible fingerprint textures, Hand-kneaded clay marks, Matte organic finish, Soft-shadow occlusion]. SIGNATURE: Tactile physical appearance, handcrafted imperfections, vibrant colored clay. BACKGROUND: Pure Solid White Studio Background (RGB 255, 255, 255). LIGHTING: Soft studio setup.'
    },
];

export const generateId = () => `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const INITIAL_STATE: ProjectState = {
    projectName: '',
    stylePrompt: 'cinematic-realistic',
    imageModel: 'fal-ai/flux-general',
    scriptModel: 'llama-3.3-70b-versatile',
    aspectRatio: '16:9',
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
    activeDirectorId: undefined,
    customDirectors: [],
    assetGallery: [],
    agents: {
        director: { status: 'idle' },
        dop: { status: 'idle' }
    },
    productionLogs: [],
    generationConfig: {

        imageDelay: 500,
        veoDelay: 200,
        insertAngleDelay: 1000,
        concurrencyLimit: 1
    }
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
