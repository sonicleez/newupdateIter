import React from 'react';
import Spinner from './Spinner';

interface ObjectAnalyzeProps {
  analysisResult: string[] | null;
  isAnalyzing: boolean;
  onClear: () => void;
  onTagClick: (tag: string) => void;
}

const ObjectAnalyze: React.FC<ObjectAnalyzeProps> = ({ analysisResult, isAnalyzing, onClear, onTagClick }) => {
  if (!analysisResult && !isAnalyzing) {
    return null;
  }

  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-3 px-2">
        <h3 className="text-lg font-semibold text-gray-100">Object Analysis</h3>
        {analysisResult && (
           <button
                onClick={onClear}
                className="p-2 rounded-full text-gray-400 hover:bg-white/10 hover:text-red-400 transition-colors"
                title="Clear Analysis"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>
        )}
      </div>
      <div className="p-4 bg-black/30 backdrop-blur-xl rounded-xl border border-white/20 min-h-[80px] flex items-center justify-center">
        {isAnalyzing ? (
          <div className="flex items-center gap-3 text-gray-300">
            <Spinner className="h-6 w-6" />
            <span>Analyzing image...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {analysisResult?.map((item, index) => (
              <button 
                key={index}
                onClick={() => onTagClick(item)}
                className="px-3 py-1 bg-blue-900/50 text-blue-200 text-sm font-medium rounded-full border border-blue-700/50 hover:bg-blue-800/60 hover:border-blue-500 transition-colors transform hover:scale-105 cursor-pointer"
                title={`Use "${item}" in edit prompt`}
              >
                {item}
              </button>
            ))}
             {analysisResult && analysisResult.length === 0 && (
                <p className="text-gray-400">No specific objects or characters were identified.</p>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectAnalyze;