import type { JSX } from 'solid-js';
import { createContext, createSignal, createEffect, useContext } from 'solid-js';

export type ThemeOption = 'daemon-os';

interface ThemeContextType {
  currentTheme: () => ThemeOption;
}

const themeContext = createContext<ThemeContextType>();

const DEFAULT_THEME: ThemeOption = 'daemon-os';

export function ThemeProvider(props: { children: JSX.Element }) {
  // Always use the daemon-os theme
  const [currentTheme] = createSignal<ThemeOption>(DEFAULT_THEME);

  createEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme());
  });

  const contextValue = {
    currentTheme,
  };

  return <themeContext.Provider value={contextValue}>{props.children}</themeContext.Provider>;
}

export function useTheme() {
  const context = useContext(themeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
