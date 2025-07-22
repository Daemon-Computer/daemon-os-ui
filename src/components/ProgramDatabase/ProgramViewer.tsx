import { Show } from 'solid-js';
import WasmIframeWrapper from '../WasmIframeWrapper';
import { WASM_ENGINE_URL, WASM_BINDINGS_URL } from '../../api/constants';
import type { WasmCanvasBridgeInterface } from '../hooks/createWasmCanvas';

interface ProgramViewerProps {
  webGPUSupported: boolean;
  onViewerReady: (bridge: WasmCanvasBridgeInterface) => void;
}

export default function ProgramViewer(props: ProgramViewerProps) {
  return (
    <div class="m-2 min-w-0 overflow-hidden">
      <div class="flex flex-col h-full p-2 overflow-hidden">
        <div class="flex-1 flex mb-2 mr-[1px] overflow-hidden">
          <Show when={!props.webGPUSupported}>
            <div class="p-4 text-center text-red-500 border border-red-500 flex-1 flex items-center justify-center">
              <div>
                <p>WebGPU Not Supported</p>
                <p class="mt-2 text-sm">
                  Please use a recent version of Chrome, Edge, or enable flags in Firefox.
                </p>
              </div>
            </div>
          </Show>
          <Show when={props.webGPUSupported}>
            <WasmIframeWrapper
              instanceId="db-viewer-frame"
              jsPath={WASM_BINDINGS_URL}
              wasmPath={WASM_ENGINE_URL}
              onReady={props.onViewerReady}
            />
          </Show>
        </div>
        <div class="grid grid-cols-2 w-full">
          <img src="/icons/remi.avif" class="w-64 h-64" />
          <div class="flex justify-center items-center">
            <span class="text-3xl font-mono font-bold italic">{Math.random().toFixed(3)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
