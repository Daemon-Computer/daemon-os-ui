import { createSignal, createEffect, For, Show, onMount } from 'solid-js';
import WasmIframeWrapper from './WasmIframeWrapper';
import type { WasmCanvasBridgeInterface } from './hooks/createWasmCanvas';
import type { EventPayload, ViewModel, ViewModelPalette, ViewModelAddon } from '../api/game/events';
import StatsList from './StatsList';
import { useWallet } from './Wallet/WalletContext';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { PROGRAM_TYPE_STRING, WASM_ENGINE_URL, WASM_BINDINGS_URL } from '../api/constants';

// Enum to match Rust-side ProgramPartName for WASM
enum ProgramPartName {
  EMPTY = 'Empty',
  EMPTY_BODY = 'EmptyBody',
  SIMPLE_BODY = 'SimpleBody',
  SIMPLE_LIMB = 'SimpleLimb',
  SIMPLE_EYE = 'SimpleEye',
  VIRUS_LIMB = 'VirusLimb',
  // Robot
  BOX_ROBOT_BODY = 'BoxRobotBody',
  ROUND_ROBOT_BODY = 'RoundRobotBody',
  BOX_ROBOT_HEAD = 'BoxRobotHead',
  PYRAMID_ROBOT_HEAD = 'PyramidRobotHead',
  SPHERE_ROBOT_HEAD = 'SphereRobotHead',
  CAMERA_ROBOT_EYE = 'CameraRobotEye',
  FEELER_ROBOT_EYE = 'FeelerRobotEye',
  SLEEK_CAMERA_ROBOT_EYE = 'SleekCameraRobotEye',
  HEXAGONAL_ROBOT_LEG_BASE = 'HexagonalRobotLegBase',
  CROWNED_ROBOT_LEG_BASE = 'CrownedRobotLegBase',
  STRAIGHT_ROBOT_LEG_TIBIA = 'StraightRobotLegTibia',
  MIDDLE_ROBOT_LEG_TIBIA = 'MiddleRobotLegTibia',
  SIDE_ROBOT_LEG_TIBIA = 'SideRobotLegTibia',
  HEXAGONAL_ROBOT_LEG_JOINT = 'HexagonalRobotLegJoint',
  CROSS_ROBOT_LEG_JOINT = 'CrossRobotLegJoint',
  STAR_ROBOT_LEG_JOINT = 'StarRobotLegJoint',
  SIDE_ROBOT_LEG_END = 'SideRobotLegEnd',
  // Addon
  ANTENNA_ROBOT_ADDON = 'AntennaRobotAddon',
}

// Helper function to create colors in format WASM expects
function createMiniColor(hue: number, saturation: number, value: number) {
  return {
    hue,
    saturation,
    value,
  };
}

// Default color palette for programs
const DEFAULT_MINI_PALETTE = {
  primary: createMiniColor(0, 200, 240), // Reddish
  accent: createMiniColor(180, 240, 100), // Dark accent
  highlight: createMiniColor(60, 220, 240), // Yellow highlight
  neutral: createMiniColor(0, 40, 220), // Light neutral
  background: createMiniColor(180, 120, 180), // Blueish background
};

