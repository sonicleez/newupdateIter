/**
 * Director Brain - Evolving AI Director System
 * 
 * Learns from user preferences over time to:
 * - Recommend directors based on scene context
 * - Suggest meta tokens 
 * - Track style preferences
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface StylePreference {
    preferredColors: string[];
    avoidColors: string[];
    preferredLighting: string[];
    preferredAngles: string[];
    successCount: number;
    totalCount: number;
}

export interface DirectorAffinity {
    directorId: string;
    directorName: string;
    usageCount: number;
    likeCount: number;
    contexts: string[];  // Which scene contexts this director was used for
    lastUsed: number;    // Timestamp
}

export interface LearnedTokens {
    positive: { token: string; weight: number }[];
    negative: { token: string; weight: number }[];
}

export interface SceneMemory {
    sceneId: string;
    context: string;       // Scene description/context
    directorId: string;
    stylePrompt: string;
    metaTokens: string;
    liked: boolean;
    timestamp: number;
    detectedMood: string;  // Auto-detected mood from context
}

export interface DirectorMemory {
    version: number;
    createdAt: number;
    updatedAt: number;

    // Core memories
    stylePreferences: Record<string, StylePreference>;  // key = detected mood/context
    directorAffinities: Record<string, DirectorAffinity>;
    learnedTokens: LearnedTokens;
    sceneHistory: SceneMemory[];  // Last N scenes for learning

    // Stats
    totalLikes: number;
    totalDislikes: number;
    totalGenerations: number;
}

// ============================================================
// CONTEXT DETECTION
// ============================================================

const MOOD_KEYWORDS: Record<string, string[]> = {
    action: ['fight', 'chase', 'explosion', 'running', 'battle', 'war', 'attack', 'combat', 'shoot', 'punch', 'kick'],
    romantic: ['love', 'kiss', 'embrace', 'tender', 'romantic', 'couple', 'heart', 'passion', 'wedding'],
    horror: ['dark', 'scary', 'monster', 'fear', 'terror', 'creepy', 'ghost', 'demon', 'blood', 'death'],
    dramatic: ['intense', 'confrontation', 'argument', 'emotional', 'crying', 'anger', 'sad', 'grief'],
    comedy: ['funny', 'laugh', 'joke', 'silly', 'humorous', 'comic', 'playful'],
    mystery: ['detective', 'clue', 'investigate', 'secret', 'hidden', 'shadow', 'noir'],
    scifi: ['space', 'future', 'robot', 'alien', 'technology', 'cyber', 'hologram', 'spacecraft'],
    fantasy: ['magic', 'dragon', 'wizard', 'fairy', 'mythical', 'enchanted', 'spell', 'kingdom'],
    documentary: ['real', 'interview', 'narration', 'factual', 'historical'],
    dialogue: ['talking', 'conversation', 'meeting', 'discuss', 'speak', 'chat'],
    establishing: ['wide', 'landscape', 'city', 'building', 'exterior', 'environment', 'location'],
};

export function detectSceneMood(contextDescription: string): string {
    const text = contextDescription.toLowerCase();
    const scores: Record<string, number> = {};

    for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
        scores[mood] = keywords.filter(kw => text.includes(kw)).length;
    }

    const maxScore = Math.max(...Object.values(scores));
    if (maxScore === 0) return 'general';

    return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'general';
}

// ============================================================
// STORAGE
// ============================================================

const STORAGE_KEY = 'genyu_director_brain';
const MAX_SCENE_HISTORY = 200;

function getDefaultMemory(): DirectorMemory {
    return {
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stylePreferences: {},
        directorAffinities: {},
        learnedTokens: { positive: [], negative: [] },
        sceneHistory: [],
        totalLikes: 0,
        totalDislikes: 0,
        totalGenerations: 0,
    };
}

export function loadDirectorMemory(): DirectorMemory {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored) as DirectorMemory;
        }
    } catch (err) {
        console.warn('[DirectorBrain] Failed to load memory:', err);
    }
    return getDefaultMemory();
}

export function saveDirectorMemory(memory: DirectorMemory): void {
    try {
        memory.updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
        console.log('[DirectorBrain] Memory saved. Total generations:', memory.totalGenerations);
    } catch (err) {
        console.error('[DirectorBrain] Failed to save memory:', err);
    }
}

export function resetDirectorMemory(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[DirectorBrain] Memory reset.');
}

// ============================================================
// LEARNING FUNCTIONS
// ============================================================

/**
 * Record a new generation (neutral signal - just tracking usage)
 */
