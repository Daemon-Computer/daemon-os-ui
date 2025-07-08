// src/hooks/createWasmCanvas.ts
import type { Accessor} from 'solid-js';
import { createSignal, onCleanup, createEffect, createMemo } from 'solid-js';
import { GameBridge } from '../../api/game/gameBridge'; // Adjust path as needed
import type { EventPayload } from '../../api/game/events'; // Adjust path as needed

// --- Interfaces ---
export interface WasmCanvasBridgeInterface {
    queueEventForWasm: (event: EventPayload) => void;
    onWasmEvent: (handler: (event: EventPayload) => void) => () => void; // Returns unsubscribe function
    clearJsEventQueue: () => void;
    getCurrentJsQueue: () => EventPayload[];
    isReady: Accessor<boolean>;
    error: Accessor<string | null>;
}

export interface CreateWasmCanvasOptions {
    wasmPath: Accessor<string>; // Use accessors for reactivity
    jsPath: Accessor<string>;
    requiredCanvasId?: string; // Default to 'monster-view-canvas'
    instanceId?: string; // For debugging
    enabled?: Accessor<boolean>; // Control if the hook should run (default true)
}

// --- Unique ID Generation ---
let instanceCounter = 0;
function generateUniqueId(prefix = 'wasm-instance'): string {
    // Simple unique ID generator
    return prefix + '-' + Date.now() + '-' + instanceCounter++;
}

// --- Global State Management for WASM Interaction ---
declare global {
    interface Window {
        // Registry for script injection promises
        _wasmInitPromises?: Record<string, { resolve: (value: any) => void; reject: (reason?: any) => void; }>;
        // Registry for instance-specific bridge functions (needed for init's wasmImports)
        _wasmBridgeFuncs?: Record<string, { poll: () => EventPayload | 'Empty'; receive: (event: EventPayload) => void; }>;
        // Pointers to the *currently targeted* bridge functions for the global event handlers
        _currentWasmEventPoller?: () => EventPayload | 'Empty';
        _currentWebEventReceiver?: (event: EventPayload) => void;
        // Actual global functions exposed to WASM
        wasm_event?: () => EventPayload | 'Empty';
        web_event?: (event: EventPayload) => void;
    }
}

// Define actual global functions ONCE, these delegate to the _current pointers
function setupGlobalEventDelegates() {
    console.log("Running setupGlobalEventDelegates...");
    // Ensure registries are initialized FIRST
    window._wasmInitPromises = window._wasmInitPromises || {};
    window._wasmBridgeFuncs = window._wasmBridgeFuncs || {};
    console.log("Global registries ensured.");

    // Define global functions if they don't exist
    if (typeof window.wasm_event === 'undefined') {
        window.wasm_event = () => {
            const poller = window._currentWasmEventPoller; // Get ref
            console.log(`[Global window.wasm_event] Called. Current poller is ${typeof poller === 'function' ? 'set' : 'NOT SET'}.`); // Added log
            if (typeof poller === 'function') {
                try {
                    return poller();
                } catch (e) {
                    console.error("[Global window.wasm_event] Error during poller execution:", e);
                    return 'Empty'; // Return safe value on error
                }
            }
            console.warn("Global window.wasm_event called, but no current poller is set."); // Keep this warning too
            return 'Empty'; // Safe default
        };
        console.log("Global window.wasm_event defined.");
    }
    if (typeof window.web_event === 'undefined') {
        window.web_event = (event: EventPayload) => {
            const receiver = window._currentWebEventReceiver; // Get ref
            console.log(`[Global window.web_event] Called with event: ${JSON.stringify(event)}. Current receiver is ${typeof receiver === 'function' ? 'set' : 'NOT SET'}.`); // Added log
            if (typeof receiver === 'function') {
                try {
                    receiver(event);
                } catch (e) {
                    console.error("[Global window.web_event] Error during receiver execution:", e);
                }
                return;
            }
            console.warn("Global window.web_event called, but no current receiver is set."); // Keep this warning too
        };
        console.log("Global window.web_event defined.");
    }
}

