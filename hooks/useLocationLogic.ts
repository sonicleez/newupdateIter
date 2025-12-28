import { useCallback } from 'react';
import { ProjectState, Location } from '../types';
import { generateId } from '../constants/presets';
import { GoogleGenAI } from "@google/genai";

export function useLocationLogic(
    state: ProjectState,
    updateStateAndRecord: (updater: (prevState: ProjectState) => ProjectState) => void,
    userApiKey: string | null,
    setApiKeyModalOpen: (open: boolean) => void
) {
    // CRUD Operations
    const addLocation = useCallback(() => {
        const newLocation: Location = {
            id: generateId(),
            name: `Location ${state.locations.length + 1}`,
            description: '',
            masterImage: null,
            colorPalette: [],
            tags: [],
            isAnalyzing: false
        };
        updateStateAndRecord(prev => ({
            ...prev,
            locations: [...prev.locations, newLocation]
        }));
        return newLocation.id;
    }, [state.locations.length, updateStateAndRecord]);

    const updateLocation = useCallback((id: string, updates: Partial<Location>) => {
        updateStateAndRecord(prev => ({
            ...prev,
            locations: prev.locations.map(loc =>
                loc.id === id ? { ...loc, ...updates } : loc
            )
        }));
    }, [updateStateAndRecord]);

    const removeLocation = useCallback((id: string) => {
        updateStateAndRecord(prev => ({
            ...prev,
            locations: prev.locations.filter(loc => loc.id !== id),
            // Also unset this location from any scenes that use it
            scenes: prev.scenes.map(scene =>
                scene.locationId === id ? { ...scene, locationId: undefined } : scene
            )
        }));
    }, [updateStateAndRecord]);

    // AI Analysis Logic
    const analyzeLocationImage = useCallback(async (locationId: string) => {
        const location = state.locations.find(l => l.id === locationId);
        if (!location || !location.masterImage) return;

        const rawApiKey = userApiKey || (process.env as any).API_KEY;
        const apiKey = typeof rawApiKey === 'string' ? rawApiKey.trim() : rawApiKey;
        if (!apiKey) {
            setApiKeyModalOpen(true);
            return;
        }

        updateLocation(locationId, { isAnalyzing: true });

        try {
            const ai = new GoogleGenAI({ apiKey });
            let data: string;
            let mimeType: string = 'image/jpeg';

            // Helper to get base64 (Duplicated logic, ideally util)
            if (location.masterImage.startsWith('data:')) {
                const [header, base64Data] = location.masterImage.split(',');
                data = base64Data;
                mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
            } else {
                // Fetch simple proxy logic if needed, or assume data URI for now for uploaded assets
                // For now assuming uploaded via local file input (data uri)
                // Falling back to empty or error if url
                data = '';
            }

            if (!data) {
                // If simple URL, skipping for now or need fetch logic
                updateLocation(locationId, { isAnalyzing: false });
                return;
            }

            const prompt = `
            Task: Analyze this film location/set image for a visual production prompt.
            
            1. NAME: Suggest a short cinematic name (e.g. "Cyberpunk Alley", "Victorian Living Room").
            2. DESCRIPTION: Write a detailed visual description for AI image generation. Focus on lighting, textures, architecture, colors, and atmosphere.
            3. TAGS: List 5 visual keywords.
            4. COLORS: List 3 dominant hex color codes.

            Return JSON ONLY:
            {
              "name": "string",
              "description": "string",
              "tags": ["string"],
              "colors": ["string"]
            }
            `;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { inlineData: { data, mimeType } },
                        { text: prompt }
                    ]
                },
                config: { responseMimeType: "application/json" }
            });

            const text = (result as any).text?.trim?.() || (result as any).text || '';
            const json = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());

            updateLocation(locationId, {
                name: json.name || location.name,
                description: json.description || '',
                tags: json.tags || [],
                colorPalette: json.colors || [],
                isAnalyzing: false
            });

        } catch (e) {
            console.error("Location analysis failed", e);
            updateLocation(locationId, { isAnalyzing: false });
        }
    }, [state.locations, userApiKey, setApiKeyModalOpen, updateLocation]);

    return {
        addLocation,
        updateLocation,
        removeLocation,
        analyzeLocationImage
    };
}
