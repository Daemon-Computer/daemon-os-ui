# Creating a Custom Theme

## Quick Start

1. Open `ThemeContext.tsx` and add your theme name to the `ThemeOption` type
2. Open `theme.css` and add your theme definition section
3. Test your theme in the application

## Detailed Instructions

### Step 1: Add Your Theme to ThemeOption Type

Edit `ThemeContext.tsx` and add your theme name to the `ThemeOption` type:

```typescript
export type ThemeOption =
  | 'classic98'
  | 'darkMode'
  | 'neonSynthwave'
  | 'pastelVaporwave'
  | 'yourThemeName';
```

### Step 2: Define Your Theme in theme.css

Add a new theme definition section to `theme.css`. Copy the template below and customize the colors:

```css
/* Theme: YourThemeName */
[data-theme='yourThemeName'] {
  /* Base colors */
  --theme-primary: #your-color;
  --theme-secondary: #your-color;
  --theme-accent: #your-color;
  --theme-desktop-bg: #your-color;

  /* Window colors */
  --theme-window-bg: #your-color;
  --theme-titlebar-bg-start: #your-color;
  --theme-titlebar-bg-end: #your-color;
  --theme-titlebar-text: #your-color;

  /* Text colors */
  --theme-text: #your-color;
  --theme-text-secondary: #your-color;
  --theme-text-disabled: #your-color;

  /* Scrollbar colors */
  --theme-scrollbar-bg: #your-color;
  --theme-scrollbar-thumb: #your-color;
  --theme-scrollbar-button: #your-color;
  --theme-scrollbar-arrow: #your-color;
}
```

### Step 3: Style Specific UI Elements (Optional)

For a complete theme, you may want to add specific styles for buttons, inputs, scrollbars, etc. Add these sections after your theme definition:

```css
/* Buttons for your theme */
[data-theme='yourThemeName'] button,
[data-theme='yourThemeName'] input[type='reset'],
[data-theme='yourThemeName'] input[type='submit'] {
  background: #your-button-bg;
  box-shadow:
    inset -1px -1px #your-shadow-dark,
    inset 1px 1px #your-shadow-light,
    inset -2px -2px #your-shadow-mid-dark,
    inset 2px 2px #your-shadow-mid-light;
  color: #your-button-text;
}

/* Button hover state */
[data-theme='yourThemeName'] button:not(:disabled):hover {
  background: #your-button-hover-bg;
}

/* Button active state */
[data-theme='yourThemeName'] button:not(:disabled):active {
  box-shadow:
    inset -1px -1px #your-shadow-light,
    inset 1px 1px #your-shadow-dark,
    inset -2px -2px #your-shadow-mid-light,
    inset 2px 2px #your-shadow-mid-dark;
}

/* Disabled button state */
[data-theme='yourThemeName'] button:disabled {
  background: #your-disabled-bg;
  color: #your-disabled-text;
}

/* Input fields */
[data-theme='yourThemeName'] input[type='text'],
[data-theme='yourThemeName'] select,
[data-theme='yourThemeName'] textarea {
  background-color: #your-input-bg;
  color: #your-input-text;
  box-shadow:
    inset -1px -1px #your-input-shadow-light,
    inset 1px 1px #your-input-shadow-dark,
    inset -2px -2px #your-input-shadow-mid-light,
    inset 2px 2px #your-input-shadow-mid-dark;
}

/* Scrollbar thumb */
[data-theme='yourThemeName'] ::-webkit-scrollbar-thumb {
  background-color: #your-scrollbar-thumb;
  box-shadow:
    inset -1px -1px #your-shadow-dark,
    inset 1px 1px #your-shadow-light,
    inset -2px -2px #your-shadow-mid-dark,
    inset 2px 2px #your-shadow-mid-light;
}

/* Scrollbar track */
[data-theme='yourThemeName'] ::-webkit-scrollbar-track {
  background-color: #your-scrollbar-track;
  /* You may want to add a custom pattern here */
}
```

## Theme Color Tips

For a cohesive Windows 98-style theme:

- **Keep the 3D effect**: Maintain light/dark shadow pairs for the beveled look
- **Limit your palette**: Windows 98 used a limited color palette - 4-6 main colors work best
- **Maintain contrast**: Ensure text is readable against backgrounds
- **Consider accessibility**: Provide enough contrast between interactive elements and backgrounds

## Theme Template

Here's a complete template with example values to get you started:

```css
/* Theme: SunsetOrange - Template Example */
[data-theme='sunsetOrange'] {
  /* Base colors */
  --theme-primary: #ff7b00;
  --theme-secondary: #ffb700;
  --theme-accent: #ff5500;
  --theme-desktop-bg: #994c00;

  /* Window colors */
  --theme-window-bg: #ffe8cc;
  --theme-titlebar-bg-start: #ff7b00;
  --theme-titlebar-bg-end: #ffb700;
  --theme-titlebar-text: #ffffff;

  /* Text colors */
  --theme-text: #663300;
  --theme-text-secondary: #994c00;
  --theme-text-disabled: #c7a078;

  /* Scrollbar colors */
  --theme-scrollbar-bg: #ffe8cc;
  --theme-scrollbar-thumb: #ffb700;
  --theme-scrollbar-button: #ffe8cc;
  --theme-scrollbar-arrow: #663300;
}

/* Buttons */
[data-theme='sunsetOrange'] button,
[data-theme='sunsetOrange'] input[type='reset'],
[data-theme='sunsetOrange'] input[type='submit'] {
  background: #ffe8cc;
  box-shadow:
    inset -1px -1px #994c00,
    inset 1px 1px #ffffff,
    inset -2px -2px #ff7b00,
    inset 2px 2px #fff5e6;
  color: #663300;
}

[data-theme='sunsetOrange'] button:not(:disabled):hover {
  background: #fff5e6;
}

[data-theme='sunsetOrange'] button:not(:disabled):active {
  box-shadow:
    inset -1px -1px #fff5e6,
    inset 1px 1px #994c00,
    inset -2px -2px #ffffff,
    inset 2px 2px #ff7b00;
}

/* Text inputs */
[data-theme='sunsetOrange'] input[type='text'],
[data-theme='sunsetOrange'] select,
[data-theme='sunsetOrange'] textarea {
  background-color: #fff5e6;
  color: #663300;
  box-shadow:
    inset -1px -1px #fff5e6,
    inset 1px 1px #994c00,
    inset -2px -2px #ffffff,
    inset 2px 2px #ff7b00;
}
```

## Testing Your Theme

1. Start your development server (`bun dev` while in the `front-end` directory)
2. Open the application in your browser
3. Click the Theme button in the taskbar
4. Select your new theme from the dropdown
5. Check how all UI elements look in your theme:
   - Windows and title bars
   - Buttons (normal, hover, active, disabled states)
   - Inputs and form controls
   - Scrollbars
   - Text readability
6. Make adjustments to your colors as needed