// Call setup immediately when this module loads
setupGlobalEventDelegates();
// --- End Global State Management ---


// --- Script Injection Helper ---
function loadWasmViaScript(jsPath: string, wasmPath: string, instanceId: string): Promise<any> {
    // This function injects a script to load and initialize the WASM module.
    // It uses global registries (_wasmInitPromises, _wasmBridgeFuncs) for communication.
    return new Promise((resolve, reject) => {
        // --- REMOVED Double-init check here - Now handled by caller ('initialize' function) ---

        // Ensure registry exists before setting promise
        window._wasmInitPromises = window._wasmInitPromises || {};
        // Store the promise's resolve/reject functions in the global registry for this instanceId
        window._wasmInitPromises[instanceId] = { resolve, reject };

        const script = document.createElement('script');
        script.type = 'module';
        script.id = 'script-' + instanceId; // Unique ID for the script tag

        // Generate the content for the injected script
        // Using string concatenation for logs to avoid potential template literal issues
        script.textContent = `
            import init from '${jsPath}'; // Assuming default export from WASM glue code

            (async () => {
                const instanceId = '${instanceId}';
                const wasmPath = '${wasmPath}';
                const promiseRegistry = window._wasmInitPromises;
                const bridgeFuncs = window._wasmBridgeFuncs;

                console.log('[Injected Script ' + instanceId + '] Running async IIFE...');

                // Validate that necessary registry entries exist before proceeding
                if (!promiseRegistry?.[instanceId] || !bridgeFuncs?.[instanceId]) {
                    const errorMsg = '[Injected Script ' + instanceId + '] Registry setup incomplete!';
                    console.error(errorMsg);
                    // Add extra check for promise existence before rejecting
                    if(promiseRegistry?.[instanceId]) {
                        promiseRegistry[instanceId].reject(new Error(errorMsg)); // Attempt rejection
                    }
                    return; // Exit IIFE
                }

                // Prepare the import object for WASM initialization
                // This uses the instance-specific functions stored in _wasmBridgeFuncs
                const wasmImports = {
                    './game_api.js': { // Check this internal path matches WASM expectations
                        wasm_event: () => bridgeFuncs[instanceId].poll(),
                        web_event: (event) => bridgeFuncs[instanceId].receive(event)
                    }
                };

                console.log('[Injected Script ' + instanceId + '] Calling init(). Path: ' + wasmPath);
                let instance = null; // To hold the result of init if successful
                try {
                    // Call the actual WASM initialization function
                    instance = await init(wasmPath, wasmImports);
                    console.log('[Injected Script ' + instanceId + '] Init call completed.');
                    // Resolve the external promise with the WASM instance (or whatever init returns)
                    promiseRegistry[instanceId].resolve(instance);

                } catch (error) {
                    // Handle errors during WASM initialization
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    // Check specifically for the known "control flow" exception from Bevy/wasm-bindgen
                    const isControlFlowException = errorMessage.includes("Using exceptions for control flow"); // More robust check

                    if (isControlFlowException) {
                        // Treat this specific exception as a success condition for readiness
                        console.warn('[Injected Script ' + instanceId + '] Caught known control flow exception during init. Treating as success.');
                        // Resolve the promise, passing the instance if available (it might be null/undefined)
                        promiseRegistry[instanceId].resolve(instance);
                    } else {
                        // Handle all other, actual errors
                        console.error('[Injected Script ' + instanceId + '] Init failed:');
                        console.error(error); // Log the full error object
                        // Reject the external promise with the actual error
                        promiseRegistry[instanceId].reject(error);
                    }
                }
            })(); // Immediately invoke the async function
        `;

        // Handle errors loading the script itself (e.g., network error, 404)
        script.onerror = (event) => {
            const errorMsg = 'Script load error for ' + jsPath;
            console.error('[' + instanceId + '] ' + errorMsg + ':', event);
            // Reject the associated promise if the script fails to load
            if (window._wasmInitPromises?.[instanceId]) {
                window._wasmInitPromises[instanceId].reject(new Error(errorMsg));
                delete window._wasmInitPromises[instanceId]; // Clean up promise entry
            }
            // Clean up the corresponding bridge function entry as well
            if (window._wasmBridgeFuncs?.[instanceId]) {
                delete window._wasmBridgeFuncs[instanceId];
            }
            script.remove(); // Remove the failed script tag from the DOM
        };

        // Append the script to the body to execute it
        try {
            document.body.appendChild(script);
            console.log('[' + instanceId + '] Appended script tag #' + script.id + '.');
        } catch (e) {
            // Catch potential synchronous errors during appendChild (e.g., previous syntax errors)
            console.error('[' + instanceId + '] Error appending script tag:', e);
            // Reject the promise if appendChild fails
            reject(e);
            // Clean up registries as append failed
            if (window._wasmInitPromises?.[instanceId]) delete window._wasmInitPromises[instanceId];
            if (window._wasmBridgeFuncs?.[instanceId]) delete window._wasmBridgeFuncs[instanceId];
        }
    });
}
// --- End Script Injection Helper ---


