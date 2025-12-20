
export interface CharacterProp {
  id: string;
  name: string; // Tên vật phẩm (ví dụ: "Kiếm", "Búa") để AI nhận diện trong prompt
  image: string | null; // Base64
}

export interface Character {
  id: string;
  name: string;
  description: string;
  
  // Cấu trúc mới
  masterImage: string | null; // Ảnh gốc tổng thể (Reference)
  faceImage: string | null; // Slot 1: Face ID (Auto-generated or Manual)
  bodyImage: string | null; // Slot 2: Outfit/Turnaround (Auto-generated or Manual)
  props: CharacterProp[]; // Slot 3-5: Props (Max 3)
  
  isDefault: boolean;
  isAnalyzing?: boolean; 
}

export interface Scene {
    id: string;
    sceneNumber: string; 
    language1: string; 
    vietnamese: string; 
    promptName: string; 
    contextDescription: string; 
    characterIds: string[]; 
    generatedImage: string | null; 
    veoPrompt: string; // Prompt tối ưu cho Google Veo
    isGenerating: boolean;
    error: string | null;
}

export interface ProjectState {
  projectName: string;
  stylePrompt: string;
  imageModel: string; // Selected Image Gen Model
  aspectRatio: string; // "16:9" | "9:16" | "1:1" | "4:3" | "3:4"
  scriptLanguage: 'vietnamese' | 'language1'; // Ngôn ngữ chính để tạo Veo prompt
  characters: Character[];
  scenes: Scene[];
}
