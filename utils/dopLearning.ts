/**
 * DOP Learning System
 * 
 * Tracks successful prompts and learns patterns for each model.
 * Stores in localStorage and optionally syncs to cloud.
 */

import { detectModelType, ModelType } from './promptNormalizer';

// Types
export interface PromptRecord {
    id: string;
    prompt: string;
    normalizedPrompt: string;
    modelId: string;
    modelType: ModelType;
    mode: 'character' | 'scene';
    aspectRatio: string;
    qualityScore?: number; // 0-1, set after quality check
    wasApproved: boolean; // User clicked "Save" or "Use"
    createdAt: string;
}

export interface ModelLearnings {
    modelType: ModelType;
    successfulPatterns: string[]; // Common keywords in successful prompts
    avgQualityScore: number;
    totalGenerations: number;
    approvalRate: number;
    bestAspectRatios: { [ar: string]: number }; // AR -> success count
    commonKeywords: { [keyword: string]: number }; // keyword -> frequency
}

// Storage key
const STORAGE_KEY = 'dop_learning_data';
const MAX_RECORDS = 500; // Keep last 500 records

// Load/Save functions
function loadData(): { records: PromptRecord[]; learnings: { [key: string]: ModelLearnings } } {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('[DOP Learning] Failed to load data:', e);
    }
    return { records: [], learnings: {} };
}