// --- createWasmCanvas Hook Implementation ---
export function createWasmCanvas(options: CreateWasmCanvasOptions): [
    ref: (el: HTMLCanvasElement | null) => void, // Allow null for ref detachment
    bridgeInterface: Accessor<WasmCanvasBridgeInterface | null>
] {
    // Destructure options with defaults
    const {
        wasmPath,
        jsPath,
        requiredCanvasId = 'monster-view-canvas',
        instanceId: providedInstanceId,
        enabled = () => true, // Hook is enabled by default
    } = options;

    // --- State Signals ---
    const [error, setError] = createSignal<string | null>(null);
    const [isReady, setIsReady] = createSignal(false);
    const [canvasElement, setCanvasElement] = createSignal<HTMLCanvasElement | null>(null);
    const [bridge, setBridge] = createSignal<GameBridge | null>(null);
    const [wasmModule, setWasmModule] = createSignal<any>(null); // Stores resolved value from init (can be null)
    const uniqueId = providedInstanceId || generateUniqueId();
    const internalCanvasId = 'canvas-' + uniqueId; // Stable internal ID

    let visibilityUnsubscribers: (() => void)[] = []; // For cleanup

    console.log('[' + uniqueId + '] Hook created.');

    // --- Canvas Ref Callback ---
    // This function is passed to the `ref` prop of the canvas element
    const canvasRef = (el: HTMLCanvasElement | null) => {
        if (el && el !== canvasElement()) { // Update only if the element is new/different
            el.id = internalCanvasId; // Set the stable unique ID
            console.log('[' + uniqueId + '] Canvas element obtained:', el);
            setCanvasElement(el);
        } else if (!el && canvasElement()) { // Handle detachment
            console.log('[' + uniqueId + '] Canvas element removed.');
            setCanvasElement(null);
        }
    };

    // --- Visibility Handling ---
    // Sets up IntersectionObserver and Page Visibility listeners
    function setupVisibilityHandling(canvas: HTMLCanvasElement, wasmInstance: any) {
        // Clean up any previous listeners first
        visibilityUnsubscribers.forEach(unsub => unsub());
        visibilityUnsubscribers = [];
        if (!canvas) return; // Don't proceed if canvas is null

        // Intersection Observer: Detects if canvas is in viewport
        const observer = new IntersectionObserver(([entry]) => {
            console.log('[' + uniqueId + '] Canvas intersection: ' + entry.isIntersecting);
            // Ideal place to call pause/resume on wasmInstance if available
            // e.g., if (entry.isIntersecting) wasmInstance?.resume?.(); else wasmInstance?.pause?.();
        }, { threshold: 0.1 }); // Trigger when 10% is visible
        observer.observe(canvas);
        visibilityUnsubscribers.push(() => observer.disconnect()); // Add cleanup function

        // Page Visibility API: Detects if the tab/window is hidden
        const handleVisibilityChange = () => {
            console.log('[' + uniqueId + '] Page visibility: ' + (document.hidden ? 'hidden' : 'visible'));
            // Ideal place to call pause/resume on wasmInstance if available
            // e.g., if (document.hidden) wasmInstance?.pause?.(); else wasmInstance?.resume?.();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        visibilityUnsubscribers.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange)); // Add cleanup

        console.log('[' + uniqueId + '] Visibility handling setup.');
    }

    // --- Initialization Function ---
    // Orchestrates the WASM loading and setup process
    async function initialize(canvas: HTMLCanvasElement, bridgeInstance: GameBridge) {
        console.log('[' + uniqueId + '] Initialize START.');
        // Get reactive values for paths
        const _jsPath = jsPath();
        const _wasmPath = wasmPath();
        // Basic validation
        if (!_jsPath || !_wasmPath) {
            setError("WASM JS or WASM file path is missing.");
            console.error('[' + uniqueId + '] Missing WASM paths.');
            return; // Exit initialization early
        }

        // --- Force cleanup of potentially old entries for this ID ---
        // This prevents errors if the component re-mounts quickly (e.g., HMR)
        // before the previous instance's cleanup fully finished processing async tasks.
        console.log('[' + uniqueId + '] Force cleanup of any existing registry entries/script...');
        // Remove existing script tag if present
        document.getElementById('script-' + uniqueId)?.remove();
        // Reject and delete any existing promise associated with this ID
        if (window._wasmInitPromises?.[uniqueId]) {
            try { window._wasmInitPromises[uniqueId].reject(new Error('New initialization started for ' + uniqueId)); } catch (e) {/*ignore rejection error*/ }
            delete window._wasmInitPromises[uniqueId];
        }
        // Get a reference to the potentially existing poller before deleting bridge funcs
        const potentiallyExistingPoller = window._wasmBridgeFuncs?.[uniqueId]?.poll;
        // Delete any existing bridge functions entry
        if (window._wasmBridgeFuncs?.[uniqueId]) {
            delete window._wasmBridgeFuncs[uniqueId];
        }
        // If globals were pointing to the functions we just deleted, clear them
        if (window._currentWasmEventPoller === potentiallyExistingPoller) {
            console.warn('[' + uniqueId + '] Clearing stale global pointers before re-init.');
            window._currentWasmEventPoller = undefined;
            window._currentWebEventReceiver = undefined;
        }
        // --- End Force Cleanup ---


        // --- ID Juggling: Set the required ID temporarily ---
        console.log('[' + uniqueId + '] Setting canvas ID to: ' + requiredCanvasId);
        canvas.id = requiredCanvasId; // WASM needs this ID during initialization

        // Ensure registries exist (redundant after setupGlobal, but safe)
        window._wasmBridgeFuncs = window._wasmBridgeFuncs || {};
        window._wasmInitPromises = window._wasmInitPromises || {}; // Needed for loadWasm helper

        // Store instance-specific functions in the registry
        window._wasmBridgeFuncs[uniqueId] = {
            poll: bridgeInstance.pollJsEvent.bind(bridgeInstance),
            receive: bridgeInstance.receiveWasmEvent.bind(bridgeInstance),
        };
        console.log('[' + uniqueId + '] Stored instance funcs in _wasmBridgeFuncs.');

        // --- Set this instance as the target for GLOBAL event functions ---
        // Safety check logs (mostly for debugging, should exist due to setupGlobalEventDelegates)
        if (typeof window._currentWasmEventPoller !== 'undefined') { console.warn('[' + uniqueId + '] _currentWasmEventPoller was already defined! Overwriting.'); }
        if (typeof window._currentWebEventReceiver !== 'undefined') { console.warn('[' + uniqueId + '] _currentWebEventReceiver was already defined! Overwriting.'); }
        // Point the global delegates to this new instance's bridge functions
        window._currentWasmEventPoller = window._wasmBridgeFuncs[uniqueId].poll;
        window._currentWebEventReceiver = window._wasmBridgeFuncs[uniqueId].receive;
        console.log('[' + uniqueId + '] Global target pointers set to this instance.');

        // --- Execute Script Injection and Handle Result ---
        try {
            console.log('[' + uniqueId + '] Executing loadWasmViaScript...');
            // Call the helper function and wait for its promise
            const instance = await loadWasmViaScript(_jsPath, _wasmPath, uniqueId);
            console.log('[' + uniqueId + '] loadWasmViaScript resolved. Instance:', instance);
            // Store the returned instance (could be null if init threw control flow exception)
            setWasmModule(instance);

            // --- ID Juggling: Revert ID after successful-ish init ---
            console.log('[' + uniqueId + '] Reverting canvas ID to: ' + internalCanvasId);
            canvas.id = internalCanvasId;

            // --- Set Ready State ---
            console.log('[' + uniqueId + '] Setting isReady = true.');
            setError(null); // Clear any previous error on success
            setIsReady(true);
            // Setup visibility listeners now that WASM is ready
            setupVisibilityHandling(canvas, instance);

        } catch (err: any) {
            // Handle errors rejected by loadWasmViaScript promise (e.g., actual init errors, script load errors)
            console.error('[' + uniqueId + '] Initialize CATCH block triggered:');
            console.error(err); // Log the actual error
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError('Initialization failed: ' + errorMsg);
            setIsReady(false); // Ensure ready state is false
            setWasmModule(null); // Clear wasm module state

            // --- Cleanup on Error ---
            // Clear global target *only* if it was pointing to this failed instance
            // Use optional chaining for safety in case registry was cleared somehow
            const pollerForThisInstance = window._wasmBridgeFuncs?.[uniqueId]?.poll;
            if (window._currentWasmEventPoller === pollerForThisInstance) {
                console.warn('[' + uniqueId + '] Clearing global target due to error.');
                window._currentWasmEventPoller = undefined;
                window._currentWebEventReceiver = undefined;
            }
            // Clean up registries for this instance using optional chaining
            if (window._wasmInitPromises?.[uniqueId]) delete window._wasmInitPromises[uniqueId];
            if (window._wasmBridgeFuncs?.[uniqueId]) delete window._wasmBridgeFuncs[uniqueId];

            // Revert canvas ID if initialization failed mid-way
            if (canvas && canvas.id === requiredCanvasId) {
                console.log('[' + uniqueId + '] Reverting canvas ID on error: ' + internalCanvasId);
                canvas.id = internalCanvasId;
            }
        } finally {
            // This block runs regardless of success or failure of the try block
            console.log('[' + uniqueId + '] Initialize FINALLY block. Ready=' + isReady() + ', Error=' + error());
        }
    }

    // --- Effect to Trigger Initialization ---
    // This effect runs when the component mounts and whenever its dependencies change.
    // It checks if conditions are right to start the initialization process.
    createEffect(() => {
        const canvas = canvasElement(); // Depend on canvas element signal
        const shouldRun = enabled();   // Depend on enabled prop accessor
        const currentBridge = bridge(); // Depend on bridge signal
        const currentError = error();   // Depend on error signal
        const currentReady = isReady(); // Depend on ready signal

        // Conditions: canvas exists, hook is enabled, not already ready, no error, bridge not yet created
        const needsInit = canvas && shouldRun && !currentReady && !currentError && !currentBridge;

        // Optional: Log the check status for debugging
        // console.log(`[${uniqueId}] Init Effect Check: needsInit=${needsInit} (canvas=${!!canvas}, enabled=${shouldRun}, isReady=${currentReady}, error=${!!currentError}, bridge=${!!currentBridge})`);

        if (needsInit) {
            console.log('[' + uniqueId + '] Initialization conditions met.');
            // Create a new GameBridge instance for this WASM canvas
            const newBridge = new GameBridge();
            setBridge(newBridge); // Store the bridge instance in state
            // Call the main initialization logic
            initialize(canvas, newBridge);
        }
    });

    // --- Cleanup Logic ---
    // This runs when the component using the hook unmounts
    onCleanup(() => {
        console.log('[' + uniqueId + '] Cleanup START.');
        const currentBridgeRef = bridge(); // Get bridge reference before clearing signal

        // Clean up visibility observers and listeners
        visibilityUnsubscribers.forEach(unsub => unsub());
        visibilityUnsubscribers = [];

        // Ideal: Call WASM's own cleanup function if it exists
        const module = wasmModule();
        if (typeof module?.free === 'function') { // Check common names like 'free'
            console.log('[' + uniqueId + '] Calling WASM free function.');
            try { module.free(); } catch (e) { console.error('[' + uniqueId + '] Error calling WASM free():', e); }
        } else if (typeof module?.destroy === 'function') { // Check for 'destroy'
            console.log('[' + uniqueId + '] Calling WASM destroy function.');
            try { module.destroy(); } catch (e) { console.error('[' + uniqueId + '] Error calling WASM destroy():', e); }
        }
        setWasmModule(null); // Clear the wasm module state

        // Clean up the associated GameBridge instance
        currentBridgeRef?.destroy(); // Call destroy method on the bridge if it exists
        setBridge(null); // Clear the bridge state

        // Remove the injected script tag from the DOM
        const scriptTag = document.getElementById('script-' + uniqueId);
        scriptTag?.remove();
        console.log('[' + uniqueId + '] Script tag removed: ' + !!scriptTag);

        // Clean up global registry entries for this instance
        if (window._wasmInitPromises?.[uniqueId]) {
            // Reject if pending, to avoid leaks if cleanup happens before init finishes
            try { window._wasmInitPromises[uniqueId].reject(new Error('WASM hook (' + uniqueId + ') cleaned up before init settled.')); } catch (e) {/* Ignore error if already settled */ }
            delete window._wasmInitPromises[uniqueId];
            console.log('[' + uniqueId + '] Removed from _wasmInitPromises.');
        }

        // Get reference to this instance's poller *before* deleting the registry entry
        const pollerForThisInstance = window._wasmBridgeFuncs?.[uniqueId]?.poll;
        // Delete the bridge functions entry
        if (window._wasmBridgeFuncs?.[uniqueId]) {
            delete window._wasmBridgeFuncs[uniqueId];
            console.log('[' + uniqueId + '] Removed from _wasmBridgeFuncs.');
        }

        // --- Clear global target *only* if it was pointing to this instance ---
        if (window._currentWasmEventPoller === pollerForThisInstance) {
            console.log('[' + uniqueId + '] Clearing global target during cleanup.');
            window._currentWasmEventPoller = undefined;
            window._currentWebEventReceiver = undefined;
        }

        // Final check to revert canvas ID if cleanup happens mid-initialization
        const canvas = canvasElement();
        if (canvas && canvas.id === requiredCanvasId) {
            console.log('[' + uniqueId + '] Reverting canvas ID during cleanup: ' + internalCanvasId);
            canvas.id = internalCanvasId;
        }
        setCanvasElement(null); // Clear canvas element state

        // Reset status signals
        setIsReady(false);
        setError(null); // Clear any lingering error state

        console.log('[' + uniqueId + '] Cleanup END.');
    });

    // --- Bridge Interface Memo ---
    // Creates a memoized accessor for the bridge interface object.
    // This ensures consumers only get the interface when the WASM is fully ready.
    const bridgeInterfaceMemo = createMemo((): WasmCanvasBridgeInterface | null => {
        const b = bridge();         // Depend on bridge signal
        const readyStatus = isReady(); // Depend on ready signal
        const errorStatus = error();   // Depend on error signal

        // Only return the interface object if bridge exists, ready is true, and error is null
        if (b && readyStatus && !errorStatus) {
            return {
                queueEventForWasm: b.queueEventForWasm.bind(b),
                onWasmEvent: b.onWasmEvent.bind(b),
                clearJsEventQueue: b.clearJsEventQueue.bind(b),
                getCurrentJsQueue: b.getCurrentJsQueue.bind(b),
                isReady: isReady, // Pass the signal accessor
                error: error,     // Pass the signal accessor
            };
        }
        // Otherwise, return null
        return null;
    }, null, { equals: false }); // equals: false ensures updates if the object identity changes


    // --- Return Values ---
    // Return the canvas ref callback and the memoized accessor for the bridge interface
    return [canvasRef, bridgeInterfaceMemo];
}