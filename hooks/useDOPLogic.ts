import { useCallback } from 'react';
import { ProjectState, Scene, Product } from '../types';

export interface RaccordInsight {
    type: 'prop' | 'environment' | 'character' | 'flow';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    suggestion?: string;
    affectedIds?: string[];
}

export function useDOPLogic(state: ProjectState) {

    /**
     * Analyzes continuity between a scene and its predecessor
     */
    const analyzeRaccord = useCallback((sceneId: string): RaccordInsight[] => {
        const insights: RaccordInsight[] = [];
        const scenes = state.scenes;
        const currentIndex = scenes.findIndex(s => s.id === sceneId);

        if (currentIndex <= 0) return insights; // No predecessor to compare with

        const currentScene = scenes[currentIndex];
        const prevScene = scenes[currentIndex - 1];

        // 1. PROJECT/LOCATION CONTINUITY
        if (currentScene.groupId === prevScene.groupId) {
            // Same group: environment should be strictly consistent
            insights.push({
                type: 'environment',
                severity: 'info',
                message: 'Bối cảnh đồng bộ: Cả hai cảnh đều nằm trong cùng một khu vực.',
                suggestion: 'Đảm bảo các chi tiết nền như tranh treo tường, vị trí đồ nội thất không thay đổi.'
            });
        } else {
            // Transitioning groups
            insights.push({
                type: 'flow',
                severity: 'info',
                message: `Chuyển cảnh: Từ "${state.sceneGroups?.find(g => g.id === prevScene.groupId)?.name}" sang "${state.sceneGroups?.find(g => g.id === currentScene.groupId)?.name}".`,
                suggestion: 'Cần một cú máy rõ ràng để giới thiệu không gian mới.'
            });
        }

        // 2. PROP CONTINUITY (Raccord de Prop)
        const prevProps = prevScene.productIds || [];
        const currentProps = currentScene.productIds || [];

        // Find props that "disappeared"
        const disappearingProps = prevProps.filter(pId => !currentProps.includes(pId));
        if (disappearingProps.length > 0) {
            const propNames = disappearingProps.map(id => state.products.find(p => p.id === id)?.name || 'Đạo cụ');
            insights.push({
                type: 'prop',
                severity: 'warning',
                message: `Đạo cụ biến mất: ${propNames.join(', ')} xuất hiện ở cảnh trước nhưng không có ở cảnh này.`,
                suggestion: 'Nếu nhân vật vẫn đang cầm vật này, hãy nhấn thêm vào "Product IDs" của cảnh hiện tại.',
                affectedIds: disappearingProps
            });
        }

        // Find props that "suddenly appeared" (Prop Jump)
        const newlyAppearedProps = currentProps.filter(pId => !prevProps.includes(pId));
        if (newlyAppearedProps.length > 0) {
            const propNames = newlyAppearedProps.map(id => state.products.find(p => p.id === id)?.name || 'Đạo cụ');
            const prevContext = (prevScene.contextDescription || '').toLowerCase();
            const pickupAction = ['nhặt', 'lấy', 'cầm', 'pick up', 'take', 'grab', 'receive'].some(v => prevContext.includes(v));

            if (!pickupAction) {
                insights.push({
                    type: 'prop',
                    severity: 'critical',
                    message: `Đạo cụ "nhảy": ${propNames.join(', ')} bỗng dưng xuất hiện.`,
                    suggestion: 'Cảnh trước thiếu hành động nhân vật nhặt hoặc lấy vật này. Hãy thêm một cảnh "Mồi" hoặc sửa Script cảnh trước.',
                    affectedIds: newlyAppearedProps
                });
            }
        }

        // 3. CHARACTER CONTINUITY
        const prevChars = prevScene.characterIds || [];
        const currentChars = currentScene.characterIds || [];

        const charactersLeft = prevChars.filter(cId => !currentChars.includes(cId));
        if (charactersLeft.length > 0) {
            const charNames = charactersLeft.map(id => state.characters.find(c => c.id === id)?.name || 'Nhân vật');
            insights.push({
                type: 'character',
                severity: 'info',
                message: `${charNames.join(', ')} đã rời khỏi khung hình hoặc không còn là tiêu điểm.`,
            });
        }

        // 4. PHYSICAL STATE & ORIENTATION
        const prevAction = (prevScene.contextDescription || '').toLowerCase();
        const currentAction = (currentScene.contextDescription || '').toLowerCase();

        const states = ['ngồi', 'đứng', 'nằm', 'chạy', 'đi bộ', 'sitting', 'standing', 'lying', 'running', 'walking'];
        const prevState = states.find(s => prevAction.includes(s));
        const currentStateMatch = states.find(s => currentAction.includes(s));

        if (prevState && currentStateMatch && prevState !== currentStateMatch) {
            insights.push({
                type: 'flow',
                severity: 'info',
                message: `Thay đổi trạng thái: Nhân vật chuyển từ ${prevState} sang ${currentStateMatch}.`,
                suggestion: 'Hãy đảm bảo có một hành động chuyển đổi (transition action) mượt mà giữa hai trạng thái này.'
            });
        }

        return insights;
    }, [state.scenes, state.sceneGroups, state.products, state.characters]);

    /**
     * Suggests cinematic flow for the next scene
     */
    const suggestNextShot = useCallback((lastSceneId: string) => {
        const scene = state.scenes.find(s => s.id === lastSceneId);
        if (!scene) return null;

        const currentAngle = scene.cameraAngle?.toLowerCase() || scene.cameraAngleOverride?.toLowerCase() || '';

        const suggestions = [
            { label: 'Cận cảnh (Close-up)', angle: 'close-up', reason: 'Để nhấn mạnh cảm xúc hoặc chi tiết đạo cụ sau hành động trước.' },
            { label: 'Góc rộng (Wide Shot)', angle: 'wide-shot', reason: 'Để thiết lập lại không gian và vị trí nhân vật trong bối cảnh.' },
            { label: 'Điểm nhìn (POV)', angle: 'pov', reason: 'Cho người xem thấy chính xác những gì nhân vật đang nhìn (ví dụ: nhìn vào đạo cụ).' },
            { label: 'Góc nghiêng (OTS)', angle: 'over-the-shoulder', reason: 'Tạo chiều sâu và sự kết nối giữa nhân vật với đối tượng/vật thể.' },
            { label: 'Cảnh phản ứng (Reaction)', angle: 'medium-shot', reason: 'Ghi lại phản ứng của nhân vật ngay sau một sự kiện quan trọng.' }
        ];

        if (currentAngle.includes('wide')) {
            return {
                title: 'Lời khuyên từ DOP',
                action: 'Tiến gần hơn hoặc POV',
                recommendation: Math.random() > 0.5 ? suggestions[0] : suggestions[2]
            };
        }

        if (scene.productIds && scene.productIds.length > 0) {
            return {
                title: 'Lời khuyên từ DOP',
                action: 'Nhấn mạnh đạo cụ',
                recommendation: suggestions[2] // Suggest POV when props are involved
            };
        }

        return {
            title: 'Lời khuyên từ DOP',
            action: 'Thay đổi nhịp điệu',
            recommendation: suggestions[Math.floor(Math.random() * 2) + 1]
        };
    }, [state.scenes]);

    return {
        analyzeRaccord,
        suggestNextShot
    };
}
