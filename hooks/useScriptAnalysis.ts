/**
 * useScriptAnalysis Hook
 * 
 * Analyzes imported voice-over scripts using AI to:
 * 1. Detect chapter headers
 * 2. Identify characters
 * 3. Suggest scene breakdown
 * 4. Generate visual prompts with Director + Character Style
 */

import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Scene, SceneGroup, Character, CharacterStyleDefinition } from '../types';
import { DirectorPreset, DIRECTOR_PRESETS } from '../constants/directors';
import { resolveStyleWithInheritance } from '../constants/characterStyles';

// Analysis result types
export interface ChapterAnalysis {
    id: string;
    title: string;
    startIndex: number;
    endIndex: number;
    estimatedDuration: number; // seconds
    suggestedTimeOfDay?: string;
    suggestedWeather?: string;
    locationAnchor?: string; // PHASE 2: Fixed location description for all scenes in chapter
}

export interface CharacterAnalysis {
    name: string;
    mentions: number;
    suggestedDescription: string;
    outfitByChapter: Record<string, string>; // chapterId -> outfit description
    isMain: boolean;
}

export interface SceneAnalysis {
    voiceOverText: string;      // Narration/commentary (off-screen narrator)
    dialogueText?: string;       // Character dialogue (spoken on-screen)
    dialogueSpeaker?: string;    // Who is speaking the dialogue
    visualPrompt: string;
    chapterId: string;
    characterNames: string[];
    estimatedDuration: number;
    needsExpansion: boolean; // If VO is long and needs multiple visual scenes
    expansionScenes?: {
        visualPrompt: string;
        isBRoll: boolean;
    }[];
}

// NEW: Location Detection for shared concept art
export interface LocationAnalysis {
    id: string;
    name: string;                    // "Casino Interior"
    description: string;             // "Dark luxurious gambling hall with roulette tables..."
    keywords: string[];              // ["casino", "gambling", "luxury"]
    chapterIds: string[];            // Which chapters use this location
    sceneRanges: { start: number; end: number }[]; // Scene number ranges
    conceptPrompt: string;           // Full prompt for generating concept art
    isInterior: boolean;             // Interior vs Exterior
    timeOfDay?: string;              // Suggested time
    mood?: string;                   // Atmospheric mood
}

export interface ScriptAnalysisResult {
    totalWords: number;
    estimatedDuration: number; // total seconds
    chapters: ChapterAnalysis[];
    characters: CharacterAnalysis[];
    locations: LocationAnalysis[]; // NEW: Detected unique locations
    suggestedSceneCount: number;
    scenes: SceneAnalysis[];
    globalContext?: string; // World setting, era, tone summary from AI
}

// Words per minute for duration estimation
const WPM_SLOW = 120;
const WPM_MEDIUM = 150;
const WPM_FAST = 180;

