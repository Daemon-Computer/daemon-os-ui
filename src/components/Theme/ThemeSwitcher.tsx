import { createSignal, For, Show } from 'solid-js';
import { useTheme } from './ThemeContext';
import type { ThemeOption } from './ThemeContext';

export default function ThemeSwitcher() {
    const { currentTheme } = useTheme();

    // This component is not used anymore since there's only one theme now
    return null;
}