// This script preloads 3D model assets before the Bevy WASM module tries to load them
// console.log('Preloading 3D model assets...');

async function preloadAssets() {
  try {
    // Preload the GLTF file
    const gltfResponse = await fetch("/models/drive.gltf");
    if (!gltfResponse.ok) {
      throw new Error(`Failed to preload GLTF: ${gltfResponse.status}`);
    }
    const gltfText = await gltfResponse.text();
    // console.log('Successfully preloaded GLTF model');

    // Also preload the binary file
    const binResponse = await fetch("/models/drive.bin");
    if (!binResponse.ok) {
      throw new Error(`Failed to preload binary: ${binResponse.status}`);
    }
    await binResponse.arrayBuffer();
    // console.log('Successfully preloaded binary data');

    // Store in sessionStorage to indicate successful preload
    sessionStorage.setItem("modelPreloaded", "true");
    sessionStorage.setItem("gltfData", gltfText);

    // console.log('Asset preloading complete');
  } catch (error) {
    console.error("Error preloading assets:", error);
  }
}

// Run the preload function
preloadAssets();
