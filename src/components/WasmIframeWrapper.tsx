import { createSignal, onCleanup, onMount, Show, createMemo, createEffect } from 'solid-js';
import type { EventPayload } from '../api/game/events';
import type { WasmCanvasBridgeInterface } from './hooks/createWasmCanvas';

interface WasmIframeWrapperProps {
  wasmPath: string;
  jsPath: string;
  class?: string;
  style?: Record<string, string> | string;
  instanceId: string;
  requiredCanvasId?: string;
  onReady?: (bridge: WasmCanvasBridgeInterface) => void;
  onError?: (error: string) => void;
}

interface IframeMessage {
  type: 'IFRAME_READY' | 'WASM_ERROR' | 'WASM_EVENT';
  payload: {
    instanceId?: string;
    error?: string;
    event?: EventPayload;
  };
}

export default function WasmIframeWrapper(props: WasmIframeWrapperProps) {
  const [isIframeReady, setIsIframeReady] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let iframeRef: HTMLIFrameElement | undefined;
  let wasmEventHandlers: ((event: EventPayload) => void)[] = [];
  let messageListener: ((event: MessageEvent) => void) | null = null;

  createEffect(() => {
    console.log(`[Wrapper ${props.instanceId}] Component created/rendering.`);
  });

  // Build the iframe source URL with query parameters
  const iframeSrc = createMemo(() => {
    const params = new URLSearchParams();
    params.set('jsPath', props.jsPath);
    params.set('wasmPath', props.wasmPath);
    params.set('instanceId', props.instanceId);

    return `/wasm_host.html?${params.toString()}`;
  });

  // --- Communication Logic ---
  const sendMessageToIframe = (message: { type: string; payload?: unknown }) => {
    if (iframeRef?.contentWindow) {
      console.log(`[Wrapper ${props.instanceId}] Sending message to iframe:`, message);
      iframeRef.contentWindow.postMessage(message, '*');
    } else {
      console.warn(
        `[Wrapper ${props.instanceId}] Attempted to send message, but iframe contentWindow is not available.`,
      );
    }
  };

  onMount(() => {
    const instanceId = props.instanceId;
    const onReady = props.onReady;
    const onError = props.onError;
    console.log(`[Wrapper ${instanceId}] Mounted. Setting up message listener.`);

    messageListener = (event: MessageEvent) => {
      const message = event.data as IframeMessage;

      switch (message?.type) {
        case 'IFRAME_READY':
          if (message.payload?.instanceId === instanceId) {
            console.log(`[Wrapper ${instanceId}] Iframe reported ready.`);
            setError(null);
            setIsIframeReady(true);

            const bridge = createBridgeInterface();
            onReady?.(bridge);
          }
          break;
        case 'WASM_ERROR':
          if (message.payload?.instanceId === instanceId) {
            console.error(
              `[Wrapper ${instanceId}] Iframe reported WASM error:`,
              message.payload.error,
            );
            setError(message.payload.error || 'Unknown WASM error');
            setIsIframeReady(false); // No longer ready if error occurs
            onError?.(message.payload.error || 'Unknown WASM error');
          }
          break;
        case 'WASM_EVENT':
          if (message.payload?.instanceId === instanceId || !message.payload?.instanceId) {
            if (message.payload.event) {
              wasmEventHandlers.forEach((handler) => {
                try {
                  handler(message.payload.event!);
                } catch (e) {
                  console.error(`[Wrapper ${instanceId}] Error in WASM event handler:`, e);
                }
              });
            }
          }
          break;
      }
    };

    window.addEventListener('message', messageListener);
  });

  onCleanup(() => {
    const instanceId = props.instanceId;
    console.log(`[Wrapper ${instanceId}] Cleaning up.`);
    if (messageListener) {
      window.removeEventListener('message', messageListener);
      console.log(`[Wrapper ${instanceId}] Removed message listener.`);
    }
    wasmEventHandlers = [];
  });

  // --- Bridge Interface Implementation ---
  const createBridgeInterface = (): WasmCanvasBridgeInterface => ({
    queueEventForWasm: (event: EventPayload) => {
      sendMessageToIframe({ type: 'QUEUE_WASM_EVENT', payload: event });
    },
    onWasmEvent: (handler: (event: EventPayload) => void): (() => void) => {
      wasmEventHandlers.push(handler);
      return () => {
        wasmEventHandlers = wasmEventHandlers.filter((h) => h !== handler);
      };
    },
    clearJsEventQueue: () => {
      console.warn(`[Wrapper] clearJsEventQueue called, but queue is managed inside iframe.`);
    },
    getCurrentJsQueue: () => {
      console.warn(`[Wrapper] getCurrentJsQueue called, but queue is managed inside iframe.`);
      return [];
    },
    isReady: isIframeReady,
    error: error,
  });

  const showLoading = () => !isIframeReady() && !error();

  return (
    <div
      class={`relative w-full h-full ${props.class || ''}`}
      style={{
        ...(typeof props.style === 'object' ? props.style : {}),
      }}
    >
      <Show when={showLoading()}>
        <div class="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-600 z-10">
          Initializing WASM Environment...
        </div>
      </Show>
      <Show when={error() && !isIframeReady()}>
        <div class="absolute inset-0 flex flex-col items-center justify-center text-center bg-red-100 text-red-700 p-2 z-10">
          <p class="font-bold">Error:</p>
          <p class="text-sm">{error()}</p>
        </div>
      </Show>

      <iframe
        ref={iframeRef}
        src={iframeSrc()}
        style={{ border: 'none', display: 'block', width: '100%', height: '100%' }}
        sandbox="allow-scripts allow-same-origin"
        title={`WASM Instance ${props.instanceId}`}
      />
    </div>
  );
}
