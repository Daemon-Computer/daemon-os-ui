import js from "@eslint/js";
import solid from "eslint-plugin-solid/configs/typescript";
import * as tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import prettierConfig from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ...solid,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      solid: solid.plugins.solid,
    },
    rules: {
      // TypeScript specific rules
      "@typescript-eslint/semi": ["error", "always"],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/prefer-interface": "off",

      // Naming conventions matching your style guide
      "@typescript-eslint/naming-convention": [
        "error",
        // Variables: camelCase, descriptive names
        {
          selector: "variable",
          format: ["camelCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        // Booleans: isActive, hasPermission pattern
        {
          selector: "variable",
          types: ["boolean"],
          format: ["camelCase"],
          prefix: ["is", "has", "contains", "should", "will", "did", "can"],
        },
        // Functions: camelCase with verb names
        {
          selector: "function",
          format: ["camelCase", "PascalCase"], // PascalCase for components
        },
        // Classes and interfaces: PascalCase
        {
          selector: "class",
          format: ["PascalCase"],
        },
        {
          selector: "interface",
          format: ["PascalCase"],
        },
        {
          selector: "typeAlias",
          format: ["PascalCase"],
        },
        // Type parameters
        {
          selector: "typeParameter",
          format: ["PascalCase"],
        },
        // Enums: PascalCase
        {
          selector: "enum",
          format: ["PascalCase"],
        },
        // Enum members: UPPER_CASE
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
      ],

      // General JavaScript/TypeScript rules
      semi: "off", // Use @typescript-eslint/semi instead
      indent: "off", // Let Prettier handle this
      quotes: ["error", "single", { avoidEscape: true }],
      "comma-dangle": ["error", "always-multiline"],
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { max: 2, maxEOF: 1 }],
      "eol-last": ["error", "always"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "arrow-parens": ["error", "always"],
      "arrow-body-style": ["error", "as-needed"],
      "prefer-const": "warn",
      "no-var": "error",
      "no-console": "warn",
      "no-debugger": "error",
      eqeqeq: ["error", "always"],

      // Import rules
      "no-restricted-imports": [
        "error",
        {
          patterns: ["./", "../"],
        },
      ],
      "import/order": "off", // You can enable this if you add eslint-plugin-import

      // SolidJS specific rules
      "solid/components-return-once": "error",
      "solid/event-handlers": "error",
      "solid/imports": "error",
      "solid/jsx-no-duplicate-props": "error",
      "solid/jsx-no-script-url": "error",
      "solid/jsx-no-undef": "error",
      "solid/jsx-uses-vars": "error",
      "solid/no-destructure": "error",
      "solid/no-innerhtml": "warn",
      "solid/no-react-deps": "error",
      "solid/no-react-specific-props": "error",
      "solid/no-unknown-namespaces": "error",
      "solid/prefer-for": "warn", // Warns to use <For> instead of map for components
      "solid/prefer-show": "warn", // Warns to use <Show> for conditionals
      "solid/reactivity": "error",
      "solid/self-closing-comp": "error",
      "solid/style-prop": "warn",

      // Disabled rules to avoid Prettier conflicts
      "max-len": "off",
      "no-mixed-spaces-and-tabs": "off",
      "no-tabs": "off",
    },
  },
  // Prettier config should be last to override formatting rules
  prettierConfig,
];
