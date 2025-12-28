import React, { useRef } from 'react';
import { X, Plus, Upload, Trash, Wand2, MapPin, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Location } from '../../types';

interface LocationManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    locations: Location[];
    addLocation: () => string;
    updateLocation: (id: string, updates: Partial<Location>) => void;
    removeLocation: (id: string) => void;
    analyzeLocationImage: (id: string) => Promise<void>;
}

export const LocationManagerModal: React.FC<LocationManagerModalProps> = ({
    isOpen,
    onClose,
    locations,
    addLocation,
    updateLocation,
    removeLocation,
    analyzeLocationImage
}) => {
    const [selectedId, setSelectedId] = React.useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const selectedLocation = locations.find(l => l.id === selectedId) || locations[0] || null;

    const handleCreate = () => {
        const newId = addLocation();
        setSelectedId(newId);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && selectedLocation) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                updateLocation(selectedLocation.id, { masterImage: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl h-[85vh] bg-[#0F1115] border border-gray-800 rounded-xl shadow-2xl flex overflow-hidden">

                {/* Sidebar List */}
                <div className="w-64 border-r border-gray-800 flex flex-col bg-gray-900/50">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-100 font-bold">
                            <MapPin className="w-5 h-5 text-orange-500" />
                            <span>Locations</span>
                        </div>
                        <button onClick={handleCreate} className="p-1 hover:bg-gray-700 rounded text-orange-500 transition-colors" title="Add Location">
                            <Plus size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {locations.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => setSelectedId(loc.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-all ${selectedId === loc.id || (selectedLocation?.id === loc.id && !selectedId)
                                        ? 'bg-orange-500/20 text-orange-200 border border-orange-500/30'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                    }`}
                            >
                                <div className="w-10 h-10 rounded overflow-hidden bg-gray-950 flex-shrink-0 border border-gray-700">
                                    {loc.masterImage ? (
                                        <img src={loc.masterImage} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600"><ImageIcon size={16} /></div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-medium truncate text-sm">{loc.name || 'Untitled'}</div>
                                    <div className="text-[10px] truncate opacity-50">{loc.description ? 'Has description' : 'Empty'}</div>
                                </div>
                            </button>
                        ))}
                        {locations.length === 0 && (
                            <div className="text-center p-8 text-gray-500 text-xs">
                                No locations yet.<br />Click + to add.
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col h-full bg-[#0F1115]">
                    {selectedLocation ? (
                        <>
                            {/* Header */}
                            <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/30">
                                <input
                                    type="text"
                                    value={selectedLocation.name}
                                    onChange={(e) => updateLocation(selectedLocation.id, { name: e.target.value })}
                                    className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b border-orange-500/50 w-full max-w-md"
                                    placeholder="Location Name..."
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => removeLocation(selectedLocation.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg flex items-center gap-2 transition-colors text-xs font-medium"
                                    >
                                        <Trash size={16} /> Delete
                                    </button>
                                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="grid grid-cols-12 gap-6">
                                    {/* Left: Image & Analysis */}
                                    <div className="col-span-12 lg:col-span-5 space-y-4">
                                        <div
                                            className="aspect-video bg-gray-950 rounded-lg border-2 border-dashed border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 hover:bg-gray-900/50 transition-all relative overflow-hidden group"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {selectedLocation.masterImage ? (
                                                <img src={selectedLocation.masterImage} className="absolute inset-0 w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-6 text-gray-500">
                                                    <Upload className="mx-auto mb-2 opacity-50" />
                                                    <div className="text-sm">Click to upload Master Image</div>
                                                    <div className="text-[10px] opacity-70">This will be the source of truth</div>
                                                </div>
                                            )}
                                            {selectedLocation.masterImage && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                    <span className="text-white text-xs font-medium flex items-center gap-2">
                                                        <ImageIcon size={14} /> Change Image
                                                    </span>
                                                </div>
                                            )}
                                            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        </div>

                                        <button
                                            onClick={() => analyzeLocationImage(selectedLocation.id)}
                                            disabled={!selectedLocation.masterImage || selectedLocation.isAnalyzing}
                                            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all ${!selectedLocation.masterImage
                                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                    : selectedLocation.isAnalyzing
                                                        ? 'bg-orange-500/50 text-orange-100'
                                                        : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-900/20'
                                                }`}
                                        >
                                            {selectedLocation.isAnalyzing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
                                            {selectedLocation.isAnalyzing ? 'Analyzing Visuals...' : 'Auto-Analyze Image'}
                                        </button>

                                        {/* Color Palette */}
                                        {selectedLocation.colorPalette && selectedLocation.colorPalette.length > 0 && (
                                            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                                <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Dominant Colors</div>
                                                <div className="flex gap-2">
                                                    {selectedLocation.colorPalette.map(color => (
                                                        <div key={color} className="w-8 h-8 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: color }} title={color} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Description & Metadata */}
                                    <div className="col-span-12 lg:col-span-7 space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Visual Description (Prompt)</label>
                                            <textarea
                                                value={selectedLocation.description}
                                                onChange={(e) => updateLocation(selectedLocation.id, { description: e.target.value })}
                                                className="w-full h-48 bg-gray-900 border border-gray-700 rounded-lg p-4 text-sm text-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none resize-none leading-relaxed"
                                                placeholder="Detailed description of the location's lighting, textures, layout, and atmosphere..."
                                            />
                                            <div className="text-[10px] text-gray-500 flex justify-between">
                                                <span>This description acts as the 'Truth' for all scenes in this location.</span>
                                                <span>{selectedLocation.description.length} chars</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tags</label>
                                            <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 min-h-[40px] flex flex-wrap gap-2">
                                                {selectedLocation.tags?.map((tag, idx) => (
                                                    <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 border border-gray-700">#{tag}</span>
                                                ))}
                                                {(!selectedLocation.tags || selectedLocation.tags.length === 0) && (
                                                    <span className="text-gray-600 text-xs italic p-1">No tags generated</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                            <MapPin size={48} className="mb-4 opacity-20" />
                            <p>Select a location or create a new one</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
