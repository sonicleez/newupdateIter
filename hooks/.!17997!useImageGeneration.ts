import React, { useState, useCallback, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ProjectState, Scene, AgentStatus } from '../types';

import {
    GLOBAL_STYLES, CAMERA_MODELS, LENS_OPTIONS, CAMERA_ANGLES,
    DEFAULT_META_TOKENS, TRANSITION_TYPES
} from '../constants/presets';
import { DIRECTOR_PRESETS, DirectorCategory } from '../constants/directors';
import { getPresetById } from '../utils/scriptPresets';
import { uploadImageToSupabase, syncUserStatsToCloud } from '../utils/storageUtils';
import { safeGetImageData, callGeminiVisionReasoning, preWarmImageCache, fixMimeType } from '../utils/geminiUtils';
import { GommoAI, urlToBase64 } from '../utils/gommoAI';
import { IMAGE_MODELS } from '../utils/appConstants';
import { normalizePrompt, normalizePromptAsync, formatNormalizationLog, needsNormalization, containsVietnamese } from '../utils/promptNormalizer';
import { recordPrompt, approvePrompt, getSuggestedKeywords } from '../utils/dopLearning';
import { analyzeSceneContinuity, extractCharacterState } from '../utils/dopIntelligence';
import { incrementGlobalStats, recordGeneratedImage } from '../utils/userGlobalStats';
import { validateRaccord as validateRaccordWithVision, formatValidationResult } from '../utils/dopRaccordValidator';
import type { RaccordValidationResult } from '../utils/dopRaccordValidator';
import { isGridModel, splitImageGrid } from '../utils/imageUtils';
import { RetryContext, getCorrectionPrompt } from '../utils/dopCorrections';
import { loadDirectorMemory, saveDirectorMemory, recordGeneration as recordDirectorGeneration } from '../utils/directorBrain';
// Helper function to clean VEO-specific tokens from prompt for image generation
const cleanPromptForImageGen = (prompt: string): string => {
    return prompt
        .replace(/\[\d{2}:\d{2}-\d{2}:\d{2}\]/g, '') // Remove timestamps [00:00-00:05]
        .replace(/SFX:.*?(\.|$)/gi, '') // Remove SFX descriptions
        .replace(/Emotion:.*?(\.|$)/gi, '') // Remove Emotion descriptions
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
};

// Helper: Determine which provider to use based on model ID
const getProviderFromModel = (modelId: string): 'gemini' | 'gommo' => {
    const model = IMAGE_MODELS.find(m => m.value === modelId);
    return (model?.provider as 'gemini' | 'gommo') || 'gemini';
};

// Helper: Create inline data object with sanitized MIME type
// This prevents "Unsupported MIME type: application/octet-stream" errors
const createInlineData = (data: string, mimeType: string, sourceUrl?: string) => {
    return {
        inlineData: {
            data,
            mimeType: fixMimeType(mimeType, sourceUrl)
        }
    };
};

