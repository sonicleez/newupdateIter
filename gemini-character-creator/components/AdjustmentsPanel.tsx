import React from 'react';
import { ImageAdjustments } from '../types';

interface AdjustmentsPanelProps {
  adjustments: ImageAdjustments;
  onAdjustmentsChange: (adjustment: keyof ImageAdjustments, value: number) => void;
}

const AdjustmentSlider: React.FC<{
  label: string;
  name: keyof ImageAdjustments;
  value: number;
  onChange: (name: keyof ImageAdjustments, value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}> = ({ label, name, value, onChange, min = -50, max = 50, step = 1 }) => (
    <div className="flex items-center gap-3">
        <label htmlFor={name} className="w-24 text-sm font-medium text-gray-300 truncate">{label}</label>
        <input
            id={name}
            type="range"
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(name, parseInt(e.target.value, 10))}
            className="flex-grow h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer"
        />
        <span className="w-8 text-center text-xs text-gray-400">{value}</span>
        <button
          onClick={() => onChange(name, 0)}
          className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
          title={`Reset ${label}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
          </svg>
        </button>
    </div>
);


const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({ adjustments, onAdjustmentsChange }) => {
  return (
    <div className="mt-6">
       <details className="p-4 bg-black/30 backdrop-blur-xl rounded-2xl border border-white/20 group shadow-lg">
            <summary className="text-lg font-semibold text-green-300 cursor-pointer list-none flex justify-between items-center">
                Advanced Adjustments
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </summary>
            <div className="mt-4 flex flex-col gap-3">
                <AdjustmentSlider label="Brightness" name="brightness" value={adjustments.brightness} onChange={onAdjustmentsChange} />
                <AdjustmentSlider label="Contrast" name="contrast" value={adjustments.contrast} onChange={onAdjustmentsChange} />
                <AdjustmentSlider label="Saturation" name="saturation" value={adjustments.saturation} onChange={onAdjustmentsChange} />
                <AdjustmentSlider label="Sharpness" name="sharpness" value={adjustments.sharpness} onChange={onAdjustmentsChange} />
                <AdjustmentSlider label="Temperature" name="temperature" value={adjustments.temperature} onChange={onAdjustmentsChange} />
            </div>
        </details>
    </div>
  );
};

export default AdjustmentsPanel;
