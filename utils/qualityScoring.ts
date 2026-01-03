/**
 * Quality Scoring System
 * 
 * Uses Gemini Vision to analyze generated images and score quality.
 * Provides feedback for auto-retry and learning system.
 */

import { GoogleGenAI } from "@google/genai";

export interface QualityScore {
    overall: number;          // 0-1 overall score
    fullBodyVisible: number;  // 0-1 full body check
    backgroundClean: number;  // 0-1 clean background check
    faceClarity: number;      // 0-1 face sharpness
    matchesDescription: number; // 0-1 matches prompt
    singleSubject: number;    // 0-1 only one subject
    issues: string[];         // List of detected issues
    suggestions: string[];    // Improvement suggestions
}

export interface QualityCheckResult {
    score: QualityScore;
    shouldRetry: boolean;
    refinedPrompt?: string;
}

/**
 * Analyze image quality using Gemini Vision
 */
export async function checkImageQuality(
    imageBase64: string,
    originalPrompt: string,
    mode: 'character' | 'scene',
    apiKey: string
): Promise<QualityScore> {
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

        // Prepare image data
        let data = imageBase64;
        let mimeType = 'image/jpeg';

        if (imageBase64.startsWith('data:')) {
            const [header, base64Data] = imageBase64.split(',');
            data = base64Data;
            mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
        }

        const checkPrompt = mode === 'character'
            ? getCharacterCheckPrompt(originalPrompt)
            : getSceneCheckPrompt(originalPrompt);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: {
                parts: [
                    { inlineData: { data, mimeType } },
                    { text: checkPrompt }
                ]
            },
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(
            response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}'
        );

        // Calculate overall score
        const scores = [
            result.fullBodyVisible ?? 1,
            result.backgroundClean ?? 1,
            result.faceClarity ?? 1,
            result.matchesDescription ?? 1,
            result.singleSubject ?? 1
        ];
        const overall = scores.reduce((a, b) => a + b, 0) / scores.length;

        console.log('[Quality Check] Results:', { overall, ...result });

        return {
            overall,
            fullBodyVisible: result.fullBodyVisible ?? 1,
            backgroundClean: result.backgroundClean ?? 1,
            faceClarity: result.faceClarity ?? 1,
            matchesDescription: result.matchesDescription ?? 1,
            singleSubject: result.singleSubject ?? 1,
            issues: result.issues || [],
            suggestions: result.suggestions || []
        };
    } catch (err) {
        console.error('[Quality Check] Failed:', err);
        // Return neutral scores on error
        return {
            overall: 0.5,
            fullBodyVisible: 0.5,
            backgroundClean: 0.5,
            faceClarity: 0.5,
            matchesDescription: 0.5,
            singleSubject: 0.5,
            issues: ['Quality check failed'],
            suggestions: []
        };
    }
}

/**
 * Get character-specific quality check prompt
 */
function getCharacterCheckPrompt(originalPrompt: string): string {
    return `Analyze this CHARACTER REFERENCE image for quality.

Original description: "${originalPrompt}"

Score each criteria from 0.0 to 1.0:

1. fullBodyVisible: Is the FULL BODY visible from head to toe? (feet must be visible)
   - 1.0 = Full body, feet clearly visible
   - 0.7 = Almost full body, feet cut off
   - 0.3 = Only upper body or headshot
   - 0.0 = Just face/head close-up

2. backgroundClean: Is the background clean white/solid color?
   - 1.0 = Pure white studio background
   - 0.7 = Light gray or off-white
   - 0.3 = Colored but plain
   - 0.0 = Busy/complex background

3. faceClarity: How sharp/clear is the face?
   - 1.0 = Crystal clear, highly detailed
   - 0.7 = Good clarity, slight blur
   - 0.3 = Noticeably blurry
   - 0.0 = Very blurry or distorted

4. matchesDescription: Does the image match the description?
   - 1.0 = Perfect match
   - 0.7 = Mostly matches
   - 0.3 = Partial match
   - 0.0 = Completely different

5. singleSubject: Is there only ONE subject in the image?
   - 1.0 = Single subject only
   - 0.5 = Small duplicates visible
   - 0.0 = Multiple full characters

Return JSON:
{
  "fullBodyVisible": 0.0-1.0,
  "backgroundClean": 0.0-1.0,
  "faceClarity": 0.0-1.0,
  "matchesDescription": 0.0-1.0,
  "singleSubject": 0.0-1.0,
  "issues": ["issue1", "issue2"],
  "suggestions": ["Add 'full body' keyword", "Use 9:16 aspect ratio"]
}`;
}

