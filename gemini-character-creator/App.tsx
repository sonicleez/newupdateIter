import React, { useState, useCallback, useRef, useEffect } from 'react';
import ControlPanel from './components/ControlPanel';
import ImageDisplay from './components/ImageDisplay';
import ImageHistory from './components/ImageHistory';
import LoginScreen from './components/LoginScreen';
import PresetManager from './components/PresetManager';
import StoryboardPanel from './components/StoryboardPanel';
import ChatBot from './components/ChatBot';
import AdjustmentsPanel from './components/AdjustmentsPanel';
import ObjectAnalyze from './components/ObjectAnalyze';
import { generateImage, editImage, editImageWithMask, upscaleImage, expandImage, applyStyleTransfer, compositeImages, generateConsistentCharacter, refinePrompt, generateStoryboardAuto, generateImageWithReferences, analyzeImage } from './services/geminiService';
import * as authService from './services/authService';
import { ArtStyle, GeneratedImage, AspectRatio, ImageDisplayHandle, CharacterPreset, StoryboardScene, StoryboardReferences, StoryboardReferenceType, HistoryImage, ImageAdjustments } from './types';
import { ART_STYLES } from './constants';

// --- IndexedDB Service Logic for Storyboard ---
const DB_NAME = 'CharacterCreatorDB';
const DB_VERSION = 1;
const STORE_NAME = 'storyboardScenes';

let db: IDBDatabase;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject("IndexedDB error");
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

const getAllScenes = async (): Promise<StoryboardScene[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject('Error fetching scenes from IndexedDB');
    request.onsuccess = () => resolve(request.result);
  });
};

const addScene = async (scene: StoryboardScene): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(scene);
    request.onerror = () => reject('Error adding scene to IndexedDB');
    request.onsuccess = () => resolve();
  });
};

const updateScene = async (scene: StoryboardScene): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(scene);
      request.onerror = () => reject('Error updating scene in IndexedDB');
      request.onsuccess = () => resolve();
    });
};

const deleteScene = async (sceneId: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(sceneId);
    request.onerror = () => reject('Error deleting scene from IndexedDB');
    request.onsuccess = () => resolve();
  });
};


type AuthState = 'unauthenticated' | 'authenticated';
type ActiveTab = 'creator' | 'storyboard';
type HistoryLayout = 'scroll' | 'grid';

const PRESETS_STORAGE_KEY = 'gemini_char_creator_presets';

const initialAdjustments: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  temperature: 0,
};


