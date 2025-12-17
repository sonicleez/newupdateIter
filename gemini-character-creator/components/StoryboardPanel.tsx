import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { StoryboardScene, GeneratedImage, StoryboardReferences, StoryboardReferenceType } from '../types';
import Spinner from './Spinner';

interface StoryboardPanelProps {
  scenes: StoryboardScene[];
  references: StoryboardReferences;
  onUpdateDescription: (sceneId: string, newDescription: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onGenerate: (mode: 'auto' | 'manual', prompt: string, sceneCount: number) => void;
  onReferenceUpload: (event: React.ChangeEvent<HTMLInputElement>, type: StoryboardReferenceType) => void;
  onClearReference: (type: StoryboardReferenceType) => void;
  onEditSceneInCreator: (scene: StoryboardScene) => void;
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

const SceneCard: React.FC<{
  scene: StoryboardScene;
  sceneNumber: number;
  onUpdateDescription: (id: string, desc: string) => void;
  onDeleteScene: (id: string) => void;
  onEditSceneInCreator: (scene: StoryboardScene) => void;
}> = ({ scene, sceneNumber, onUpdateDescription, onDeleteScene, onEditSceneInCreator }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
        <div className="flex-shrink-0 md:w-1/3 relative">
            <img 
                src={`data:${scene.image.mimeType};base64,${scene.image.base64}`} 
                alt={`Scene ${sceneNumber}`}
                className="w-full h-auto object-cover rounded-md shadow-md"
            />
            <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
                SCENE {sceneNumber}
            </span>
        </div>
        <div className="flex-grow flex flex-col">
            <textarea
                value={scene.description}
                onChange={(e) => onUpdateDescription(scene.id, e.target.value)}
                placeholder={`Describe scene ${sceneNumber}... (e.g., The wizard enters the dark cave.)`}
                className="w-full h-full min-h-[100px] flex-grow p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors placeholder-gray-400"
            />
            <div className="mt-2 self-end flex items-center gap-2">
                <button
                    onClick={() => onEditSceneInCreator(scene)}
                    className="p-2 text-sm font-semibold text-blue-300 hover:text-blue-200 hover:bg-blue-900/30 rounded-md transition-colors"
                    title="Edit Scene in Creator Tab"
                >
                    Edit
                </button>
                 <button
                    onClick={() => onDeleteScene(scene.id)}
                    className="p-2 text-sm text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded-md transition-colors"
                    title="Delete Scene"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
  );
};

const ReferenceUploader: React.FC<{
    type: StoryboardReferenceType;
    label: string;
    icon: React.ReactNode;
    image: GeneratedImage | null;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>, type: StoryboardReferenceType) => void;
    onClear: (type: StoryboardReferenceType) => void;
}> = ({ type, label, icon, image, onUpload, onClear }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div className="relative group flex flex-col items-center justify-center w-full h-32 bg-black/20 rounded-lg border-2 border-dashed border-white/20 hover:border-blue-400/80 transition-colors">
            <input type="file" accept="image/*" ref={inputRef} className="hidden" onChange={(e) => onUpload(e, type)} />
            {image ? (
                <>
                    <img src={`data:${image.mimeType};base64,${image.base64}`} alt={`${label} reference`} className="w-full h-full object-cover rounded-md" />
                    <button onClick={() => onClear(type)} className="absolute top-1 right-1 p-1 bg-black/60 backdrop-blur-sm rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" title={`Clear ${label}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </>
            ) : (
                <button onClick={() => inputRef.current?.click()} className="text-center text-gray-400">
                    {icon}
                    <span className="mt-1 text-xs block font-semibold">{label}</span>
                </button>
            )}
        </div>
    );
};

const StoryboardPanel: React.FC<StoryboardPanelProps> = ({ scenes, references, onUpdateDescription, onDeleteScene, onGenerate, onReferenceUpload, onClearReference, onEditSceneInCreator, isLoading, loadingMessage, error }) => {
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [prompt, setPrompt] = useState('');
  const [sceneCount, setSceneCount] = useState(4);
  const [isZipping, setIsZipping] = useState(false);

  const handleGenerateClick = () => {
    if (!prompt.trim()) return;
    onGenerate(mode, prompt, sceneCount);
    setPrompt('');
  }

  const handleDownloadAll = async () => {
    if (scenes.length === 0 || isZipping) return;
    setIsZipping(true);
    try {
        const zip = new JSZip();

        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            const sceneNumber = i + 1;
            const paddedSceneNumber = String(sceneNumber).padStart(3, '0');
            
            // Add image
            zip.file(`scene_${paddedSceneNumber}.png`, scene.image.base64, { base64: true });
            
            // Add description if it exists
            if (scene.description.trim()) {
                zip.file(`scene_${paddedSceneNumber}_description.txt`, scene.description);
            }
        }
        
        const content = await zip.generateAsync({ type: 'blob' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `storyboard-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

    } catch (err) {
        console.error("Failed to create zip file", err);
        // In a real app, we'd set an error state to show the user
    } finally {
        setIsZipping(false);
    }
  };


  const Placeholder = () => (
    <div className="text-center text-gray-300 bg-black/30 backdrop-blur-xl p-10 rounded-2xl border-2 border-dashed border-white/20">
      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-gray-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
      <h3 className="mt-4 text-xl font-medium">Your Storyboard is Empty</h3>
      <p className="mt-2 text-md max-w-lg mx-auto">Use the generator below to create your first scene, or go to the <span className="font-bold text-blue-300">Creator</span> tab to send an image here.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-3xl font-bold tracking-wider text-gray-100">Storyboard</h2>
        <button
            onClick={handleDownloadAll}
            disabled={isLoading || isZipping || scenes.length === 0}
            className="w-full md:w-auto flex justify-center items-center gap-2 bg-green-500/50 hover:bg-green-500/70 border border-green-400/50 disabled:bg-gray-500/50 disabled:border-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition-all"
        >
            {isZipping ? 
                <><Spinner className="h-5 w-5" /> Zipping...</> : 
                (<>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    Download Storyboard
                </>)
            }
        </button>
      </div>
      
      <div className="p-4 md:p-6 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 flex flex-col gap-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-100">Generator</h2>
          
          {/* Mode Toggle */}
          <div className="flex items-center gap-2 p-1 bg-black/20 rounded-full self-start">
            <button onClick={() => setMode('manual')} className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${mode === 'manual' ? 'bg-blue-600' : 'text-gray-300 hover:bg-white/10'}`}>Manual Mode</button>
            <button onClick={() => setMode('auto')} className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${mode === 'auto' ? 'bg-blue-600' : 'text-gray-300 hover:bg-white/10'}`}>Auto Mode</button>
          </div>
          <div className="text-sm text-gray-300 -mt-4">
            {mode === 'manual' ? (
                <p><strong>Chế độ Thủ công:</strong> Tạo một cảnh tại một thời điểm để kiểm soát câu chuyện một cách chính xác.</p>
            ) : (
                <p><strong>Chế độ Tự động:</strong> Mô tả toàn bộ câu chuyện của bạn và AI sẽ tự động tạo ra tất cả các cảnh.</p>
            )}
          </div>

          {/* Reference Images */}
          <div>
            <h3 className="font-bold text-lg text-gray-300 mb-3">1. Add References (Optional)</h3>
            <p className="text-sm text-gray-300 mb-4">
                Cung cấp hình ảnh để hướng dẫn AI. <strong>Nhân vật:</strong> duy trì sự nhất quán của nhân vật. <strong>Bối cảnh:</strong> xác định môi trường. <strong>Đạo cụ:</strong> bao gồm một đối tượng cụ thể. <strong>Phong cách:</strong> ảnh hưởng đến giao diện và cảm nhận nghệ thuật.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <ReferenceUploader type="character" label="Character" image={references.character} onUpload={onReferenceUpload} onClear={onClearReference} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>} />
               <ReferenceUploader type="setting" label="Setting" image={references.setting} onUpload={onReferenceUpload} onClear={onClearReference} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>} />
               <ReferenceUploader type="prop" label="Prop" image={references.prop} onUpload={onReferenceUpload} onClear={onClearReference} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 10a2 2 0 00-2 2v.5a.5.5 0 00.5.5h15a.5.5 0 00.5-.5V16a2 2 0 00-2-2H4z" clipRule="evenodd" /></svg>} />
               <ReferenceUploader type="style" label="Style/Mood" image={references.style} onUpload={onReferenceUpload} onClear={onClearReference} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>} />
            </div>
             <p className="text-xs text-gray-500 mt-2">In Manual Mode, if no Character reference is set, the last scene's image will be used automatically.</p>
          </div>
          
          {/* Prompt and Controls */}
          <div>
              <h3 className="font-bold text-lg text-gray-300 mb-3">{mode === 'auto' ? '2. Describe Your Story' : '2. Describe The Scene'}</h3>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'auto' ? "e.g., A knight finds a magic sword in a forest, fights a goblin, and saves the village." : "e.g., The character discovers a hidden treasure chest."}
                className="w-full h-24 p-3 bg-black/20 border border-white/20 rounded-md focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors placeholder-gray-400"
                disabled={isLoading}
              />
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              {mode === 'auto' && (
                  <div className="flex items-center gap-3">
                      <label htmlFor="scene-count" className="font-medium text-gray-300">Number of Scenes:</label>
                      <input 
                          id="scene-count"
                          type="number" 
                          value={sceneCount} 
                          onChange={(e) => setSceneCount(Math.max(2, Math.min(8, Number(e.target.value))))}
                          min="2" max="8"
                          className="w-20 p-2 bg-black/20 border border-white/20 rounded-md text-center"
                          disabled={isLoading}
                      />
                  </div>
              )}
              <div className={mode === 'manual' ? 'w-full' : ''}>
                <button
                    onClick={handleGenerateClick}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full md:w-auto flex justify-center items-center gap-2 bg-blue-500/50 hover:bg-blue-500/70 border border-blue-400/50 disabled:bg-gray-500/50 disabled:border-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-md transition-all duration-300 transform hover:scale-105"
                >
                    {isLoading ? <Spinner /> : (mode === 'auto' ? 'Generate Storyboard' : 'Generate Scene')}
                </button>
              </div>
          </div>
      </div>
      
      {isLoading && (
        <div className="flex flex-col items-center gap-4 text-gray-300 p-8">
          <Spinner className="h-12 w-12" />
          <p className="text-lg animate-pulse">{loadingMessage || 'Processing...'}</p>
        </div>
      )}

       {error && !isLoading && (
        <div className="text-center text-red-400 bg-red-900/50 backdrop-blur-sm p-6 rounded-xl border border-red-400/30">
           <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-semibold">An Error Occurred During Generation</h3>
          <p className="mt-1 text-sm max-w-md mx-auto">{error}</p>
        </div>
      )}
      
      {scenes.length === 0 && !isLoading && <Placeholder />}

      {scenes.map((scene, index) => (
        <SceneCard 
          key={scene.id} 
          scene={scene} 
          sceneNumber={index + 1}
          onUpdateDescription={onUpdateDescription} 
          onDeleteScene={onDeleteScene} 
          onEditSceneInCreator={onEditSceneInCreator}
        />
      ))}

    </div>
  );
};

export default StoryboardPanel;