export function useScriptAnalysis(userApiKey: string | null) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<ScriptAnalysisResult | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    /**
     * Analyze script text using AI
     */
    const analyzeScript = useCallback(async (
        scriptText: string,
        readingSpeed: 'slow' | 'medium' | 'fast' = 'medium',
        modelSelector: string = 'gemini-2.5-flash|none', // format: model|thinkingLevel
        characterStyle?: CharacterStyleDefinition | null,
        director?: DirectorPreset | null,
        researchNotes?: { director?: string; dop?: string; story?: string } | null,
        activeCharacters: { id: string; name: string; description?: string }[] = [] // New Param for auto-assignment
    ): Promise<ScriptAnalysisResult | null> => {
        if (!userApiKey) {
            setAnalysisError('API key required');
            return null;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: userApiKey });
            const wpm = readingSpeed === 'slow' ? WPM_SLOW : readingSpeed === 'fast' ? WPM_FAST : WPM_MEDIUM;
            const wordCount = scriptText.split(/\s+/).length;
            const estimatedTotalDuration = Math.ceil((wordCount / wpm) * 60);

            // Parse model selector format: "model-name|thinking-level"
            const [modelName, thinkingLevel] = modelSelector.split('|');

            // Map thinking level to budget tokens
            const thinkingBudgets: Record<string, number | undefined> = {
                'high': 24576,
                'medium': 8192,
                'low': 2048,
                'minimal': 512,
                'none': undefined
            };

            // Only apply thinking config to models that support it
            // gemini-2.5-flash does NOT support thinkingConfig
            const supportsThinking = modelName.includes('2.5-pro') || modelName.includes('thinking');
            const thinkingBudget = supportsThinking ? (thinkingBudgets[thinkingLevel] ?? undefined) : undefined;

            if (!supportsThinking && thinkingLevel !== 'none') {
                console.warn(`[ScriptAnalysis] Model ${modelName} does not support thinking mode. Ignoring thinking level: ${thinkingLevel}`);
            }

            // Context Injection
            let contextInstructions = "";

            // [New] Global Story Context - INJECT FIRST
            if (researchNotes?.story) {
                contextInstructions += `\n[GLOBAL STORY CONTEXT - MANDATORY WORLD SETTING]:\n${researchNotes.story}\n- ALL visual descriptions MUST align with this world setting. Do not hallucinate settings that contradict this context.\n`;
            }

            if (characterStyle) {
                // Check if this is a mannequin style
                const isMannequinStyle = characterStyle.id?.includes('mannequin') || characterStyle.name?.toLowerCase().includes('mannequin');
                const mannequinPrefix = isMannequinStyle ? 'Faceless white mannequin, egg-shaped head. ' : '';

                contextInstructions += `\nVISUAL STYLE CONSTRAINT: The user selected the character style "${characterStyle.name}" (${characterStyle.promptInjection.global}).\n- You MUST generate "suggestedDescription" that aligns with this style.\n${isMannequinStyle ? `- MANDATORY MANNEQUIN PREFIX: Every character's suggestedDescription MUST start with: "${mannequinPrefix}"\n` : ''}- CRITICAL: You MUST extract the SPECIFIC OUTFIT (uniforms, period clothing, colors) from the script.\n- IF SCRIPT IS VAGUE: You MUST INFER appropriate period-accurate clothing in EXTREME DETAIL.\n- TEXTURE & MATERIAL LOCK: You MUST describe textures with MICROSCOPIC DETAIL (e.g. "cracked leather with oil stains", "coarse wool with pilling", "rusted brass buttons", "frayed cotton edges").\n- FORMAT: "${mannequinPrefix}WEARING: [Detailed Outfit Description with specific textures/materials] + [Accessories/Props] + [SHOES: specific footwear]."\n- Example: "Faceless white mannequin, egg-shaped head. WEARING: A heavy, cracked vintage bomber jacket (worn leather texture), coarse grey wool trousers with mud splatters, tarnished silver cufflinks. SHOES: Brown leather oxford shoes with scuff marks."\n- COMPLETE OUTFIT MANDATORY: Every character MUST have pants/skirt AND shoes specified.\n`;
            } else {
                contextInstructions += `\n- For characters, provide a HIGHLY DETAILED VISUAL DESCRIPTION (Age, Ethnicity, Hair, Face, Body, Initial Outfit).`;
            }

            if (director) {
                contextInstructions += `\nDIRECTOR VISION: ${director.name} (${director.description}).\n- Frame scenes according to this director's style.\n`;
            }

            // Inject Research Notes (User's custom research for this script)
            if (researchNotes?.director) {
                contextInstructions += `\n[USER DIRECTOR NOTES - MANDATORY CONTEXT]:\n${researchNotes.director}\n- Apply these storytelling guidelines to scene breakdown and character actions.\n`;
            }
            if (researchNotes?.dop) {
                contextInstructions += `\n[USER DOP NOTES - MANDATORY CAMERA/LIGHTING CONTEXT]:\n${researchNotes.dop}\n- Apply these cinematography guidelines to visual prompts.\n`;
            }

            // Calculate expected scene count based on word count and reading speed
            // Formula: Each scene should be 3-5s of VO. At 150 WPM, that's ~7.5-12.5 words per scene.
            // We use ~10 words per scene as the target (4s at 150 WPM).
            const wordsPerScene = readingSpeed === 'slow' ? 8 : readingSpeed === 'fast' ? 12 : 10;
            const expectedSceneCount = Math.ceil(wordCount / wordsPerScene);
            const minSceneCount = Math.max(20, Math.floor(expectedSceneCount * 0.8)); // At least 80% of expected
            const maxSceneCount = Math.ceil(expectedSceneCount * 1.2); // At most 120% of expected

            // PHASE 1: Pre-split script into sentences for consistent scene splitting
            const sentenceSplitRegex = /(?<=[.!?])\s+(?=[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ"])/g;
            const sentences = scriptText.split(sentenceSplitRegex).filter(s => s.trim().length > 0);
            const sentenceCount = sentences.length;

            console.log('[ScriptAnalysis] Pre-split:', { wordCount, sentenceCount, expectedSceneCount, minSceneCount, maxSceneCount });

            // Build sentences array for AI with indices
            const sentencesForAI = sentences.map((text, idx) => `[${idx}] ${text.trim()}`).join('\n');

            const prompt = `Analyze this voice-over script for a documentary video. Return JSON only.

=== FULL SCRIPT (read this FIRST for character context) ===
"""
${scriptText}
"""

=== PRE-SPLIT SENTENCES (use for scene generation) ===
"""
${sentencesForAI}
"""
TOTAL: ${sentenceCount} sentences. Generate EXACTLY ${sentenceCount} scenes.

TASK ORDER (follow strictly):
1. Read FULL SCRIPT above to understand story, characters, and flow
2. Extract GLOBAL CONTEXT (World setting, Time period, Tone)
3. Identify CHAPTERS with LOCATION ANCHORS
4. Extract ALL CHARACTER NAMES from full script (merge aliases)
5. CHARACTER SCANNING: For each sentence [index], identify which characters are:
   - MENTIONED by name
   - PERFORMING actions
   - PRESENT in the scene context
6. Create ONE scene per sentence with visual prompt + characterNames array

CRITICAL - CHARACTER SCANNING RULES:
- Read the FULL SCRIPT to understand when characters enter/exit narrative
- If a character was mentioned in sentence [N], they may still be present in [N+1] even if not named
- Use context: "He said..." refers to the last male character mentioned
- "The man/woman" = previously introduced character, NOT a new one
- ONLY list characters who should be VISIBLE in the image
- If a sentence is pure narration with no visible characters, leave characterNames: []

CRITICAL - LOCATION ANCHOR RULE:
- Each chapter MUST define a "locationAnchor" - a DETAILED, FIXED environment description
- ALL scenes in that chapter MUST visually exist in this EXACT location
- Format: "Interior/Exterior, [specific place], [decade], [architectural style], [lighting], [key props]"
- Example: "Interior, 1940s Monte Carlo casino, Art Deco style, crystal chandeliers, mahogany tables, warm amber lighting"

VISUAL PROMPT FORMAT:
"[SHOT TYPE]. [Location from locationAnchor]. [Subject/Characters]. [Action]. [Mood]."
- SHOT TYPES: WIDE SHOT, MEDIUM SHOT, CLOSE-UP, EXTREME CLOSE-UP, POV
- Include locationAnchor elements in every scene

CRITICAL - VOICE OVER vs DIALOGUE DETECTION:
- VOICE OVER (voiceOverText): Narration text read by off-screen narrator. Third-person descriptions.
- DIALOGUE (dialogueText): Direct speech by a character on-screen. Usually in quotes or preceded by speaker name.
  
DETECTION RULES:
- If sentence is quoted speech like "Badge. Monegasque police." → This is DIALOGUE
- If sentence has format "Name said: ..." or "...," he/she said → Extract as DIALOGUE
- If sentence starts with name + colon like "John: Hello" → This is DIALOGUE  
- Pure narration without quotes = VOICE OVER only
- A sentence CAN have BOTH (narration + embedded dialogue)

RULES:
- One sentence = one scene. DO NOT merge sentences.
${contextInstructions}
- If sentence needs B-roll, mark needsExpansion: true
- B-roll uses SAME locationAnchor as parent
- CONSISTENCY CHECK: Same character must have same name throughout

RESPOND WITH JSON ONLY:
{
  "globalContext": "Detailed summary of world, era, setting...",
  "locations": [
    {
      "id": "loc_casino",
      "name": "Casino Interior",
      "description": "Dark luxurious 1940s gambling hall with crystal chandeliers, mahogany gaming tables, velvet curtains, Art Deco style architecture",
      "keywords": ["casino", "gambling", "interior", "art deco"],
      "chapterIds": ["chapter_1", "chapter_5", "chapter_8"],
      "isInterior": true,
      "timeOfDay": "night",
      "mood": "tense, anticipation",
      "conceptPrompt": "WIDE SHOT establishing interior. 1940s Monte Carlo casino, Art Deco style architecture. Crystal chandeliers cast warm amber light. Mahogany roulette tables, velvet curtains, marble floors. Empty of people, focus on environment. David Fincher cinematography, desaturated tones."
    },
    {
      "id": "loc_mansion",
      "name": "Grand Mansion Hall",
      "description": "Ornate entrance hall with marble columns, grand staircase, high ceilings",
      "keywords": ["mansion", "hall", "grand", "marble"],
      "chapterIds": ["chapter_3"],
      "isInterior": true,
      "timeOfDay": "afternoon",
      "mood": "opulent, mysterious",
      "conceptPrompt": "WIDE SHOT establishing interior. Grand mansion entrance hall. Marble columns, sweeping staircase, crystal chandelier, checkered floor. Afternoon light through tall windows. Empty of people."
    }
  ],
  "chapters": [
    {
      "id": "chapter_1",
      "title": "Chapter Title",
      "suggestedTimeOfDay": "night",
      "suggestedWeather": "clear",
      "locationAnchor": "Interior, 1940s Monte Carlo casino, Art Deco style, crystal chandeliers, mahogany gaming tables, warm amber lighting from wall sconces, velvet curtains, marble floors",
      "locationId": "loc_casino"
    }
  ],
  "characters": [
    {
      "name": "Étienne Marchand",
      "mentions": 5,
      "suggestedDescription": "Faceless white mannequin, egg-shaped head. WEARING: A tailored charcoal grey 1940s wool suit with wide lapels, crisp white shirt, silk tie, gold pocket watch chain. SHOES: Polished black leather oxfords.",
      "outfitByChapter": {
        "chapter_1": "charcoal grey 1940s wool suit"
      },
      "isMain": true
    }
  ],
  "scenes": [
    {
      "sentenceIndex": 0,
      "voiceOverText": "Monte Carlo, March 2019. 11:47 p.m. A man in a charcoal suit stands at the edge of a roulette table.",
      "dialogueText": null,
      "dialogueSpeaker": null,
      "visualPrompt": "WIDE SHOT. 1940s Monte Carlo casino interior, Art Deco, crystal chandeliers. Étienne Marchand stands at the roulette table, chips in hand. Warm amber lighting, anticipation.",
      "chapterId": "chapter_1",
      "characterNames": ["Étienne Marchand"],
      "needsExpansion": false
    },
    {
      "sentenceIndex": 5,
      "voiceOverText": "Two plainclothes officers intercept him near the coat check.",
      "dialogueText": "Badge. Monegasque police. Monsieur, we need to speak with you regarding your activities this evening.",
      "dialogueSpeaker": "Police Officer",
      "visualPrompt": "MEDIUM SHOT. Casino lobby. Two officers in suits approach Étienne, one showing badge. Tense atmosphere.",
      "chapterId": "chapter_1",
      "characterNames": ["Étienne Marchand", "Police Officer"],
      "needsExpansion": false
    },
    {
      "sentenceIndex": 10,
      "voiceOverText": "Next narration sentence without dialogue...",
      "dialogueText": null,
      "dialogueSpeaker": null,
      "visualPrompt": "CLOSE-UP. Casino interior. Roulette wheel spinning, ball bouncing.",
      "chapterId": "chapter_1",
      "characterNames": [],
      "needsExpansion": true,
      "expansionScenes": [
        { "visualPrompt": "EXTREME CLOSE-UP. Same casino. Étienne's hands placing chips.", "isBRoll": true }
      ]
    }
  ]
}`;

            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    temperature: 0.3,
                    responseMimeType: 'application/json',
                    maxOutputTokens: 65536, // Allow large output for many scenes
                    ...(thinkingBudget && {
                        thinkingConfig: { thinkingBudget }
                    })
                }
            });

            const text = response.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in response');

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate scene count - warn if too low
            const actualSceneCount = parsed.scenes?.length || 0;
            if (actualSceneCount < minSceneCount) {
                console.warn(`[ScriptAnalysis] ⚠️ AI returned only ${actualSceneCount} scenes but expected ${minSceneCount}-${maxSceneCount}. AI may have ignored scene count constraint.`);
            }

            // Calculate durations
            const result: ScriptAnalysisResult = {
                totalWords: wordCount,
                estimatedDuration: estimatedTotalDuration,
                chapters: parsed.chapters.map((ch: any, i: number) => ({
                    ...ch,
                    startIndex: 0,
                    endIndex: 0,
                    estimatedDuration: Math.ceil(estimatedTotalDuration / parsed.chapters.length)
                })),
                characters: parsed.characters || [],
                locations: (parsed.locations || []).map((loc: any) => ({
                    ...loc,
                    sceneRanges: loc.sceneRanges || [] // Ensure array exists
                })),
                suggestedSceneCount: parsed.scenes.length +
                    parsed.scenes.reduce((sum: number, s: any) => sum + (s.expansionScenes?.length || 0), 0),
                scenes: parsed.scenes.map((s: any) => ({
                    ...s,
                    estimatedDuration: Math.ceil(((s.voiceOverText || '').split(/\\s+/).length / wpm) * 60)
                })),
                globalContext: parsed.globalContext
            };

            // Log detected locations
            if (result.locations.length > 0) {
                console.log(`[ScriptAnalysis] 📍 Detected ${result.locations.length} unique locations:`,
                    result.locations.map(l => l.name).join(', '));
            }

            setAnalysisResult(result);
            console.log('[ScriptAnalysis] ✅ Analysis complete:', result);
            return result;

        } catch (error: any) {
            console.error('[ScriptAnalysis] ❌ Error:', error);
            setAnalysisError(error.message || 'Analysis failed');
            return null;
        } finally {
            setIsAnalyzing(false);
        }
    }, [userApiKey]);

    /**
     * Generate Scene Map from analysis result
     */
    const generateSceneMap = useCallback((
        analysis: ScriptAnalysisResult,
        director: DirectorPreset | null,
        characterStyle: CharacterStyleDefinition | null,
        existingCharacters: Character[] = []
    ): { scenes: Scene[]; groups: SceneGroup[]; newCharacters: { name: string; description: string }[]; sceneCharacterMap: Record<number, string[]> } => {

        // Create chapter ID -> locationAnchor map for quick lookup
        const chapterLocationMap: Record<string, string> = {};
        analysis.chapters.forEach(ch => {
            chapterLocationMap[ch.id] = ch.locationAnchor || '';
        });

        const groups: SceneGroup[] = analysis.chapters.map(ch => {
            const outfitOverrides: Record<string, string> = {};
            // Map character name -> outfit for this chapter
            analysis.characters.forEach(c => {
                // Ensure case-insensitive or exact name match? 
                // We will use the exact name here and rely on App.tsx to resolve IDs
                if (c.outfitByChapter?.[ch.id]) {
                    outfitOverrides[c.name] = c.outfitByChapter[ch.id];
                }
            });

            return {
                id: ch.id,
                name: ch.title,
                // PHASE 2: Store locationAnchor in description for concept image reference
                description: ch.locationAnchor || ch.title,
                timeOfDay: (ch.suggestedTimeOfDay as any) || 'day',
                weather: (ch.suggestedWeather as any) || 'clear',
                outfitOverrides
            };
        });

        const scenes: Scene[] = [];
        let sceneNumber = 1;

        // Resolve character style prompts
        const stylePrompt = characterStyle?.promptInjection.global || '';
        const directorDna = director?.dna || '';
        const directorCamera = director?.signatureCameraStyle || '';

        const sceneCharacterMap: Record<number, string[]> = {};

        for (const sceneAnalysis of analysis.scenes) {
            // PHASE 2: Get locationAnchor for this scene's chapter
            const locationAnchor = chapterLocationMap[sceneAnalysis.chapterId] || '';

            // Main scene with VO
            const mainScene: Scene = {
                id: `scene_${sceneNumber}`,
                sceneNumber: String(sceneNumber),
                groupId: sceneAnalysis.chapterId,

                // Dialogue - if AI detected dialogue, format it with speaker
                language1: sceneAnalysis.dialogueText
                    ? (sceneAnalysis.dialogueSpeaker
                        ? `${sceneAnalysis.dialogueSpeaker}: ${sceneAnalysis.dialogueText}`
                        : sceneAnalysis.dialogueText)
                    : '',
                vietnamese: '', // Secondary language empty by default

                promptName: `Scene ${sceneNumber}`,

                // VO fields - narration text
                voiceOverText: sceneAnalysis.voiceOverText,
                isVOScene: Boolean(sceneAnalysis.voiceOverText),
                voSecondsEstimate: sceneAnalysis.estimatedDuration,

                // PHASE 2: Visual prompt with LOCATION ANCHOR injection
                contextDescription: [
                    locationAnchor ? `[LOCATION ANCHOR - MANDATORY]: ${locationAnchor}` : '',
                    stylePrompt ? `[CHARACTER STYLE]: ${stylePrompt}` : '',
                    directorDna ? `[DIRECTOR DNA]: ${directorDna}` : '',
                    directorCamera ? `[CAMERA STYLE]: ${directorCamera}` : '',
                    sceneAnalysis.visualPrompt
                ].filter(Boolean).join('\n\n'),

                characterIds: [], // Will be mapped after character creation
                productIds: [],
                generatedImage: null,
                veoPrompt: '',
                isGenerating: false,
                error: null
            };


            // Map characters to scene index (0-based)
            // Map characters to scene index (0-based)
            sceneCharacterMap[scenes.length] = sceneAnalysis.characterNames || [];

            // AUTO-ASSIGN EXISTING CHARACTERS
            if (existingCharacters && existingCharacters.length > 0) {
                const foundIds: string[] = [];
                const namesInScene = (sceneAnalysis.characterNames || []).map((n: string) => n.toLowerCase());

                existingCharacters.forEach(char => {
                    const charName = char.name.toLowerCase();
                    // Check for full match or partial match (e.g. "John" in "John Doe")
                    const isMatch = namesInScene.some((n: string) =>
                        charName.includes(n) || n.includes(charName) ||
                        (char.description && char.description.toLowerCase().includes(n))
                    );
                    if (isMatch) {
                        foundIds.push(char.id);
                    }
                });
                mainScene.characterIds = foundIds;
            }

            scenes.push(mainScene);
            sceneNumber++;

            // Expansion scenes (B-roll)
            if (sceneAnalysis.needsExpansion && sceneAnalysis.expansionScenes) {
                for (const expansion of sceneAnalysis.expansionScenes) {
                    const bRollScene: Scene = {
                        id: `scene_${sceneNumber}`,
                        sceneNumber: String(sceneNumber),
                        groupId: sceneAnalysis.chapterId,
                        language1: '',
                        vietnamese: '',
                        promptName: `B-Roll ${sceneNumber}`,

                        // B-roll has no VO
                        voiceOverText: undefined,
                        isVOScene: false,
                        referenceSceneId: mainScene.id, // Reference the VO scene

                        // PHASE 3: B-roll inherits locationAnchor from parent scene
                        contextDescription: [
                            locationAnchor ? `[LOCATION ANCHOR - MANDATORY]: ${locationAnchor}` : '',
                            `[B-ROLL FOR SCENE ${sceneNumber - 1}]: Match environment from parent scene`,
                            stylePrompt ? `[CHARACTER STYLE]: ${stylePrompt}` : '',
                            directorDna ? `[DIRECTOR DNA]: ${directorDna}` : '',
                            expansion.visualPrompt
                        ].filter(Boolean).join('\n\n'),

                        characterIds: [],
                        productIds: [],
                        generatedImage: null,
                        veoPrompt: '',
                        isGenerating: false,
                        error: null
                    };

                    // B-roll inherits characters from main scene? Or none?
                    // Typically B-roll is about environment or specific details.
                    // If it's a character B-roll, visualPrompt should describe it.
                    // For now, we don't auto-assign characters to B-roll to avoid clutter
                    sceneCharacterMap[scenes.length] = [];

                    scenes.push(bRollScene);
                    sceneNumber++;
                }
            }
        }

        // Identify new characters not in existing list
        const existingNames = new Set(existingCharacters.map(c => c.name.toLowerCase()));
        const newCharacters = analysis.characters
            .filter(c => !existingNames.has(c.name.toLowerCase()))
            .map(c => ({
                name: c.name,
                description: c.suggestedDescription
            }));

        return { scenes, groups, newCharacters, sceneCharacterMap };
    }, []);

    return {
        isAnalyzing,
        analysisResult,
        analysisError,
        analyzeScript,
        generateSceneMap,
        setAnalysisResult
    };
}
