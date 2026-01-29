// Intelligence Module Types

export interface DetectedScene {
    id: string;
    index: number;
    thumbnailPath: string;      // Path to extracted frame
    thumbnailBase64?: string;   // Base64 for display
    startTime: number;          // Scene start in seconds
    endTime: number;            // Scene end in seconds
    duration: number;           // Scene duration
    
    // AI Analysis Results
    aiDescription?: string;     // Groq Vision description
    detectedCharacters?: string[];
    detectedLocations?: string[];
    detectedActions?: string[];
    mood?: string;
    
    // Source Finding Results
    sourceUrl?: string;         // Found source URL
    sourceTitle?: string;       // Title of source
    sourceTimecode?: string;    // Timecode in original
    sourceConfidence?: number;  // 0-100 confidence score
    
    // Processing Status
    status: 'pending' | 'analyzing' | 'sourcing' | 'completed' | 'error';
    error?: string;
    
    // Export Flag
    isExported?: boolean;
}

export interface IntelligenceProject {
    id: string;
    videoPath: string;
    videoName: string;
    videoDuration: number;
    uploadedAt: number;
    scenes: DetectedScene[];
    status: 'uploading' | 'processing' | 'analyzing' | 'sourcing' | 'completed' | 'error';
    progress: number;           // 0-100
    currentStep?: string;
    error?: string;
}

export interface IntelligenceState {
    currentProject: IntelligenceProject | null;
    history: IntelligenceProject[];
    settings: {
        sceneThreshold: number;     // FFmpeg scene detection threshold (0.1-0.5)
        minSceneDuration: number;   // Minimum scene duration in seconds
        maxConcurrentAnalysis: number;
    };
}

export const DEFAULT_INTELLIGENCE_STATE: IntelligenceState = {
    currentProject: null,
    history: [],
    settings: {
        sceneThreshold: 0.3,
        minSceneDuration: 1.0,
        maxConcurrentAnalysis: 3
    }
};
