/**
 * State Persistence Utilities
 * Handles saving/loading app state to localStorage
 */

const STORAGE_KEY = 'scene_director_state';
const STORAGE_VERSION = '1.0';

// What to persist (selective - small data only)
export interface PersistedState {
    version: string;
    timestamp: number;

    // Characters (without base64 images)
    characters: Array<{
        id: string;
        name: string;
        description: string;
        masterImageUrl?: string; // Only URL, not base64
        faceIdUrl?: string;
    }>;

    // Products
    products: Array<{
        id: string;
        name: string;
        description: string;
        imageUrl?: string;
    }>;

    // Scenes (just prompts)
    scenes: Array<{
        id: string;
        visualPrompt: string;
        audioPrompt: string;
        duration: number;
        characterId?: string;
        productId?: string;
        cameraAngle?: string;
        transition?: string;
    }>;

    // Settings
    settings: {
        stylePrompt?: string;
        customStyleInstruction?: string;
        imageModel?: string;
        aspectRatio?: string;
        resolution?: string;
        scriptLanguage?: string;
    };

    // Current project info
    project?: {
        name?: string;
        activeSection?: string;
    };
}

/**
 * Save state to localStorage
 */
export function saveState(state: Partial<PersistedState>): boolean {
    try {
        const fullState: PersistedState = {
            version: STORAGE_VERSION,
            timestamp: Date.now(),
            characters: state.characters || [],
            products: state.products || [],
            scenes: state.scenes || [],
            settings: state.settings || {},
            project: state.project,
        };

        const serialized = JSON.stringify(fullState);

        // Check size (localStorage limit ~5MB)
        const sizeKB = new Blob([serialized]).size / 1024;
        if (sizeKB > 4000) {
            console.warn(`[StateManager] State too large: ${sizeKB.toFixed(0)}KB`);
            return false;
        }

        localStorage.setItem(STORAGE_KEY, serialized);
        console.log(`[StateManager] Saved state: ${sizeKB.toFixed(1)}KB`);
        return true;
    } catch (err) {
        console.error('[StateManager] Save failed:', err);
        return false;
    }
}

/**
 * Load state from localStorage
 */
export function loadState(): PersistedState | null {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return null;

        const state = JSON.parse(serialized) as PersistedState;

        // Version check
        if (state.version !== STORAGE_VERSION) {
            console.warn('[StateManager] Version mismatch, clearing state');
            clearState();
            return null;
        }

        // Check age (discard if > 7 days old)
        const ageHours = (Date.now() - state.timestamp) / (1000 * 60 * 60);
        if (ageHours > 168) { // 7 days
            console.warn('[StateManager] State too old, clearing');
            clearState();
            return null;
        }

        console.log(`[StateManager] Loaded state from ${new Date(state.timestamp).toLocaleString()}`);
        return state;
    } catch (err) {
        console.error('[StateManager] Load failed:', err);
        return null;
    }
}

/**
 * Clear persisted state
 */
export function clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[StateManager] State cleared');
}

/**
 * Get last save timestamp
 */
export function getLastSaveTime(): Date | null {
    try {
        const serialized = localStorage.getItem(STORAGE_KEY);
        if (!serialized) return null;
        const state = JSON.parse(serialized) as PersistedState;
        return new Date(state.timestamp);
    } catch {
        return null;
    }
}

/**
 * Auto-save debouncer
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function debouncedSave(state: Partial<PersistedState>, delayMs: number = 2000): void {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveState(state);
    }, delayMs);
}