// Default parts for programs
const DEFAULT_PARTS = [
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

// --- Frontend Programs and ViewModel ---
interface Program {
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
interface SuiMiniColor {
  // Actual HSV values
  hue: number;
  saturation: number;
  value: number;
}

interface SuiMiniColorObject {
  // Wrapper for SuiMiniColor from RPC
  type: string;
  fields: SuiMiniColor;
}

interface SuiMiniPalette {
  // The structure of the 'palette' field
  primary: SuiMiniColorObject;
  accent: SuiMiniColorObject;
  highlight: SuiMiniColorObject;
  neutral?: SuiMiniColorObject;
  background?: SuiMiniColorObject;
}

interface SuiProgramPart {
  name: string;
  params: number[];
}

interface SuiVersion {
  number: number;
}

interface SuiProgramDataFields {
  id: { id: string };
  protocol: Record<string, null> | string;
  version: SuiVersion;
  generated_on: SuiVersion;
  palette: SuiMiniPalette;
  parts: SuiProgramPart[];
}

// --- Custom types for WASM communication ---
interface ProgramPartData {
  name: string;
  params: number[];
}

// Helper function to map SUI part name to ProgramPartName enum
function mapPartNameToEnum(name: string): ProgramPartName {
  // Direct mapping for GLTF part names
  switch (name) {
    // Robot Body parts
    case 'BoxRobotBody':
      return ProgramPartName.BOX_ROBOT_BODY;
    case 'RoundRobotBody':
      return ProgramPartName.ROUND_ROBOT_BODY;

    // Robot Head parts
    case 'BoxRobotHead':
      return ProgramPartName.BOX_ROBOT_HEAD;
    case 'PyramidRobotHead':
      return ProgramPartName.PYRAMID_ROBOT_HEAD;
    case 'SphereRobotHead':
      return ProgramPartName.SPHERE_ROBOT_HEAD;

    // Robot Eye parts
    case 'CameraRobotEye':
      return ProgramPartName.CAMERA_ROBOT_EYE;
    case 'FeelerRobotEye':
      return ProgramPartName.FEELER_ROBOT_EYE;
    case 'SleekCameraRobotEye':
      return ProgramPartName.SLEEK_CAMERA_ROBOT_EYE;

    // Robot Addon parts
    case 'AntennaRobotAddon':
      return ProgramPartName.ANTENNA_ROBOT_ADDON;

    // Robot Leg Base parts
    case 'HexagonalRobotLegBase':
      return ProgramPartName.HEXAGONAL_ROBOT_LEG_BASE;
    case 'CrownedRobotLegBase':
      return ProgramPartName.CROWNED_ROBOT_LEG_BASE;

    // Robot Leg Tibia parts
    case 'StraightRobotLegTibia':
      return ProgramPartName.STRAIGHT_ROBOT_LEG_TIBIA;
    case 'MiddleRobotLegTibia':
      return ProgramPartName.MIDDLE_ROBOT_LEG_TIBIA;
    case 'SideRobotLegTibia':
      return ProgramPartName.SIDE_ROBOT_LEG_TIBIA;

    // Robot Leg Joint parts
    case 'HexagonalRobotLegJoint':
      return ProgramPartName.HEXAGONAL_ROBOT_LEG_JOINT;
    case 'CrossRobotLegJoint':
      return ProgramPartName.CROSS_ROBOT_LEG_JOINT;
    case 'StarRobotLegJoint':
      return ProgramPartName.STAR_ROBOT_LEG_JOINT;

    // Robot Leg End parts
    case 'SideRobotLegEnd':
      return ProgramPartName.SIDE_ROBOT_LEG_END;

    // Fallback to legacy mapping for backwards compatibility
    default: {
      const lowerName = name.toLowerCase();
      if (lowerName.includes('body')) return ProgramPartName.SIMPLE_BODY;
      if (lowerName.includes('eye')) return ProgramPartName.SIMPLE_EYE;
      if (lowerName.includes('limb')) return ProgramPartName.SIMPLE_LIMB;
      // Default to Empty for unknown parts
      return ProgramPartName.EMPTY;
    }
  }
}

// --- Default/Placeholder Data ---
const DEFAULT_PROGRAM_VIEW_MODEL: ViewModel = {
  palette: {
    primary: [128, 128, 128],
    secondary: [100, 100, 100],
    tertiary: [80, 80, 80],
    highlight: [200, 200, 200],
    accent: [150, 150, 150],
  },
  addons: [
    { Lizard: { size: 1.0, length: 1 } },
    { RoundHead: {} },
    { SimpleEye: { size_ratio: 0.3 } },
  ],
};

const DEFAULT_PROGRAM_DATA_PLACEHOLDER: Program = {
  id: 'default-placeholder',
  name: 'NO DAE-MON SELECTED',
  suiObjectId: '',
  source: 'N/A',
  type: 'N/A',
  speed: 0,
  corruption: 0,
  maxHealth: 0,
  health: 0,
  damage: 0,
  mintDate: 'N/A',
  protocol: 'N/A',
  viewModel: DEFAULT_PROGRAM_VIEW_MODEL,
};

// --- Date Formatting Helper ---
function formatTimestamp(timestampMs: string | undefined | null): string {
  if (!timestampMs) return 'N/A';
  try {
    const date = new Date(parseInt(timestampMs));
    if (isNaN(date.getTime())) return 'Invalid Date'; // Check if date is valid
    // Example format: "4/17/2024, 2:30:15 PM"
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date - ' + e;
  }
}

// --- Transformation Functions ---
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  let r = 0,
    g = 0,
    b = 0;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function transformSuiPaletteToWasmPalette(suiPalette: SuiMiniPalette | undefined): any | null {
  if (
    !suiPalette ||
    !suiPalette.primary?.fields ||
    !suiPalette.accent?.fields ||
    !suiPalette.highlight?.fields
  ) {
    // Core colors are missing or malformed, SUI palette is unusable for WASM basic needs.
    console.warn(
      'WASM Palette Prep: SUI palette is missing or core fields (primary, accent, highlight) are invalid. Cannot use SUI palette.',
    );
    return null;
  }

  // Validate that the fields contain proper HSV values
  const validateColor = (color: any, name: string): boolean => {
    if (
      !color ||
      typeof color.hue !== 'number' ||
      typeof color.saturation !== 'number' ||
      typeof color.value !== 'number'
    ) {
      console.warn(`WASM Palette Prep: Invalid ${name} color format:`, color);
      return false;
    }
    return true;
  };

  if (
    !validateColor(suiPalette.primary.fields, 'primary') ||
    !validateColor(suiPalette.accent.fields, 'accent') ||
    !validateColor(suiPalette.highlight.fields, 'highlight')
  ) {
    return null;
  }

  // Core colors are present and valid, use them.
  // For optional colors (neutral, background), use SUI if available, otherwise use defaults.
  const result = {
    primary: suiPalette.primary.fields, // Known to be valid here
    accent: suiPalette.accent.fields, // Known to be valid here
    highlight: suiPalette.highlight.fields, // Known to be valid here
    neutral: suiPalette.neutral?.fields || DEFAULT_MINI_PALETTE.neutral,
    background: suiPalette.background?.fields || DEFAULT_MINI_PALETTE.background,
  };

  console.log('WASM Palette Prep: Successfully transformed SUI palette:', result);
  return result;
}

// Keep the existing ViewModelPalette transformation for the UI display
function transformSuiPaletteToViewModelPalette(
  suiPalette: SuiMiniPalette | undefined,
): ViewModelPalette {
  const defaultViewModelPalette: ViewModelPalette = {
    primary: [128, 128, 128],
    secondary: [100, 100, 100],
    tertiary: [80, 80, 80],
    highlight: [200, 200, 200],
    accent: [150, 150, 150],
  };

  if (
    !suiPalette ||
    !suiPalette.primary?.fields ||
    !suiPalette.accent?.fields ||
    !suiPalette.highlight?.fields
  ) {
    return defaultViewModelPalette;
  }

  const scale = (val: number | undefined) => (typeof val === 'number' ? val / 255 : 0.5);
  const scaleHue = (val: number | undefined) => (typeof val === 'number' ? val / 360 : 0);

  const defaultSuiColorFields: SuiMiniColor = {
    hue: 0,
    saturation: 128,
    value: 128,
  };

  const primaryColorFields = suiPalette.primary.fields;
  const accentColorFields = suiPalette.accent.fields;
  const highlightColorFields = suiPalette.highlight.fields;
  const neutralColorFields = suiPalette.neutral?.fields || defaultSuiColorFields;
  const backgroundColorFields = suiPalette.background?.fields || defaultSuiColorFields;

  return {
    primary: hsvToRgb(
      scaleHue(primaryColorFields.hue),
      scale(primaryColorFields.saturation),
      scale(primaryColorFields.value),
    ),
    secondary: hsvToRgb(
      scaleHue(neutralColorFields.hue),
      scale(neutralColorFields.saturation),
      scale(neutralColorFields.value),
    ),
    tertiary: hsvToRgb(
      scaleHue(backgroundColorFields.hue),
      scale(backgroundColorFields.saturation),
      scale(backgroundColorFields.value),
    ),
    highlight: hsvToRgb(
      scaleHue(highlightColorFields.hue),
      scale(highlightColorFields.saturation),
      scale(highlightColorFields.value),
    ),
    accent: hsvToRgb(
      scaleHue(accentColorFields.hue),
      scale(accentColorFields.saturation),
      scale(accentColorFields.value),
    ),
  };
}

function transformSuiPartsToWasmParts(suiParts: SuiProgramPart[] | undefined): ProgramPartData[] {
  if (!suiParts || !suiParts.length) {
    // Return some default parts if none provided
    return DEFAULT_PARTS;
  }

  // Map SUI parts to the format expected by WASM
  return suiParts.map((part) => {
    // Try to map part names to ProgramPartName enum values
    let partName = ProgramPartName.EMPTY;
    const lowerName = typeof part.name === 'string' ? part.name.toLowerCase() : '';

    if (lowerName.includes('body')) partName = ProgramPartName.SIMPLE_BODY;
    else if (lowerName.includes('limb')) partName = ProgramPartName.SIMPLE_LIMB;
    else if (lowerName.includes('eye')) partName = ProgramPartName.SIMPLE_EYE;

    return {
      name: partName,
      params: part.params || [],
    };
  });
}

function transformSuiPartsToViewModelAddons(suiParts: any): ViewModelAddon[] {
  if (!suiParts) {
    console.warn('SuiParts is undefined, returning empty addons array.');
    return [];
  }
  if (!Array.isArray(suiParts)) {
    console.warn('SuiParts is not an array, returning empty addons array.');
    return [];
  }

  return suiParts.map((part, index) => {
    const addon: ViewModelAddon = {};
    // Default key in case name is invalid
    let addonKey = `UnknownPart${index}`;

    // Handle different possible SUI data structures
    let partName: string | undefined;
    let partParams: number[] = [];

    if (typeof part === 'object' && part !== null) {
      // Try different ways to extract part name
      if (typeof part.name === 'string') {
        partName = part.name;
      } else if (part.fields && typeof part.fields.name === 'string') {
        partName = part.fields.name;
      } else if (typeof part.type === 'string' && part.type.includes('::')) {
        const typeParts = part.type.split('::');
        partName = typeParts[typeParts.length - 1];
      }

      // Try different ways to extract params
      if (Array.isArray(part.params)) {
        partParams = [...part.params];
      } else if (part.fields && Array.isArray(part.fields.params)) {
        partParams = [...part.fields.params];
      } else if (Array.isArray(part.parameters)) {
        partParams = [...part.parameters];
      }
    }

    // --- FIX: Check if partName is a string before using .toLowerCase() ---
    if (typeof partName === 'string' && partName.length > 0) {
      const lowerCaseName = partName.toLowerCase();
      // Assign initial addonKey based on valid name
      addonKey = partName;

      // Try specific mapping
      if (lowerCaseName.includes('lizard')) addonKey = 'Lizard';
      else if (lowerCaseName.includes('head')) addonKey = 'RoundHead';
      else if (lowerCaseName.includes('eye')) addonKey = 'SimpleEye';
      else if (lowerCaseName.includes('tail')) addonKey = 'SimpleTail';
      else if (lowerCaseName.includes('limb')) addonKey = 'SimpleLimb';
      // If specific mapping didn't change addonKey, it remains partName
    } else {
      // If name is not a valid string, addonKey remains the default `UnknownPart${index}`
      console.warn(`Part at index ${index} has invalid or missing name:`, partName);
    }
    // ---------------------------------------------------------------------

    addon[addonKey] = {};

    // Parameter mapping (remains speculative) - Check if partParams exists
    if (partParams && partParams.length > 0) {
      if (addonKey === 'Lizard' || addonKey === 'SimpleLimb') {
        if (partParams.length > 0) addon[addonKey]!.size = ((partParams[0] % 2000) + 500) / 1000;
        if (partParams.length > 1) addon[addonKey]!.length = partParams[1] % 10;
      } else if (addonKey === 'SimpleEye') {
        if (partParams.length > 0)
          addon[addonKey]!.size_ratio = ((partParams[0] % 400) + 100) / 1000;
      } else if (addonKey === 'SimpleTail') {
        if (partParams.length > 0) addon[addonKey]!.end = ((partParams[0] % 500) + 100) / 1000;
        if (partParams.length > 1) addon[addonKey]!.length = (partParams[1] % 10) + 2;
      } else {
        // Generic fallback
        if (partParams.length > 0) addon[addonKey]!.size = ((partParams[0] % 2000) + 500) / 1000;
        if (partParams.length > 1) addon[addonKey]!.length = partParams[1] % 10;
        if (partParams.length > 2)
          addon[addonKey]!.size_ratio = ((partParams[2] % 400) + 100) / 1000;
      }
    } else {
      console.warn(`Part "${addonKey}" at index ${index} has missing or empty params array.`);
    }

    return addon;
  });
}

function getProtocolNameFromSui(protocolField: Record<string, null> | string | undefined): string {
  if (!protocolField) return 'UnknownProtocol';
  if (typeof protocolField === 'string') {
    return protocolField;
  }
  const keys = Object.keys(protocolField);
  if (keys.length === 1) {
    return keys[0];
  }
  return 'UnknownProtocol';
}

// --- Helper function to transform SUI parts for WASM, with validation ---
function transformRawPartsForWasm(
  rawParts: any,
  programId: string, // For logging context
): ProgramPartData[] | null {
  if (!rawParts || !Array.isArray(rawParts) || rawParts.length === 0) {
    console.warn(
      `WASM Prep (${programId}): rawParts is missing, not an array, or empty. Cannot use SUI parts directly.`,
    );
    return null; // Indicates SUI parts are not usable as-is
  }

  const transformedParts: ProgramPartData[] = [];
  let hasBodyPartPresent = false;

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i];

    // Handle different possible SUI data structures
    let partName: string | undefined;
    let partParams: number[] = [];

    // Try different ways to extract part name
    if (typeof part === 'object' && part !== null) {
      // Check for direct name property
      if (typeof part.name === 'string') {
        partName = part.name;
      }
      // Check for nested name structure (common in SUI)
      else if (part.fields && typeof part.fields.name === 'string') {
        partName = part.fields.name;
      }
      // Check if part itself is a name wrapper
      else if (typeof part.type === 'string' && part.type.includes('::')) {
        // Extract type name from SUI type string like "0x123::module::PartName"
        const typeParts = part.type.split('::');
        partName = typeParts[typeParts.length - 1];
      }

      // Try different ways to extract params
      if (Array.isArray(part.params)) {
        partParams = [...part.params];
      } else if (part.fields && Array.isArray(part.fields.params)) {
        partParams = [...part.fields.params];
      } else if (Array.isArray(part.parameters)) {
        partParams = [...part.parameters];
      }
    }

    // Core structural validation: name must be a string
    if (typeof partName !== 'string' || partName.length === 0) {
      console.warn(
        `WASM Prep (${programId}): SUI Part at index ${i} has invalid name (name: "${partName}", type: ${typeof partName}). Using fallback part.`,
      );
      // Use a fallback part instead of aborting entirely
      partName = 'SimpleBody';
      partParams = [];
    }

    const partNameEnum = mapPartNameToEnum(partName);

    // Track if we have a body part (including robot bodies)
    if (
      partNameEnum === ProgramPartName.SIMPLE_BODY ||
      partNameEnum === ProgramPartName.BOX_ROBOT_BODY ||
      partNameEnum === ProgramPartName.ROUND_ROBOT_BODY
    ) {
      hasBodyPartPresent = true;
    }

    // Fix Empty parts and SimpleEye to have no parameters (matching working ProgramEventDemo format)
    if (partNameEnum === ProgramPartName.EMPTY || partNameEnum === ProgramPartName.SIMPLE_EYE) {
      partParams = [];
    }

    transformedParts.push({ name: partNameEnum, params: partParams });
  }

  // Ensure there's always at least one SimpleBody part - critical for skeleton building
  if (!hasBodyPartPresent) {
    console.warn(
      `WASM Prep (${programId}): No body part found in SUI data. Adding SimpleBody as first part.`,
    );
    transformedParts.unshift({
      name: ProgramPartName.SIMPLE_BODY,
      params: [4, 5, 50, 40, 20, 85], // Use working params from ProgramEventDemo
    });
  }

  console.log(
    `WASM Parts Prep: Successfully transformed ${transformedParts.length} parts:`,
    transformedParts,
  );
  return transformedParts;
}

