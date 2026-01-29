// Legacy Gemini AI Client - Migrated to Groq
// This file is kept for backward compatibility but now uses Groq via proxy

/**
 * Get or create a Groq-compatible client stub
 * Note: All actual API calls now go through the server proxy
 */
export function getGeminiClient(apiKey: string): { apiKey: string } {
    const trimmedKey = apiKey?.trim();

    if (!trimmedKey) {
        throw new Error('API key is required');
    }

    console.log('[GeminiClient] Using Groq proxy (legacy compatibility mode)');
    return { apiKey: trimmedKey };
}

/**
 * Clear the cached client (no-op in new architecture)
 */
export function clearGeminiClient(): void {
    console.log('[GeminiClient] Cleared (no-op in Groq mode)');
}

/**
 * Check if client exists (always true in new architecture)
 */
export function hasGeminiClient(): boolean {
    return true;
}