export function recordGeneration(
    memory: DirectorMemory,
    sceneId: string,
    context: string,
    directorId: string,
    directorName: string,
    stylePrompt: string,
    metaTokens: string
): DirectorMemory {
    const mood = detectSceneMood(context);

    // Update director usage
    if (!memory.directorAffinities[directorId]) {
        memory.directorAffinities[directorId] = {
            directorId,
            directorName,
            usageCount: 0,
            likeCount: 0,
            contexts: [],
            lastUsed: Date.now(),
        };
    }
    memory.directorAffinities[directorId].usageCount++;
    memory.directorAffinities[directorId].lastUsed = Date.now();
    if (!memory.directorAffinities[directorId].contexts.includes(mood)) {
        memory.directorAffinities[directorId].contexts.push(mood);
    }

    // Add to scene history
    memory.sceneHistory.push({
        sceneId,
        context,
        directorId,
        stylePrompt,
        metaTokens,
        liked: false, // Will be updated if user likes
        timestamp: Date.now(),
        detectedMood: mood,
    });

    // Trim history
    if (memory.sceneHistory.length > MAX_SCENE_HISTORY) {
        memory.sceneHistory = memory.sceneHistory.slice(-MAX_SCENE_HISTORY);
    }

    memory.totalGenerations++;
    return memory;
}

/**
 * Record a LIKE signal (user kept the image, explicitly liked, or saved)
 */
export function recordLike(
    memory: DirectorMemory,
    sceneId: string
): DirectorMemory {
    const scene = memory.sceneHistory.find(s => s.sceneId === sceneId);
    if (!scene) return memory;

    scene.liked = true;
    memory.totalLikes++;

    // Boost director affinity
    if (memory.directorAffinities[scene.directorId]) {
        memory.directorAffinities[scene.directorId].likeCount++;
    }

    // Learn positive tokens
    if (scene.metaTokens) {
        const tokens = scene.metaTokens.split(',').map(t => t.trim()).filter(Boolean);
        for (const token of tokens) {
            const existing = memory.learnedTokens.positive.find(t => t.token === token);
            if (existing) {
                existing.weight += 1;
            } else {
                memory.learnedTokens.positive.push({ token, weight: 1 });
            }
        }
    }

    // Update style preference for this mood
    const mood = scene.detectedMood;
    if (!memory.stylePreferences[mood]) {
        memory.stylePreferences[mood] = {
            preferredColors: [],
            avoidColors: [],
            preferredLighting: [],
            preferredAngles: [],
            successCount: 0,
            totalCount: 0,
        };
    }
    memory.stylePreferences[mood].successCount++;
    memory.stylePreferences[mood].totalCount++;

    console.log(`[DirectorBrain] 👍 Recorded LIKE for scene ${sceneId}. Mood: ${mood}`);
    return memory;
}

/**
 * Record a DISLIKE signal (user rejected the image)
 */
export function recordDislike(
    memory: DirectorMemory,
    sceneId: string,
    reason?: string
): DirectorMemory {
    const scene = memory.sceneHistory.find(s => s.sceneId === sceneId);
    if (!scene) return memory;

    memory.totalDislikes++;

    // Learn negative tokens
    if (scene.metaTokens) {
        const tokens = scene.metaTokens.split(',').map(t => t.trim()).filter(Boolean);
        for (const token of tokens) {
            const existing = memory.learnedTokens.negative.find(t => t.token === token);
            if (existing) {
                existing.weight += 1;
            } else {
                memory.learnedTokens.negative.push({ token, weight: 1 });
            }
        }
    }

    // Update style preference
    const mood = scene.detectedMood;
    if (!memory.stylePreferences[mood]) {
        memory.stylePreferences[mood] = {
            preferredColors: [],
            avoidColors: [],
            preferredLighting: [],
            preferredAngles: [],
            successCount: 0,
            totalCount: 0,
        };
    }
    memory.stylePreferences[mood].totalCount++;

    console.log(`[DirectorBrain] 👎 Recorded DISLIKE for scene ${sceneId}. Reason: ${reason || 'unspecified'}`);
    return memory;
}

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================

