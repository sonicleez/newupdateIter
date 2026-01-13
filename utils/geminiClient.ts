// Singleton Gemini AI Client
// Tránh tạo nhiều GoogleGenAI instances - giảm memory overhead

import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let cachedApiKey: string | null = null;

/**
 * Get or create a singleton GoogleGenAI client
 * Only creates new instance if API key changes
 */
export function getGeminiClient(apiKey: string): GoogleGenAI {
    const trimmedKey = apiKey?.trim();

    if (!trimmedKey) {
        throw new Error('API key is required');
    }

    // Reuse existing instance if key hasn't changed
    if (aiInstance && cachedApiKey === trimmedKey) {
        return aiInstance;
    }

    // Create new instance
    aiInstance = new GoogleGenAI({ apiKey: trimmedKey });
    cachedApiKey = trimmedKey;

    console.log('[GeminiClient] Created new singleton instance');
    return aiInstance;
}

/**
 * Clear the cached client (useful for logout)
 */
export function clearGeminiClient(): void {
    aiInstance = null;
    cachedApiKey = null;
    console.log('[GeminiClient] Cleared singleton instance');
}

/**
 * Check if client exists
 */
export function hasGeminiClient(): boolean {
    return aiInstance !== null;
}
