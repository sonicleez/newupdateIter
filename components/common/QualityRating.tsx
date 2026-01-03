/**
 * Quality Rating Component
 * 
 * Allows user to rate generated images for DOP learning.
 * Shows 👍👎 buttons that update the learning database.
 */

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { approvePrompt } from '../../utils/dopLearning';

interface QualityRatingProps {
    dopRecordId?: string;
    onRate?: (rating: 'good' | 'bad') => void;
    size?: 'sm' | 'md';
    className?: string;
}

export function QualityRating({
    dopRecordId,
    onRate,
    size = 'sm',
    className = ''
}: QualityRatingProps) {
    const [rated, setRated] = useState<'good' | 'bad' | null>(null);
    const [isRating, setIsRating] = useState(false);

    const handleRate = async (rating: 'good' | 'bad') => {
        if (rated || isRating) return;

        setIsRating(true);

        try {
            // Update in DOP Learning System
            if (dopRecordId) {
                const qualityScore = rating === 'good' ? 0.95 : 0.3;
                await approvePrompt(dopRecordId, {
                    overall: qualityScore,
                    match: qualityScore
                });
                console.log('[QualityRating] Rated:', dopRecordId, rating, qualityScore);
            }

            setRated(rating);
            onRate?.(rating);
        } catch (e) {
            console.error('[QualityRating] Failed:', e);
        } finally {
            setIsRating(false);
        }
    };

    const iconSize = size === 'sm' ? 14 : 18;
    const buttonSize = size === 'sm' ? 'p-1' : 'p-1.5';

    // Already rated - show result
    if (rated) {
        return (
            <div className={`flex items-center gap-1 ${className}`}>
                {rated === 'good' ? (
                    <span className="text-green-500 text-xs flex items-center gap-0.5">
                        <ThumbsUp size={iconSize} fill="currentColor" /> Đã đánh giá tốt
                    </span>
                ) : (
                    <span className="text-red-400 text-xs flex items-center gap-0.5">
                        <ThumbsDown size={iconSize} fill="currentColor" /> Đã đánh giá
                    </span>
                )}
            </div>
        );
    }

    // No dopRecordId - can't rate
    if (!dopRecordId) {
        return null;
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <span className="text-gray-500 text-xs mr-1">Đánh giá:</span>
            <button
                onClick={() => handleRate('good')}
                disabled={isRating}
                className={`${buttonSize} rounded hover:bg-green-500/20 text-gray-400 hover:text-green-500 
                    transition-colors disabled:opacity-50`}
                title="Ảnh tốt - DOP sẽ học pattern này"
            >
                <ThumbsUp size={iconSize} />
            </button>
            <button
                onClick={() => handleRate('bad')}
                disabled={isRating}
                className={`${buttonSize} rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 
                    transition-colors disabled:opacity-50`}
                title="Ảnh chưa tốt - DOP sẽ tránh pattern này"
            >
                <ThumbsDown size={iconSize} />
            </button>
        </div>
    );
}

export default QualityRating;
