// Sourcing Module Types

export interface FootageItem {
    id: string;
    filename: string;           // e.g., "F001.mp4"
    videoPath: string;          // Path to split video clip
    thumbnailPath: string;      // Path to extracted frame (Fxxx.jpg)
    thumbnailBase64?: string;   // Base64 for display
    sourceUrl: string;          // User input: original source URL
    sourceStart: string;        // Timecode: HH:MM:SS
    sourceEnd: string;          // Timecode: HH:MM:SS  
    note: string;               // User notes
    duration?: number;          // Duration in seconds
    sceneIndex: number;         // Order in the compilation
}

export interface SourcingProject {
    id: string;
    name: string;
    originalVideoPath: string;
    originalVideoName: string;
    footages: FootageItem[];
    createdAt: string;
    updatedAt: string;
    status: 'idle' | 'uploading' | 'processing' | 'ready' | 'error';
    error?: string;
}

export interface SceneDetectionResult {
    scenes: {
        index: number;
        startTime: number;
        endTime: number;
        duration: number;
    }[];
    totalScenes: number;
}
