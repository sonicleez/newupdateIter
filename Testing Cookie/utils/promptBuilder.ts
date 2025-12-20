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
        ? `\n**AVAILABLE CHARACTERS:**\n${characterListString}\n\nSử dụng các nhân vật này trong script. Trả về 'character_ids' cho nhân vật XUẤT HIỆN trong cảnh.
MANDATORY: Khi một nhân vật xuất hiện, "visual_context" PHẢI mô tả chi tiết đặc điểm nhận dạng của họ (kiểu tóc, màu tóc, trang phục cụ thể, phụ kiện, biểu cảm) để AI tạo ảnh không bị bias.`
        : '';

    // Build product instructions
    const productInstructions = productListString
        ? `\n**AVAILABLE PRODUCTS/PROPS:**\n${productListString}\n\nĐây là các sản phẩm/đạo cụ có thể xuất hiện trong cảnh. Trả về 'product_ids' cho sản phẩm XUẤT HIỆN trong cảnh. 
MANDATORY: Mô tả cực kỳ chi tiết hình dáng, chất liệu, màu sắc và cách sản phẩm xuất hiện trong visual_context. Không dùng tên chung chung.`
        : '';

    // Build output format instructions based on preset
    let outputFormatInstructions = `\n**OUTPUT FORMAT (JSON Object):**\n`;

    outputFormatInstructions += `
- "detailed_story": "A comprehensive detailed story/script summary of the entire content (Detailed Script)."
- "scene_groups": [
    {
      "id": "group_id",
      "name": "Tên bối cảnh (VD: Boong tàu, Khoang tàu, Dưới nước)",
      "description": "Mô tả bối cảnh và diễn biến chung trong nhóm này",
      "continuity_reference_group_id": "id_nhóm_trước_đó" (Chỉ dùng nếu bối cảnh này lặp lại từ một nhóm phía trước để đảm bảo tính nhất quán)
    }
],
- "scenes": [
    {
        "visual_context": "BẮT ĐẦU bằng từ khóa cỡ cảnh (WIDE SHOT, CLOSE UP...). Mô tả chi tiết nhân vật (tóc, quần áo), bối cảnh và hành động.",
        "scene_number": "1",
        "group_id": "group_id",
        "prompt_name": "Tiêu đề cảnh",
        "character_ids": ["id1"],
        "product_ids": ["id1"]
`;

    if (preset.outputFormat.hasDialogue) {
        outputFormatInstructions += `        , "dialogues": [{ "characterName": "Tên nhân vật", "line": "Lời thoại" }]\n`;
    }

    if (preset.outputFormat.hasNarration) {
        outputFormatInstructions += `        , "voiceover": "Lời tường thuật"\n`;
    }

    if (preset.outputFormat.hasCameraAngles) {
        outputFormatInstructions += `        , "camera_angle": "Góc máy"\n`;
    }

    outputFormatInstructions += `    }
]

**IMPORTANT RULES:**
1. **Shot Scale**: "visual_context" BẮT ĐẦU bằng từ khóa cỡ cảnh viết hoa (VD: WIDE SHOT, MEDIUM SHOT, CLOSE UP).
2. **Character Detail**: Mô tả chi tiết ngoại hình (tóc, quần áo) của nhân vật TRONG MỖI CẢNH.
3. **High-Density Visuals**: Cung cấp mô tả độ phân giải cao về chất liệu, ánh sáng, da dẻ.
4. **Group Continuity**: Mọi cảnh trong bối cảnh mới PHẢI mô tả lại không khí chung của Group.
5. **No Ghost People**: NẾU KHÔNG CÓ character_ids, visual_context TUYỆT ĐỐI KHÔNG mô tả bất kỳ người nào.
6. **Integrity**: Chỉ sử dụng các character_id được cung cấp.
`;

    // Add custom instructions if present
    const customInstructionBlock = customInstruction?.trim()
        ? `\n**CUSTOM INSTRUCTIONS (META TOKENS):**\n${customInstruction}\n(Prioritize these instructions for tone and style)\n`
        : '';

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

---

${outputFormatInstructions}

---

**EXAMPLE OUTPUT:**
${preset.exampleOutput}

---

**YOUR TASK:**
Create EXACTLY ${sceneCount} scenes following the format and guidelines above.
Return ONLY a valid JSON array. Do NOT include any text outside the JSON.
`;

    return prompt;
}

/**
 * Build AI prompt for regenerating a specific group of scenes
 */
export function buildGroupRegenerationPrompt(
    fullScript: string,
    groupToRegen: { id: string; name: string; description: string },
    allGroups: any[],
    preset: ScriptPreset,
    characters: Character[],
    products: Product[],
    language: string,
    customInstruction?: string,
    pacing?: 'slow' | 'medium' | 'fast'
): string {
    const availableCharacters = characters
        .filter(c => c.name.trim() !== '')
        .map(c => ({ name: c.name, id: c.id, description: c.description }));

    const characterListString = JSON.stringify(availableCharacters, null, 2);

    const availableProducts = products
        .filter(p => p.name.trim() !== '')
        .map(p => ({ name: p.name, id: p.id, description: p.description }));

    const productListString = JSON.stringify(availableProducts, null, 2);

    const sceneProperties: any = {
        scene_number: "Keep sequence consistent with original",
        group_id: groupToRegen.id,
        prompt_name: "String",
        visual_context: "String",
        character_ids: ["Array of strings"],
        product_ids: ["Array of strings"]
    };

    if (preset.outputFormat.hasDialogue) sceneProperties.dialogues = [{ characterName: "Name", line: "Line" }];
    if (preset.outputFormat.hasNarration) sceneProperties.voiceover = "String";
    if (preset.outputFormat.hasCameraAngles) sceneProperties.camera_angle = "String";

    const pacingInstruction = pacing ? `
**PACING REQUIREMENT:**
This group must have a **${pacing.toUpperCase()}** pacing.
- **Slow:** Focus on long takes, emotional close-ups, environmental textures.
- **Medium/Balanced:** Standard cinematic narrative flow.
- **Fast:** Quick cuts, dynamic camera movement, energetic action.
` : '';

    const prompt = `
${preset.systemPrompt}

---

**CONTEXT - FULL STORY PLOT:**
"${fullScript}"

${pacingInstruction}

---

**YOUR SPECIFIC TASK:**
You are asked to REGENERATE the scenes for a specific group/location.
- **Group Name:** "${groupToRegen.name}"
- **Group Description:** "${groupToRegen.description}"

**OTHER GROUPS:**
${allGroups.map(g => `- ${g.name}: ${g.description}`).join('\n')}

---

**REQUIREMENTS:**
1. Create a logical sequence of 2-4 scenes for THIS GROUP ONLY.
1. Return ONLY the JSON. No conversational filler.
2. Write in ${language}.

**AVAILABLE CHARACTERS:**
${characterListString}

**AVAILABLE PRODUCTS:**
${productListString}

**CUSTOM STYLE:**
${customInstruction || 'None'}

---

**OUTPUT FORMAT:**
Return ONLY a valid JSON object:
{
  "scenes": [
    // Array of scene objects for THIS GROUP ONLY
  ]
}

**SCENE STRUCTURE:**
${JSON.stringify(sceneProperties, null, 2)}
`;

    return prompt;
}
