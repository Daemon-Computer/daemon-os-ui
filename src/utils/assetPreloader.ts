import { WASM_ENGINE_URL, WASM_BINDINGS_URL } from '../api/constants';

export interface AssetStatus {
  message: string;
  error?: boolean;
}

type StatusCallback = (status: AssetStatus) => void;

const CACHE_NAME = 'daemon-assets-v2';

interface AssetDefinition {
  url: string;
  name: string;
}

// Define assets to preload
const ASSETS_TO_PRELOAD: AssetDefinition[] = [
  // Critical WASM files (remote from R2 bucket)
  { url: WASM_ENGINE_URL, name: 'WASM Engine' },
  { url: WASM_BINDINGS_URL, name: 'WASM Bindings' },
  { url: 'https://engine.daemon.computer/dev/game_api.js', name: 'Game API' },
  
  // Local application files
  { url: '/preload-assets.js', name: 'Asset Preloader' },
  { url: '/model-worker.js', name: 'Model Worker' },
  { url: '/wasm_host.html', name: 'WASM Host Page' },
  { url: '/favicon.ico', name: 'Favicon' },
  
  // Icons
  { url: '/icons/wallet.avif', name: 'Wallet Icon' },
  { url: '/icons/daemon-title.avif', name: 'DAEMON Logo' },
  { url: '/icons/decrypt.avif', name: 'Decrypt Icon' },
  { url: '/icons/remi.avif', name: 'Remi Icon' },
  { url: '/icons/store.avif', name: 'Store Icon' },
  { url: '/icons/viewer.avif', name: 'Program Viewer Icon' },
  
  // Fonts
  { url: '/assets/ms_sans_serif.woff2', name: 'MS Sans Serif Font' },
  { url: '/assets/ms_sans_serif_bold.woff2', name: 'MS Sans Serif Bold Font' },
  
  // 3D Models
  { url: '/assets/models/drive.gltf', name: 'Core Drive Model' },
  { url: '/assets/models/drive.bin', name: 'Core Drive Binary' },
];

async function validateAsset(asset: AssetDefinition, cache: Cache): Promise<{ status: string; cached: boolean }> {
  try {
    // Check if we have a cached version and its ETag
    const cachedResponse = await cache.match(asset.url);
    const cachedETag = cachedResponse?.headers.get('ETag');
    
    // Build headers for conditional request
    const headers: Record<string, string> = {};
    if (cachedETag) {
      headers['If-None-Match'] = cachedETag;
    }
    
    // Make conditional GET request
    const response = await fetch(asset.url, { headers });
    
    if (response.status === 304) {
      // File unchanged, use cached version
      return { status: 'unchanged', cached: true };
    } else if (response.ok) {
      // File changed or first fetch, cache new version
      await cache.put(asset.url, response.clone());
      return { status: 'updated', cached: false };
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (networkError) {
    // Network error - try to use cached version as fallback
    const cachedResponse = await cache.match(asset.url);
    if (cachedResponse) {
      return { status: 'error-cached', cached: true };
    }
    // No cached version available, re-throw error
    throw networkError;
  }
}

export async function preloadAllAssets(statusCallback: StatusCallback): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  
  for (const asset of ASSETS_TO_PRELOAD) {
    statusCallback({ message: `Checking ${asset.name}...` });
    
    try {
      const result = await validateAsset(asset, cache);
      
      const statusMessages = {
        'unchanged': 'up-to-date (cached)',
        'updated': 'downloaded and cached',
        'error-cached': 'using cached version (network error)'
      };
      
      statusCallback({ 
        message: `${asset.name}: ${statusMessages[result.status as keyof typeof statusMessages]}`,
        error: result.status === 'error-cached'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      statusCallback({
        message: `${asset.name}: failed to load - ${errorMessage}`,
        error: true
      });
      
      // For critical WASM files, stop the entire process
      if (asset.url === WASM_ENGINE_URL || asset.url === WASM_BINDINGS_URL) {
        statusCallback({ 
          message: `CRITICAL: ${asset.name} is required but failed to load and not cached.`, 
          error: true 
        });
        throw new Error(`Critical asset ${asset.name} failed to load`);
      }
    }
  }
  
  statusCallback({ message: 'Asset preloading complete' });
}