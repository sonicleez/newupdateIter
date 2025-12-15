import { ScriptPreset } from '../types';

/**
 * Default Script Presets
 * These are built-in presets available to all users
 */

export const DEFAULT_PRESETS: ScriptPreset[] = [
    {
        id: 'film-animation',
        name: 'Film Animation / Cinematic',
        category: 'film',
        description: 'Phim ngắn hoạt hình với lời thoại nhân vật, camera chi tiết',
        icon: '🎬',
        systemPrompt: `Bạn là nhà biên kịch chuyên nghiệp về phim hoạt hình và điện ảnh.

Viết kịch bản với:
- Tên nhân vật và lời thoại (CHARACTER NAME: "dialogue")
- Góc máy chi tiết (WIDE SHOT, MEDIUM SHOT, CLOSE-UP, OVER THE SHOULDER, etc.)
- Mô tả hình ảnh phong phú (ánh sáng, bố cục, màu sắc)
- Cảm xúc và hành động của nhân vật
- Ngôn ngữ điện ảnh (establishing shot, cutaway, match cut, etc.)

Mỗi cảnh phải đầy đủ thông tin để có thể tạo storyboard.`,
        outputFormat: {
            hasDialogue: true,
            hasNarration: false,
            hasCameraAngles: true,
            sceneStructure: 'traditional'
        },
        toneKeywords: ['điện ảnh', 'cảm xúc', 'kịch tính', 'kể chuyện bằng hình ảnh'],
        sceneGuidelines: `Định dạng mỗi cảnh:

CẢNH [SỐ]: [Mô tả ngắn gọn]
CAMERA: [Góc máy và chuyển động]
[Mô tả hình ảnh với ánh sáng, bố cục]

NHÂN VẬT: "Lời thoại"
[Mô tả hành động/cảm xúc]`,
        exampleOutput: `CẢNH 1: Phòng làm việc - Sáng sớm
CAMERA: WIDE SHOT, ánh sáng tự nhiên xuyên qua cửa sổ
Căn phòng nhỏ gọn với bàn làm việc gỗ cũ. Ánh nắng vàng chiếu qua rèm tạo bóng dài trên sàn nhà.

CAMERA: MEDIUM SHOT theo ông MINH (60 tuổi)
ÔNG MINH: "60 năm rồi... từ khi còn là cậu bé, ta đã yêu nghề này."
[Ông chạm nhẹ vào chiếc bình gốm cổ, ánh mắt da diết]

CAMERA: CLOSE-UP tay ông
[Những ngón tay chai sạn nhẹ nhàng vuốt ve bình gốm]`,
        isDefault: true,
        isCustom: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'documentary',
        name: 'Documentary / Educational',
        category: 'documentary',
        description: 'Phim tài liệu với voiceover narration, không có lời thoại nhân vật',
        icon: '📺',
        systemPrompt: `Bạn là nhà biên kịch phim tài liệu chuyên nghiệp.

Viết kịch bản với:
- NARRATION: Voiceover (lời tường thuật)
- Mô tả chi tiết B-roll (các cảnh minh họa)
- Tập trung vào địa điểm và môi trường
- Giọng văn thông tin, giáo dục
- KHÔNG có lời thoại nhân vật

Tạo kịch bản phim tài liệu hấp dẫn, dễ hiểu, có chiều sâu.`,
        outputFormat: {
            hasDialogue: false,
            hasNarration: true,
            hasCameraAngles: true,
            sceneStructure: 'documentary'
        },
        toneKeywords: ['thông tin', 'quan sát', 'giáo dục', 'không khí'],
        sceneGuidelines: `Định dạng mỗi cảnh:

CẢNH [SỐ]: [Địa điểm/Chủ đề]
VISUAL: [Mô tả B-roll với chuyển động camera]
NARRATION: "Lời tường thuật - rõ ràng, thông tin"
[Ghi chú âm thanh môi trường/nhạc nền]`,
        exampleOutput: `CẢNH 1: Làng Bát Tràng - Bình minh
VISUAL: Aerial drone shot hạ từ từ xuyên qua sương mù sáng sớm. Những mái ngói truyền thống. Pan chậm qua làng.
NARRATION: "Trong ánh bình minh nhẹ nhàng, làng gốm Bát Tràng thức giấc cùng tiếng vọng của nghề truyền thống hàng nghìn năm..."
[Âm thanh: tiếng gà gáy xa xa, tiếng nước chảy]

CẢNH 2: Đôi tay nghệ nhân
VISUAL: Extreme close-up đôi bàn tay rạn nứt đang nặn đất sét trên bàn xoay. Nước lấp lánh trên ngón tay. Camera từ từ pull back.
NARRATION: "Đôi bàn tay của nghệ nhân Nguyễn Văn Hùng đã nặn đất sét suốt 60 năm. Mỗi đường nét đều mang trong mình tâm hồn..."`,
        isDefault: true,
        isCustom: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'commercial',
        name: 'Commercial / Advertisement',
        category: 'commercial',
        description: 'Quảng cáo ngắn tập trung sản phẩm với call-to-action',
        icon: '📢',
        systemPrompt: `Bạn là nhà biên kịch quảng cáo chuyên nghiệp.

Viết kịch bản quảng cáo ngắn gọn, hút mắt:
- Nhấn mạnh lợi ích sản phẩm
- Tạo kết nối cảm xúc
- Call-to-action rõ ràng
- Mỗi cảnh 15-30 giây
- Kết hợp lời thoại và narration

Tạo kịch bản quảng cáo chuyên nghiệp, hấp dẫn, dễ nhớ.`,
        outputFormat: {
            hasDialogue: true,
            hasNarration: true,
            hasCameraAngles: true,
            sceneStructure: 'commercial'
        },
        toneKeywords: ['súc tích', 'hấp dẫn', 'tập trung lợi ích', 'khát vọng'],
        sceneGuidelines: `Định dạng mỗi cảnh (15-30 giây):

CẢNH [SỐ]: [Hook/Thu hút sự chú ý]
VISUAL: [Showcase sản phẩm với camera động]
VOICEOVER/DIALOGUE: [Câu nói về lợi ích]
CTA: [Call to action - rõ ràng, trực tiếp]`,
        exampleOutput: `CẢNH 1: Phòng khách gia đình - Chiều tối (15s)
VISUAL: Slow motion - gia đình ba thế hệ quây quần trên sofa, cười đùa. Camera dolly in.
VOICEOVER: "Những khoảnh khắc quý giá nhất... là khi cả nhà cùng nhau."
[Sản phẩm tivi xuất hiện góc màn hình]

CẢNH 2: Close-up sản phẩm (20s)
VISUAL: Product shot với lighting chuyên nghiệp. Tivi hiển thị hình ảnh sống động 4K.
VOICEOVER: "Smart TV XYZ - Đem cả thế giới về nhà bạn. 4K HDR, âm thanh Dolby Atmos."
CTA: "Trải nghiệm ngay tại ABC.com - Giảm 30% trong tuần này!"`,
        isDefault: true,
        isCustom: false,
        createdAt: new Date().toISOString()
    },
    {
        id: 'music-video',
        name: 'Music Video',
        category: 'music-video',
        description: 'Kể chuyện bằng hình ảnh theo nhạc, ít hoặc không lời thoại',
        icon: '🎵',
        systemPrompt: `Bạn là đạo diễn music video chuyên nghiệp.

Viết treatment music video với:
- Đồng bộ với nhịp điệu và lời bài hát
- Tập trung vào ẩn dụ thị giác
- Kết hợp cảnh performance và narrative
- Ít hoặc không lời thoại (để nhạc dẫn dắt)
- Chuyển động camera năng động

Tạo treatment MV sáng tạo, thẩm mỹ cao, đầy cảm xúc.`,
        outputFormat: {
            hasDialogue: false,
            hasNarration: false,
            hasCameraAngles: true,
            sceneStructure: 'montage'
        },
        toneKeywords: ['nhịp điệu', 'hình ảnh', 'ẩn dụ', 'năng động'],
        sceneGuidelines: `Định dạng mỗi cảnh với đánh dấu nhạc:

CẢNH [SỐ]: [Timestamp/Đoạn lời]
VISUAL: [Performance hoặc narrative action]
CAMERA: [Chuyển động match với energy nhạc]
MOOD: [Tone thị giác, màu sắc, ánh sáng]`,
        exampleOutput: `CẢNH 1: Intro (0:00-0:15) - "Trong đêm tối..."
VISUAL: Nghệ sĩ đứng một mình dưới ánh đèn spotlight xanh trong không gian tối.
CAMERA: Slow zoom in từ wide shot. Camera quay tròn chậm rãi xung quanh.
MOOD: Tông màu lạnh, xanh lam, cô đơn, huyền bí

CẢNH 2: Verse 1 (0:15-0:45) - Beat drop
VISUAL: Quick cut montage - nghệ sĩ chạy qua phố đêm, ánh đèn neon phản chiếu trên vũng nước.
CAMERA: Handheld năng động, match cut với nhịp beat. Dutch angle shots.
MOOD: Năng lượng cao, neon rực rỡ, urban, chuyển động nhanh`,
        isDefault: true,
        isCustom: false,
        createdAt: new Date().toISOString()
    }
];

/**
 * Get preset by ID
 */
export function getPresetById(id: string, customPresets: ScriptPreset[] = []): ScriptPreset | undefined {
    const allPresets = [...DEFAULT_PRESETS, ...customPresets];
    return allPresets.find(p => p.id === id);
}

/**
 * Get all available presets (defaults + custom)
 */
export function getAllPresets(customPresets: ScriptPreset[] = []): ScriptPreset[] {
    return [...DEFAULT_PRESETS, ...customPresets];
}

/**
 * Create a new custom preset
 */
export function createCustomPreset(preset: Omit<ScriptPreset, 'id' | 'isDefault' | 'isCustom' | 'createdAt'>): ScriptPreset {
    return {
        ...preset,
        id: `custom-${Date.now()}`,
        isDefault: false,
        isCustom: true,
        createdAt: new Date().toISOString()
    };
}