/**
 * Get scene-specific quality check prompt
 */
function getSceneCheckPrompt(originalPrompt: string): string {
    return `Analyze this SCENE/IMAGE for quality.

Original description: "${originalPrompt}"

Score each criteria from 0.0 to 1.0:

1. fullBodyVisible: Are subjects properly framed? (N/A for landscapes = 1.0)
   - 1.0 = Subjects properly framed
   - 0.5 = Awkward cropping
   - 0.0 = Important parts cut off

2. backgroundClean: Is the composition clean?
   - 1.0 = Clean, balanced composition
   - 0.5 = Acceptable
   - 0.0 = Cluttered/chaotic

3. faceClarity: Image sharpness overall
   - 1.0 = Sharp and detailed
   - 0.5 = Acceptable
   - 0.0 = Blurry

4. matchesDescription: Does the image match the description?
   - 1.0 = Perfect match
   - 0.7 = Mostly matches
   - 0.3 = Partial match
   - 0.0 = Completely different

5. singleSubject: Proper subject focus (1.0 if appropriate)
   - 1.0 = Clear focus on intended subject(s)
   - 0.5 = Focus unclear
   - 0.0 = Wrong subject

Return JSON:
{
  "fullBodyVisible": 0.0-1.0,
  "backgroundClean": 0.0-1.0,
  "faceClarity": 0.0-1.0,
  "matchesDescription": 0.0-1.0,
  "singleSubject": 0.0-1.0,
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1"]
}`;
}

/**
 * Decide if image should be retried based on quality score
 */
export function shouldAutoRetry(score: QualityScore, mode: 'character' | 'scene'): boolean {
    if (mode === 'character') {
        // Character mode: Strict requirements
        return (
            score.overall < 0.7 ||
            score.fullBodyVisible < 0.6 ||
            score.backgroundClean < 0.6 ||
            score.singleSubject < 0.8
        );
    }

    // Scene mode: More lenient
    return score.overall < 0.5 || score.matchesDescription < 0.5;
}

/**
 * Generate refined prompt based on quality issues
 */
export function generateRefinedPrompt(
    originalPrompt: string,
    score: QualityScore,
    mode: 'character' | 'scene'
): string {
    const additions: string[] = [];

    if (mode === 'character') {
        if (score.fullBodyVisible < 0.7) {
            additions.push('CRITICAL: FULL BODY from head to toe, feet must be visible');
        }
        if (score.backgroundClean < 0.7) {
            additions.push('PURE WHITE STUDIO BACKGROUND, no other colors');
        }
        if (score.singleSubject < 0.8) {
            additions.push('EXACTLY ONE SUBJECT, no duplicates, no multiple views');
        }
        if (score.faceClarity < 0.7) {
            additions.push('ultra-sharp face details, 8K quality');
        }
    }

    if (score.matchesDescription < 0.7) {
        additions.push(`MUST MATCH: ${originalPrompt}`);
    }

    if (additions.length === 0) {
        return originalPrompt;
    }

    return `${additions.join('. ')}. ${originalPrompt}`;
}

/**
 * Full quality check with retry decision
 */
export async function performQualityCheck(
    imageBase64: string,
    originalPrompt: string,
    mode: 'character' | 'scene',
    apiKey: string
): Promise<QualityCheckResult> {
    const score = await checkImageQuality(imageBase64, originalPrompt, mode, apiKey);
    const shouldRetry = shouldAutoRetry(score, mode);

    let refinedPrompt: string | undefined;
    if (shouldRetry) {
        refinedPrompt = generateRefinedPrompt(originalPrompt, score, mode);
    }

    return {
        score,
        shouldRetry,
        refinedPrompt
    };
}

console.log('[Quality Scoring] Module loaded');
