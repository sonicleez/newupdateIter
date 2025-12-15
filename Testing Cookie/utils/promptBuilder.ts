import { ScriptPreset, Character, Product } from '../types';

/**
 * Build AI prompt for script generation based on selected preset
 */
export function buildScriptPrompt(
    userIdea: string,
    preset: ScriptPreset,
    characters: Character[],
    products: Product[],
    sceneCount: number
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
    let outputFormatInstructions = `\n**OUTPUT FORMAT (JSON Array):**\n`;

    if (preset.outputFormat.hasDialogue) {
        outputFormatInstructions += `
- "dialogues": [{ "characterName": "Tên nhân vật", "line": "Lời thoại" }]`;
    }

    if (preset.outputFormat.hasNarration) {
        outputFormatInstructions += `
- "voiceover": "Lời tường thuật/narration"`;
    }

    if (preset.outputFormat.hasCameraAngles) {
        outputFormatInstructions += `
- "camera_angle": "Góc máy và chuyển động (VD: WIDE SHOT, MEDIUM SHOT, CLOSE-UP, OTS, etc.)"`;
    }

    outputFormatInstructions += `
- "visual_context": "Mô tả hình ảnh chi tiết cho AI image generation (bao gồm cả sản phẩm/đạo cụ nếu có)"
- "scene_number": "1", "2", "3", ...
- "prompt_name": "Tiêu đề ngắn gọn của cảnh"
- "character_ids": ["id1", "id2"] (array of character IDs visible in scene, empty [] if no characters)
- "product_ids": ["id1"] (array of product IDs visible in scene, empty [] if no products)
`;

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