const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('authenticated');
  const [activeTab, setActiveTab] = useState<ActiveTab>('creator');

  const handleLoginSuccess = () => {
    setAuthState('authenticated');
  };

  const handleLogout = () => {
    setAuthState('unauthenticated');
  };

  // --- Character Creator State ---
  const [prompt, setPrompt] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState<string>('');
  const [shotType, setShotType] = useState<string>('');
  const [cameraAngle, setCameraAngle] = useState<string>('');
  const [cameraRoll, setCameraRoll] = useState<string>('');
  const [style, setStyle] = useState<ArtStyle>(ArtStyle.PIXAR);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMaskingEnabled, setIsMaskingEnabled] = useState<boolean>(false);
  
  const [imageHistory, setImageHistory] = useState<HistoryImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [styleImage, setStyleImage] = useState<GeneratedImage | null>(null);
  const [compositeImage, setCompositeImage] = useState<GeneratedImage | null>(null);
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(initialAdjustments);
  const [historyLayout, setHistoryLayout] = useState<HistoryLayout>('scroll');

  const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<number, string[] | null>>({});


  const [lockedCharacter, setLockedCharacter] = useState<GeneratedImage | null>(null);
  const isCharacterLocked = lockedCharacter !== null;

  const [presets, setPresets] = useState<CharacterPreset[]>([]);
  
  // --- Storyboard State ---
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([]);
  const [storyboardReferences, setStoryboardReferences] = useState<StoryboardReferences>({
    character: null, setting: null, prop: null, style: null,
  });
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  
  const imageDisplayRef = useRef<ImageDisplayHandle>(null);
  
  const currentImage: HistoryImage | null = imageHistory[activeImageIndex] || null;
  const areAdjustmentsDefault = Object.values(adjustments).every(v => v === 0);

  // --- LocalStorage & IndexedDB Effects ---
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (storedPresets) setPresets(JSON.parse(storedPresets));
    } catch (e) {
      console.error("Failed to load presets from localStorage:", e);
    }

    const loadStoryboard = async () => {
      try {
        const scenes = await getAllScenes();
        setStoryboardScenes(scenes);
      } catch (e) {
        console.error("Failed to load storyboard from IndexedDB:", e);
        setError("Could not load storyboard data. Your stories might not be saved correctly.");
      }
    };
    loadStoryboard();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) { console.error("Failed to save presets:", e); }
  }, [presets]);

  useEffect(() => {
    // When the user navigates away from the creator, clear the scene editing context.
    if (activeTab !== 'creator') {
      setEditingSceneId(null);
    }
  }, [activeTab]);


  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setEditPrompt('');
    setIsMaskingEnabled(false);
    setStyleImage(null);
    setCompositeImage(null);
    setAdjustments(initialAdjustments);
    setEditingSceneId(null); // Clear editing context on new generation

    try {
      setLoadingMessage('Enhancing your prompt with AI...');
      const styleModifier = ART_STYLES.find(s => s.value === style)?.promptModifier || '';
      
      const promptAdditions = [shotType, cameraAngle, cameraRoll].filter(Boolean).join(', ');
      const fullUserPrompt = [prompt, promptAdditions].filter(Boolean).join(', ');

      const refinedPrompt = await refinePrompt(fullUserPrompt, styleModifier);

      setLoadingMessage(isCharacterLocked ? 'Generating new scene...' : 'Generating your masterpiece...');

      let imageResult: GeneratedImage;
      
      if (isCharacterLocked && lockedCharacter) {
        imageResult = await generateConsistentCharacter(lockedCharacter, refinedPrompt, styleModifier);
      } else {
        imageResult = await generateImage(refinedPrompt, styleModifier, aspectRatio);
      }
      
      const newHistoryImage: HistoryImage = {
        ...imageResult,
        prompt: prompt, // Keep original user prompt for history
        style: style,
      };

      const newHistory = [...imageHistory, newHistoryImage];
      setImageHistory(newHistory);
      setActiveImageIndex(newHistory.length - 1);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, style, aspectRatio, isCharacterLocked, lockedCharacter, imageHistory, shotType, cameraAngle, cameraRoll]);
  
  const handleEdit = useCallback(async () => {
    const imageToEdit = imageHistory[activeImageIndex];
    
    const getAdjective = (value: number, positive: string, negative: string): string => {
      if (value > 30) return `significantly ${positive}`;
      if (value > 0) return `slightly ${positive}`;
      if (value < -30) return `significantly ${negative}`;
      if (value < 0) return `slightly ${negative}`;
      return '';
    };

    const adjustmentPrompts = [
        getAdjective(adjustments.brightness, 'increase the brightness', 'decrease the brightness'),
        getAdjective(adjustments.contrast, 'increase the contrast', 'decrease the contrast'),
        getAdjective(adjustments.saturation, 'boost color saturation', 'desaturate the colors'),
        getAdjective(adjustments.sharpness, 'increase sharpness', 'soften the image'),
        getAdjective(adjustments.temperature, 'add a warm color tone', 'add a cool color tone'),
    ].filter(Boolean);
    
    const finalEditPrompt = [editPrompt, shotType, cameraAngle, cameraRoll, ...adjustmentPrompts].filter(Boolean).join(', ');

    if (!finalEditPrompt.trim() || !imageToEdit) return;

    setIsLoading(true);
    setLoadingMessage('Applying your edits...');
    setError(null);

    try {
      let imageResult: GeneratedImage;
      const maskBase64 = imageDisplayRef.current?.getMaskAsBase64();

      if (compositeImage) {
        imageResult = await compositeImages(imageToEdit, compositeImage, finalEditPrompt);
      } else if (styleImage) {
        imageResult = await applyStyleTransfer(imageToEdit, styleImage, finalEditPrompt);
      } else if (isMaskingEnabled && maskBase64) {
        imageResult = await editImageWithMask(imageToEdit.base64, imageToEdit.mimeType, maskBase64, finalEditPrompt);
      } else {
         if (isMaskingEnabled && !maskBase64) {
          setError("Mask editing is enabled, but no mask was drawn. Please draw on the image to specify the edit area.");
          setIsLoading(false);
          return;
        }
        imageResult = await editImage(imageToEdit.base64, imageToEdit.mimeType, finalEditPrompt);
      }
      
      const newHistoryImage: HistoryImage = {
        ...imageResult,
        prompt: imageToEdit.prompt,
        style: imageToEdit.style,
      };
      
      const newHistory = [...imageHistory, newHistoryImage];
      setImageHistory(newHistory);
      setActiveImageIndex(newHistory.length - 1);
      setEditPrompt('');
      setCompositeImage(null);
      setAdjustments(initialAdjustments);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [editPrompt, imageHistory, activeImageIndex, isMaskingEnabled, styleImage, compositeImage, shotType, cameraAngle, cameraRoll, adjustments]);

  const handleUpscale = useCallback(async () => {
    const imageToUpscale = imageHistory[activeImageIndex];
    if (!imageToUpscale) return;

    setIsLoading(true);
    setLoadingMessage('Upscaling your image...');
    setError(null);


    try {
      const imageResult = await upscaleImage(imageToUpscale.base64, imageToUpscale.mimeType);
      
      const newHistoryImage: HistoryImage = {
        ...imageResult,
        prompt: imageToUpscale.prompt,
        style: imageToUpscale.style,
      };
      
      const newHistory = [...imageHistory, newHistoryImage];
      setImageHistory(newHistory);
      setActiveImageIndex(newHistory.length - 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [imageHistory, activeImageIndex]);
  
  const handleExpand = useCallback(async (direction: 'up' | 'down' | 'left' | 'right') => {
    const imageToExpand = imageHistory[activeImageIndex];
    if (!imageToExpand) return;

    setIsLoading(true);
    setLoadingMessage(`Expanding image ${direction}...`);
    setError(null);

    try {
      const imageResult = await expandImage(imageToExpand.base64, imageToExpand.mimeType, direction);
      
      const newHistoryImage: HistoryImage = {
        ...imageResult,
        prompt: imageToExpand.prompt,
        style: imageToExpand.style,
      };

      const newHistory = [...imageHistory, newHistoryImage];
      setImageHistory(newHistory);
      setActiveImageIndex(newHistory.length - 1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [imageHistory, activeImageIndex]);
  
  const processUploadedFile = (file: File, onComplete: (image: GeneratedImage) => void) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const [header, base64Data] = result.split(',');
      if (!header || !base64Data) { setError("Could not read the uploaded file."); return; }
      const mimeType = header.split(';')[0].split(':')[1];
      if (!mimeType) { setError("Could not determine the image type."); return; }
      onComplete({ base64: base64Data, mimeType });
    };
    reader.onerror = () => { setError("Failed to read the file."); };
    reader.readAsDataURL(file);
  }

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true); setLoadingMessage('Loading your image...');
    setEditPrompt(''); setIsMaskingEnabled(false); setStyleImage(null); setCompositeImage(null);
    setShotType(''); setCameraAngle(''); setCameraRoll('');
    setAdjustments(initialAdjustments);
    setEditingSceneId(null);

    processUploadedFile(file, (uploadedImage) => {
        const newHistoryImage: HistoryImage = {
          ...uploadedImage,
          prompt: "Uploaded image",
          style: style,
        };
        const newHistory = [...imageHistory, newHistoryImage];
        setImageHistory(newHistory);
        setActiveImageIndex(newHistory.length - 1);
        setIsLoading(false);
    });
    event.target.value = '';
  }, [style, imageHistory]);
  
  const handleStyleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processUploadedFile(file, (image) => {
      setStyleImage(image);
      setCompositeImage(null); // Mutually exclusive
    });
    event.target.value = '';
  }, []);
  
  const handleRemoveStyleImage = () => setStyleImage(null);

  const handleCompositeImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processUploadedFile(file, (image) => {
      setCompositeImage(image);
      setStyleImage(null); // Mutually exclusive
    });
    event.target.value = '';
  }, []);
  
  const handleClearCompositeImage = () => setCompositeImage(null);
  
  const handleSelectCompositeFromHistory = useCallback((index: number) => {
    const image = imageHistory[index];
    if (image) {
      setCompositeImage(image);
      setStyleImage(null); // Mutually exclusive
    }
  }, [imageHistory]);
  
  const handleDeleteFromHistory = useCallback((indexToDelete: number) => {
    if (!window.confirm("Are you sure you want to delete this version? This action cannot be undone.")) {
        return;
    }

    const newHistory = imageHistory.filter((_, i) => i !== indexToDelete);
    
    let newActiveIndex = activeImageIndex;
    if (newHistory.length === 0) {
        newActiveIndex = 0;
    } else if (indexToDelete < activeImageIndex) {
        newActiveIndex = activeImageIndex - 1;
    } else if (indexToDelete === activeImageIndex) {
        newActiveIndex = Math.min(indexToDelete, newHistory.length - 1);
    }

    setImageHistory(newHistory);
    setActiveImageIndex(newActiveIndex);
  }, [imageHistory, activeImageIndex]);

  const handleToggleHistoryLayout = () => {
    setHistoryLayout(prev => prev === 'scroll' ? 'grid' : 'scroll');
  };

  const handleToggleCharacterLock = useCallback(() => {
    if (isCharacterLocked) {
      setLockedCharacter(null);
    } else if (currentImage) {
      setLockedCharacter(currentImage);
      setPrompt(''); setError(null);
    }
  }, [isCharacterLocked, currentImage]);

  const handleSavePreset = useCallback(() => {
    if (!currentImage) return;
    const name = window.prompt("Enter a name for your character preset:", "My Awesome Character");
    if (name && name.trim()) {
      const newPreset: CharacterPreset = {
        id: Date.now().toString(), name: name.trim(), image: currentImage,
        prompt: currentImage.prompt, style: currentImage.style,
      };
      setPresets(prevPresets => [...prevPresets, newPreset]);
    }
  }, [currentImage]);

  const handleLoadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      const newHistoryImage: HistoryImage = {
        ...preset.image,
        prompt: preset.prompt,
        style: preset.style,
      };
      setImageHistory([newHistoryImage]); setActiveImageIndex(0);
      setPrompt(preset.prompt); setStyle(preset.style);
      setError(null); setEditPrompt(''); setLockedCharacter(null);
      setIsMaskingEnabled(false); setStyleImage(null); setCompositeImage(null);
      setShotType(''); setCameraAngle(''); setCameraRoll('');
      setAdjustments(initialAdjustments);
      setEditingSceneId(null);
      setActiveTab('creator');
    }
  }, [presets]);

  const handleDeletePreset = useCallback((presetId: string) => {
    if (window.confirm("Are you sure you want to delete this character preset?")) {
      setPresets(prevPresets => prevPresets.filter(p => p.id !== presetId));
    }
  }, []);

  // --- Storyboard Handlers ---
  const handleAddToStoryboard = useCallback(async () => {
    if (!currentImage) return;
    const newScene: StoryboardScene = {
      id: Date.now().toString(),
      image: currentImage,
      description: '',
    };
    try {
      await addScene(newScene);
      setStoryboardScenes(prev => [...prev, newScene]);
      setActiveTab('storyboard');
    } catch (e) {
      console.error("Failed to add scene to DB", e);
      setError("Could not save the new scene to the storyboard.");
    }
  }, [currentImage]);

  const handleSetStoryboardReference = useCallback((image: GeneratedImage, type: StoryboardReferenceType) => {
    setStoryboardReferences(prev => ({ ...prev, [type]: image }));
    setActiveTab('storyboard');
  }, []);

  const handleUpdateSceneDescription = async (sceneId: string, description: string) => {
    const sceneToUpdate = storyboardScenes.find(scene => scene.id === sceneId);
    if (!sceneToUpdate) return;

    const updatedScene = { ...sceneToUpdate, description };
    try {
      await updateScene(updatedScene);
      setStoryboardScenes(prev => prev.map(scene => scene.id === sceneId ? updatedScene : scene));
    } catch (e) {
      console.error("Failed to update scene description in DB", e);
      setError("Could not save the scene description.");
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    if (window.confirm("Are you sure you want to delete this scene?")) {
      try {
        await deleteScene(sceneId);
        setStoryboardScenes(prev => prev.filter(scene => scene.id !== sceneId));
      } catch (e) {
        console.error("Failed to delete scene from DB", e);
        setError("Could not delete the scene.");
      }
    }
  };
  
  const handleEditSceneInCreator = useCallback((scene: StoryboardScene) => {
    if (!scene) return;
    
    const newHistoryImage: HistoryImage = {
      ...scene.image,
      prompt: scene.description || `Editing Scene #${scene.id.substring(0,5)}`,
      style: style, // Use current global style as scenes don't store it
    };
    
    const newHistory = [...imageHistory, newHistoryImage];
    setImageHistory(newHistory);
    setActiveImageIndex(newHistory.length - 1);

    setPrompt('');
    setEditPrompt('');
    setIsMaskingEnabled(false);
    setStyleImage(null);
    setCompositeImage(null);
    setLockedCharacter(null);
    setError(null);
    setAdjustments(initialAdjustments);
    
    setEditingSceneId(scene.id);
    setActiveTab('creator');
  }, [style, imageHistory]);

  const handleReplaceScene = async () => {
    if (!editingSceneId || !currentImage) return;

    const sceneToUpdate = storyboardScenes.find(scene => scene.id === editingSceneId);
    if (!sceneToUpdate) {
        setError("Error: Could not find the original scene to replace.");
        setEditingSceneId(null); // Clear context if scene is not found
        return;
    }

    const updatedScene = { ...sceneToUpdate, image: currentImage };

    try {
      await updateScene(updatedScene);
      setStoryboardScenes(prev => prev.map(scene => scene.id === editingSceneId ? updatedScene : scene));
      
      // Success: go back to storyboard and clear context
      setActiveTab('storyboard');
      setEditingSceneId(null);

    } catch (e) {
      console.error("Failed to replace scene in DB", e);
      setError("Could not update the scene in the storyboard.");
    }
  };

  const handleReferenceUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: StoryboardReferenceType) => {
    const file = event.target.files?.[0];
    if (!file) return;
    processUploadedFile(file, (image) => {
        setStoryboardReferences(prev => ({ ...prev, [type]: image }));
    });
    event.target.value = '';
  }, []);
  
  const handleClearReference = (type: StoryboardReferenceType) => {
    setStoryboardReferences(prev => ({ ...prev, [type]: null }));
  };

  const handleGenerateStoryboard = useCallback(async (mode: 'auto' | 'manual', prompt: string, sceneCount: number) => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'auto') {
        setLoadingMessage(`Generating ${sceneCount} scenes...`);
        const newImages = await generateStoryboardAuto(prompt, sceneCount, storyboardReferences);
        
        const newScenes: StoryboardScene[] = newImages.map(image => ({
          id: Date.now().toString() + Math.random(),
          image,
          description: ''
        }));

        for (const scene of newScenes) {
            await addScene(scene);
        }
        setStoryboardScenes(prev => [...prev, ...newScenes]);

      } else { // Manual mode
        setLoadingMessage('Generating scene...');
        const lastScene = storyboardScenes[storyboardScenes.length - 1];
        
        // Use last scene as character ref if no explicit character ref is provided
        const finalReferences = { ...storyboardReferences };
        if (!finalReferences.character && lastScene) {
            finalReferences.character = lastScene.image;
        }

        const newImage = await generateImageWithReferences(prompt, finalReferences);
        const newScene: StoryboardScene = {
          id: Date.now().toString(),
          image: newImage,
          description: '',
        };
        await addScene(newScene);
        setStoryboardScenes(prev => [...prev, newScene]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [storyboardScenes, storyboardReferences]);
  
  const handleAdjustmentsChange = useCallback((adjustment: keyof ImageAdjustments, value: number) => {
    setAdjustments(prev => ({ ...prev, [adjustment]: value }));
  }, []);

  const handleAnalyzeImage = useCallback(async (index: number) => {
    const imageToAnalyze = imageHistory[index];
    if (!imageToAnalyze) return;

    setAnalyzingIndex(index);
    setError(null);

    try {
        const result = await analyzeImage(imageToAnalyze);
        setAnalysisResults(prev => ({
            ...prev,
            [index]: result.length > 0 ? result : null // Use null for empty result
        }));
    } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
        setAnalysisResults(prev => {
            const newResults = { ...prev };
            delete newResults[index];
            return newResults;
        });
    } finally {
        setAnalyzingIndex(null);
    }
  }, [imageHistory]);
  
  const handleClearAnalysis = (index: number) => {
    setAnalysisResults(prev => {
        const newResults = { ...prev };
        delete newResults[index];
        return newResults;
    });
  };

  const handleAnalysisTagClick = useCallback((tag: string) => {
    setEditPrompt(tag);
  }, []);


  // --- Render logic ---
  if (authState === 'unauthenticated') {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} validateCode={authService.validateAccessCode} />;
  }

  const TabButton: React.FC<{tab: ActiveTab; label: string}> = ({tab, label}) => (
     <button 
        onClick={() => setActiveTab(tab)}
        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-blue-500/80 text-white' : 'text-gray-300 hover:bg-white/10'}`}>
        {label}
     </button>
  );

  return (
    <div className="min-h-screen text-gray-100 font-sans">
      <header className="sticky top-0 z-30 bg-black/30 backdrop-blur-xl py-4 px-8 border-b border-white/20">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
            </svg>
            <h1 className="text-2xl font-bold tracking-wider">Gemini Character Creator</h1>
          </div>
           <button onClick={handleLogout} className="text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2 px-4 rounded-md transition-colors">
              Logout
            </button>
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
         <div className="mb-6 flex items-center gap-2 p-1 bg-black/30 backdrop-blur-lg rounded-lg border border-white/20 max-w-xs">
            <TabButton tab="creator" label="Creator" />
            <TabButton tab="storyboard" label="Storyboard" />
         </div>

        {activeTab === 'creator' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-8">
              <ControlPanel
                prompt={prompt} setPrompt={setPrompt} style={style} setStyle={setStyle} aspectRatio={aspectRatio}
                setAspectRatio={setAspectRatio} onGenerate={handleGenerate} isLoading={isLoading || analyzingIndex !== null} editPrompt={editPrompt}
                setEditPrompt={setEditPrompt} onEdit={handleEdit} hasImage={!!currentImage} isMaskingEnabled={isMaskingEnabled}
                setIsMaskingEnabled={setIsMaskingEnabled} onImageUpload={handleImageUpload} 
                onStyleImageUpload={handleStyleImageUpload} styleImage={styleImage} onRemoveStyleImage={handleRemoveStyleImage}
                compositeImage={compositeImage} onCompositeImageUpload={handleCompositeImageUpload} onClearCompositeImage={handleClearCompositeImage}
                isCharacterLocked={isCharacterLocked} lockedCharacter={lockedCharacter} onToggleCharacterLock={handleToggleCharacterLock}
                shotType={shotType} setShotType={setShotType} cameraAngle={cameraAngle} setCameraAngle={setCameraAngle} cameraRoll={cameraRoll} setCameraRoll={setCameraRoll}
                areAdjustmentsDefault={areAdjustmentsDefault}
              />
              <PresetManager presets={presets} onLoad={handleLoadPreset} onDelete={handleDeletePreset} />
            </div>
            <div className="md:col-span-1 lg:col-span-3">
              <ImageDisplay 
                ref={imageDisplayRef} image={currentImage} isLoading={isLoading} loadingMessage={loadingMessage} error={error}
                aspectRatio={aspectRatio} isMaskingEnabled={isMaskingEnabled} onUpscale={handleUpscale} onExpand={handleExpand}
                isCharacterLocked={isCharacterLocked} onToggleCharacterLock={handleToggleCharacterLock} onSavePreset={handleSavePreset}
                onAddToStoryboard={handleAddToStoryboard}
                onSetReference={handleSetStoryboardReference}
                editingSceneId={editingSceneId}
                onReplaceScene={handleReplaceScene}
              />
              {currentImage && (
                <AdjustmentsPanel 
                    adjustments={adjustments} 
                    onAdjustmentsChange={handleAdjustmentsChange} 
                />
              )}
              <ImageHistory 
                history={imageHistory} 
                activeIndex={activeImageIndex} 
                onSelect={(index) => {
                  setActiveImageIndex(index);
                  setIsMaskingEnabled(false);
                }}
                onSelectComposite={handleSelectCompositeFromHistory}
                onDelete={handleDeleteFromHistory}
                onAnalyze={handleAnalyzeImage}
                layout={historyLayout}
                onToggleLayout={handleToggleHistoryLayout}
              />
               <ObjectAnalyze 
                analysisResult={analysisResults[activeImageIndex]}
                isAnalyzing={analyzingIndex === activeImageIndex}
                onClear={() => handleClearAnalysis(activeImageIndex)}
                onTagClick={handleAnalysisTagClick}
              />
            </div>
          </div>
        )}

        {activeTab === 'storyboard' && (
           <StoryboardPanel 
              scenes={storyboardScenes}
              references={storyboardReferences}
              onUpdateDescription={handleUpdateSceneDescription}
              onDeleteScene={handleDeleteScene}
              onGenerate={handleGenerateStoryboard}
              onReferenceUpload={handleReferenceUpload}
              onClearReference={handleClearReference}
              onEditSceneInCreator={handleEditSceneInCreator}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              error={error}
           />
        )}
      </main>
      
      <ChatBot activeCreatorImage={currentImage} />

      <footer className="text-center p-4 mt-8 text-gray-300/70 text-sm">
        <p>Powered by Google Gemini. Create something amazing.</p>
      </footer>
    </div>
  );
};

export default App;