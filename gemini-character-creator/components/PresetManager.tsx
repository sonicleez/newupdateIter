import React from 'react';
import { CharacterPreset } from '../types';

interface PresetManagerProps {
  presets: CharacterPreset[];
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

const PresetManager: React.FC<PresetManagerProps> = ({ presets, onLoad, onDelete }) => {
  if (presets.length === 0) {
    return null;
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent onLoad from firing when delete is clicked
    onDelete(id);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-100">Character Presets</h2>
        <div className="max-h-60 overflow-y-auto pr-2 flex flex-col gap-3">
          {presets.map((preset) => (
            <div
              key={preset.id}
              onClick={() => onLoad(preset.id)}
              className="flex items-center gap-4 p-2 bg-black/20 hover:bg-blue-900/30 rounded-lg border border-white/20 hover:border-blue-700/50 cursor-pointer transition-all"
            >
              <img
                src={`data:${preset.image.mimeType};base64,${preset.image.base64}`}
                alt={preset.name}
                className="w-16 h-16 rounded-md object-cover flex-shrink-0"
              />
              <div className="flex-grow min-w-0">
                <p className="font-bold text-gray-200 truncate">{preset.name}</p>
                <p className="text-xs text-gray-400 truncate italic">Style: {preset.style}</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, preset.id)}
                className="p-2 rounded-full text-gray-400 hover:bg-red-800/50 hover:text-red-300 transition-colors flex-shrink-0"
                title="Delete Preset"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PresetManager;
