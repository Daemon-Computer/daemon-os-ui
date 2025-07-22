// Sui Network Constants for Daemon Clean Project

// Package ID for the core Daemon logic (monsters, drives, etc.)
export const DAEMON_PACKAGE_ID = "0x46db1957d5c4107aa4df66f39db218903b74a0b1346bc1a2dee9a486896c6803";

// Object ID for the Program (Monster) Registry
export const PROGRAM_REGISTRY_OBJECT_ID = "0xb03522c67576ac48c54992fd4de6b69fc9f0e216069c67e925803e2737f20666";

// Object ID for the Program (Monster) Minter
export const PROGRAM_MINTER_OBJECT_ID = "0xecabd38465adf2e0a9379bec520200feeb14a159a01ee5b7885790a74fe6ddc3";

// Object ID for the Distribution Table (used in minting)
export const DISTRIBUTION_TABLE_OBJECT_ID = "0x8c74a0c8b828ef4c37909cee2c8c2e1275501cc9591776947a92d470fbb84d96";

// Object ID for the Encrypted Drive Minter
export const DRIVE_MINTER_OBJECT_ID = "0x47a194a52f050829863fdfb3114bd93cfbd2ec11a1a995453aff6b8ef9564abf";

// Derived constant for program type string, often used in filters
export const PROGRAM_TYPE_STRING = `${DAEMON_PACKAGE_ID}::monster::Monster`;

// WASM Configuration
export const WASM_ENGINE_URL = import.meta.env.VITE_WASM_ENGINE_URL;
export const WASM_BINDINGS_URL = import.meta.env.VITE_WASM_BINDINGS_URL; 