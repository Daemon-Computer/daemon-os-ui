import { ProgramPartName } from '../../../api/program/enums';
import { createMiniColor } from '../../../api/program/constants';

// Generate a deterministic palette based on program ID (fallback when no data available)
export function generatePaletteFromId(id: string): any {
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
export function generatePartsFromId(id: string): any[] {
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