export default function ProgramDatabase() {
  const { state: walletState } = useWallet();
  const [suiClient, setSuiClient] = createSignal<SuiClient | null>(null);

  const [programs, setPrograms] = createSignal<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = createSignal<Program | null>(null);
  const [viewerBridge, setViewerBridge] = createSignal<WasmCanvasBridgeInterface | null>(null);
  const [webGPUSupported, setWebGPUSupported] = createSignal(true);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [webGPUError, setWebGPUError] = createSignal<string | null>(null);

  onMount(() => {
    if (typeof navigator !== 'undefined' && !('gpu' in navigator)) {
      setWebGPUSupported(false);
      console.error('WebGPU Check Failed: Not supported in this browser.');
    } else {
      console.log('WebGPU Check Passed.');
    }

    // Listen for WebGPU rendering errors
    const _handleWebGPUError = (event: any) => {
      const message = event.detail || event.message || 'Unknown WebGPU error';
      if (
        message.includes('uniform buffers') ||
        message.includes('pipeline') ||
        message.includes('WebGPU')
      ) {
        setWebGPUError(
          'WebGPU rendering issue detected. This may be due to complex 3D models exceeding hardware limits. Try refreshing the page or using a simpler model.',
        );
        console.warn('WebGPU Error detected:', message);
      }
    };

    // Monitor console errors for WebGPU issues
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (
        message.includes('uniform buffers') ||
        message.includes('Invalid PipelineLayout') ||
        message.includes('Invalid RenderPipeline')
      ) {
        setWebGPUError(
          'WebGPU rendering pipeline failed. This may be due to hardware limitations with complex 3D models.',
        );
      }
      originalError.apply(console, args);
    };

    // Clean up on unmount
    return () => {
      console.error = originalError;
    };
  });

  createEffect(() => {
    if (walletState.network) {
      // Directly use getFullnodeUrl as walletState.network is guaranteed to be valid by WalletContext
      const client = new SuiClient({
        url: getFullnodeUrl(walletState.network),
      });
      setSuiClient(client);
    }
  });

  const fetchProgramsFromWallet = async () => {
    if (!walletState.isConnected || !walletState.activeAccount || !suiClient()) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    console.log('Fetching programs from wallet for account:', walletState.activeAccount.address);

    // Create a map for faster transaction history lookup
    const historyMap = new Map(
      walletState.transactionHistory?.map((tx) => [tx.digest, tx.timestampMs]) ?? [],
    );
    // console.log("History Map Size:", historyMap.size);

    try {
      const client = suiClient()!;
      const owner = walletState.activeAccount.address;

      const ownedProgramObjects = await client.getOwnedObjects({
        owner,
        filter: { StructType: PROGRAM_TYPE_STRING },
        options: {
          showContent: true,
          showType: true,
          showDisplay: true,
          showPreviousTransaction: true,
        },
      });

      console.log(
        `Found ${ownedProgramObjects.data.length} potential program objects of type ${PROGRAM_TYPE_STRING}.`,
      );

      const fetchedProgramData: Program[] = [];

      for (const obj of ownedProgramObjects.data) {
        if (obj.data && obj.data.content?.dataType === 'moveObject') {
          const fields = obj.data.content.fields as unknown as SuiProgramDataFields;

          // console.log(`Program Object ID: ${obj.data.objectId}`);
          // console.log("Raw fields.palette:", JSON.stringify(fields.palette, null, 2));
          // console.log("Raw fields.parts:", JSON.stringify(fields.parts, null, 2));

          const protocolName = getProtocolNameFromSui(fields.protocol);
          const programName =
            obj.data.display?.data?.name || `Program ${obj.data.objectId.slice(-6)}`;

          const randomSpeed = (parseInt(obj.data.objectId.slice(-2, -1), 16) % 5) + 1;
          const randomCorruption = (parseInt(obj.data.objectId.slice(-3, -2), 16) % 80) + 10;
          const randomMaxHealth = (parseInt(obj.data.objectId.slice(-4, -3), 16) % 50) + 50;
          const randomDamage = (parseInt(obj.data.objectId.slice(-5, -4), 16) % 25) + 5;

          // --- Mint Date Logic ---
          let mintDateStr = 'N/A';
          const previousTxDigest = obj.data?.previousTransaction; // Get the digest of the tx that created/mutated the object
          let timestampFromHistory: string | undefined | null = null;

          if (previousTxDigest) {
            timestampFromHistory = historyMap.get(previousTxDigest);
          }

          if (timestampFromHistory) {
            // Prefer timestamp from transaction history if found
            mintDateStr = formatTimestamp(timestampFromHistory);
            // console.log(`Found mint date for ${obj.data.objectId} from history: ${mintDateStr}`);
          } else {
            // Fallback to display object data if history doesn't have the tx
            const creationTimestampFromDisplay = obj.data.display?.data?.creation_date;
            if (creationTimestampFromDisplay) {
              if (!isNaN(Number(creationTimestampFromDisplay))) {
                // Try parsing as timestamp number
                mintDateStr = formatTimestamp(String(creationTimestampFromDisplay));
              } else if (
                typeof creationTimestampFromDisplay === 'string' &&
                creationTimestampFromDisplay.match(/^\d{4}-\d{2}-\d{2}/)
              ) {
                // Try parsing as date string
                try {
                  mintDateStr = new Date(creationTimestampFromDisplay).toLocaleDateString();
                } catch (e) {
                  /* Ignore parsing error, keep N/A */
                }
              }
            }
          }
          // --- End Mint Date Logic ---

          // First, create ViewModel for UI display
          const viewModelPalette = transformSuiPaletteToViewModelPalette(fields.palette);
          const viewModelAddons = transformSuiPartsToViewModelAddons(fields.parts);

          const transformedProgram: Program = {
            id: obj.data.objectId,
            suiObjectId: obj.data.objectId,
            name: programName,
            protocol: protocolName,
            source: protocolName,
            type: `${protocolName} / Digital`,
            speed: randomSpeed,
            corruption: randomCorruption,
            maxHealth: randomMaxHealth,
            health: randomMaxHealth,
            damage: randomDamage,
            mintDate: mintDateStr,
            viewModel: {
              palette: viewModelPalette,
              addons: viewModelAddons,
            },
            rawFields: fields, // Store raw fields for WASM communication
          };
          fetchedProgramData.push(transformedProgram);
        }
      }

      setPrograms(fetchedProgramData);
      if (fetchedProgramData.length > 0) {
        setSelectedProgram(fetchedProgramData[0]);
      } else {
        setSelectedProgram(null);
      }
      console.log(`Successfully transformed ${fetchedProgramData.length} programs.`);
    } catch (e) {
      console.error('Error fetching or transforming programs:', e);
      setError(e instanceof Error ? e.message : String(e));
      setPrograms([]);
      setSelectedProgram(null);
    } finally {
      setIsLoading(false);
    }
  };

  createEffect(() => {
    if (walletState.isConnected && walletState.activeAccount && suiClient()) {
      fetchProgramsFromWallet();
    } else {
      setPrograms([]);
      setSelectedProgram(null);
    }
  });

  const handleViewerReady = (bridge: WasmCanvasBridgeInterface) => {
    console.log('ProgramDatabase iframe viewer reported ready.');
    setViewerBridge(bridge);

    // Initialize with default program immediately when ready
    if (bridge.isReady()) {
      const programBuilder = {
        id: 'default_program',
        palette: DEFAULT_MINI_PALETTE,
        parts: DEFAULT_PARTS,
      };

      const event: EventPayload = { ViewModel: programBuilder as any };
      console.log('Sending initial ViewModel to WASM:', event);
      bridge.queueEventForWasm(event);
    }
  };

  const handleProgramSelect = (program: Program) => {
    setSelectedProgram(program);
  };

  const displayData = () => selectedProgram() ?? DEFAULT_PROGRAM_DATA_PLACEHOLDER;

  // Update effect to handle program selection and update viewer
  createEffect(() => {
    const currentProgram = selectedProgram();
    const bridge = viewerBridge();

    if (bridge?.isReady() && currentProgram) {
      try {
        const programId = currentProgram.id;
        let partsToUse: ProgramPartData[];
        let paletteToUse: any; // Matches ProgramPalette structure

        // 1. Attempt to use SUI parts (with minimal transformation)
        const suiPartsProcessed = transformRawPartsForWasm(
          currentProgram.rawFields?.parts,
          programId,
        );
        if (suiPartsProcessed !== null) {
          // console.log(`Using SUI-derived parts for program: ${programId}`);
          partsToUse = suiPartsProcessed;
        } else {
          console.warn(
            `WASM Prep (${programId}): SUI parts were structurally unusable or missing. Falling back to algorithmic generation for parts.`,
          );
          partsToUse = generatePartsFromId(programId);
        }

        // 2. Attempt to use SUI palette (with minimal transformation)
        let suiPaletteProcessed = null;
        if (currentProgram.rawFields?.palette) {
          suiPaletteProcessed = transformSuiPaletteToWasmPalette(currentProgram.rawFields.palette);
        }

        if (suiPaletteProcessed !== null) {
          // console.log(`Using SUI-derived palette for program: ${programId}`);
          paletteToUse = suiPaletteProcessed;
        } else {
          console.warn(
            `WASM Prep (${programId}): SUI palette was unusable, missing, or core colors invalid. Falling back to algorithmic generation for palette.`,
          );
          paletteToUse = generatePaletteFromId(programId); // Ensure this returns WASM-compatible palette
        }

        const programBuilder = {
          id: programId,
          palette: paletteToUse,
          parts: partsToUse,
        };

        console.log(
          `Sending data to WASM for program ${programId}:`,
          JSON.stringify(programBuilder, null, 2),
        );
        try {
          bridge.queueEventForWasm({ ViewModel: programBuilder as any });
          console.log(`Successfully sent ViewModel for program ${programId} to WASM`);

          // Clear any previous WebGPU errors when successfully sending new data
          if (webGPUError()) {
            setTimeout(() => setWebGPUError(null), 1000);
          }
        } catch (wasmError) {
          console.error('Error sending data to WASM:', wasmError);
          setWebGPUError('Failed to communicate with 3D renderer. Please refresh the page.');
        }
      } catch (error) {
        console.error(
          `Error in createEffect sending program data to WASM for ${currentProgram?.id}:`,
          error,
        );
        const fallbackProgramBuilder = {
          id: currentProgram?.id || 'error_program_in_catch',
          palette: DEFAULT_MINI_PALETTE,
          parts: DEFAULT_PARTS,
        };
        bridge.queueEventForWasm({ ViewModel: fallbackProgramBuilder as any });
      }
    }
  });

  // Generate a deterministic palette based on program ID (fallback when no data available)
  function generatePaletteFromId(id: string): any {
    // Extract some bytes from the ID to generate colors
    const hash = id.replace(/[^0-9a-f]/g, '');

    // Get some deterministic values from the hash
    const byte1 = parseInt(hash.slice(2, 4), 16);
    const byte2 = parseInt(hash.slice(4, 6), 16);
    const byte3 = parseInt(hash.slice(6, 8), 16);
    const byte4 = parseInt(hash.slice(8, 10), 16);
    const byte5 = parseInt(hash.slice(10, 12), 16);

    return {
      primary: createMiniColor(byte1 % 360, 150 + (byte2 % 105), 180 + (byte3 % 75)),
      accent: createMiniColor((byte2 + 120) % 360, 150 + (byte3 % 105), 150 + (byte4 % 105)),
      highlight: createMiniColor((byte3 + 240) % 360, 180 + (byte4 % 75), 200 + (byte5 % 55)),
      neutral: createMiniColor(byte4 % 30, 20 + (byte5 % 80), 180 + (byte1 % 75)),
      background: createMiniColor((byte5 + 180) % 360, 100 + (byte1 % 80), 150 + (byte2 % 75)),
    };
  }

  // Generate deterministic parts based on program ID (fallback when no data available)
  function generatePartsFromId(id: string): any[] {
    // Extract some bytes from the ID to make deterministic decisions
    const hash = id.replace(/[^0-9a-f]/g, '');

    // Get some deterministic values from the hash
    const byte1 = parseInt(hash.slice(0, 2), 16);
    const byte2 = parseInt(hash.slice(2, 4), 16);
    const byte3 = parseInt(hash.slice(4, 6), 16);
    const byte4 = parseInt(hash.slice(6, 8), 16);
    const byte5 = parseInt(hash.slice(8, 10), 16);

    // Create random but deterministic parts based on the ID
    // Always ensure SimpleBody is first and has proper params
    return [
      {
        name: ProgramPartName.SIMPLE_BODY,
        params: [
          Math.max(1, Math.floor((2 + (byte1 % 6)) / 2)), // Halved, ensures at least 1
          Math.max(1, Math.floor((3 + (byte2 % 5)) / 2)), // Halved, ensures at least 1
          Math.max(1, Math.floor((15 + (byte3 % 30)) / 1.5)), // Scaled down
          Math.max(1, Math.floor((15 + (byte4 % 20)) / 1.5)), // Scaled down
          Math.max(1, Math.floor((5 + (byte5 % 15)) / 1.5)), // Scaled down
          Math.max(1, Math.floor((10 + (byte1 % 15)) / 1.5)), // Scaled down significantly
        ],
      },
      {
        name: ProgramPartName.SIMPLE_EYE,
        params: [], // Match working ProgramEventDemo format - no params
      },
      {
        name: ProgramPartName.SIMPLE_LIMB,
        params: [
          1 + (byte3 % 3), // Random but deterministic param in range 1-3
        ],
      },
      {
        name: byte4 % 2 === 0 ? ProgramPartName.SIMPLE_LIMB : ProgramPartName.EMPTY,
        params: byte4 % 2 === 0 ? [1 + (byte5 % 2)] : [], // Empty parts get no params
      },
      {
        name: byte5 % 3 === 0 ? ProgramPartName.SIMPLE_LIMB : ProgramPartName.EMPTY,
        params: byte5 % 3 === 0 ? [1] : [], // Empty parts get no params
      },
    ];
  }

  // Remove unused debug functions
  createEffect(() => {
    const currentPrograms = programs();
    if (currentPrograms.length > 0 && !selectedProgram()) {
      setSelectedProgram(currentPrograms[0]);
    } else if (currentPrograms.length === 0) {
      setSelectedProgram(null);
    }
  });

  return (
    <div class="flex w-full h-full pt-2 overflow-hidden">
      {/* Left panel - Program viewer and details */}
      <div class="w-2/5 window m-2 min-w-0 overflow-hidden">
        <div class="flex flex-col h-full p-2 overflow-hidden">
          <div class="flex-1 flex mb-2 mr-[1px] overflow-hidden">
            <Show when={!webGPUSupported()}>
              <div class="p-4 text-center text-red-500 border border-red-500 flex-1 flex items-center justify-center">
                <div>
                  <p>WebGPU Not Supported</p>
                  <p class="mt-2 text-sm">
                    Please use a recent version of Chrome, Edge, or enable flags in Firefox.
                  </p>
                </div>
              </div>
            </Show>
            <Show when={webGPUSupported()}>
              <WasmIframeWrapper
                instanceId="db-viewer-frame"
                jsPath={WASM_BINDINGS_URL}
                wasmPath={WASM_ENGINE_URL}
                onReady={handleViewerReady}
              />
            </Show>
          </div>
          <div class="overflow-hidden">
            <div class="flex justify-between status-bar-field px-2 items-center">
              <div class="font-bold ml-2 truncate" title={displayData().name}>
                {displayData().name}
              </div>
              <div class="flex gap-2 text-gray-500 mr-2 text-xs truncate">
                Decrypted: <p class="italic truncate">{displayData().mintDate}</p>
              </div>
            </div>
            <div class="mt-4 text-sm">
              <div class="flex justify-between">
                <div>Source</div>
                <div class="truncate">{displayData().source}</div>
              </div>
              <div class="flex justify-between">
                <div>Type</div>
                <div class="truncate">{displayData().type}</div>
              </div>
              <Show when={webGPUError()}>
                <div class="flex justify-between text-yellow-600 mt-2">
                  <div>Render Status</div>
                  <div class="truncate">WebGPU Issue</div>
                </div>
              </Show>
              <Show when={selectedProgram() && selectedProgram()?.rawFields?.parts}>
                <div class="flex justify-between text-blue-600 mt-2">
                  <div>3D Model</div>
                  <div class="truncate">
                    Legacy Parts ({selectedProgram()?.rawFields?.parts?.length || 0})
                  </div>
                </div>
              </Show>
            </div>
            <div class="mt-4">
              <div class="flex text-sm">
                <div class="w-1/2 pr-1 overflow-hidden">
                  <StatsList program={displayData()} />
                </div>
                <div class="w-1/2 overflow-hidden">
                  <div class="font-bold mb-1 text-right">Attacks</div>
                  <div class="flex-col h-full text-right">
                    <Show
                      when={
                        selectedProgram() &&
                        displayData().name !== DEFAULT_PROGRAM_DATA_PLACEHOLDER.name
                      }
                      fallback={
                        <>
                          <div class="status-bar-field">-</div>{' '}
                          <div class="status-bar-field">-</div>
                          <div class="status-bar-field">-</div>{' '}
                          <div class="status-bar-field">-</div>
                        </>
                      }
                    >
                      <div class="status-bar-field">Slash</div>{' '}
                      <div class="status-bar-field">Bite</div>
                      <div class="status-bar-field">Roar</div>{' '}
                      <div class="status-bar-field">Hide</div>
                    </Show>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Program list */}
      <div class="w-3/5 flex flex-col ml-1 mr-2 min-w-0 overflow-hidden">
        <div class="flex justify-between items-center mb-2 pr-1">
          <button
            onClick={fetchProgramsFromWallet}
            disabled={isLoading() || !walletState.isConnected}
            class="text-xs px-2 py-1"
          >
            {isLoading() ? 'Refreshing...' : 'Refresh List'}
          </button>
          <span class="font-bold truncate">Available DAE-MON/S ({programs().length})</span>
        </div>

        <Show when={error()}>
          <div class="p-2 text-center text-sm text-red-600 bg-red-100 border border-red-300 mb-2 overflow-hidden text-ellipsis">
            Error loading programs: {error()}
          </div>
        </Show>

        <div class="overflow-y-auto overflow-x-hidden p-1">
          <Show when={isLoading() && programs().length === 0}>
            <div class="p-4 text-center text-sm italic">Loading DAE-MONs from wallet...</div>
          </Show>
          <Show when={!isLoading() && programs().length === 0 && walletState.isConnected}>
            <div class="p-4 text-center text-sm italic overflow-hidden">
              No DAE-MONs found in your wallet for type{' '}
              <code class="text-xs bg-gray-200 p-0.5 rounded break-all">{PROGRAM_TYPE_STRING}</code>
              .
              <br /> Mint one in 'Drives & Programs'.
            </div>
          </Show>
          <Show when={!walletState.isConnected && !isLoading()}>
            <div class="p-4 text-center text-sm italic">
              Connect your wallet to see your DAE-MONs.
            </div>
          </Show>

          <For each={programs()}>
            {(program) => (
              <div class="mb-1 cursor-pointer" onClick={() => handleProgramSelect(program)}>
                <button
                  class="w-full font-bold justify-between p-2 flex items-center gap-2 text-sm"
                  classList={{ active: selectedProgram()?.id === program.id }}
                >
                  <div class="w-32 truncate text-left" title={program.name}>
                    {program.name}
                  </div>
                  <div class="progress-indicator segmented w-full">
                    <span
                      class="progress-corruption-bar"
                      style={{ width: `${program.corruption}%` }}
                    />
                  </div>
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
