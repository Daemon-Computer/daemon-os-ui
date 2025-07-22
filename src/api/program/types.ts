import type { ViewModel } from '../game/events';

// --- Frontend Programs and ViewModel ---
export interface Program {
  id: string;
  name: string;
  suiObjectId: string;
  source: string;
  type: string;
  speed: number;
  corruption: number;
  maxHealth: number;
  health: number;
  damage: number;
  mintDate: string;
  protocol: string;
  viewModel: ViewModel;
  rawFields?: SuiProgramDataFields;
}

// --- On-chain Data Structures ---
export interface SuiMiniColor {
  // Actual HSV values
  hue: number;
  saturation: number;
  value: number;
}

export interface SuiMiniColorObject {
  // Wrapper for SuiMiniColor from RPC
  type: string;
  fields: SuiMiniColor;
}

export interface SuiMiniPalette {
  // The structure of the 'palette' field
  primary: SuiMiniColorObject;
  accent: SuiMiniColorObject;
  highlight: SuiMiniColorObject;
  neutral?: SuiMiniColorObject;
  background?: SuiMiniColorObject;
}

export interface SuiProgramPart {
  name: string;
  params: number[];
}

export interface SuiVersion {
  number: number;
}

export interface SuiProgramDataFields {
  id: { id: string };
  protocol: Record<string, null> | string;
  version: SuiVersion;
  generated_on: SuiVersion;
  palette: SuiMiniPalette;
  parts: SuiProgramPart[];
}

// --- Custom types for WASM communication ---
export interface ProgramPartData {
  name: string;
  params: number[];
}
