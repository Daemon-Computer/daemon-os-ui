import type { ViewModelPalette, ViewModelAddon } from '../game/events';
import type { SuiMiniPalette, SuiMiniColor, SuiProgramPart, ProgramPartData } from './types';
import { ProgramPartName } from './enums';
import { DEFAULT_MINI_PALETTE, DEFAULT_PARTS } from './constants';
import { hsvToRgb } from '../../components/ProgramDatabase/utils/colorUtils';

// Helper function to map SUI part name to ProgramPartName enum
export function mapPartNameToEnum(name: string): ProgramPartName {
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

export function transformSuiPaletteToWasmPalette(
  suiPalette: SuiMiniPalette | undefined,
): any | null {
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
export function transformSuiPaletteToViewModelPalette(
  suiPalette: SuiMiniPalette | undefined,
): ViewModelPalette {
  const defaultViewModelPalette: ViewModelPalette = {
    primary: [128, 128, 128],
    neutral: [100, 100, 100],
    background: [80, 80, 80],
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
    neutral: hsvToRgb(
      scaleHue(neutralColorFields.hue),
      scale(neutralColorFields.saturation),
      scale(neutralColorFields.value),
    ),
    background: hsvToRgb(
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

export function transformSuiPartsToWasmParts(
  suiParts: SuiProgramPart[] | undefined,
): ProgramPartData[] {
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

export function transformSuiPartsToViewModelAddons(suiParts: any): ViewModelAddon[] {
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

export function getProtocolNameFromSui(
  protocolField: Record<string, null> | string | undefined,
): string {
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
export function transformRawPartsForWasm(
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
