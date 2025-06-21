# Client-Generated & Manipulated Data in MonsterDatabase.tsx

This document outlines data points displayed or utilized in `MonsterDatabase.tsx` that are not direct, 1:1 representations of distinct fields within a user's SUI wallet object (`monster.rawFields`). Instead, they are generated client-side, involve transformations, or are fallbacks for missing/malformed on-chain data.

The goal is to identify areas where the front-end makes assumptions or derives information that ideally should originate from or be explicitly defined by the backend/on-chain data for true ownership representation.

## I. Core Monster Statistics

These stats are entirely generated client-side based on the SUI Object ID.

- [ ] **Speed**:
  - **Description**: Numerical value for monster speed.
  - **Derivation**: Calculated using `parseInt(obj.data.objectId.slice(-2, -1), 16) % 5 + 1`.
  - **Issue**: Not read from a dedicated `speed` field in `monster.rawFields`.
- [ ] **Corruption**:
  - **Description**: Numerical value for monster corruption.
  - **Derivation**: Calculated using `parseInt(obj.data.objectId.slice(-3, -2), 16) % 80 + 10`.
  - **Issue**: Not read from a dedicated `corruption` field in `monster.rawFields`. Also visually influences a progress bar.
- [ ] **Max Health**:
  - **Description**: Numerical value for monster maximum health.
  - **Derivation**: Calculated using `parseInt(obj.data.objectId.slice(-4, -3), 16) % 50 + 50`.
  - **Issue**: Not read from a dedicated `maxHealth` field in `monster.rawFields`.
- [ ] **Health (Current)**:
  - **Description**: Initialized to Max Health.
  - **Derivation**: Set equal to the client-generated Max Health.
  - **Issue**: Not read from a dedicated `currentHealth` field in `monster.rawFields`.
- [ ] **Damage**:
  - **Description**: Numerical value for monster damage.
  - **Derivation**: Calculated using `parseInt(obj.data.objectId.slice(-5, -4), 16) % 25 + 5`.
  - **Issue**: Not read from a dedicated `damage` field in `monster.rawFields`.

## II. Monster Identity & Display Information

- [ ] **Monster Name (Fallback)**:
  - **Description**: Display name for the monster.
  - **Derivation**: Tries `obj.data.display?.data?.name`. If unavailable, falls back to a generated name like "Monster XXXXXX" (derived from SUI Object ID).
  - **Issue**: The primary SUI object `fields` may not store a canonical name. The `display` object is off-chain metadata.
- [ ] **Monster Type Suffix**:
  - **Description**: Displayed type, e.g., "{Protocol Name} / Digital".
  - **Derivation**: "{Protocol Name}" is from `monster.rawFields.protocol`. The " / Digital" suffix is a hardcoded client-side string.
  - **Issue**: The "Digital" classification is a client-side addition.
- [x] **Mint Date (Formatting)**:
  - **Description**: Formatted mint date.
  - **Derivation**: Attempts to use `obj.data.display?.data?.creation_date`. If it's a timestamp, it's formatted. If it's a string, it's parsed.
  - **Issue**: Relies on `display` object format. The formatting itself (`toLocaleDateString()`) is a client-side presentation choice.
- [ ] **Monster Attacks**:
  - **Description**: List of attacks (e.g., "Slash", "Bite").
  - **Derivation**: Hardcoded strings in the JSX of `MonsterDatabase.tsx`.
  - **Issue**: Attacks are not fetched from `monster.rawFields`.

## III. Data Transformations for UI (ViewModel)

This data is primarily for the `DEFAULT_MONSTER_DATA_PLACEHOLDER` and potentially other UI elements, separate from the direct WASM rendering pipeline.

- [ ] **`viewModel.palette` (RGB for UI)**:
  - **Description**: Palette used for UI elements, with RGB color values.
  - **Derivation**: `transformSuiPaletteToViewModelPalette` converts SUI HSV colors (from `monster.rawFields.palette`) to RGB. If SUI palette data is incomplete, default RGB values are substituted.
  - **Issue**: Color space conversion (HSV to RGB) and fallback to default RGB values if SUI data is incomplete.
