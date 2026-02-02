import { useState, useCallback } from 'react';
import { ProjectState, Scene, Character, Product, DirectorPreset } from '../types';
import { getPresetById } from '../utils/scriptPresets';
import { buildScriptPrompt, buildGroupRegenerationPrompt } from '../utils/promptBuilder';
import { generateId } from '../utils/helpers';

import { callGeminiText } from '../utils/geminiUtils';


export function useScriptGeneration(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null, // kept for backward compatibility but no longer used for script
    setApiKeyModalOpen: (open: boolean) => void,
    setAgentState: (agent: 'director' | 'dop', status: any, message?: string, stage?: string) => void

) {

    const [isScriptGenerating, setIsScriptGenerating] = useState(false);

    const handleGenerateScript = useCallback(async (idea: string, count: number, selectedCharacterIds: string[], selectedProductIds: string[], director?: DirectorPreset) => {
        setIsScriptGenerating(true);
        setAgentState('dop', 'thinking', 'Đang phân tích ý tưởng và xây dựng kịch bản chi tiết...');


        try {
            const activePreset = getPresetById(state.activeScriptPreset, state.customScriptPresets);
            if (!activePreset) {
                throw new Error("Preset not found");
            }

            const activeCharacters = state.characters.filter(c => selectedCharacterIds.includes(c.id));
            const activeProducts = (state.products || []).filter(p => selectedProductIds.includes(p.id));

            const languageNames: Record<string, string> = {
                'vietnamese': 'Vietnamese',
                'language1': 'English',
                'spanish': 'Spanish',
                'chinese': 'Chinese (Mandarin)',
                'hindi': 'Hindi',
                'arabic': 'Arabic',
                'custom': state.customScriptLanguage || 'English'
            };
            const effectiveLanguage = languageNames[state.scriptLanguage] || 'English';

            // ═══════════════════════════════════════════════════════════════
            // STEP 1: VISUAL CLUSTERING (The "Director's Thinking" Phase)
            // ═══════════════════════════════════════════════════════════════
            setAgentState('director', 'thinking', 'Đang đọc hiểu và gom cụm chi tiết hình ảnh (Visual Clustering)...');

            const clusteringSystemPrompt = `
*** CRITICAL ROLE: VISUAL DIRECTOR ***
You are NOT a text splitter. You are a CINEMATIC ADAPTER.
Your job is to read the raw input and restructure it into merged VISUAL BLOCKS.

*** ALGORITHM (THE GOLDEN RULES) ***
1. **SCAN**: Read the input text.
2. **MERGE**: If Sentence A is "Subject Action" and Sentence B is "Subject Adjective", MERGE THEM into one block.
   - RAW: "He sees a mask. It is white. It has a beak."
   - BLOCKED: "Close-up of him looking at a WHITE MASK with a LONG BEAK." (1 Scene).
3. **NO FRAGMENTATION**: DO NOT create separate blocks for adjectives, colors, or materials.
4. **NARRATIVE FLOW**: Only create a new block when there is a significant CHANGE in Action, Location, or Time.
`;

            const clusteringUserPrompt = `
Analyze and REWRITE the following story concept into a list of "VISUAL SHOTS".
Don't worry about JSON format yet. Just simple text blocks.

INPUT STORY:
"${idea}"

OUTPUT FORMAT:
- Shot 1: [Description with merged details]
- Shot 2: [Description]
...
            `;

            // Call Step 1 via Groq
            const visualPlan = await callGeminiText(clusteringUserPrompt, clusteringSystemPrompt, false, state.scriptModel);
            console.log("Visual Plan:", visualPlan);

            // ═══════════════════════════════════════════════════════════════
            // STEP 2: JSON SCRIPT GENERATION
            // ═══════════════════════════════════════════════════════════════
            setAgentState('dop', 'thinking', 'Đang cấu trúc lại theo quy tắc 5-Shot và đóng gói dữ liệu...');

            // Pass the OPTIMIZED PLAN to the prompt builder instead of the raw idea
            const optimizedIdea = `
ORIGINAL CONCEPT: "${idea}"

OPTIMIZED VISUAL PLAN (STRICTLY FOLLOW THIS STRUCTURE):
${visualPlan}
            `;

            const prompt = buildScriptPrompt(optimizedIdea, activePreset, activeCharacters, activeProducts, count, effectiveLanguage, state.customScriptInstruction, director);

            // Build the scene schema description for JSON mode
            const sceneSchemaDescription = `
You must respond with a valid JSON object containing these fields:
{
  "global_story_context": "string - overall story/world setting",
  "detailed_story": "string - expanded narrative",
  "scene_groups": [
    {
      "id": "string - unique group ID",
      "name": "string - group name",
      "description": "string - group description",
      "continuity_reference_group_id": "string (optional) - reference to another group for continuity"
    }
  ],
  "scenes": [
    {
      "scene_number": "string - e.g. '1', '2', etc.",
      "group_id": "string - which group this scene belongs to",
      "prompt_name": "string - short descriptive name",
      "visual_context": "string - detailed visual description for image generation",
      "character_ids": ["array of character IDs appearing in this scene"],
      "product_ids": ["array of product IDs appearing in this scene"]
      ${activePreset.outputFormat.hasDialogue ? ',"dialogues": [{"characterName": "string", "line": "string"}]' : ''}
      ${activePreset.outputFormat.hasNarration ? ',"voiceover": "string - narration text"' : ''}
      ${activePreset.outputFormat.hasCameraAngles ? ',"camera_angle": "string - camera angle description"' : ''}
    }
  ]
}
`;

            const fullPrompt = `${prompt}

${sceneSchemaDescription}

Generate the script now. Respond ONLY with valid JSON.`;

            const rawText = await callGeminiText(fullPrompt, 'You are an expert film director and screenwriter.', true, state.scriptModel);

            // Parse JSON - handle potential markdown wrapping
            let jsonResponse;
            try {
                const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                jsonResponse = JSON.parse(cleanedText);
            } catch (e) {
                console.error('Failed to parse script JSON:', rawText);
                throw new Error('Failed to parse script response as JSON');
            }

            const finalScript = {
                globalStoryContext: jsonResponse.global_story_context || '',
                detailedStory: jsonResponse.detailed_story || '',
                groups: jsonResponse.scene_groups || [],
                scenes: jsonResponse.scenes || []
            };

            // --- Pre-Production Style Audit (The "Gatekeeper") ---
            setAgentState('director', 'thinking', 'Đang thực hiện Style Audit để đồng bộ visual DNA...', 'Pre-Prod Audit');

            const auditPrompt = `You are the AI Director. Audit the following generated scenes for visual and material consistency.
            
            SCENES:
            ${finalScript.scenes.map((s: any) => `Scene ${s.scene_number}: ${s.visual_context}`).join('\n')}


            GUIDELINES:
            1. Characters MUST have consistent visual DNA (materials, clothing descriptions, facial features) across all scenes.
            2. If you detect a character is described as "human" in one scene but "mannequin" in another, harmonize them.
            3. Synchronize lighting and weather keywords if they are in the same location/time.
            
            OUTPUT: JSON array of string (the corrected visual_context for each scene), same order.
            Respond with ONLY the JSON array, no explanation.`;

            try {
                const auditedTextsRaw = await callGeminiText(auditPrompt, 'System: Expert Film Director.', true, state.scriptModel);

                let auditedTexts;
                try {
                    const cleanedAudit = auditedTextsRaw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    auditedTexts = JSON.parse(cleanedAudit);
                } catch (e) {
                    console.error('Failed to parse audit response:', auditedTextsRaw);
                    auditedTexts = null;
                }

                if (Array.isArray(auditedTexts) && auditedTexts.length === finalScript.scenes.length) {
                    finalScript.scenes = finalScript.scenes.map((s: any, idx: number) => {
                        let newVisual = s.visual_context;
                        // Safety check: Ensure we have a valid string update
                        if (auditedTexts[idx]) {
                            if (typeof auditedTexts[idx] === 'string') {
                                newVisual = auditedTexts[idx];
                            } else if (typeof auditedTexts[idx] === 'object' && auditedTexts[idx].visual_context) {
                                newVisual = auditedTexts[idx].visual_context;
                            }
                        }
                        return { ...s, visual_context: newVisual };
                    });
                    setAgentState('director', 'success', 'Style Audit hoàn tất! Visual DNA đã được đồng bộ.');

                    // --- Extract Material Kit for future reference ---
                    const kitPrompt = `Based on these audited scenes, extract a "Material Kit" (5-10 technical words like 'brushed aluminum', 'cinematic lighting', '8k octane') that should be used in EVERY future prompt for this project to maintain visual DNA.
                    SCENES:
                    ${auditedTexts.slice(0, 3).join('\n')}
                    OUTPUT: Just the comma-separated words.`;

                    try {
                        const kit = await callGeminiText(kitPrompt, 'System: Expert Technical Director.', false, state.scriptModel);

                        updateStateAndRecord(s => ({
                            ...s,
                            researchNotes: {
                                ...s.researchNotes,
                                materialKit: kit
                            }
                        }));
                    } catch (e) { console.error('Kit extraction failed:', e); }
                }
            } catch (auditError) {

                console.error('Style Audit failed:', auditError);
                // Fallback: Continue with original scenes if audit fails
            }

            return finalScript;


        } catch (error) {

            console.error("Script generation failed:", error);
            alert("Tạo kịch bản thất bại. Vui lòng thử lại.");
            return null;
        } finally {
            setIsScriptGenerating(false);
        }
    }, [state, setApiKeyModalOpen]);

    const handleRegenerateGroup = useCallback(async (detailedStory: string, groupToRegen: any, allGroups: any[], sceneCount?: number) => {
        setIsScriptGenerating(true);
        setAgentState('dop', 'thinking', 'Đang tái cấu trúc nhóm phân cảnh...');


        try {
            const activePreset = getPresetById(state.activeScriptPreset, state.customScriptPresets);
            if (!activePreset) throw new Error("Preset not found");

            const languageNames: Record<string, string> = {
                'vietnamese': 'Vietnamese',
                'language1': 'English',
                'spanish': 'Spanish',
                'chinese': 'Chinese (Mandarin)',
                'hindi': 'Hindi',
                'arabic': 'Arabic',
                'custom': state.customScriptLanguage || 'English'
            };
            const effectiveLanguage = languageNames[state.scriptLanguage] || 'English';

            const prompt = buildGroupRegenerationPrompt(
                detailedStory,
                groupToRegen,
                allGroups,
                activePreset,
                state.characters,
                state.products || [],
                effectiveLanguage,
                state.customScriptInstruction,
                groupToRegen.pacing,
                sceneCount
            );

            const fullPrompt = `${prompt}

Respond with a JSON object containing a "scenes" array with the regenerated scenes.
Each scene should have: scene_number, group_id, prompt_name, visual_context, character_ids, product_ids.
Respond ONLY with valid JSON.`;

            const rawText = await callGeminiText(fullPrompt, 'You are an expert film director.', true, state.scriptModel);

            let jsonResponse;
            try {
                const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                jsonResponse = JSON.parse(cleanedText);
            } catch (e) {
                console.error('Failed to parse regeneration JSON:', rawText);
                throw new Error('Failed to parse regeneration response');
            }

            setAgentState('dop', 'success', 'Cấu trúc nhóm phân cảnh đã được cập nhật.');
            return jsonResponse.scenes || [];

        } catch (error) {
            console.error("Group regeneration failed:", error);
            alert("Tái tạo nhóm kịch bản thất bại.");
            return null;
        } finally {
            setIsScriptGenerating(false);
        }
    }, [state, setApiKeyModalOpen]);

    const handleSmartMapAssets = useCallback(async (scenes: any[], characters: Character[], products: Product[]) => {
        try {
            const mappingPrompt = `
            **TASK:** Audit this list of scenes and map the correct Character and Product IDs to each scene based on their visual description and dialogue.
            
            **AVAILABLE ASSETS:**
            Characters:
            ${JSON.stringify(characters.map(c => ({ id: c.id, name: c.name, description: c.description })), null, 2)}
            
            Products:
            ${JSON.stringify(products.map(p => ({ id: p.id, name: p.name, description: p.description })), null, 2)}
            
            **SCENES TO MAP:**
            ${JSON.stringify(scenes.map(s => ({
                scene_number: s.scene_number,
                visual_context: s.visual_context,
                dialogues: s.dialogues,
                voiceover: s.voiceover
            })), null, 2)}
            
            **RULES:**
            1. Characters should ONLY be mapped if they are EXPLICITLY mentioned by name or have DIALOGUE in this specific scene.
            2. DO NOT map characters based on ambiguous pronouns (like "he", "she", "they") unless their visual description is the primary focus of the "visual_context".
            3. Products should be mapped if they are the primary focus or interactable item in the scene.
            4. If a scene is environmental or purely landscape, both arrays should be empty.
            3. Return ONLY a JSON object where keys are "scene_number" and values are objects containing "character_ids" and "product_ids" arrays.
            
            **EXAMPLE FORMAT:**
            {
              "1": { "character_ids": ["id1", "id2"], "product_ids": ["prod1"] },
              "2": { "character_ids": ["id1"], "product_ids": [] }
            }
            `;

            const rawText = await callGeminiText(mappingPrompt, 'You are an expert script supervisor.', true, state.scriptModel);

            let result;
            try {
                const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                result = JSON.parse(cleanedText);
            } catch (e) {
                console.error('Failed to parse mapping JSON:', rawText);
                return null;
            }

            return result;
        } catch (error) {
            console.error("Smart mapping failed:", error);
            return null;
        }
    }, []);

    return {
        handleGenerateScript,
        handleRegenerateGroup,
        handleSmartMapAssets,
        isScriptGenerating
    };
}
