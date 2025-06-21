// Base event types that match Rust-side definitions
export type RayMarchDebugEvent = 'Disabled' | 'Normals' | 'Steps';

export type ViewModelPalette = {
    primary: [number, number, number];
    secondary: [number, number, number];
    tertiary: [number, number, number];
    highlight: [number, number, number];
    accent: [number, number, number];
};

export type ViewModelAddon = {
    [key: string]: {
        size?: number;
        length?: number;
        size_ratio?: number;
        end?: number;
    };
};

export type ViewModel = {
    palette: ViewModelPalette;
    addons: ViewModelAddon[];
};

// Combined event payload type
export type EventPayload = {
    DebugRayMarch?: RayMarchDebugEvent;
    ViewModel?: ViewModel | string;
    Drive?: {};
};

// Event validation types
export type EventValidator<T> = {
    validate: (data: unknown) => data is T;
    errorMessage: string;
};

// Event serialization helpers
export type EventSerializer<T> = {
    serialize: (data: T) => string;
    deserialize: (data: string) => T;
};

// Event monitoring types for debugging
export type EventMonitor = {
    onEvent: (event: EventPayload) => void;
    getEventHistory: () => EventPayload[];
    clearHistory: () => void;
};