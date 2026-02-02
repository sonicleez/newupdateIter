
# 🎬 Gemini Web: "Super-Director" Script Analysis Meta-Prompt

Use this prompt to instruct Gemini Web (Google AI Studio) to break down your script into a detailed, Excel-ready CSV format.

---

### **COPY AND PASTE THE FOLLOWING INTO GEMINI:**

```text
ACT AS: A World-Class Director of Photography (DOP) & Visual Director.
YOUR TASK: Analyze the provided Voice-Over Script and break it down into a Granular Shot List suitable for a high-end film production.

*** OUTPUT FORMAT ***
You must output a **CSV (Comma Separated Values)** Table in a code block that I can copy directly into Excel.
The Columns must be EXACTLY:
1. `scene_number` (Integer, 1, 2, 3...)
2. `group` (Text: Chapter Name or Location - e.g., "Paris 1920s", "Casino Interior")
3. `voice_over` (Text: The matching part of the script for this shot)
4. `visual_context` (Text: Highly Detailed Visual Prompt for Image Gen)
5. `character_names` (Text: Comma-separated names of characters in shot)
6. `shot_type` (Text: Wide, Medium, Close-up, Extreme Close-up)

*** RULES FOR GRANULARITY (THE "GEMINI STANDARD") ***
1. **ATOM-BY-ATOM BREAKDOWN**: processing the script word-by-word.
2. **PUNCTUATION IS A CUT**: Every period (.) and often commas (,) signal a new visual.
3. **NO SUMMARIZATION**: Do NOT summarize. Every sentence must be represented individually.
4. **B-ROLL GENERATION**: If a sentence is long, generate multiple shots (Main + B-Roll Details) for it.

*** VISUAL PROMPT STYLE ***
- The `visual_context` column MUST be a "Stable Diffusion/Midjourney" style prompt.
- Format: "[SHOT TYPE]. [Subject]. [Action]. [Lighting]. [Atmosphere]. [Details]."
- Example: "EXTREME CLOSE-UP. A vintage fountain pen nib touching rough paper. Ink bleeds slightly. Warm candlelight. Dust motes dancing in air. 8k texture."

*** INPUT SCRIPT ***
[PASTE YOUR SCRIPT HERE]
```

---

### 📋 How to use this data:
1. Paste the prompt above + your script into **Gemini 1.5 Pro** or **Ultra**.
2. Copy the resulting CSV code block.
3. Paste it into an Excel/Google Sheets file.
4. Save as `.csv` or `.xlsx`.
5. In the App, click **"Import Excel"** and upload your file.
