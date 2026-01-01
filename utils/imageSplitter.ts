/**
 * Split a storyboard image (2x2 grid) into individual panels
 * @param fullImage Base64 encoded image
 * @param panelCount Number of panels to extract (default 4)
 * @returns Array of base64 encoded panel images
 */
export async function splitStoryboardImage(
    fullImage: string,
    panelCount: number = 4
): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Could not get canvas context'));
                    return;
                }

                // Calculate panel dimensions (2x2 grid)
                const cols = 2;
                const rows = Math.ceil(panelCount / cols);
                const panelWidth = Math.floor(img.width / cols);
                const panelHeight = Math.floor(img.height / rows);

                canvas.width = panelWidth;
                canvas.height = panelHeight;

                const panels: string[] = [];

                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < cols; col++) {
                        const panelIndex = row * cols + col;
                        if (panelIndex >= panelCount) break;

                        // Clear canvas
                        ctx.clearRect(0, 0, panelWidth, panelHeight);

                        // Draw panel section
                        ctx.drawImage(
                            img,
                            col * panelWidth, row * panelHeight, // Source position
                            panelWidth, panelHeight,             // Source size
                            0, 0,                                 // Destination position
                            panelWidth, panelHeight              // Destination size
                        );

                        // Convert to base64 (JPEG for smaller size)
                        const panelData = canvas.toDataURL('image/jpeg', 0.92);
                        panels.push(panelData);
                    }
                }

                console.log(`[ImageSplitter] Split image into ${panels.length} panels (${panelWidth}x${panelHeight} each)`);
                resolve(panels);
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            reject(new Error('Failed to load image for splitting'));
        };

        // Handle both base64 and URL formats
        if (fullImage.startsWith('data:')) {
            img.src = fullImage;
        } else {
            img.src = `data:image/jpeg;base64,${fullImage}`;
        }
    });
}

/**
 * Validate that an image appears to be a grid/storyboard
 * (Optional helper for quality control)
 */
export function estimateGridQuality(
    img: HTMLImageElement
): { isGrid: boolean; confidence: number } {
    // Simple heuristic: storyboard images are typically square-ish
    const aspectRatio = img.width / img.height;
    const isSquarish = aspectRatio > 0.8 && aspectRatio < 1.2;

    return {
        isGrid: isSquarish,
        confidence: isSquarish ? 0.8 : 0.3
    };
}