export function useImageGeneration(
    state: ProjectState,
    stateRef: React.MutableRefObject<ProjectState>,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void,
    isContinuityMode: boolean,
    setAgentState: (agent: 'director' | 'dop', status: AgentStatus, message?: string, stage?: string) => void,
    addProductionLog?: (sender: 'director' | 'dop' | 'user' | 'system', message: string, type?: string, stage?: string) => void,

    userId?: string,
    isOutfitLockMode?: boolean,
    addToGallery?: (image: string, type: string, prompt?: string, sourceId?: string) => void,
    isDOPEnabled?: boolean,
    validateRaccordWithVision?: (currentImage: string, prevImage: string, currentScene: Scene, prevScene: Scene, apiKey: string) => Promise<{ isValid: boolean; errors: { type: string; description: string }[]; correctionPrompt?: string; decision?: 'retry' | 'skip' | 'try_once' }>,
    makeRetryDecision?: (failedImage: string, referenceImage: string, originalPrompt: string, errors: { type: string; description: string }[], apiKey: string) => Promise<{ action: 'retry' | 'skip' | 'try_once'; reason: string; enhancedPrompt?: string; confidence: number }>
) {


    const [isBatchGenerating, setIsBatchGenerating] = useState(false);
    const [isStopping, setIsStopping] = useState(false);
    const stopRef = useRef(false);

    // Generation Lock: Track which scenes are currently being generated to prevent duplicates
    const generatingSceneIdsRef = useRef<Set<string>>(new Set());

    // [Fix] Signal stop when the hook instance is destroyed, key changes, or project changes
    React.useEffect(() => {
        return () => {
            console.log('[BatchGen] 🧹 Cleaning up generation state (key/project change)');
            stopRef.current = true;
            generatingSceneIdsRef.current.clear();
            setIsBatchGenerating(false);
            setIsStopping(false);
        };
    }, [userApiKey, state.projectName]);

    /**
     * Storyboard Mode: Find the best cascade reference image for visual consistency
     * Priority: Nearest KEY FRAME > Nearest any scene > Group conceptImage
     * - Looks for the nearest scene with an image in the SAME SceneGroup
     * - KEY FRAMES are prioritized as they are hero shots
     * - Falls back to group's conceptImage if no scene has image
     * - Returns undefined if no reference available (first scene in group)
     */
    const findCascadeReference = useCallback((
        currentScene: Scene,
        currentState: ProjectState
    ): string | undefined => {
        if (!currentScene.groupId) return undefined;

        // 1. Get ALL scenes in same group that have generated images AND are valid (no critical errors)
        const sameGroupScenes = (currentState.scenes || []).filter(
            s => s.groupId === currentScene.groupId &&
                s.generatedImage &&
                s.id !== currentScene.id &&
                // IGNORE scenes with Critical DOP Errors (Unfixable / Wrong Person) to prevent error propagation
                (!s.error || (!s.error.includes('UNFIXABLE') && !s.error.includes('DOP Skip')))
        );

        if (sameGroupScenes.length === 0) {
            // No scenes with images in this group - try conceptImage
            const group = currentState.sceneGroups?.find(g => g.id === currentScene.groupId);
            if (group?.conceptImage) {
                console.log(`[Cascade] Using group conceptImage as reference for scene ${currentScene.sceneNumber}`);
                return group.conceptImage;
            }
            return undefined;
        }

        const currentNum = parseInt(currentScene.sceneNumber);

        // 2. PRIORITY: Find nearest KEY FRAME (hero shot) first
        const keyFramesInGroup = sameGroupScenes.filter(s => s.isKeyFrame);
        if (keyFramesInGroup.length > 0) {
            // Find nearest key frame by scene number distance
            const sortedByDistance = keyFramesInGroup.sort((a, b) => {
                const distA = Math.abs(parseInt(a.sceneNumber) - currentNum);
                const distB = Math.abs(parseInt(b.sceneNumber) - currentNum);
                return distA - distB;
            });
            console.log(`[Cascade] Scene ${currentScene.sceneNumber} referencing KEY FRAME Scene ${sortedByDistance[0].sceneNumber} ⭐`);
            return sortedByDistance[0].generatedImage!;
        }

        // 3. Fallback: Find nearest scene BEFORE current (by sceneNumber)
        const beforeScenes = sameGroupScenes
            .filter(s => parseInt(s.sceneNumber) < currentNum)
            .sort((a, b) => parseInt(b.sceneNumber) - parseInt(a.sceneNumber));

        if (beforeScenes.length > 0) {
            console.log(`[Cascade] Scene ${currentScene.sceneNumber} referencing Scene ${beforeScenes[0].sceneNumber} for consistency`);
            return beforeScenes[0].generatedImage!;
        }

        // 4. If no scene before, check if any scene AFTER has image (edge case: regenerating earlier scene)
        const afterScenes = sameGroupScenes
            .filter(s => parseInt(s.sceneNumber) > currentNum)
            .sort((a, b) => parseInt(a.sceneNumber) - parseInt(b.sceneNumber));

        if (afterScenes.length > 0) {
            console.log(`[Cascade] Scene ${currentScene.sceneNumber} referencing Scene ${afterScenes[0].sceneNumber} (forward ref)`);
            return afterScenes[0].generatedImage!;
        }

        return undefined;
    }, []);

    const stopBatchGeneration = useCallback(() => {
        if (isBatchGenerating) {
            stopRef.current = true;
            setIsStopping(true);
        }
    }, [isBatchGenerating]);

    const callAIImageAPI = async (
        prompt: string,
        apiKey: string | null,
        model: string,
        aspectRatio: string,
        parts: any[] = [],
        imageSize: string = '1K',
        gommoCredentials?: { domain: string; accessToken: string }
    ): Promise<{ imageUrl: string; mediaId?: string }> => {
        const provider = getProviderFromModel(model);

        console.log(`[ImageGen] Provider: ${provider}, Model: ${model}`);
        console.log(`[ImageGen] Gommo credentials check:`, {
            domain: gommoCredentials?.domain || '(empty)',
            hasToken: !!gommoCredentials?.accessToken,
            tokenLength: gommoCredentials?.accessToken?.length || 0
        });

