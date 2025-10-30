// eslint.config.js
import js from "@eslint/js";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config([
  // 1. Global ignores
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
      },
    },
  },
  {
    ignores: [
      "playwright/.auth",
      "playwright/.crypt.auth",
      "*.enc",
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      "app/dist/", // Common for browser extensions
      "*.log",
      ".DS_Store",
      //mirror .gitignore, makes no sense to lint ublock installed during testing
      //(that would take eslint considerable extra time (minutes))
      "tests/testDist/",
      "tests/testUBlockOrigin/",
      "tests/testUBlockOriginLite/",
    ],
  },

  // 2. ESLint's recommended configurations
  js.configs.recommended,
  tseslint.configs.recommended,

  // 3. Prettier recommended configuration
  // This applies Prettier formatting as ESLint rules and disables conflicting ESLint rules.
  eslintPluginPrettierRecommended,

  // 4. Custom project-specific configurations
  {
    files: [
      "**/*.js",
      "**/*.jsx",
      "**/*.mjs",
      "**/*.cjs",
      "**/*.ts",
      "**/*.tsx",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      // Globals for browser, node, esXXXX are typically provided by js.configs.recommended.
    },
    rules: {
      // "Use const if possible" from your Cursor Rules
      "prefer-const": "error",
      curly: "error",
      eqeqeq: "error",
      "no-empty": "warn",

      // Add any other project-specific rules or overrides here.
      // For example:
      // "no-unused-vars": "warn",
    },
    // Note: For full TypeScript linting capabilities (e.g., type-aware rules),
    // you would need to install @typescript-eslint/parser and @typescript-eslint/eslint-plugin,
    // and configure them here. This setup will apply basic ESLint rules and Prettier to .ts/.tsx files.
  },

  // 5. Restrict direct DOM querySelector/querySelectorAll only inside app/** (excluding tests)
  {
    files: [
      "app/**/*.js",
      "app/**/*.jsx",
      "app/**/*.mjs",
      "app/**/*.cjs",
      "app/**/*.ts",
      "app/**/*.tsx",
    ],
    ignores: [
      "app/**/*.test.js",
      "app/**/*.test.ts",
      "app/**/*.spec.js",
      "app/**/*.spec.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.property.name=/^querySelector(All)?$/]:not([callee.object.type="MemberExpression"][callee.object.object.type="Identifier"][callee.object.object.name="window"][callee.object.property.type="Identifier"][callee.object.property.name="YoutubeAntiTranslate"])',
          message:
            "Use window.YoutubeAntiTranslate.querySelector/querySelectorAll instead of direct DOM query.",
        },
      ],
    },
  },
]);
