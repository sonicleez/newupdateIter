import { Scene, Character, ProjectState } from '../types';
import { DIRECTOR_PRESETS } from '../constants/directors';

interface StoryboardPromptResult {
    textPrompt: string;
    parts: { text?: string; inlineData?: { data: string; mimeType: string } }[];
}

/**
 * Build a comprehensive storyboard prompt with character references
 * Returns both text prompt and image parts for API call
 */
export async function buildStoryboardPromptWithRefs(
    scenes: Scene[],
    state: ProjectState,
    safeGetImageData: (url: string) => Promise<{ data: string; mimeType: string } | null>
): Promise<StoryboardPromptResult> {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const maxScenes = Math.min(scenes.length, 4);
    const parts: StoryboardPromptResult['parts'] = [];

    // 1. STYLE INJECTION
    const allDirectors = [...Object.values(DIRECTOR_PRESETS).flat(), ...(state.customDirectors || [])];
    const activeDirector = state.activeDirectorId
        ? allDirectors.find(d => d.id === state.activeDirectorId)
        : null;

    let styleInstruction = '';
    if (activeDirector) {
        styleInstruction = `DIRECTOR STYLE: ${activeDirector.name}. ${activeDirector.dna}`;
    }
    if (state.customMetaTokens) {
        styleInstruction += ` META: ${state.customMetaTokens}`;
    }

    // 2. CHARACTER REFERENCES - Inject face/body images
    const allCharacterIds = new Set<string>();
    scenes.forEach(s => s.characterIds?.forEach(id => allCharacterIds.add(id)));
    const selectedChars = state.characters.filter(c => allCharacterIds.has(c.id));

    for (const char of selectedChars) {
        if (char.faceImage) {
            const imgData = await safeGetImageData(char.faceImage);
            if (imgData) {
                parts.push({
                    text: `[CHARACTER: ${char.name}] - This is the ONLY valid face for ${char.name}. MUST appear identical in ALL panels.`
                });
                parts.push({ inlineData: { data: imgData.data, mimeType: imgData.mimeType } });
            }
        }
        if (char.bodyImage || char.masterImage) {
            const imgData = await safeGetImageData(char.bodyImage || char.masterImage || '');
            if (imgData) {
                parts.push({
                    text: `[COSTUME: ${char.name}] - Match clothing, colors, and outfit exactly in ALL panels.`
                });
                parts.push({ inlineData: { data: imgData.data, mimeType: imgData.mimeType } });
            }
        }
    }

    // 3. CUSTOM STYLE IMAGE
    if (state.stylePrompt === 'custom' && state.customStyleImage) {
        const styleImg = await safeGetImageData(state.customStyleImage);
        if (styleImg) {
            parts.push({
                text: `[STYLE REFERENCE] - Match the artistic style, color grading, and lighting of this image across ALL panels.`
            });
            parts.push({ inlineData: { data: styleImg.data, mimeType: styleImg.mimeType } });
        }
    }

    // 4. PANEL DESCRIPTIONS
    const panelDescriptions = scenes.slice(0, maxScenes).map((scene, i) => {
        const position = positions[i];
        const description = scene.contextDescription || scene.language1 || `Scene ${scene.sceneNumber}`;
        const charNames = state.characters
            .filter(c => scene.characterIds?.includes(c.id))
            .map(c => c.name)
            .join(', ');

        return `Panel ${i + 1} (${position}): ${description}${charNames ? ` [Characters: ${charNames}]` : ''}`;
    }).join('\n\n');

    // 5. FINAL TEXT PROMPT
    const textPrompt = `CREATE A 4-PANEL STORYBOARD IMAGE (2x2 grid layout).

${styleInstruction}

LAYOUT REQUIREMENTS:
- Single image containing 4 DISTINCT PANELS in a 2x2 grid
- Each panel separated by thin black borders (2-3px)
- Aspect ratio: Square (1:1) for the full image
- Each panel is a SEPARATE shot/moment

STRICT CONSISTENCY RULES:
- Character faces MUST be IDENTICAL across all panels (use provided face references)
- Clothing/costume MUST be IDENTICAL across all panels (use provided body references)
- Lighting conditions MUST be CONSISTENT
- Color grading MUST be CONSISTENT
- Environment/location MUST be THE SAME

PANEL CONTENTS:
${panelDescriptions}

CRITICAL: This is ONE IMAGE with 4 sub-panels, NOT 4 separate images.`;

    parts.push({ text: textPrompt });

    return { textPrompt, parts };
}

/**
 * Simple text-only prompt for fallback
 */
export function buildStoryboardPrompt(scenes: Scene[]): string {
    const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const maxScenes = Math.min(scenes.length, 4);

    const panelDescriptions = scenes.slice(0, maxScenes).map((scene, i) => {
        const position = positions[i];
        const description = scene.contextDescription || scene.language1 || `Scene ${scene.sceneNumber}`;
        return `Panel ${i + 1} (${position}): ${description}`;
    }).join('\n\n');

    return `Create a 4-panel storyboard in a 2x2 grid format.
Each panel must be clearly separated with thin black borders (2px).
Maintain STRICT CONSISTENCY across all panels:
- Same characters (face, body, clothing)
- Same lighting conditions
- Same color grading
- Same environment/location
- Only camera angle and action changes between panels

${panelDescriptions}

CRITICAL REQUIREMENTS:
1. All 4 panels share the SAME scene location and characters
2. Character identity must be IDENTICAL across all panels
3. Lighting and color palette must be CONSISTENT
4. Each panel shows a different moment/angle of the same scene`;
}