export interface DirectorRecommendation {
    directorId: string;
    directorName: string;
    confidence: number;  // 0-100
    reason: string;
}

/**
 * Get director recommendations for a scene context
 */
export function getDirectorRecommendations(
    memory: DirectorMemory,
    sceneContext: string,
    topN: number = 3
): DirectorRecommendation[] {
    const mood = detectSceneMood(sceneContext);
    const recommendations: DirectorRecommendation[] = [];

    // Score each director based on affinity for this mood
    for (const [id, affinity] of Object.entries(memory.directorAffinities)) {
        if (affinity.usageCount < 2) continue; // Need at least 2 uses

        const likeRate = affinity.likeCount / affinity.usageCount;
        const moodMatch = affinity.contexts.includes(mood) ? 1.5 : 1;
        const recencyBonus = (Date.now() - affinity.lastUsed) < 86400000 ? 1.2 : 1; // Used in last 24h

        const score = (likeRate * 100) * moodMatch * recencyBonus;

        if (score > 30) { // Minimum threshold
            recommendations.push({
                directorId: id,
                directorName: affinity.directorName,
                confidence: Math.min(Math.round(score), 100),
                reason: likeRate >= 0.7
                    ? `${Math.round(likeRate * 100)}% success rate for ${mood} scenes`
                    : `Used ${affinity.usageCount} times for similar scenes`,
            });
        }
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations.slice(0, topN);
}

/**
 * Get suggested meta tokens based on learning
 */
export function getSuggestedTokens(memory: DirectorMemory, topN: number = 5): string[] {
    // Get positive tokens with high weight, excluding negative ones
    const negativeSet = new Set(memory.learnedTokens.negative.filter(t => t.weight >= 2).map(t => t.token));

    return memory.learnedTokens.positive
        .filter(t => t.weight >= 2 && !negativeSet.has(t.token))
        .sort((a, b) => b.weight - a.weight)
        .slice(0, topN)
        .map(t => t.token);
}

/**
 * Get success rate for a given mood
 */
export function getMoodSuccessRate(memory: DirectorMemory, mood: string): number | null {
    const pref = memory.stylePreferences[mood];
    if (!pref || pref.totalCount < 3) return null;
    return Math.round((pref.successCount / pref.totalCount) * 100);
}

// ============================================================
// STATS & INSIGHTS
// ============================================================

export interface DirectorInsights {
    totalGenerations: number;
    overallSuccessRate: number;
    topDirector: { name: string; successRate: number } | null;
    favoriteStyle: string | null;
    suggestedTokens: string[];
}

export function getDirectorInsights(memory: DirectorMemory): DirectorInsights {
    const overallSuccessRate = memory.totalGenerations > 0
        ? Math.round((memory.totalLikes / memory.totalGenerations) * 100)
        : 0;

    // Find top director by like rate
    let topDirector: { name: string; successRate: number } | null = null;
    let maxRate = 0;
    for (const affinity of Object.values(memory.directorAffinities)) {
        if (affinity.usageCount >= 5) {
            const rate = affinity.likeCount / affinity.usageCount;
            if (rate > maxRate) {
                maxRate = rate;
                topDirector = { name: affinity.directorName, successRate: Math.round(rate * 100) };
            }
        }
    }

    // Find favorite style (most successful mood)
    let favoriteStyle: string | null = null;
    let maxSuccess = 0;
    for (const [mood, pref] of Object.entries(memory.stylePreferences)) {
        if (pref.totalCount >= 5 && pref.successCount > maxSuccess) {
            maxSuccess = pref.successCount;
            favoriteStyle = mood;
        }
    }

    return {
        totalGenerations: memory.totalGenerations,
        overallSuccessRate,
        topDirector,
        favoriteStyle,
        suggestedTokens: getSuggestedTokens(memory, 5),
    };
}

console.log('[DirectorBrain] Module loaded. Ready to learn!');
