/**
 * Location Selector
 * 
 * Dropdown to select a location from the library for a scene group.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Location } from '../../types';
import styles from './LocationSelector.module.css';

interface LocationSelectorProps {
    locations: Location[];
    selectedLocationId?: string;
    onSelect: (locationId: string | undefined) => void;
    onOpenLibrary?: () => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
    locations,
    selectedLocationId,
    onSelect,
    onOpenLibrary
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedLocation = locations.find(l => l.id === selectedLocationId);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={styles.container} ref={dropdownRef}>
            <label className={styles.label}>📍 Location</label>

            <button
                className={`${styles.trigger} ${isOpen ? styles.open : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedLocation ? (
                    <div className={styles.selectedPreview}>
                        {selectedLocation.conceptImage ? (
                            <img
                                src={selectedLocation.conceptImage}
                                alt={selectedLocation.name}
                                className={styles.thumb}
                            />
                        ) : (
                            <span className={styles.thumbPlaceholder}>🗺️</span>
                        )}
                        <span className={styles.selectedName}>{selectedLocation.name}</span>
                    </div>
                ) : (
                    <span className={styles.placeholder}>No location selected</span>
                )}
                <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    {/* None option */}
                    <button
                        className={`${styles.option} ${!selectedLocationId ? styles.selected : ''}`}
                        onClick={() => {
                            onSelect(undefined);
                            setIsOpen(false);
                        }}
                    >
                        <span className={styles.optionIcon}>✕</span>
                        <span>No location (use group's own concept)</span>
                    </button>

                    {/* Divider */}
                    {locations.length > 0 && <div className={styles.divider} />}

                    {/* Location options */}
                    {locations.map(location => (
                        <button
                            key={location.id}
                            className={`${styles.option} ${selectedLocationId === location.id ? styles.selected : ''}`}
                            onClick={() => {
                                onSelect(location.id);
                                setIsOpen(false);
                            }}
                        >
                            {location.conceptImage ? (
                                <img
                                    src={location.conceptImage}
                                    alt={location.name}
                                    className={styles.optionThumb}
                                />
                            ) : (
                                <span className={styles.optionThumbPlaceholder}>🗺️</span>
                            )}
                            <div className={styles.optionInfo}>
                                <span className={styles.optionName}>{location.name}</span>
                                {location.description && (
                                    <span className={styles.optionDesc}>{location.description}</span>
                                )}
                            </div>
                            {selectedLocationId === location.id && (
                                <span className={styles.checkmark}>✓</span>
                            )}
                        </button>
                    ))}

                    {/* Empty state */}
                    {locations.length === 0 && (
                        <div className={styles.empty}>
                            <p>No locations in library</p>
                        </div>
                    )}

                    {/* Manage link */}
                    {onOpenLibrary && (
                        <>
                            <div className={styles.divider} />
                            <button className={styles.manageBtn} onClick={onOpenLibrary}>
                                ⚙️ Manage Locations
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationSelector;
