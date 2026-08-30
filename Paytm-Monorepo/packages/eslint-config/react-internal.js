/**
 * packages/eslint-config/react-internal.js  (ESLint Config — Internal React Libraries)
 *
 * Shared ESLint configuration for internal React component libraries in the
 * monorepo — specifically the @repo/ui package. "Internal" means the library
 * is bundled by the consuming application (not published to npm separately),
 * so it targets browser environments and React-specific patterns.
 *
 * Extends the Vercel Engineering Style Guide for internal React libraries.
 * For more information, see https://github.com/vercel/style-guide
 *
 * Extends:
 *  - "eslint:recommended"   — ESLint's core recommended rules
 *  - "prettier"             — Disables conflicting formatting rules
 *  - "eslint-config-turbo"  — Turborepo-aware rules
 *
 * Plugins:
 *  - "only-warn" — Converts all lint errors to warnings (monorepo-friendly)
 *
 * Globals:
 *  React and JSX are declared global for the new JSX transform.
 *
 * Environment:
 *  browser: true — Enable browser globals (window, document, etc.)
 *                  Note: unlike the Next.js config, `node: true` is NOT set
 *                  because UI components are client-only (browser-side React).
 *
 * Import resolver:
 *  TypeScript resolver uses the local tsconfig.json for path alias resolution.
 *
 * Ignored paths:
 *  - Dotfiles (.*js)
 *  - node_modules/
 *  - dist/ — compiled library output
 *
 * Overrides:
 *  Forces ESLint to detect and lint .tsx files (TypeScript + JSX).
 */
const { resolve } = require("node:path");

// Resolve tsconfig.json from the consuming package's root
const project = resolve(process.cwd(), "tsconfig.json");

/*
 * This is a custom ESLint configuration for use with
 * internal (bundled by their consumer) libraries
 * that utilize React.
 *
 * This config extends the Vercel Engineering Style Guide.
 * For more information, see https://github.com/vercel/style-guide
 *
 */

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "prettier", "eslint-config-turbo"],
  plugins: ["only-warn"],
  globals: {
    React: true,  // React available globally (no explicit import needed)
    JSX: true,    // JSX types available globally
  },
  env: {
    browser: true,  // Browser-only: UI components run in the browser, not in Node
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,  // resolve TS path aliases using the package's tsconfig.json
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",  // ignore compiled output
  ],
  overrides: [
    // Force ESLint to detect .tsx files
    { files: ["*.js?(x)", "*.ts?(x)"] },
  ],
};
