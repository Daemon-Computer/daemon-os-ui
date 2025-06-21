import { createContext, createSignal, createEffect, useContext, JSX } from 'solid-js';

export type ThemeOption = 'daemon-os';

interface ThemeContextType {
    currentTheme: () => ThemeOption;
    setTheme: (theme: ThemeOption) => void;
    isDarkTheme: () => boolean;
}

const ThemeContext = createContext<ThemeContextType>();

const DEFAULT_THEME: ThemeOption = 'daemon-os';

export function ThemeProvider(props: { children: JSX.Element; }) {
    // Always use the daemon-os theme
    const [currentTheme, setCurrentTheme] = createSignal<ThemeOption>(DEFAULT_THEME);
    const isDarkTheme = () => false; // daemon-os is not a dark theme

    const setTheme = (theme: ThemeOption) => {
        setCurrentTheme(DEFAULT_THEME); // Always set to daemon-os regardless of input
    };

    createEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme());
    });

    const contextValue = {
        currentTheme,
        setTheme,
        isDarkTheme
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {props.children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}