import React, { useRef } from 'react';
import { ART_STYLES, ASPECT_RATIOS, SHOT_TYPES, CAMERA_ANGLES, CAMERA_ROLLS } from '../constants';
import { ArtStyle, AspectRatio, GeneratedImage, ImageAdjustments } from '../types';
import Spinner from './Spinner';

interface ControlPanelProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  style: ArtStyle;
  setStyle: (style: ArtStyle) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (ratio: AspectRatio) => void;
  onGenerate: () => void;
  isLoading: boolean;
  editPrompt: string;
  setEditPrompt: (prompt: string) => void;
  shotType: string;
  setShotType: (value: string) => void;
  cameraAngle: string;
  setCameraAngle: (value: string) => void;
  cameraRoll: string;
  setCameraRoll: (value: string) => void;
  onEdit: () => void;
  hasImage: boolean;
  isMaskingEnabled: boolean;
  setIsMaskingEnabled: (enabled: boolean) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onStyleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  styleImage: GeneratedImage | null;
  onRemoveStyleImage: () => void;
  compositeImage: GeneratedImage | null;
  onCompositeImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCompositeImage: () => void;
  isCharacterLocked: boolean;
  lockedCharacter: GeneratedImage | null;
  onToggleCharacterLock: () => void;
  areAdjustmentsDefault: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  prompt,
  setPrompt,
  style,
  setStyle,
  aspectRatio,
  setAspectRatio,
  onGenerate,
  isLoading,
  editPrompt,
  setEditPrompt,
  shotType,
  setShotType,
  cameraAngle,
  setCameraAngle,
  cameraRoll,
  setCameraRoll,
  onEdit,
  hasImage,
  isMaskingEnabled,
  setIsMaskingEnabled,
  onImageUpload,
  onStyleImageUpload,
  styleImage,
  onRemoveStyleImage,
  compositeImage,
  onCompositeImageUpload,
  onClearCompositeImage,
  isCharacterLocked,
  lockedCharacter,
  onToggleCharacterLock,
  areAdjustmentsDefault,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleFileInputRef = useRef<HTMLInputElement>(null);
  const compositeFileInputRef = useRef<HTMLInputElement>(null);

  const isEditDisabled = isLoading || (!editPrompt.trim() && !shotType && !cameraAngle && !cameraRoll && areAdjustmentsDefault);
  
  let editPlaceholder = "e.g., Add a pointy hat, change the staff's glow to red";
  if (isMaskingEnabled) {
    editPlaceholder = "e.g., a golden crown, make this blue, or 'remove this'";
  } else if (compositeImage) {
    editPlaceholder = "Describe how to combine the images. e.g., 'Place the sword in the character's hand'";
  } else if (styleImage) {
    editPlaceholder = "Describe how to apply the style. e.g., 'Keep character's features, but use the style's color palette'";
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
      {isCharacterLocked && lockedCharacter && (
        <div className="flex items-center gap-4 bg-blue-900/30 p-3 rounded-xl border border-blue-400/30">
          <img src={`data:${lockedCharacter.mimeType};base64,${lockedCharacter.base64}`} alt="Locked character reference" className="w-16 h-16 rounded-md object-cover"/>
          <div className="flex-grow">
            <h3 className="font-bold text-blue-300">Character Locked</h3>
            <p className="text-sm text-gray-300">New generations will use this character as a reference.</p>
          </div>
           <button onClick={onToggleCharacterLock} className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition-colors" title="Unlock Character">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75M10.5 10.5h3M10.5 10.5v3M10.5 10.5V15m3 0V12m0 0H15m-3 0h.008v.008H12V12zm0 0h.008v.008H12V12zm0 0h.008v.008H12V12zm-3 3h.008v.008H9v-.008zm0 0H9V15zm0 0H9v-.008zm3 0h.008v.008H12v-.008zm0 0H12V15zm0 0h.008v.008H12v-.008z" />
               <path d="M12 15a1 1 0 01-1-1v-2.396a1 1 0 01.38-.79l.69-.69a1 1 0 000-1.414l-.69-.69a1 1 0 01-.38-.79V6a1 1 0 112 0v.22a1 1 0 01.38.79l.69.69a1 1 0 001.414 0l.69-.69a1 1 0 0117 6.22V6a1 1 0 112 0v.22a1 1 0 01-.38.79l-.69.69a1 1 0 000 1.414l.69.69a1 1 0 01.38.79V12a1 1 0 01-1 1h-1.396a1 1 0 01-.79-.38l-.69-.69a1 1 0 00-1.414 0l-.69.69a1 1 0 01-.79.38H12z" />
             </svg>
           </button>
        </div>
      )}

      <div>
        <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-bold text-gray-100">{isCharacterLocked ? '1. Describe The New Scene' : '1. Describe Your Character'}</h2>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={isCharacterLocked ? "e.g., fighting a dragon, walking in a neon-lit street" : "e.g., A wise old wizard with a long white beard, holding a glowing staff"}
          className="w-full h-28 p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors placeholder-gray-400"
        />
      </div>

      <div>
        <h2 className="text-xl font-bold mb-3 text-gray-100">2. Configure Image</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="style-select" className="block text-sm font-medium text-gray-300 mb-1">Style</label>
            <select
              id="style-select"
              value={style}
              onChange={(e) => setStyle(e.target.value as ArtStyle)}
              className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            >
              {ART_STYLES.map((styleOption) => (
                <option key={styleOption.value} value={styleOption.value} className="bg-gray-800">
                  {styleOption.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="aspect-ratio-select" className="block text-sm font-medium text-gray-300 mb-1">Aspect Ratio</label>
            <select
              id="aspect-ratio-select"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
              className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
            >
              {ASPECT_RATIOS.map((ratioOption) => (
                <option key={ratioOption.value} value={ratioOption.value} className="bg-gray-800">
                  {ratioOption.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={onGenerate}
        disabled={isLoading || !prompt.trim()}
        className="w-full flex justify-center items-center gap-2 bg-blue-500/50 hover:bg-blue-500/70 border border-blue-400/50 disabled:bg-gray-500/50 disabled:border-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105"
      >
        {isLoading && !hasImage ? <Spinner /> : (isCharacterLocked ? 'Generate New Scene' : 'Generate Character')}
      </button>

      <div className="flex items-center gap-4">
        <hr className="flex-grow border-white/20" />
        <span className="text-gray-400 text-sm font-semibold">OR</span>
        <hr className="flex-grow border-white/20" />
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageUpload}
        className="hidden"
        accept="image/*"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="w-full flex justify-center items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/20 disabled:bg-gray-500/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" />
            <path d="M9 13.5V9m0 0l-1 1m1-1l1 1" />
        </svg>
        Upload Image to Edit
      </button>

      {hasImage && !isCharacterLocked && (
        <div className="border-t border-white/20 pt-6 mt-2 flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-green-300">3. Edit Your Character</h2>
            </div>
             <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <label htmlFor="mask-toggle" className="text-sm font-medium text-gray-300">Mask Editing</label>
                    <button
                        role="switch"
                        aria-checked={isMaskingEnabled}
                        onClick={() => setIsMaskingEnabled(!isMaskingEnabled)}
                        className={`${isMaskingEnabled ? 'bg-green-500' : 'bg-gray-600'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900`}
                        id="mask-toggle"
                    >
                        <span className={`${isMaskingEnabled ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                    </button>
                </div>
            </div>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={editPlaceholder}
              className="w-full h-24 p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors placeholder-gray-400"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="sm:col-span-1">
                <label htmlFor="shot-type-select" className="block text-sm font-medium text-gray-300 mb-1">Shot Type</label>
                <select
                  id="shot-type-select"
                  value={shotType}
                  onChange={(e) => setShotType(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors"
                >
                  {SHOT_TYPES.map((option) => (
                    <option key={option.name} value={option.value} className="bg-gray-800">{option.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="camera-angle-select" className="block text-sm font-medium text-gray-300 mb-1">Camera Angle</label>
                <select
                  id="camera-angle-select"
                  value={cameraAngle}
                  onChange={(e) => setCameraAngle(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors"
                >
                  {CAMERA_ANGLES.map((option) => (
                    <option key={option.name} value={option.value} className="bg-gray-800">{option.name}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-1">
                <label htmlFor="camera-roll-select" className="block text-sm font-medium text-gray-300 mb-1">Camera Roll</label>
                <select
                  id="camera-roll-select"
                  value={cameraRoll}
                  onChange={(e) => setCameraRoll(e.target.value)}
                  className="w-full p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors"
                >
                  {CAMERA_ROLLS.map((option) => (
                    <option key={option.name} value={option.value} className="bg-gray-800">{option.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="mt-2 p-4 bg-black/20 rounded-lg border border-white/20 flex flex-col gap-4">
            <h3 className="text-lg font-semibold text-green-200">Advanced Editing</h3>
            
            {/* Image Compositing */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Image Compositing (Layer)</h4>
              <input type="file" ref={compositeFileInputRef} onChange={onCompositeImageUpload} className="hidden" accept="image/*" />
              {!compositeImage && (
                <button onClick={() => compositeFileInputRef.current?.click()} disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/20 text-sm py-2 px-3 rounded-md transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" /><path d="M9 13.5V9m0 0l-1 1m1-1l1 1" /></svg>
                  Upload Layer Image
                </button>
              )}
               {compositeImage && (
                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-md border border-white/20">
                    <img src={`data:${compositeImage.mimeType};base64,${compositeImage.base64}`} alt="Composite layer" className="w-12 h-12 rounded object-cover" />
                    <p className="flex-grow text-sm text-gray-300">Layer image is active. <br/><span className="text-xs text-gray-400">Describe how to combine them.</span></p>
                    <button onClick={onClearCompositeImage} className="p-1 rounded-full hover:bg-black/30" title="Remove layer image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
              )}
              <p className="text-xs text-center text-gray-500 mt-2">Or, select a layer from version history.</p>
            </div>
            
            <div className="flex items-center gap-2"><hr className="flex-grow border-white/20" /><span className="text-xs text-gray-500">OR</span><hr className="flex-grow border-white/20" /></div>

            {/* Style Fusion */}
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">Style Fusion</h4>
              <input type="file" ref={styleFileInputRef} onChange={onStyleImageUpload} className="hidden" accept="image/*" />
              {!styleImage && (
                  <button onClick={() => styleFileInputRef.current?.click()} disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/20 text-sm py-2 px-3 rounded-md transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                  Upload Style Image
                  </button>
              )}
              {styleImage && (
                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-md border border-white/20">
                    <img src={`data:${styleImage.mimeType};base64,${styleImage.base64}`} alt="Style reference" className="w-12 h-12 rounded object-cover" />
                    <p className="flex-grow text-sm text-gray-300">Style image is active.</p>
                    <button onClick={onRemoveStyleImage} className="p-1 rounded-full hover:bg-black/30" title="Remove style image">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onEdit}
            disabled={isEditDisabled}
            className="w-full flex justify-center items-center gap-2 bg-green-500/50 hover:bg-green-500/70 border border-green-400/50 disabled:bg-gray-500/50 disabled:border-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition-all duration-300 transform hover:scale-105"
          >
            {isLoading && hasImage ? <Spinner /> : 'Apply Edit'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
