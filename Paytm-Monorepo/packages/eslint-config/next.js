/**
 * packages/eslint-config/next.js  (ESLint Config — Next.js Apps)
 *
 * Shared ESLint configuration for all Next.js applications in the monorepo
 * (user-app, merchant-app). Extends the Vercel Engineering Style Guide
 * specifically for Next.js projects on top of the base recommended rules.
 *
 * Extends:
 *  - "eslint:recommended"              — ESLint's core recommended rules
 *  - "prettier"                        — Disables rules that conflict with Prettier
 *  - "@vercel/style-guide/eslint/next" — Vercel's opinionated Next.js lint rules.
 *                                        Catches common Next.js anti-patterns:
 *                                        missing Image alt props, misused Link,
 *                                        wrong export patterns, etc.
 *  - "eslint-config-turbo"             — Turborepo-aware rules (env variable usage)
 *
 * Plugins:
 *  - "only-warn" — Converts all ESLint errors to warnings (monorepo-friendly)
 *
 * Globals:
 *  React and JSX are declared global for the new JSX transform (no import needed).
 *
 * Environment:
 *  node: true    — Node.js globals for server-side Next.js code (API routes, etc.)
 *  browser: true — Browser globals for client components (window, document, etc.)
 *                  Both are needed because Next.js runs code in both environments.
 *
 * Import resolver:
 *  Resolves TypeScript path aliases via the consuming app's tsconfig.json.
 *
 * Ignored paths:
 *  - Dotfiles (.*js)
 *  - node_modules/
 */
const { resolve } = require("node:path");

// Resolve tsconfig.json from the consuming Next.js app's root
const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "prettier",
    require.resolve("@vercel/style-guide/eslint/next"),  // Vercel Next.js style guide
    "eslint-config-turbo",
  ],
  globals: {
    React: true,  // React available globally (new JSX transform)
    JSX: true,    // JSX namespace available globally
  },
  env: {
    node: true,     // Node.js globals for server-side Next.js code
    browser: true,  // Browser globals for client components
  },
  plugins: ["only-warn"],
  settings: {
    "import/resolver": {
      typescript: {
        project,  // use the app's tsconfig.json for import resolution
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
  ],
  overrides: [{ files: ["*.js?(x)", "*.ts?(x)"] }],
};
