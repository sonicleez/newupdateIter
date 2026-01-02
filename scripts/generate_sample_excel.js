// Script to generate sample Excel file with proper encoding
import * as XLSX from 'xlsx';

const data = [
    {
        scene_number: 1,
        group: 'Chương 1 - Mở đầu',
        voice_over: 'Năm 1985 tại Sài Gòn...',
        dialogue: '',
        dialogue_speaker: '',
        visual_context: 'WIDE SHOT. Exterior, Saigon street 1985, motorbikes, French colonial buildings, morning light, golden hour atmosphere.',
        camera_angle: 'Wide Shot',
        lens: '35mm',
        character_names: '',
        is_key_frame: 'TRUE'
    },
    {
        scene_number: 2,
        group: 'Chương 1 - Mở đầu',
        voice_over: 'Một người đàn ông bước đi trên con phố quen thuộc.',
        dialogue: '',
        dialogue_speaker: '',
        visual_context: 'MEDIUM SHOT. Same street. A man in 1980s clothing walks slowly, nostalgic expression, documentary style.',
        camera_angle: 'Medium Shot',
        lens: '50mm',
        character_names: 'Minh',
        is_key_frame: 'FALSE'
    },
    {
        scene_number: 3,
        group: 'Chương 1 - Mở đầu',
        voice_over: 'Anh dừng lại trước một quán cà phê cũ.',
        dialogue: 'Chào chị! Một ly đen đá.',
        dialogue_speaker: 'Minh',
        visual_context: 'CLOSE-UP. Minh standing outside a traditional Vietnamese coffee shop, ordering from the counter.',
        camera_angle: 'Close-Up',
        lens: '85mm',
        character_names: 'Minh',
        is_key_frame: 'FALSE'
    },
    {
        scene_number: 4,
        group: 'Chương 2 - Hồi ức',
        voice_over: 'Cô ấy là Lan - người bạn thuở nhỏ của anh.',
        dialogue: '',
        dialogue_speaker: '',
        visual_context: 'MEDIUM SHOT. Interior coffee shop. A woman (Lan) sits at a wooden table, reading a book, soft light from window.',
        camera_angle: 'Medium Shot',
        lens: '50mm',
        character_names: 'Lan',
        is_key_frame: 'TRUE'
    },
    {
        scene_number: 5,
        group: 'Chương 2 - Hồi ức',
        voice_over: 'Họ đã không gặp nhau suốt 20 năm.',
        dialogue: 'Lan? Có phải là Lan không?',
        dialogue_speaker: 'Minh',
        visual_context: 'TWO-SHOT. Minh approaches Lan table, surprised expression, warm ambient lighting.',
        camera_angle: 'Medium Shot',
        lens: '35mm',
        character_names: 'Minh, Lan',
        is_key_frame: 'FALSE'
    },
    {
        scene_number: 6,
        group: 'Chương 2 - Hồi ức',
        voice_over: 'Lan ngước lên nhìn.',
        dialogue: 'Minh? Trời ơi, Minh!',
        dialogue_speaker: 'Lan',
        visual_context: 'CLOSE-UP. Lan looks up, recognition and joy on her face, tears forming.',
        camera_angle: 'Close-Up',
        lens: '85mm',
        character_names: 'Lan',
        is_key_frame: 'FALSE'
    },
    {
        scene_number: 7,
        group: 'Chương 3 - Kết thúc',
        voice_over: 'Họ ngồi xuống và bắt đầu kể về những năm tháng đã qua.',
        dialogue: '',
        dialogue_speaker: '',
        visual_context: 'WIDE SHOT. Two friends sitting across from each other, coffee cups on table, golden afternoon light streaming through window.',
        camera_angle: 'Wide Shot',
        lens: '35mm',
        character_names: 'Minh, Lan',
        is_key_frame: 'FALSE'
    },
    {
        scene_number: 8,
        group: 'Chương 3 - Kết thúc',
        voice_over: 'Có những câu chuyện không bao giờ kết thúc...',
        dialogue: '',
        dialogue_speaker: '',
        visual_context: 'POV SHOT. Looking out the coffee shop window at the busy Saigon street, reflective mood, fade to warm tones.',
        camera_angle: 'POV',
        lens: '50mm',
        character_names: '',
        is_key_frame: 'TRUE'
    }
];

// Create workbook and worksheet
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Add worksheet to workbook
XLSX.utils.book_append_sheet(wb, ws, 'Scenes');

// Write to file
XLSX.writeFile(wb, './docs/sample_import.xlsx');

console.log('✅ Created: docs/sample_import.xlsx');