- [ ] **`viewModel.addons` (Abstracted Parts for UI)**:
  - **Description**: Abstracted representation of monster parts for potential UI use.
  - **Derivation**: `transformSuiPartsToViewModelAddons` converts `monster.rawFields.parts` into a `ViewModelAddon[]` structure. This involves:
    - Mapping SUI part names (strings) to different addon keys (e.g., "lizard" -> "Lizard").
    - Generating generic names like "UnknownPartX" if SUI part names are `undefined` or unrecognized.
    - Deriving new addon parameters (e.g., `size`, `length`) using formulas on original SUI `part.params`.
  - **Issue**: Significant abstraction, re-interpretation of part names and parameters. Not a direct representation of `monster.rawFields.parts`.

## IV. Data for WASM Visual Rendering (Fallback Scenarios)

This section describes how the data sent to the WASM renderer (`programBuilder`) can deviate from direct SUI data if the SUI data is deemed unusable. The refactor aims to use SUI data if structurally valid.

- [ ] **WASM Parts (`programBuilder.parts`) - Algorithmic Fallback**:
  - **Description**: The array of parts (name and params) sent to WASM for rendering.
  - **Derivation**:
    1.  **Primary**: `transformRawPartsForWasm` attempts to use `monster.rawFields.parts`. It validates structure (name is string, params is array) and maps SUI part names to `ProgramPartName` enums. It **no longer alters numerical `params` values** (e.g., `[0]` or `[]` are passed as is).
    2.  **Fallback**: If `transformRawPartsForWasm` returns `null` (due to SUI parts being structurally invalid or missing), `partsToUse` for `programBuilder` is generated by `generatePartsFromId(monsterId)`.
  - **Issue**: If fallback occurs, the monster's visual part structure is entirely algorithmically determined by its ID, not its (unusable) on-chain part data. _Bloating or incorrect part sizes under this fallback are due to the generation formulas in `generatePartsFromId`._
- [ ] **WASM Palette (`programBuilder.palette`) - Algorithmic Fallback**:
  - **Description**: The color palette sent to WASM for rendering.
  - **Derivation**:
    1.  **Primary**: `transformSuiPaletteToWasmPalette` attempts to use `monster.rawFields.palette`. It validates that core colors (`primary`, `accent`, `highlight`) are present and valid. If so, it uses them and fills in _optional_ missing SUI colors (`neutral`, `background`) with defaults from `DEFAULT_MINI_PALETTE`.
    2.  **Fallback**: If `transformSuiPaletteToWasmPalette` returns `null` (SUI palette missing or core colors invalid), `paletteToUse` for `programBuilder` is generated by `generatePaletteFromId(monsterId)`.
  - **Issue**: If fallback occurs, the monster's visual color scheme is entirely algorithmically determined, not its (unusable/incomplete) on-chain palette. If primary SUI colors are used but optional ones are defaulted, it's a partial deviation.

## V. Notes on "Truthfulness" Post-Refactor

- The recent refactor makes the WASM data pipeline _more_ faithful: if SUI `parts` are structurally valid, their `params` (numbers) are now sent to WASM unaltered.
- If the WASM renderer crashes or renders parts oddly with these direct SUI params (e.g., `params: [0]` or very large numbers), it reflects an incompatibility between that specific on-chain data and the WASM renderer's current interpretation rules.
- Visual discrepancies (like "bloating") when SUI data _is_ used directly are now more clearly attributable to the combination of (potentially extreme) on-chain parameter values and how the WASM module consumes them.
- The algorithmic fallbacks for parts/palette generation (`generatePartsFromId`, `generatePaletteFromId`) are still significant deviations, triggered only when the corresponding SUI data is structurally unusable for WASM.

---

# Client-Generated & Manipulated Data in WalletApp.tsx

This section outlines data points displayed or utilized in `WalletApp.tsx` that involve client-side generation, formatting, or interpretation beyond a direct pass-through of wallet state or on-chain transaction data.

## I. Transaction Display & Interpretation

