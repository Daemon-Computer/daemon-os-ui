import type { EventPayload } from './events';

export class GameBridge {
    private eventQueue: EventPayload[] = [];

    // WASM to get events (JS -> WASM direction)
    getWasmEvent(): EventPayload | 'Empty' {
        if (this.eventQueue.length === 0) {
            return 'Empty';
        }

        // Return the oldest event
        const nextEvent = this.eventQueue.shift();
        console.log('Event polled by WASM:', nextEvent);
        return nextEvent!; // We know it's not undefined due to the length check
    }

    private jsEventQueue: EventPayload[] = []; // Events JS wants to send TO WASM
    private wasmEventHandlers: ((event: EventPayload) => void)[] = []; // Handlers for events received FROM WASM

    // Called by WASM to get events queued by JS
    pollJsEvent(): EventPayload | 'Empty' {
        const event = this.jsEventQueue.shift();
        if (!event) return 'Empty';
        console.log('[Bridge] Event polled by WASM:', event);
        return event;
    }

    // Called by JS to queue an event FOR WASM
    queueEventForWasm(event: EventPayload): void {
        let processedEvent = { ...event };
        if (event.ViewModel && typeof event.ViewModel !== 'string') {
            processedEvent = {
                ViewModel: JSON.stringify(event.ViewModel),
            };
            console.log('[Bridge] Converted ViewModel for WASM:', processedEvent);
        }
        this.jsEventQueue.push(processedEvent);
        console.log('[Bridge] Event queued for WASM:', processedEvent);
    }

    // Called BY WASM to send an event TO JS
    receiveWasmEvent(event: EventPayload): void {
        console.log('[Bridge] Event received from WASM:', event);
        this.wasmEventHandlers.forEach(handler => handler(event));
    }

    // Subscribe to events FROM WASM
    onWasmEvent(handler: (event: EventPayload) => void): () => void {
        this.wasmEventHandlers.push(handler);
        return () => {
            this.wasmEventHandlers = this.wasmEventHandlers.filter(h => h !== handler);
        };
    }

    // Clear the queue of events waiting for WASM
    clearJsEventQueue(): void {
        this.jsEventQueue = [];
    }

    // See the current queue for WASM
    getCurrentJsQueue(): EventPayload[] {
        return [...this.jsEventQueue];
    }

    destroy() {
        this.jsEventQueue = [];
        this.wasmEventHandlers = [];
        console.log('[Bridge] Instance destroyed');
    }
}