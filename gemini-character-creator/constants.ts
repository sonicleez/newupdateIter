import { ArtStyle, StyleOption, AspectRatio, AspectRatioOption, ShotTypeOption, CameraAngleOption, CameraRollOption } from './types';

export const ART_STYLES: StyleOption[] = [
  { name: 'Pixar', value: ArtStyle.PIXAR, promptModifier: 'in the whimsical, vibrant 3D style of Pixar animation' },
  { name: 'Realistic', value: ArtStyle.REALISTIC, promptModifier: 'hyper-realistic, photorealistic, 8k' },
  { name: 'Hyper-Realistic', value: ArtStyle.HYPER_REALISTIC, promptModifier: 'hyper-realistic digital portrait, photorealistic, 8k resolution, UHD, sharp focus, detailed skin texture with natural pores and subtle imperfections, lifelike eyes with catchlights, shot on a Sony a7R IV with an 85mm f/1.4 lens, cinematic lighting, masterpiece' },
  { name: 'Anime', value: ArtStyle.ANIME, promptModifier: 'in a modern anime style, detailed, vibrant colors, Studio Ghibli inspired' },
  { name: 'Cyberpunk', value: ArtStyle.CYBERPUNK, promptModifier: 'cyberpunk aesthetic, neon lighting, futuristic city, high-tech gear' },
  { name: 'Steampunk', value: ArtStyle.STEAMPUNK, promptModifier: 'steampunk theme, victorian-era technology, gears and cogs, sepia tones' },
  { name: 'Watercolor', value: ArtStyle.WATERCOLOR, promptModifier: 'beautiful watercolor painting, soft edges, vibrant washes of color' },
  { name: 'Vintage Comic', value: ArtStyle.VINTAGE_COMIC, promptModifier: 'in the style of a vintage comic book, halftone dots, bold lines, retro colors' },
  { name: 'Fantasy Art', value: ArtStyle.FANTASY_ART, promptModifier: 'epic fantasy art, dramatic lighting, detailed armor, mythical setting' },
  { name: 'Surrealism', value: ArtStyle.SURREALISM, promptModifier: 'surrealist painting, dreamlike, bizarre, unexpected juxtapositions, Salvador Dali inspired' },
  { name: 'Art Deco', value: ArtStyle.ART_DECO, promptModifier: 'in the Art Deco style, geometric shapes, bold lines, glamorous, roaring twenties aesthetic, sleek and stylized' },
  { name: 'Minimalist', value: ArtStyle.MINIMALIST, promptModifier: 'minimalist art, clean lines, simple forms, negative space, limited color palette, abstract' },
];

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { name: 'Square (1:1)', value: '1:1' },
  { name: 'Portrait (3:4)', value: '3:4' },
  { name: 'Landscape (4:3)', value: '4:3' },
  { name: 'Tall (9:16)', value: '9:16' },
  { name: 'Wide (16:9)', value: '16:9' },
];

export const SHOT_TYPES: ShotTypeOption[] = [
  { name: 'Default', value: '' },
  { name: 'Portrait', value: 'portrait shot' },
  { name: 'Close-up', value: 'close-up shot' },
  { name: 'Medium Shot', value: 'medium shot' },
  { name: 'Full Body Shot', value: 'full body shot, full shot' },
];

export const CAMERA_ANGLES: CameraAngleOption[] = [
  { name: 'Default', value: '' },
  { name: 'Eye-level', value: 'eye-level shot' },
  { name: 'Low-angle', value: 'low-angle shot, from below' },
  { name: 'High-angle', value: 'high-angle shot, from above' },
  { name: 'Dutch Angle', value: 'dutch angle shot' },
];

export const CAMERA_ROLLS: CameraRollOption[] = [
    { name: 'Default', value: '' },
    { name: 'Slight Tilt Left', value: 'slight dutch angle tilt to the left' },
    { name: 'Slight Tilt Right', value: 'slight dutch angle tilt to the right' },
    { name: 'Dramatic Tilt Left', value: 'dramatic dutch angle tilt to the left, canted angle' },
    { name: 'Dramatic Tilt Right', value: 'dramatic dutch angle tilt to the right, canted angle' },
];