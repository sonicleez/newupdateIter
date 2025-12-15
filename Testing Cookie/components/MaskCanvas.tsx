import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';
import CanvasDraw from "react-canvas-draw";

interface MaskCanvasProps {
    image: string;
    width: number;
    height: number;
    brushRadius: number;
    brushColor?: string;
    className?: string;
}

export interface MaskCanvasHandle {
    undo: () => void;
    clear: () => void;
    getDataURL: () => string; // Returns the drawing as an image
    getMaskDataURL: () => Promise<string>; // Returns a clean B&W mask
}

const MaskCanvas = forwardRef<MaskCanvasHandle, MaskCanvasProps>(({ image, width, height, brushRadius, brushColor = "#a855f7", className }, ref) => {
    const canvasRef = useRef<any>(null);
    const [canvasKey, setCanvasKey] = useState(0); // Force re-render when dimensions change

    useEffect(() => {
        setCanvasKey(prev => prev + 1);
    }, [width, height]);

    useImperativeHandle(ref, () => ({
        undo: () => {
            canvasRef.current?.undo();
        },
        clear: () => {
            canvasRef.current?.clear();
        },
        getDataURL: () => {
            return canvasRef.current?.getDataURL();
        },
        getMaskDataURL: async () => {
            // This function creates a binary mask (white drawing on black background)
            // React-canvas-draw gives us the drawing on a transparent background
            const drawingDataUrl = canvasRef.current?.getDataURL();

            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve('');

                    // 1. Fill black background
                    ctx.fillStyle = "black";
                    ctx.fillRect(0, 0, width, height);

                    // 2. Adjust global composite operation to draw white where the brush was
                    // But since the brush might be translucent purple, we just want the SHAPE
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert non-black pixels to white (simple thresholding)
                    const imageData = ctx.getImageData(0, 0, width, height);
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        // If alpha > 0, make it white
                        if (data[i + 3] > 0) {
                            data[i] = 255;     // R
                            data[i + 1] = 255; // G
                            data[i + 2] = 255; // B
                            data[i + 3] = 255; // Alpha
                        }
                    }
                    ctx.putImageData(imageData, 0, 0);

                    resolve(canvas.toDataURL('image/png'));
                };
                img.src = drawingDataUrl;
            });
        }
    }));

    return (
        <div className={`relative ${className}`} style={{ width, height }}>
            {/* Background Image Layer */}
            <img
                src={image}
                alt="Reference"
                crossOrigin="anonymous" // CRITICAL: Allow CORS
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{ width, height }}
            />

            {/* Drawing Layer */}
            <CanvasDraw
                key={canvasKey}
                ref={canvasRef}
                brushColor={brushColor}
                brushRadius={brushRadius}
                lazyRadius={0} // Immediate drawing
                canvasWidth={width}
                canvasHeight={height}
                hideGrid={true}
                backgroundColor="transparent"
                imgSrc="" // We handle background manually to ensure proper scaling
                className="absolute inset-0"
                style={{ background: 'transparent' }}
            />
        </div>
    );
});

export default MaskCanvas;
