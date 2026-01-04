/**
 * Location Suggest Popup
 * 
 * Auto-suggests similar locations when creating a new scene group.
 */

import React from 'react';
import { Location } from '../../types';
import styles from './LocationSuggestPopup.module.css';

interface LocationSuggestPopupProps {
    detectedKeywords: string[];
    matches: { location: Location; score: number; matchedKeywords: string[] }[];
    suggestedLocation: Location | null;
    onSelectLocation: (locationId: string) => void;
    onCreateNew: () => void;
    onSkip: () => void;
}

export const LocationSuggestPopup: React.FC<LocationSuggestPopupProps> = ({
    detectedKeywords,
    matches,
    suggestedLocation,
    onSelectLocation,
    onCreateNew,
    onSkip
}) => {
    if (matches.length === 0) {
        return (
            <div className={styles.popup}>
                <div className={styles.header}>
                    <span className={styles.icon}>📍</span>
                    <span>New Location Detected</span>
                </div>

                {detectedKeywords.length > 0 && (
                    <div className={styles.keywords}>
                        <span className={styles.keywordLabel}>Keywords:</span>
                        {detectedKeywords.map(kw => (
                            <span key={kw} className={styles.keyword}>{kw}</span>
                        ))}
                    </div>
                )}

                <p className={styles.message}>
                    Would you like to create a location for this group?
                </p>

                <div className={styles.actions}>
                    <button className={styles.primaryBtn} onClick={onCreateNew}>
                        ✨ Create Location
                    </button>
                    <button className={styles.secondaryBtn} onClick={onSkip}>
                        Skip
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.popup}>
            <div className={styles.header}>
                <span className={styles.icon}>📍</span>
                <span>Similar Location Found!</span>
            </div>

            <div className={styles.suggestion}>
                {suggestedLocation && (
                    <div className={styles.locationPreview}>
                        {suggestedLocation.conceptImage ? (
                            <img
                                src={suggestedLocation.conceptImage}
                                alt={suggestedLocation.name}
                                className={styles.previewImage}
                            />
                        ) : (
                            <div className={styles.noPreview}>🗺️</div>
                        )}
                        <div className={styles.previewInfo}>
                            <h4>{suggestedLocation.name}</h4>
                            {suggestedLocation.description && (
                                <p>{suggestedLocation.description}</p>
                            )}
                            <div className={styles.matchScore}>
                                <span className={styles.scoreBar}>
                                    <span
                                        className={styles.scoreFill}
                                        style={{ width: `${matches[0].score * 100}%` }}
                                    />
                                </span>
                                <span>{Math.round(matches[0].score * 100)}% match</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {matches.length > 1 && (
                <div className={styles.otherMatches}>
                    <span className={styles.otherLabel}>Other matches:</span>
                    {matches.slice(1, 3).map(match => (
                        <button
                            key={match.location.id}
                            className={styles.otherMatch}
                            onClick={() => onSelectLocation(match.location.id)}
                        >
                            {match.location.name}
                            <span className={styles.otherScore}>{Math.round(match.score * 100)}%</span>
                        </button>
                    ))}
                </div>
            )}

            <div className={styles.actions}>
                <button
                    className={styles.primaryBtn}
                    onClick={() => suggestedLocation && onSelectLocation(suggestedLocation.id)}
                >
                    ✓ Use "{suggestedLocation?.name}"
                </button>
                <button className={styles.createBtn} onClick={onCreateNew}>
                    + Create New
                </button>
                <button className={styles.secondaryBtn} onClick={onSkip}>
                    Skip
                </button>
            </div>
        </div>
    );
};

export default LocationSuggestPopup;
