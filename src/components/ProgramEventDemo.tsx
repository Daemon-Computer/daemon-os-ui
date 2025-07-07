import { createSignal, Show, onMount } from "solid-js";
import { WasmIframeWrapper } from "./WasmIframeWrapper";
import type { WasmCanvasBridgeInterface } from "./hooks/createWasmCanvas";
import type { EventPayload } from "../api/game/events";
import { WASM_ENGINE_URL, WASM_BINDINGS_URL } from "~/api/constants";

// Enum to match Rust-side ProgramPartName
enum ProgramPartName {
  Empty = "Empty",
  SimpleBody = "SimpleBody",
  SimpleLimb = "SimpleLimb",
  SimpleEye = "SimpleEye",
  // Robot parts for GLTF testing
  BoxRobotBody = "BoxRobotBody",
  SphereRobotHead = "SphereRobotHead",
  CameraRobotEye = "CameraRobotEye",
  AntennaRobotAddon = "AntennaRobotAddon",
  HexagonalRobotLegBase = "HexagonalRobotLegBase",
  SideRobotLegTibia = "SideRobotLegTibia",
  SideRobotLegEnd = "SideRobotLegEnd",
  CrossRobotLegJoint = "CrossRobotLegJoint",
}

export default function ProgramEventDemo() {
  const [bridge, setBridge] = createSignal<WasmCanvasBridgeInterface | null>(
    null,
  );
  const [webGPUSupported, setWebGPUSupported] = createSignal(true); // Assume true

  onMount(() => {
    if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
      setWebGPUSupported(false);
      console.error("WebGPU Check Failed: Not supported in this browser.");
    } else {
      console.log("WebGPU Check Passed.");
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
  //     name: ProgramPartName.BoxRobotBody,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SphereRobotHead,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.CameraRobotEye,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.AntennaRobotAddon,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.HexagonalRobotLegBase,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SideRobotLegTibia,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.SideRobotLegEnd,
  //     params: [],
  //   },
  //   {
  //     name: ProgramPartName.CrossRobotLegJoint,
  //     params: [],
  //   },
  // ];

  // Legacy parts for testing (complete structure that was known to work)
  const parts = [
    {
      name: ProgramPartName.SimpleBody,
      params: [4, 5, 50, 40, 20, 85],
    },
    {
      name: ProgramPartName.SimpleEye,
      params: [],
    },
    {
      name: ProgramPartName.SimpleLimb,
      params: [2],
    },
    {
      name: ProgramPartName.Empty,
      params: [],
    },
    {
      name: ProgramPartName.Empty,
      params: [],
    },
  ];

  // Callback function for the wrapper to pass the bridge when ready
  const handleWasmReady = (b: WasmCanvasBridgeInterface) => {
    console.log("ProgramEventDemo WASM canvas is ready.");
    setBridge(b);

    // Initialize with the ProgramBuilder format the Rust code expects
    if (b.isReady()) {
      // Create a program builder object matching the Rust-side ProgramBuilder struct
      const programBuilder = {
        id: "new_program",
        palette: miniPalette,
        parts: parts,
      };

      // Use type assertion to bypass TypeScript error - this structure is correct for Rust
      const event: EventPayload = { ViewModel: programBuilder as any };
      console.log("Sending initial ViewModel to WASM:", event);
      b.queueEventForWasm(event);
    }
  };

  const handleShowNormals = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: "Normals" };
      console.log("Sending event to demo WASM:", event);
      b.queueEventForWasm(event);
    } else {
      console.warn("Demo WASM bridge not ready to send 'Normals' event.");
    }
  };

  const handleShowDefault = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: "Disabled" };
      console.log("Sending event to demo WASM:", event);
      b.queueEventForWasm(event);
    } else {
      console.warn("Demo WASM bridge not ready to send 'Disabled' event.");
    }
  };

  const handleShowSteps = () => {
    const b = bridge();
    if (b?.isReady()) {
      const event: EventPayload = { DebugRayMarch: "Steps" };
      console.log("Sending event to demo WASM:", event);
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
            Please use a recent version of Chrome, Edge, or enable flags in
            Firefox.
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
