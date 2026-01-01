import { Scene } from '../types';

/**
 * Build a storyboard prompt for batch coherent generation
 * Generates 4 scenes as a single 2x2 grid image
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

/**
 * Extract character and location info from scenes for consistency
 */
export function extractSceneContext(scenes: Scene[]): {
    characters: string[];
    location: string;
} {
    const characters = new Set<string>();
    let location = '';

    scenes.forEach(scene => {
        // Extract character names from description (if present)
        const charMatches = scene.contextDescription?.match(/\[([^\]]+):/g);
        if (charMatches) {
            charMatches.forEach(m => characters.add(m.replace(/[\[\]:]/g, '').trim()));
        }

        // Use first scene's location anchor if available
        if (!location && scene.contextDescription) {
            const locMatch = scene.contextDescription.match(/\[LOCATION[^\]]*\]:\s*([^.]+)/i);
            if (locMatch) location = locMatch[1];
        }
    });

    return {
        characters: Array.from(characters),
        location: location || 'Consistent environment across all panels'
    };
}
