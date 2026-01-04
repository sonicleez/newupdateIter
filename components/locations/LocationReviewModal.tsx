/**
 * Location Review Modal
 * 
 * Shows detected locations after script analysis.
 * Allows user to edit, merge, or remove before generating concepts.
 */

import React, { useState, useMemo } from 'react';
import { LocationAnalysis } from '../../hooks/useScriptAnalysis';
import styles from './LocationReviewModal.module.css';

interface LocationReviewModalProps {
    locations: LocationAnalysis[];
    globalStyle?: string; // Applied style for concept prompts
    onConfirm: (locations: LocationAnalysis[], generateConcepts: boolean) => void;
    onClose: () => void;
}

export const LocationReviewModal: React.FC<LocationReviewModalProps> = ({
    locations: initialLocations,
    globalStyle,
    onConfirm,
    onClose
}) => {
    const [locations, setLocations] = useState<LocationAnalysis[]>(initialLocations);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(
        new Set(initialLocations.map(l => l.id))
    );
    const [editingId, setEditingId] = useState<string | null>(null);

    // Calculate total scenes covered
    const totalScenesCovered = useMemo(() => {
        const selectedLocs = locations.filter(l => selectedIds.has(l.id));
        const sceneCount = selectedLocs.reduce((sum, loc) =>
            sum + loc.chapterIds.length, 0
        );
        return sceneCount;
    }, [locations, selectedIds]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const updateLocation = (id: string, updates: Partial<LocationAnalysis>) => {
        setLocations(prev => prev.map(loc =>
            loc.id === id ? { ...loc, ...updates } : loc
        ));
    };

    const deleteLocation = (id: string) => {
        setLocations(prev => prev.filter(loc => loc.id !== id));
        const newSelected = new Set(selectedIds);
        newSelected.delete(id);
        setSelectedIds(newSelected);
    };

    const handleConfirm = (generateConcepts: boolean) => {
        const selectedLocations = locations.filter(l => selectedIds.has(l.id));
        onConfirm(selectedLocations, generateConcepts);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>📍 Detected Locations ({locations.length})</h2>
                    <p className={styles.subtitle}>
                        Review and select locations for concept art generation
                    </p>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.content}>
                    {locations.length === 0 ? (
                        <div className={styles.empty}>
                            <span className={styles.emptyIcon}>🗺️</span>
                            <p>No locations detected in script</p>
                            <p className={styles.emptyHint}>
                                Locations will be auto-detected from scene descriptions
                            </p>
                        </div>
                    ) : (
                        <div className={styles.locationList}>
                            {locations.map(location => {
                                const isSelected = selectedIds.has(location.id);
                                const isEditing = editingId === location.id;

                                return (
                                    <div
                                        key={location.id}
                                        className={`${styles.locationCard} ${isSelected ? styles.selected : ''}`}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            className={styles.checkbox}
                                            onClick={() => toggleSelect(location.id)}
                                        >
                                            {isSelected ? '☑' : '☐'}
                                        </div>

                                        {/* Content */}
                                        <div className={styles.locationContent}>
                                            {isEditing ? (
                                                <div className={styles.editForm}>
                                                    <input
                                                        type="text"
                                                        value={location.name}
                                                        onChange={e => updateLocation(location.id, { name: e.target.value })}
                                                        className={styles.editInput}
                                                        placeholder="Location name"
                                                    />
                                                    <textarea
                                                        value={location.description}
                                                        onChange={e => updateLocation(location.id, { description: e.target.value })}
                                                        className={styles.editTextarea}
                                                        rows={2}
                                                        placeholder="Description"
                                                    />
                                                    <textarea
                                                        value={location.conceptPrompt}
                                                        onChange={e => updateLocation(location.id, { conceptPrompt: e.target.value })}
                                                        className={styles.editTextarea}
                                                        rows={3}
                                                        placeholder="Concept art prompt"
                                                    />
                                                    <button
                                                        className={styles.doneBtn}
                                                        onClick={() => setEditingId(null)}
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={styles.locationHeader}>
                                                        <h3 className={styles.locationName}>
                                                            {location.isInterior ? '🏠' : '🌳'} {location.name}
                                                        </h3>
                                                        <span className={styles.chapterCount}>
                                                            {location.chapterIds.length} chapter{location.chapterIds.length !== 1 ? 's' : ''}
                                                        </span>
                                                    </div>

                                                    <p className={styles.description}>{location.description}</p>

                                                    {/* Keywords */}
                                                    <div className={styles.keywords}>
                                                        {location.keywords.map(kw => (
                                                            <span key={kw} className={styles.keyword}>{kw}</span>
                                                        ))}
                                                    </div>

                                                    {/* Metadata */}
                                                    <div className={styles.metadata}>
                                                        {location.timeOfDay && (
                                                            <span className={styles.meta}>🕐 {location.timeOfDay}</span>
                                                        )}
                                                        {location.mood && (
                                                            <span className={styles.meta}>🎭 {location.mood}</span>
                                                        )}
                                                    </div>

                                                    {/* Concept Prompt Preview */}
                                                    <div className={styles.promptPreview}>
                                                        <span className={styles.promptLabel}>Concept Prompt:</span>
                                                        <p className={styles.promptText}>
                                                            {location.conceptPrompt.slice(0, 150)}
                                                            {location.conceptPrompt.length > 150 ? '...' : ''}
                                                        </p>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {!isEditing && (
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => setEditingId(location.id)}
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                    onClick={() => deleteLocation(location.id)}
                                                    title="Remove"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <div className={styles.summary}>
                        <span>{selectedIds.size} location{selectedIds.size !== 1 ? 's' : ''} selected</span>
                        <span className={styles.dot}>•</span>
                        <span>{totalScenesCovered} chapter{totalScenesCovered !== 1 ? 's' : ''} covered</span>
                    </div>

                    <div className={styles.footerActions}>
                        <button
                            className={styles.skipBtn}
                            onClick={() => handleConfirm(false)}
                        >
                            Skip - Use Scene 1 as Concept
                        </button>
                        <button
                            className={styles.generateBtn}
                            onClick={() => handleConfirm(true)}
                            disabled={selectedIds.size === 0}
                        >
                            ✨ Generate {selectedIds.size} Concept{selectedIds.size !== 1 ? 's' : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LocationReviewModal;
