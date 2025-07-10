import { WASM_ENGINE_URL, WASM_BINDINGS_URL } from '~/api/constants';

export interface AssetStatus {
  message: string;
  error?: boolean;
}

type StatusCallback = (status: AssetStatus) => void;

const CACHE_NAME = 'daemon-assets-v1';
const WASM_URL = WASM_ENGINE_URL;
const WASM_ETAG_STORAGE_KEY = 'wasm-monster_view_bg-etag';
const JS_BINDINGS_URL = WASM_BINDINGS_URL;
const JS_BINDINGS_ETAG_STORAGE_KEY = 'js-monster_view-etag';

interface AssetDefinition {
  url: string;
  name: string;
  type: 'wasm' | 'script' | 'image' | 'font' | 'html' | 'json' | 'gltf' | 'bin' | 'other';
}

// Define assets to preload
// Paths should be relative to the public folder or absolute URLs
const PUBLIC_ASSETS_TO_PRELOAD: AssetDefinition[] = [
  { url: WASM_BINDINGS_URL, name: 'WASM Bindings Script', type: 'script' },
  { url: '/preload-assets.js', name: 'Initial Asset Preloader', type: 'script' },
  { url: '/model-worker.js', name: 'Model Worker', type: 'script' },
  { url: '/wasm_host.html', name: 'WASM Host Page', type: 'html' },
  { url: '/favicon.ico', name: 'Favicon', type: 'image' },
  // Icons
  { url: '/icons/wallet.avif', name: 'Wallet Icon', type: 'image' },
  { url: '/icons/daemon-title.avif', name: 'DAEMON Logo', type: 'image' },
  { url: '/icons/decrypt.avif', name: 'Decrypt Icon', type: 'image' },
  { url: '/icons/remi.avif', name: 'Remi Icon', type: 'image' },
  { url: '/icons/store.avif', name: 'Store Icon', type: 'image' },
  { url: '/icons/viewer.avif', name: 'Program Viewer Icon', type: 'image' },
  // Fonts
  { url: '/assets/ms_sans_serif.woff2', name: 'MS Sans Serif Font', type: 'font' },
  { url: '/assets/ms_sans_serif_bold.woff2', name: 'MS Sans Serif Bold Font', type: 'font' },
  // Critical 3D models (preload-assets.js handles others, but we can ensure the main one is noted)
  { url: '/models/drive.gltf', name: 'Core Drive Model', type: 'gltf' },
];

