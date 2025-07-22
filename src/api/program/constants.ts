import type { ViewModel } from '../game/events';
import { ProgramPartName } from './enums';

// Helper function to create colors in format WASM expects
export function createMiniColor(hue: number, saturation: number, value: number) {
  return {
    hue,
    saturation,
    value,
  };
}

// Default color palette for programs
export const DEFAULT_MINI_PALETTE = {
  primary: createMiniColor(0, 200, 240), // Reddish
  accent: createMiniColor(180, 240, 100), // Dark accent
  highlight: createMiniColor(60, 220, 240), // Yellow highlight
  neutral: createMiniColor(0, 40, 220), // Light neutral
  background: createMiniColor(180, 120, 180), // Blueish background
};

// Default parts for programs
export const DEFAULT_PARTS = [
  {
    name: ProgramPartName.SIMPLE_BODY,
    params: [4, 5, 50, 40, 20, 85],
  },
  {
    name: ProgramPartName.SIMPLE_EYE,
    params: [],
  },
  {
    name: ProgramPartName.SIMPLE_LIMB,
    params: [2],
  },
  {
    name: ProgramPartName.EMPTY,
    params: [],
  },
  {
    name: ProgramPartName.EMPTY,
    params: [],
  },
];

// --- Default/Placeholder Data ---
export const DEFAULT_PROGRAM_VIEW_MODEL: ViewModel = {
  palette: {
    primary: [128, 128, 128],
    neutral: [100, 100, 100],
    background: [180, 120, 180],
    highlight: [200, 200, 200],
    accent: [150, 150, 150],
  },
  addons: [
    { Lizard: { size: 1.0, length: 1 } },
    { RoundHead: {} },
    { SimpleEye: { size_ratio: 0.3 } },
  ],
};