function saveData(data: { records: PromptRecord[]; learnings: { [key: string]: ModelLearnings } }) {
    try {
        // Keep only last MAX_RECORDS
        if (data.records.length > MAX_RECORDS) {
            data.records = data.records.slice(-MAX_RECORDS);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('[DOP Learning] Failed to save data:', e);
    }
}

// Generate unique ID
function generateId(): string {
    return `dop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Record a prompt generation
 */
export function recordPrompt(
    prompt: string,
    normalizedPrompt: string,
    modelId: string,
    mode: 'character' | 'scene',
    aspectRatio: string
): string {
    const data = loadData();
    const modelType = detectModelType(modelId);

    const record: PromptRecord = {
        id: generateId(),
        prompt,
        normalizedPrompt,
        modelId,
        modelType,
        mode,
        aspectRatio,
        wasApproved: false,
        createdAt: new Date().toISOString()
    };

    data.records.push(record);
    saveData(data);

    console.log('[DOP Learning] Recorded prompt:', record.id);
    return record.id;
}

/**
 * Mark a prompt as approved (user saved/used the result)
 */
export function approvePrompt(recordId: string, qualityScore?: number) {
    const data = loadData();
    const record = data.records.find(r => r.id === recordId);

    if (record) {
        record.wasApproved = true;
        if (qualityScore !== undefined) {
            record.qualityScore = qualityScore;
        }

        // Update learnings for this model type
        updateModelLearnings(data, record);
        saveData(data);

        console.log('[DOP Learning] Approved prompt:', recordId, 'score:', qualityScore);
    }
}

/**
 * Update model learnings based on approved prompt
 */
function updateModelLearnings(
    data: { records: PromptRecord[]; learnings: { [key: string]: ModelLearnings } },
    record: PromptRecord
) {
    const key = record.modelType;

    if (!data.learnings[key]) {
        data.learnings[key] = {
            modelType: record.modelType,
            successfulPatterns: [],
            avgQualityScore: 0,
            totalGenerations: 0,
            approvalRate: 0,
            bestAspectRatios: {},
            commonKeywords: {}
        };
    }

    const learning = data.learnings[key];
    learning.totalGenerations++;

    // Update approval rate
    const approvedCount = data.records.filter(r => r.modelType === key && r.wasApproved).length;
    const totalCount = data.records.filter(r => r.modelType === key).length;
    learning.approvalRate = totalCount > 0 ? approvedCount / totalCount : 0;

    // Update avg quality score
    if (record.qualityScore !== undefined) {
        const scoresRecords = data.records.filter(r => r.modelType === key && r.qualityScore !== undefined);
        const avgScore = scoresRecords.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / scoresRecords.length;
        learning.avgQualityScore = avgScore;
    }

    // Track aspect ratio success
    learning.bestAspectRatios[record.aspectRatio] = (learning.bestAspectRatios[record.aspectRatio] || 0) + 1;

    // Extract and track keywords from successful prompts
    if (record.wasApproved) {
        const keywords = extractKeywords(record.normalizedPrompt);
        keywords.forEach(kw => {
            learning.commonKeywords[kw] = (learning.commonKeywords[kw] || 0) + 1;
        });

        // Keep top 50 patterns
        const sortedKeywords = Object.entries(learning.commonKeywords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50);
        learning.successfulPatterns = sortedKeywords.map(([kw]) => kw);
    }
}

/**
 * Extract keywords from a prompt
 */
function extractKeywords(prompt: string): string[] {
    // Common quality/style keywords to track
    const importantKeywords = [
        'full body', 'white background', 'studio', 'cinematic', 'realistic',
        '8k', '4k', 'detailed', 'sharp', 'professional', 'lighting',
        'portrait', 'landscape', 'ultra', 'high quality', 'masterpiece',
        'anime', 'cartoon', 'pixar', 'illustration', 'photorealistic',
        'soft lighting', 'golden hour', 'dramatic', 'vibrant', 'moody'
    ];

    const promptLower = prompt.toLowerCase();
    return importantKeywords.filter(kw => promptLower.includes(kw));
}

/**
 * Get learnings for a specific model type
 */
export function getModelLearnings(modelId: string): ModelLearnings | null {
    const data = loadData();
    const modelType = detectModelType(modelId);
    return data.learnings[modelType] || null;
}

/**
 * Get suggested keywords based on model learnings
 */
export function getSuggestedKeywords(modelId: string, mode: 'character' | 'scene'): string[] {
    const learnings = getModelLearnings(modelId);
    if (!learnings || learnings.successfulPatterns.length === 0) {
        // Return defaults
        if (mode === 'character') {
            return ['full body', 'white background', '8k', 'detailed', 'professional lighting'];
        }
        return ['cinematic', 'detailed', 'professional'];
    }

    return learnings.successfulPatterns.slice(0, 10);
}

/**
 * Get best aspect ratio for model based on learnings
 */
export function getSuggestedAspectRatio(modelId: string, mode: 'character' | 'scene'): string {
    const learnings = getModelLearnings(modelId);

    // Default suggestions
    const defaults: { [mode: string]: string } = {
        'character': '9:16', // Portrait for full body
        'scene': '16:9'     // Landscape for scenes
    };

    if (!learnings || Object.keys(learnings.bestAspectRatios).length === 0) {
        return defaults[mode] || '16:9';
    }

    // Find most successful AR
    const sortedARs = Object.entries(learnings.bestAspectRatios)
        .sort((a, b) => b[1] - a[1]);

    return sortedARs[0]?.[0] || defaults[mode] || '16:9';
}

/**
 * Get similar successful prompts for reference
 */
export function getSimilarSuccessfulPrompts(
    prompt: string,
    modelId: string,
    limit: number = 3
): PromptRecord[] {
    const data = loadData();
    const modelType = detectModelType(modelId);

    // Get approved records for this model type
    const approvedRecords = data.records.filter(
        r => r.modelType === modelType && r.wasApproved && r.qualityScore && r.qualityScore >= 0.7
    );

    if (approvedRecords.length === 0) return [];

    // Simple similarity: count shared keywords
    const promptKeywords = extractKeywords(prompt.toLowerCase());

    const scored = approvedRecords.map(record => {
        const recordKeywords = extractKeywords(record.normalizedPrompt.toLowerCase());
        const sharedCount = promptKeywords.filter(kw => recordKeywords.includes(kw)).length;
        return { record, similarity: sharedCount };
    });

    return scored
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(s => s.record);
}

/**
 * Get learning stats for display
 */
export function getLearningStats(): {
    totalRecords: number;
    totalApproved: number;
    modelStats: { [key: string]: { total: number; approved: number; avgScore: number } };
} {
    const data = loadData();

    const modelStats: { [key: string]: { total: number; approved: number; avgScore: number } } = {};

    data.records.forEach(r => {
        if (!modelStats[r.modelType]) {
            modelStats[r.modelType] = { total: 0, approved: 0, avgScore: 0 };
        }
        modelStats[r.modelType].total++;
        if (r.wasApproved) modelStats[r.modelType].approved++;
    });

    // Calculate avg scores
    Object.keys(modelStats).forEach(mt => {
        const records = data.records.filter(r => r.modelType === mt && r.qualityScore !== undefined);
        if (records.length > 0) {
            modelStats[mt].avgScore = records.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / records.length;
        }
    });

    return {
        totalRecords: data.records.length,
        totalApproved: data.records.filter(r => r.wasApproved).length,
        modelStats
    };
}

/**
 * Clear all learning data
 */
export function clearLearningData() {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[DOP Learning] Cleared all data');
}

console.log('[DOP Learning] Module loaded');