async function preloadWasm(statusCallback: StatusCallback): Promise<void> {
  statusCallback({ message: 'Initializing engine check: monster_view_bg.wasm...' });
  let headResponse: Response | undefined;
  try {
    headResponse = await fetch(WASM_URL, { method: 'HEAD' });
    if (!headResponse.ok) {
      statusCallback({
        message: `Engine HEAD request failed: ${headResponse.statusText} (${headResponse.status}). Will try cache.`,
        error: true,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
    statusCallback({
      message: `Engine HEAD request network error: ${errorMessage}. Will try cache.`,
      error: true,
    });
  }

  const currentEtag =
    headResponse?.headers.get('ETag') || headResponse?.headers.get('Last-Modified');
  const cachedEtag = localStorage.getItem(WASM_ETAG_STORAGE_KEY);
  const cache = await caches.open(CACHE_NAME);

  if (headResponse?.ok && currentEtag && currentEtag === cachedEtag) {
    statusCallback({ message: 'Engine is up-to-date. Verifying cache...' });
    const cachedResponse = await cache.match(WASM_URL);
    if (cachedResponse) {
      statusCallback({ message: 'Engine verified from cache.' });
      return;
    }
    statusCallback({
      message: 'Engine cache miss despite ETag match. Re-fetching...',
      error: true,
    }); // Considered an error if ETag matched but not in cache
  } else if (headResponse?.ok) {
    statusCallback({
      message: cachedEtag
        ? 'Engine update detected. Fetching new version...'
        : 'Fetching engine for the first time...',
    });
  } else {
    statusCallback({ message: 'Engine check failed. Attempting to load from cache...' });
  }

  try {
    const getResponse = await fetch(WASM_URL);
    if (!getResponse.ok) {
      throw new Error(`Network request failed: ${getResponse.statusText} (${getResponse.status})`);
    }
    statusCallback({ message: 'Engine downloaded. Caching...' });
    await cache.put(WASM_URL, getResponse.clone());
    if (currentEtag && headResponse?.ok) {
      localStorage.setItem(WASM_ETAG_STORAGE_KEY, currentEtag);
    }
    statusCallback({ message: 'Engine successfully fetched and cached.' });
  } catch (fetchError) {
    const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
    statusCallback({
      message: `Engine fetch error: ${errorMessage}. Trying cache as fallback.`,
      error: true,
    });
    const cachedResponse = await cache.match(WASM_URL);
    if (cachedResponse) {
      statusCallback({ message: 'Engine loaded from cache (network fetch failed).' });
    } else {
      statusCallback({ message: 'CRITICAL: Engine fetch failed and not in cache.', error: true });
      throw new Error('Failed to load WASM from network and cache.'); // Re-throw critical error
    }
  }
}

async function preloadPublicAsset(
  asset: AssetDefinition,
  statusCallback: StatusCallback,
): Promise<void> {
  statusCallback({ message: `Initializing check for: ${asset.name}...` });

  if (asset.url === JS_BINDINGS_URL) {
    // Special ETag handling for monster_view.js
    let headResponse: Response | undefined;
    try {
      headResponse = await fetch(asset.url, { method: 'HEAD', cache: 'no-store' }); // Ensure fresh HEAD
      if (!headResponse.ok) {
        statusCallback({
          message: `HEAD request for ${asset.name} failed: ${headResponse.statusText} (${headResponse.status}). Will try cache.`,
          error: true,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      statusCallback({
        message: `HEAD request for ${asset.name} network error: ${errorMessage}. Will try cache.`,
        error: true,
      });
    }

    const currentEtag =
      headResponse?.headers.get('ETag') || headResponse?.headers.get('Last-Modified');
    const cachedEtag = localStorage.getItem(JS_BINDINGS_ETAG_STORAGE_KEY);
    const cache = await caches.open(CACHE_NAME);

    if (headResponse?.ok && currentEtag && currentEtag === cachedEtag) {
      statusCallback({ message: `${asset.name} is up-to-date. Verifying cache...` });
      const cachedResponse = await cache.match(asset.url);
      if (cachedResponse) {
        statusCallback({ message: `${asset.name} verified from cache.` });
        return;
      }
      statusCallback({
        message: `${asset.name} cache miss despite ETag match. Re-fetching...`,
        error: true,
      });
    } else if (headResponse?.ok) {
      statusCallback({
        message: cachedEtag
          ? `${asset.name} update detected. Fetching new version...`
          : `Fetching ${asset.name} for the first time...`,
      });
    } else {
      statusCallback({ message: `${asset.name} check failed. Attempting to load from cache...` });
    }

    try {
      const getResponse = await fetch(asset.url, { cache: 'no-store' }); // Ensure fresh GET
      if (!getResponse.ok) {
        throw new Error(
          `Network request failed: ${getResponse.statusText} (${getResponse.status})`,
        );
      }
      statusCallback({ message: `${asset.name} downloaded. Caching...` });
      await cache.put(asset.url, getResponse.clone());
      if (currentEtag && headResponse?.ok) {
        localStorage.setItem(JS_BINDINGS_ETAG_STORAGE_KEY, currentEtag);
      }
      statusCallback({ message: `${asset.name} successfully fetched and cached.` });
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      statusCallback({
        message: `${asset.name} fetch error: ${errorMessage}. Trying cache as fallback.`,
        error: true,
      });
      const cachedResponse = await cache.match(asset.url);
      if (cachedResponse) {
        statusCallback({ message: `${asset.name} loaded from cache (network fetch failed).` });
      } else {
        statusCallback({
          message: `CRITICAL: ${asset.name} fetch failed and not in cache.`,
          error: true,
        });
        throw new Error('Failed to load WASM from network and cache.'); // Re-throw critical error
      }
    }
  } else {
    // Standard cache-first strategy for other assets
    statusCallback({ message: `Fetching asset: ${asset.name}...` });
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(asset.url);

      if (cachedResponse) {
        statusCallback({ message: `${asset.name} loaded successfully from cache.` });
        return;
      }

      statusCallback({ message: `Fetching ${asset.name} from network...` });
      const response = await fetch(asset.url);
      if (!response.ok) {
        statusCallback({
          message: `Failed to fetch ${asset.name}: ${response.statusText} (${response.status})`,
          error: true,
        });
      } else {
        await cache.put(asset.url, response.clone());
        statusCallback({ message: `${asset.name} fetched and cached successfully.` });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      statusCallback({ message: `Error fetching ${asset.name}: ${errorMessage}`, error: true });
    }
  }
}

export async function preloadAllAssets(statusCallback: StatusCallback): Promise<void> {
  try {
    await preloadWasm(statusCallback);
  } catch (error) {
    // Error is already reported by preloadWasm and re-thrown if critical.
    // If it was critical, execution stops here. If not (e.g. loaded from cache after primary fetch fail), continue.
    const errorMessage = error instanceof Error ? error.message : 'Unknown WASM loading error';
    statusCallback({ message: `WASM loading ended with issues: ${errorMessage}`, error: true });
    if (errorMessage === 'Failed to load WASM from network and cache.') {
      throw error; // Re-throw the critical error to stop further asset loading
    }
  }

  statusCallback({ message: 'Fetching core application files...' });
  for (const asset of PUBLIC_ASSETS_TO_PRELOAD) {
    await preloadPublicAsset(asset, statusCallback);
  }
  statusCallback({ message: 'Asset preloading phase complete.' });
}
