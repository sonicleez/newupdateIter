import React from 'react';
import { GeneratedImage, HistoryImage } from '../types';

interface ImageHistoryProps {
  history: HistoryImage[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onSelectComposite: (index: number) => void;
  onDelete: (index: number) => void;
  onAnalyze: (index: number) => void;
  layout: 'scroll' | 'grid';
  onToggleLayout: () => void;
}

const ImageHistory: React.FC<ImageHistoryProps> = ({ history, activeIndex, onSelect, onSelectComposite, onDelete, onAnalyze, layout, onToggleLayout }) => {
  if (history.length === 0) {
    return null;
  }

  const containerClasses = layout === 'scroll'
    ? "flex gap-3 overflow-x-auto p-2"
    : "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 p-2";

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="text-lg font-semibold text-gray-100">Version History</h3>
        <button
            onClick={onToggleLayout}
            className="p-2 rounded-full text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            title={layout === 'scroll' ? 'Switch to Grid View' : 'Switch to Scroll View'}
        >
            {layout === 'scroll' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0h10v10H5V5z" clipRule="evenodd" />
                    <path d="M15 8H5a1 1 0 000 2h10a1 1 0 100-2z" />
                </svg>
            )}
        </button>
      </div>
      <div className={`${containerClasses} bg-black/30 backdrop-blur-xl rounded-xl border border-white/20`}>
        {history.map((image, index) => (
          <div key={index} className="relative flex-shrink-0 group">
            <button
              onClick={() => onSelect(index)}
              className={`w-24 h-24 rounded-md overflow-hidden border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-400
                ${activeIndex === index ? 'border-blue-400 scale-105 shadow-lg' : 'border-transparent hover:border-white/50'}`}
              aria-label={`Select version ${index + 1}`}
            >
              <img
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt={`Version ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(index);
                }}
                className="absolute top-1 left-1 p-1 bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200 transform hover:scale-110"
                title="Delete Version"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectComposite(index);
                }}
                className="absolute top-1 right-1 p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-green-600 transition-all duration-200 transform hover:scale-110"
                title="Use as Layer for Compositing"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
                </svg>
            </button>
             <button
                onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze(index);
                }}
                className="absolute bottom-1 right-1 p-1.5 bg-black/60 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-purple-600 transition-all duration-200 transform hover:scale-110"
                title="Analyze Objects"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageHistory;
