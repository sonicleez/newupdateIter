export enum ArtStyle {
  PIXAR = 'Pixar',
  REALISTIC = 'Realistic',
  ANIME = 'Anime',
  CYBERPUNK = 'Cyberpunk',
  STEAMPUNK = 'Steampunk',
  WATERCOLOR = 'Watercolor',
  VINTAGE_COMIC = 'Vintage Comic Book',
  FANTASY_ART = 'Fantasy Art',
  SURREALISM = 'Surrealism',
  ART_DECO = 'Art Deco',
  MINIMALIST = 'Minimalist',
  HYPER_REALISTIC = 'Hyper-Realistic',
}

export type AspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";

export interface StyleOption {
  name: string;
  value: ArtStyle;
  promptModifier: string;
}

export interface AspectRatioOption {
  name: string;
  value: AspectRatio;
}

export interface ShotTypeOption {
  name: string;
  value: string;
}

export interface CameraAngleOption {
  name: string;
  value: string;
}

export interface CameraRollOption {
  name: string;
  value: string;
}

export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

export interface HistoryImage extends GeneratedImage {
  prompt: string;
  style: ArtStyle;
}

export interface ImageDisplayHandle {
  getMaskAsBase64: () => string | null;
}

export interface CharacterPreset {
  id: string;
  name: string;
  image: GeneratedImage;
  prompt: string;
  style: ArtStyle;
}

export interface StoryboardScene {
  id: string;
  image: GeneratedImage;
  description: string;
}

export type StoryboardReferenceType = 'character' | 'setting' | 'prop' | 'style';

export interface StoryboardReferences {
  character: GeneratedImage | null;
  setting: GeneratedImage | null;
  prop: GeneratedImage | null;
  style: GeneratedImage | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: GeneratedImage;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  temperature: number;
}