import { useState, useCallback } from 'react';
import { callGeminiText } from '../utils/geminiUtils';
import { Scene, Character, SceneGroup } from '../types';

interface ExpansionResult {
    scenes: Partial<Scene>[];
}

interface UseSequenceExpansionReturn {
    isExpanding: boolean;
    expandScene: (
        scene: Scene,
        notes: { director?: string; dop?: string } | undefined,
        apiKey: string | null
    ) => Promise<Partial<Scene>[] | null>;
    expansionError: string | null;
}

export function useSequenceExpansion(): UseSequenceExpansionReturn {
    const [isExpanding, setIsExpanding] = useState(false);
    const [expansionError, setExpansionError] = useState<string | null>(null);

    const expandScene = useCallback(async (
        scene: Scene,
        notes: { director?: string; dop?: string } | undefined,
        apiKey: string | null
    ): Promise<Partial<Scene>[] | null> => {
        // No longer strictly require apiKey - fallback will handle it
        setIsExpanding(true);
        setExpansionError(null);

        try {
            // Build Context
            let contextInstructions = "";
            if (notes?.director) {
                contextInstructions += `\n[DIRECTOR NOTES]: ${notes.director}\n`;
            }
            if (notes?.dop) {
                contextInstructions += `\n[DOP NOTES]: ${notes.dop}\n`;
            }

            const prompt = `
You are an expert Film Editor and Cinematographer.
Your task is to SPLIT a single Voice-Over (VO) segment into a SEQUENCE of 3-5 visual shots that effectively tell the story.

INPUT SCENE VO:
"${scene.voiceOverText || scene.vietnamese || ''}"

CURRENT VISUAL CONTEXT:
"${scene.contextDescription || scene.promptName || 'No visual description'}"

${contextInstructions}

REQUIREMENTS:
1. Break the VO into 3-5 sub-segments (if VO is long) OR create reaction shots/B-roll if VO is short.
2. Maintain NARRATIVE FLOW.
3. VARY CAMERA ANGLES: ESTABLISHING -> MEDIUM/ACTION -> CLOSE-UP/DETAIL.
4. ASSIGN PARTS of the VO to each shot (or leave empty if it's a reaction shot).
5. Output JSON ONLY.

RESPONSE FORMAT:
{
  "expanded_scenes": [
    {
      "visual_prompt": "Detailed visual description of the shot...",
      "vo_segment": "Corresponding part of the VO text...",
      "camera_angle": "Wide Shot" | "Medium Shot" | "Close Up" | "Extreme Close Up",
      "shot_type": "Action" | "Reaction" | "Establishing" | "Detail",
      "estimated_duration": 4
    }
  ]
}
`;

            // Use callGeminiText with fallback (prioritize gemini-1.5-flash)
            const responseText = await callGeminiText(prompt, 'You are an expert Film Editor.', true, 'gemini-1.5-flash');

            // Parse JSON
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No JSON found in response");

            const parsed = JSON.parse(jsonMatch[0]);

            if (!parsed.expanded_scenes || !Array.isArray(parsed.expanded_scenes)) {
                throw new Error("Invalid JSON structure");
            }

            // Map to Partial<Scene>
            const newScenes: Partial<Scene>[] = parsed.expanded_scenes.map((s: any) => ({
                voiceOverText: s.vo_segment,
                vietnamese: s.vo_segment, // Sync for now
                contextDescription: s.visual_prompt,
                promptName: `${s.shot_type}: ${s.camera_angle}`,
                customCameraAngle: s.camera_angle,
                // We'll generate IDs and other fields in App.tsx
            }));

            return newScenes;

        } catch (error: any) {
            console.error("Expansion failed:", error);
            setExpansionError(error.message || "Expansion failed");
            return null;
        } finally {
            setIsExpanding(false);
        }
    }, []);

    return {
        isExpanding,
        expandScene,
        expansionError
    };
}
