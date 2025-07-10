import { createSignal, onMount, Show } from 'solid-js';

// WebGPU type definitions
declare global {
  interface Navigator {
    gpu?: GPU;
  }

  interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
  }

  interface GPUAdapter {
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    info?: GPUAdapterInfo;
  }

  interface GPUAdapterInfo {
    vendor?: string;
    architecture?: string;
    device?: string;
    description?: string;
  }

  interface GPUDevice {
    // Basic device interface - can be extended as needed
  }

  interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
  }

  interface GPUDeviceDescriptor {
    label?: string;
    requiredFeatures?: GPUFeatureName[];
    requiredLimits?: Record<string, number>;
  }

  type GPUFeatureName = string;
}

interface WGPUSupport {
  isSupported: boolean;
  adapter: GPUAdapter | null;
  device: GPUDevice | null;
}

export default function WGPUNotificationApp() {
  const [wgpuSupport, setWgpuSupport] = createSignal<WGPUSupport>({
    isSupported: false,
    adapter: null,
    device: null,
  });
  const [isChecking, setIsChecking] = createSignal(true);

  onMount(async () => {
    await checkWGPUSupport();
  });

  async function checkWGPUSupport() {
    try {
      if (!navigator.gpu) {
        setWgpuSupport({
          isSupported: false,
          adapter: null,
          device: null,
        });
        setIsChecking(false);
        return;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        setWgpuSupport({
          isSupported: false,
          adapter: null,
          device: null,
        });
        setIsChecking(false);
        return;
      }

      const device = await adapter.requestDevice();
      setWgpuSupport({
        isSupported: true,
        adapter,
        device,
      });
    } catch (error) {
      console.error('WGPU check failed:', error);
      setWgpuSupport({
        isSupported: false,
        adapter: null,
        device: null,
      });
    } finally {
      setIsChecking(false);
    }
  }

  function getAdapterInfo() {
    const adapter = wgpuSupport().adapter;
    if (!adapter?.info) return null;

    return {
      vendor: adapter.info.vendor || 'Unknown',
      architecture: adapter.info.architecture || 'Unknown',
      device: adapter.info.device || 'Unknown',
      description: adapter.info.description || 'Unknown',
    };
  }

  const adapterInfo = () => getAdapterInfo();

  return (
    <div class="flex flex-col h-full p-4">
      <div class="flex items-center mb-4">
        <div class="w-8 h-8 mr-3 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full text-purple-900">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <h2 class="text-lg font-bold text-black">WebGPU Support Check</h2>
      </div>

      <div class="flex-1 overflow-auto">
        <Show
          when={isChecking()}
          fallback={
            <div class="space-y-4">
              <div
                class={`p-4 rounded border-2 ${
                  wgpuSupport().isSupported
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}
              >
                <div class="flex items-center mb-2">
                  <Show
                    when={wgpuSupport().isSupported}
                    fallback={
                      <svg
                        class="w-5 h-5 text-red-600 mr-2"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    }
                  >
                    <svg
                      class="w-5 h-5 text-green-600 mr-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </Show>
                  <h3
                    class={`font-semibold ${
                      wgpuSupport().isSupported ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {wgpuSupport().isSupported ? 'WebGPU Supported!' : 'WebGPU Not Supported'}
                  </h3>
                </div>

                <Show
                  when={wgpuSupport().isSupported}
                  fallback={
                    <div class="text-sm text-red-700">
                      <p class="mb-2">
                        Your browser does not support WebGPU, which is required for the 3D
                        experience.
                      </p>
                      <p class="mb-2">
                        <strong>To enable WebGPU support:</strong>
                      </p>
                      <ul class="list-disc list-inside space-y-1 ml-2">
                        <li>Use Chrome 113+ or Edge 113+</li>
                        <li>Enable WebGPU in chrome://flags/#enable-unsafe-webgpu</li>
                        <li>Restart your browser</li>
                        <li>Ensure you have a compatible GPU and drivers</li>
                      </ul>
                    </div>
                  }
                >
                  <div class="text-sm text-green-700">
                    <p class="mb-2">
                      Your browser supports WebGPU! The 3D experience will work correctly.
                    </p>
                    <Show when={adapterInfo()}>
                      <div class="bg-white p-2 rounded border mt-2">
                        <p class="font-semibold mb-1">GPU Information:</p>
                        <p>
                          <strong>Vendor:</strong> {adapterInfo()!.vendor}
                        </p>
                        <p>
                          <strong>Device:</strong> {adapterInfo()!.device}
                        </p>
                        <p>
                          <strong>Architecture:</strong> {adapterInfo()!.architecture}
                        </p>
                      </div>
                    </Show>
                  </div>
                </Show>
              </div>

              <div class="p-4 bg-blue-50 border-2 border-blue-300 rounded">
                <h4 class="font-semibold text-blue-800 mb-2">About This Application</h4>
                <p class="text-sm text-blue-700">
                  This application uses WebGPU for high-performance 3D graphics and compute
                  operations. WebGPU provides direct access to modern GPU capabilities, enabling
                  smooth 3D rendering and advanced visual effects.
                </p>
              </div>

              <div class="p-4 bg-gray-50 border-2 border-gray-300 rounded">
                <h4 class="font-semibold text-gray-800 mb-2">Need Help?</h4>
                <p class="text-sm text-gray-700">
                  If you're having trouble with WebGPU support, make sure your graphics drivers are
                  up to date and you're using a supported browser. Some corporate networks or
                  security software may also block WebGPU access.
                </p>
              </div>
            </div>
          }
        >
          <div class="flex items-center justify-center h-32">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p class="text-sm text-gray-600">Checking WebGPU support...</p>
            </div>
          </div>
        </Show>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-400">
        <p class="text-xs text-gray-600 text-center">
          Close this window to continue to the wallet application
        </p>
      </div>
    </div>
  );
}
