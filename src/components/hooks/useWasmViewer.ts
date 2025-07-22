import { createSignal, onMount } from 'solid-js';
import type { WasmCanvasBridgeInterface } from './createWasmCanvas';
import type { EventPayload } from '../../api/game/events';
import type { Program, ProgramPartData } from '../../api/program/types';
import { DEFAULT_MINI_PALETTE, DEFAULT_PARTS } from '../../api/program/constants';
import {
  transformSuiPaletteToWasmPalette,
  transformRawPartsForWasm,
} from '../../api/program/transformers';
import { generatePaletteFromId, generatePartsFromId } from '../ProgramDatabase/utils/generators';
import { hsvToRgb } from '../ProgramDatabase/utils/colorUtils';

export function useWasmViewer() {
  const [viewerBridge, setViewerBridge] = createSignal<WasmCanvasBridgeInterface | null>(null);
  const [webGPUSupported, setWebGPUSupported] = createSignal(true);
  const [webGPUError, setWebGPUError] = createSignal<string | null>(null);

  // Store the background color from the WASM palette data
  // Calculate default background color from DEFAULT_MINI_PALETTE to match default model
  const defaultBg = DEFAULT_MINI_PALETTE.background;
  const [defaultR, defaultG, defaultB] = hsvToRgb(
    defaultBg.hue / 360,
    defaultBg.saturation / 255,
    defaultBg.value / 255,
  );
  const [windowBackgroundColor, setWindowBackgroundColor] = createSignal<string>(
    `rgb(${defaultR}, ${defaultG}, ${defaultB})`,
  );

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

  const sendProgramToWasm = (program: Program) => {
    const bridge = viewerBridge();
    if (!bridge?.isReady() || !program) return;

    try {
      const programId = program.id;
      let partsToUse: ProgramPartData[];
      let paletteToUse: any; // Matches ProgramPalette structure

      // 1. Attempt to use SUI parts (with minimal transformation)
      const suiPartsProcessed = transformRawPartsForWasm(program.rawFields?.parts, programId);
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
      if (program.rawFields?.palette) {
        suiPaletteProcessed = transformSuiPaletteToWasmPalette(program.rawFields.palette);
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

      // Extract background color from the palette that's being sent to WASM
      if (paletteToUse?.background) {
        const bgColor = paletteToUse.background;
        const [r, g, b] = hsvToRgb(
          bgColor.hue / 360,
          bgColor.saturation / 255,
          bgColor.value / 255,
        );
        setWindowBackgroundColor(`rgb(${r}, ${g}, ${b})`);
      }

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
        `Error in createEffect sending program data to WASM for ${program?.id}:`,
        error,
      );
      const fallbackProgramBuilder = {
        id: program?.id || 'error_program_in_catch',
        palette: DEFAULT_MINI_PALETTE,
        parts: DEFAULT_PARTS,
      };

      // Set fallback background color
      const defaultBg = DEFAULT_MINI_PALETTE.background;
      const [r, g, b] = hsvToRgb(
        defaultBg.hue / 360,
        defaultBg.saturation / 255,
        defaultBg.value / 255,
      );
      setWindowBackgroundColor(`rgb(${r}, ${g}, ${b})`);

      bridge.queueEventForWasm({ ViewModel: fallbackProgramBuilder as any });
    }
  };

  return {
    viewerBridge,
    webGPUSupported,
    webGPUError,
    windowBackgroundColor,
    handleViewerReady,
    sendProgramToWasm,
  };
}