- [ ] **Transaction Summary (`getTransactionSummary`)**:
  - **Description**: A human-readable summary of a transaction's purpose (e.g., "Mint Monster", "Transfer X Object(s)").
  - **Derivation**: This function inspects the raw transaction data (`tx.transaction?.data?.transaction`). It uses client-side logic (if/else statements, checking for specific function names like "mint", "generate", module names, and transaction kinds like "ProgrammableTransaction") to generate a concise summary string.
  - **Issue**: This is a significant client-side interpretation layer. While based on on-chain data, the summary string itself is generated by front-end logic and heuristics. If the transaction structure is new or unrecognized by this logic, it defaults to generic summaries like "Programmable Tx" or "Unknown Kind". The accuracy of custom summaries like "Buy Encrypted Drive" depends on the client-side logic correctly identifying specific package/module/function patterns.
- [ ] **Transaction Timestamp Formatting (`formatTimestamp`)**:
  - **Description**: Displays the transaction timestamp in a human-readable, localized format.
  - **Derivation**: Takes `tx.timestampMs` (which is from the backend/SUI) and uses `new Date(parseInt(timestampMs)).toLocaleString(...)`.
  - **Issue**: The raw timestamp is from the backend, but the specific display format (e.g., "4/17/2024, 2:30:15 PM") is determined by client-side `toLocaleString()` and the user's locale settings. This is a presentation choice.
- [ ] **Explorer Link Generation (`getExplorerLink`)**:
  - **Description**: Provides a hyperlink to a blockchain explorer (Suiscan).
  - **Derivation**: Constructs the URL string using a base URL (`https://suiscan.xyz`) and appends the network and transaction digest. For `local` network, it generates a different, non-URL string.
  - **Issue**: The explorer URL and its structure are client-defined. The fallback for `local` network is a client-side display string, not a link.
- [ ] **Transaction Status (`tx.effects?.status?.status`)**:
  - **Description**: Displays "Success" or "Failure".
  - **Derivation**: Directly uses the `status` field from the transaction effects.
  - **Issue**: Generally representative, but the visual styling (colors) is client-side. The error message `tx.effects?.status?.error` is displayed as-is if present.

## II. Balance & General UI Display

- [ ] **Balance Formatting**:
  - **Description**: Displays coin balances with decimal points.
  - **Derivation**: Calculates `(parseInt(balance.balance) / Math.pow(10, balance.decimals)).toFixed(4)`.
  - **Issue**: `balance.balance` (total amount in smallest units) and `balance.decimals` come from the wallet state. The conversion to a decimal string and the `toFixed(4)` formatting are client-side presentation choices.
- [ ] **Address/Digest Truncation (`truncateAddress`)**:
  - **Description**: Shortens SUI addresses and transaction digests for display (e.g., "0x123...xyz").
  - **Derivation**: Client-side utility function that manipulates the string.
  - **Issue**: Presentation choice for brevity; the full data is available but not shown.
- [ ] **Network Name Formatting**:
  - **Description**: Displays the network name with the first letter capitalized (e.g., "Devnet").
  - **Derivation**: `state.network.charAt(0).toUpperCase() + state.network.slice(1)`.
  - **Issue**: Minor client-side string formatting for presentation.
- [ ] **Collection Labels & Counts**:
  - **Description**: Displays labels like "Encrypted Drives" and "Monsters" alongside counts from `state.collections`.
  - **Derivation**: Labels are hardcoded client-side strings. Counts (`state.collections.encryptedDrives`, `state.collections.decryptedMonsters`) are assumed to be derived by `WalletContext` based on fetched objects.
  - **Issue**: While the counts likely reflect objects the user owns (as determined by `WalletContext`), the grouping and labeling are client-defined.
- [ ] **Static UI Text & Messages**:
  - **Description**: Various informational messages like "No balances found.", "No recent transactions...", "No compatible wallets detected...", button labels ("Refresh All", "Disconnect", etc.).
  - **Derivation**: Hardcoded strings within the JSX.
  - **Issue**: These are entirely client-defined and not representative of any specific user data from the wallet, but rather UI state or general information.
- [ ] **Wallet Icons & Names (`state.availableWallets`)**:
  - **Description**: Displays icons and names of available Sui wallet extensions.
  - **Derivation**: Provided by the wallet standard interface implemented by the browser extensions (e.g., `window.suiWallets`).
  - **Issue**: This information is about the user's browser environment and available tools, not directly their on-chain assets or data. It's metadata for connection purposes.
