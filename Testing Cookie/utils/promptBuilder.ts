import { ScriptPreset, Character, Product } from '../types';

/**
 * Build AI prompt for script generation based on selected preset
 */
export function buildScriptPrompt(
    userIdea: string,
    preset: ScriptPreset,
    characters: Character[],
    products: Product[],
    sceneCount: number,
    language: string,
    customInstruction?: string
): string {
    // Filter characters with names
    const availableCharacters = characters
        .filter(c => c.name.trim() !== '')
        .map(c => ({ name: c.name, id: c.id, description: c.description }));

    const characterListString = availableCharacters.length > 0
        ? JSON.stringify(availableCharacters, null, 2)
        : 'Không có nhân vật được định nghĩa.';

    // Filter products with names
    const availableProducts = products
        .filter(p => p.name.trim() !== '')
        .map(p => ({ name: p.name, id: p.id, description: p.description }));

    const productListString = availableProducts.length > 0
        ? JSON.stringify(availableProducts, null, 2)
        : null;

    // Build character instructions based on preset
    const characterInstructions = preset.outputFormat.hasDialogue && availableCharacters.length > 0
        ? `\n**AVAILABLE CHARACTERS:**\n${characterListString}\n\nSử dụng các nhân vật này trong script. Trả về 'character_ids' cho nhân vật XUẤT HIỆN trong cảnh.`
        : '';

    // Build product instructions
    const productInstructions = productListString
        ? `\n**AVAILABLE PRODUCTS/PROPS:**\n${productListString}\n\nĐây là các sản phẩm/đạo cụ có thể xuất hiện trong cảnh. Trả về 'product_ids' cho sản phẩm XUẤT HIỆN trong cảnh. Mô tả chi tiết cách sản phẩm xuất hiện trong visual_context.`
        : '';

    // Build output format instructions based on preset
    let outputFormatInstructions = `\n**OUTPUT FORMAT (JSON Object):**\n`;

    outputFormatInstructions += `
- "detailed_story": "A comprehensive detailed story/script summary of the entire content (Detailed Script)."
- "scenes": [
    // Array of scene objects
    {
        "visual_context": "Mô tả hình ảnh chi tiết cho AI image generation (bao gồm cả sản phẩm/đạo cụ nếu có)",
        "scene_number": "1", "2", "3", ...
        "prompt_name": "Tiêu đề ngắn gọn của cảnh",
        "character_ids": ["id1", "id2"] (array of character IDs visible in scene)
        "product_ids": ["id1"] (array of product IDs visible in scene)

IMPORTANT:
1. **Cinematic Logic & Flow**: Start with a "HOOK" in Scene 1. Use a variety of cinematic shots (OTS for dialogue, Cutaways for details, Flycam/Bird-view for scale). Avoid repetitive Medium Shots.
2. **Visual Continuity (Image-to-Video)**: Ensure character appearance, lighting, and environment stay consistent between adjacent scenes to allow for smooth Image-to-Video motion.
3. **Avoid Over-Stuffing**: In "visual_context", do NOT re-list the entire character description if they were defined earlier. Focus on their current ACTION, POSITION, and LIGHTING in the specific scene.
4. **Scene Recommendations**: For a compelling story, aim for 8-12 scenes. Ensure there is "visual breathing room" (detail shots without characters).
5. **Logic**:
   - The story MUST feature the selected "AVAILABLE CHARACTERS".
   - If a character/product is mentioned, include their exact ID in "character_ids" or "product_ids".
   - Environment/Cutaway shots: If no characters are present, leave "character_ids" empty [].
   - **CRITICAL VISUAL CONTINUITY**: Cutaway/Detail shots MUST match the lighting, color palette, and location of the current scene.
`;

    // Add custom instructions if present
    const customInstructionBlock = customInstruction?.trim()
        ? `\n**CUSTOM INSTRUCTIONS (META TOKENS):**\n${customInstruction}\n(Prioritize these instructions for tone and style)\n`
        : '';

    if (preset.outputFormat.hasDialogue) {
        outputFormatInstructions += `        "dialogues": [{ "characterName": "Tên nhân vật", "line": "Lời thoại" }],\n`;
    }

    if (preset.outputFormat.hasNarration) {
        outputFormatInstructions += `        "voiceover": "Lời tường thuật/narration",\n`;
    }

    if (preset.outputFormat.hasCameraAngles) {
        outputFormatInstructions += `        "camera_angle": "Góc máy và chuyển động",\n`;
    }

    // Close object and array
    outputFormatInstructions += `    }
]`;

    // Full prompt construction
    const prompt = `
${preset.systemPrompt}

---

**STORY CONCEPT:**
"${userIdea}"

${characterInstructions}
${productInstructions}

---

**TONE & STYLE:**
${preset.toneKeywords.join(', ')}
${customInstructionBlock}

**LANGUAGE REQUIREMENT:**
Write all dialogues, voiceovers, and narration in ${language}.

**SCENE STRUCTURE GUIDELINES:**
${preset.sceneGuidelines}

${outputFormatInstructions}

---

**EXAMPLE OUTPUT:**
${preset.exampleOutput}

---

**YOUR TASK:**
Create EXACTLY ${sceneCount} scenes following the format and guidelines above.
Return ONLY a valid JSON array. Do NOT include any text outside the JSON array.

Each scene must follow the structure precisely as shown in the example.
`;

    return prompt;
}
