import { createSignal, Show, onMount } from 'solid-js';
import WasmIframeWrapper from './WasmIframeWrapper';
import type { WasmCanvasBridgeInterface } from './hooks/createWasmCanvas';
import type { EventPayload } from '../api/game/events';
import { WASM_ENGINE_URL, WASM_BINDINGS_URL } from '../api/constants';

// Enum to match Rust-side ProgramPartName
enum ProgramPartName {
  EMPTY = 'Empty',
  SIMPLE_BODY = 'SimpleBody',
  SIMPLE_LIMB = 'SimpleLimb',
  SIMPLE_EYE = 'SimpleEye',
  // Robot parts for GLTF testing
  BOX_ROBOT_BODY = 'BoxRobotBody',
  SPHERE_ROBOT_HEAD = 'SphereRobotHead',
  CAMERA_ROBOT_EYE = 'CameraRobotEye',
  ANTENNA_ROBOT_ADDON = 'AntennaRobotAddon',
  HEXAGONAL_ROBOT_LEG_BASE = 'HexagonalRobotLegBase',
  SIDE_ROBOT_LEG_TIBIA = 'SideRobotLegTibia',
  SIDE_ROBOT_LEG_END = 'SideRobotLegEnd',
  CROSS_ROBOT_LEG_JOINT = 'CrossRobotLegJoint',
}

export default function ProgramEventDemo() {
  const [bridge, setBridge] = createSignal<WasmCanvasBridgeInterface | null>(null);
  const [webGPUSupported, setWebGPUSupported] = createSignal(true); // Assume true

  onMount(() => {
    if (typeof navigator !== 'undefined' && !('gpu' in navigator)) {
      setWebGPUSupported(false);
      console.error('WebGPU Check Failed: Not supported in this browser.');
    } else {
      console.log('WebGPU Check Passed.');
    }
  });

  // Define a color in the format the Rust code expects (HSV values)
  const createMiniColor = (hue: number, saturation: number, value: number) => ({
    hue,
    saturation,
    value,
  });

  // GLTF robot color palette
  const miniPalette = {
    primary: createMiniColor(78, 127, 249),
    accent: createMiniColor(93, 221, 101),
    highlight: createMiniColor(136, 105, 220),
    neutral: createMiniColor(78, 54, 207),
    background: createMiniColor(258, 86, 170),
  };

  // const parts = [
  //   {
  //     name: ProgramPartName.BOX_ROBOT_BODY,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SPHERE_ROBOT_HEAD,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.CAMERA_ROBOT_EYE,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.ANTENNA_ROBOT_ADDON,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.HEXAGONAL_ROBOT_LEG_BASE,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SIDE_ROBOT_LEG_TIBIA,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SIDE_ROBOT_LEG_END,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.CROSS_ROBOT_LEG_JOINT,
  //     params: [],
  //   },
  // ];

  // Legacy parts for testing (complete structure that was known to work)
  const parts = [
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

  // Callback function for the wrapper to pass the bridge when ready
  const handleWasmReady = (b: WasmCanvasBridgeInterface) => {
    console.log('ProgramEventDemo WASM canvas is ready.');
    setBridge(b);

    // Initialize with the ProgramBuilder format the Rust code expects
    if (b.isReady()) {
      // Create a program builder object matching the Rust-side ProgramBuilder struct
      const programBuilder = {
        id: 'new_program',
        palette: miniPalette,
        parts: parts,
      };

      // Use type assertion to bypass TypeScript error - this structure is correct for Rust
      const event: EventPayload = { ViewModel: programBuilder as any };
      console.log('Sending initial ViewModel to WASM:', event);
      b.queueEventForWasm(event);
    }
  };

  const _handleShowNormals = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: 'Normals' };
      console.log('Sending event to demo WASM:', event);
      b.queueEventForWasm(event);
    } else {
      console.warn("Demo WASM bridge not ready to send 'Normals' event.");
    }
  };

  const _handleShowDefault = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: 'Disabled' };
      console.log('Sending event to demo WASM:', event);
      b.queueEventForWasm(event);
    } else {
      console.warn("Demo WASM bridge not ready to send 'Disabled' event.");
    }
  };

  const _handleShowSteps = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: 'Steps' };
      console.log('Sending event to demo WASM:', event);
      b.queueEventForWasm(event);
    } else {
      console.warn("Demo WASM bridge not ready to send 'Steps' event.");
    }
  };

  return (
    <div class="flex-col h-[90%]">
      {/* Conditional Rendering based on WebGPU support */}
      <Show when={!webGPUSupported()}>
        <div class="p-4 text-center text-red-500 border border-red-500">
          <p>WebGPU Not Supported</p>
          <p class="mt-2 text-sm">
            Please use a recent version of Chrome, Edge, or enable flags in Firefox.
          </p>
        </div>
      </Show>

      <Show when={webGPUSupported()}>
        <WasmIframeWrapper
          instanceId="event-demo-viewer-iframe"
          jsPath={WASM_BINDINGS_URL}
          wasmPath={WASM_ENGINE_URL}
          onReady={handleWasmReady}
        />
      </Show>
    </div>
  );
}
