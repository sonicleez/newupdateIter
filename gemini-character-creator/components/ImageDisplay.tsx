import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Spinner from './Spinner';
import { GeneratedImage, AspectRatio, ImageDisplayHandle, StoryboardReferenceType } from '../types';

interface ImageDisplayProps {
  image: GeneratedImage | null;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  aspectRatio: AspectRatio;
  isMaskingEnabled: boolean;
  onUpscale: () => void;
  onExpand: (direction: 'up' | 'down' | 'left' | 'right') => void;
  isCharacterLocked: boolean;
  onToggleCharacterLock: () => void;
  onSavePreset: () => void;
  onAddToStoryboard: () => void;
  onSetReference: (image: GeneratedImage, type: StoryboardReferenceType) => void;
  editingSceneId: string | null;
  onReplaceScene: () => void;
}

type Point = { x: number; y: number };
type Line = { points: Point[]; brushSize: number };

const ratioToClassMap: Record<AspectRatio, string> = {
  '1:1': 'aspect-square',
  '16:9': 'aspect-[16/9]',
  '9:16': 'aspect-[9/16]',
  '4:3': 'aspect-[4/3]',
  '3:4': 'aspect-[3/4]',
};

const ImageDisplay = forwardRef<ImageDisplayHandle, ImageDisplayProps>(({ image, isLoading, loadingMessage, error, aspectRatio, isMaskingEnabled, onUpscale, onExpand, isCharacterLocked, onToggleCharacterLock, onSavePreset, onAddToStoryboard, onSetReference, editingSceneId, onReplaceScene }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const referenceMenuRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [brushSize, setBrushSize] = useState(40);
  const [isReferenceMenuOpen, setIsReferenceMenuOpen] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleImageMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isMaskingEnabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const handleImageMouseEnter = () => {
    if (isMaskingEnabled) return;
    setIsZooming(true);
  };

  const handleImageMouseLeave = () => {
    if (isMaskingEnabled) return;
    setIsZooming(false);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (referenceMenuRef.current && !referenceMenuRef.current.contains(event.target as Node)) {
        setIsReferenceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const redrawCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'; // Semi-transparent red for visibility
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
    lines.forEach(line => {
      ctx.lineWidth = line.brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      if (line.points.length > 0) {
        ctx.moveTo(line.points[0].x, line.points[0].y);
        for (let i = 1; i < line.points.length; i++) {
          ctx.lineTo(line.points[i].x, line.points[i].y);
        }
      }
      ctx.stroke();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && isMaskingEnabled) {
      const ctx = canvas.getContext('2d');
      if (ctx) redrawCanvas(ctx);
    }
  }, [lines, isMaskingEnabled]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isMaskingEnabled) return;
    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    setLines([...lines, { points: [{ x, y }], brushSize }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isMaskingEnabled) return;
    const { x, y } = getCanvasCoordinates(e);
    const newLines = [...lines];
    newLines[newLines.length - 1].points.push({ x, y });
    setLines(newLines);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleUndo = () => setLines(lines.slice(0, -1));
  const handleClear = () => setLines([]);

  useImperativeHandle(ref, () => ({
    getMaskAsBase64: () => {
      if (!isMaskingEnabled || lines.length === 0 || !imageRef.current) return null;
      
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageRef.current.naturalWidth;
      maskCanvas.height = imageRef.current.naturalHeight;
      const ctx = maskCanvas.getContext('2d');

      if (!ctx) return null;

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      ctx.strokeStyle = 'white';
      ctx.fillStyle = 'white';

      const scaleX = maskCanvas.width / imageRef.current.clientWidth;
      const scaleY = maskCanvas.height / imageRef.current.clientHeight;

      lines.forEach(line => {
        ctx.lineWidth = line.brushSize * Math.min(scaleX, scaleY); // Scale brush size
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        line.points.forEach((p, i) => {
            const scaledP = { x: p.x * scaleX, y: p.y * scaleY };
            if (i === 0) ctx.moveTo(scaledP.x, scaledP.y);
            else ctx.lineTo(scaledP.x, scaledP.y);
        });
        ctx.stroke();
      });
      
      return maskCanvas.toDataURL('image/png').split(',')[1];
    }
  }));

  const handleDownload = () => {
    if (!image) return;
    const link = document.createElement('a');
    link.href = `data:${image.mimeType};base64,${image.base64}`;
    link.download = `gemini-character-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  useEffect(() => {
    if (!isMaskingEnabled) {
      handleClear();
    }
  }, [isMaskingEnabled]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (isMaskingEnabled && canvas && img) {
        const setCanvasSize = () => {
            canvas.width = img.clientWidth;
            canvas.height = img.clientHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) redrawCanvas(ctx);
        };
        
        // Ensure image is loaded before setting size
        if (img.complete) {
            setCanvasSize();
        } else {
            img.onload = setCanvasSize;
        }

        const resizeObserver = new ResizeObserver(setCanvasSize);
        resizeObserver.observe(img);

        return () => {
            resizeObserver.disconnect();
            img.onload = null;
        };
    }
  }, [isMaskingEnabled, image]);


  const Placeholder = () => (
    <div className="text-center text-gray-300">
      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-gray-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <h3 className="mt-4 text-lg font-medium">Your creation will appear here</h3>
      <p className="mt-1 text-sm">Describe your character and pick a style to get started.</p>
    </div>
  );
  
  const ExpandButton = ({ direction, position }: { direction: 'up' | 'down' | 'left' | 'right', position: string }) => (
    <button
        onClick={() => onExpand(direction)}
        disabled={isLoading}
        className={`absolute ${position} z-10 p-2 bg-black/40 backdrop-blur-sm text-white rounded-full hover:bg-blue-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500`}
        aria-label={`Expand image ${direction}`}
        title={`Magic Expand ${direction}`}
    >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {direction === 'up' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />}
            {direction === 'down' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />}
            {direction === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />}
            {direction === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />}
        </svg>
    </button>
  );

  const handleSetReference = (type: StoryboardReferenceType) => {
    if (image) {
        onSetReference(image, type);
        setIsReferenceMenuOpen(false);
    }
  }

  const ReferenceMenuItem: React.FC<{ type: StoryboardReferenceType, label: string, children: React.ReactNode }> = ({ type, label, children }) => (
    <button
      onClick={() => handleSetReference(type)}
      className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-200 hover:bg-blue-600/70 rounded-md transition-colors"
    >
      {children}
      <span>{label}</span>
    </button>
  );


  const aspectRatioClass = image ? '' : ratioToClassMap[aspectRatio];

  const baseContent = !error ? (
    image ? (
      <div className="relative w-full h-full flex items-center justify-center group">
        <div className="overflow-hidden rounded-md shadow-2xl">
            <img
            ref={imageRef}
            src={`data:${image.mimeType};base64,${image.base64}`}
            alt="Generated character"
            className={`block max-w-full max-h-full object-contain transition-transform duration-100 ease-out`}
            onMouseMove={handleImageMouseMove}
            onMouseEnter={handleImageMouseEnter}
            onMouseLeave={handleImageMouseLeave}
            style={{
                transform: isZooming ? 'scale(2.5)' : 'scale(1)',
                transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
                cursor: isZooming ? 'zoom-in' : 'default',
            }}
            crossOrigin="anonymous"
            />
        </div>
        {isMaskingEnabled && (
          <>
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full cursor-crosshair"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md p-2 rounded-lg flex items-center gap-4 border border-white/20 shadow-xl z-10">
               <label htmlFor="brush-size" className="text-xs text-white">Brush</label>
               <input 
                 id="brush-size"
                 type="range"
                 min="10"
                 max="100"
                 value={brushSize}
                 onChange={(e) => setBrushSize(Number(e.target.value))}
                 className="w-24"
               />
               <button onClick={handleUndo} title="Undo" className="text-white p-1 rounded-full hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0V4.44A6.5 6.5 0 005.53 15.24l-1.06 1.06A8 8 0 0110 2z" clipRule="evenodd" /></svg>
               </button>
               <button onClick={handleClear} title="Clear Mask" className="text-white p-1 rounded-full hover:bg-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zM4 9a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM3 13a1 1 0 100 2h14a1 1 0 100-2H3z" clipRule="evenodd" /></svg>
               </button>
            </div>
          </>
        )}
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10" ref={referenceMenuRef}>
          {!editingSceneId && (
            <button
              onClick={onAddToStoryboard}
              disabled={isLoading}
              className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-purple-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500 transition-colors"
              aria-label="Add to Storyboard"
              title="Add to Storyboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          )}
          <div className="relative">
              <button
              onClick={() => setIsReferenceMenuOpen(prev => !prev)}
              disabled={isLoading}
              className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-indigo-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-colors"
              aria-label="Use as Storyboard Reference"
              title="Use as Storyboard Reference"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 9a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM9.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM13 9a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM6.5 15a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM3 15a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM9.5 15a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
                      <path d="M13 15a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" />
                  </svg>
              </button>
              {isReferenceMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-black/50 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl p-2 z-20">
                      <ReferenceMenuItem type="character" label="Set Character">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                      </ReferenceMenuItem>
                      <ReferenceMenuItem type="setting" label="Set Setting">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                      </ReferenceMenuItem>
                      <ReferenceMenuItem type="prop" label="Set Prop">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 10a2 2 0 00-2 2v.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V16a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>
                      </ReferenceMenuItem>
                      <ReferenceMenuItem type="style" label="Set Style">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                      </ReferenceMenuItem>
                  </div>
              )}
          </div>
          <button
            onClick={onSavePreset}
            disabled={isLoading}
            className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-yellow-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500 transition-colors"
            aria-label="Save Character"
            title="Save Character"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
           <button
            onClick={onToggleCharacterLock}
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
              ${isCharacterLocked 
                ? 'bg-blue-600/70 text-white hover:bg-blue-700/80 focus:ring-blue-500' 
                : 'bg-black/40 backdrop-blur-sm text-white hover:bg-blue-600/70 focus:ring-blue-500'
              }
              disabled:bg-gray-600/50 disabled:cursor-not-allowed`}
            aria-label={isCharacterLocked ? "Unlock Character" : "Lock Character"}
            title={isCharacterLocked ? "Unlock Character" : "Lock Character"}
          >
            {isCharacterLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v3m-6-3h12a2 2 0 012 2v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 012-2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </button>
          <button
            onClick={onUpscale}
            disabled={isLoading}
            className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-green-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-green-500 transition-colors"
            aria-label="Upscale image"
            title="Upscale image"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m12 4V4h-4M4 16v4h4m12-4v4h-4" />
              </svg>
          </button>
          <button
            onClick={handleDownload}
            disabled={isLoading}
            className="bg-black/40 backdrop-blur-sm text-white p-2 rounded-full hover:bg-blue-600/70 disabled:bg-gray-600/50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
            aria-label="Download image"
            title="Download image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
        {/* Magic Expand Buttons */}
         <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <ExpandButton direction="up" position="top-2 left-1/2 -translate-x-1/2 -translate-y-full" />
              <ExpandButton direction="down" position="bottom-2 left-1/2 -translate-x-1/2 translate-y-full" />
              <ExpandButton direction="left" position="left-2 top-1/2 -translate-y-1/2 -translate-x-full" />
              <ExpandButton direction="right" position="right-2 top-1/2 -translate-y-1/2 translate-x-full" />
          </div>
      </div>
    ) : (
      <Placeholder />
    )
  ) : null;


  return (
    <div className={`relative w-full ${aspectRatioClass} bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center p-4 transition-all duration-300`}>
      {editingSceneId && (
          <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-r from-green-800/80 to-green-900/70 backdrop-blur-sm text-white z-20 flex justify-between items-center rounded-t-2xl shadow-lg">
              <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                      <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-sm">Editing Storyboard Scene</span>
              </div>
              <button
                  onClick={onReplaceScene}
                  disabled={isLoading}
                  className="bg-green-600/70 hover:bg-green-500/80 border border-green-400/50 text-white font-bold py-1 px-3 rounded-md text-sm flex items-center gap-2 transition-transform transform hover:scale-105 disabled:bg-gray-500/50"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Update &amp; Return
              </button>
          </div>
      )}
      {baseContent}
      
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md border border-white/20 rounded-full shadow-lg z-20 flex items-center gap-3 px-4 py-2">
            <Spinner className="h-5 w-5" />
            <p className="text-sm text-white animate-pulse">{loadingMessage || 'Processing...'}</p>
        </div>
      )}
      
      {!isLoading && error && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-2xl p-4">
          <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-xl border border-red-400/30">
             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-semibold">An Error Occurred</h3>
            <p className="mt-1 text-sm max-w-md">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
});

export default ImageDisplay;
