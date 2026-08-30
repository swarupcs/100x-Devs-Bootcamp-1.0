/**
 * packages/eslint-config/library.js  (ESLint Config — Generic Node/TS Libraries)
 *
 * Shared ESLint configuration for generic TypeScript/JavaScript libraries
 * in the monorepo that are NOT React-specific (e.g. server-side utilities,
 * pure TypeScript packages, Node.js scripts).
 *
 * Extends:
 *  - "eslint:recommended"       — ESLint's built-in recommended rule set
 *  - "prettier"                 — Disables ESLint rules that conflict with Prettier formatting
 *  - "eslint-config-turbo"      — Turborepo-specific lint rules (e.g. env variable checks)
 *
 * Plugins:
 *  - "only-warn" — Converts all ESLint errors to warnings. Useful in a monorepo
 *                  so that lint issues don't hard-fail CI but are still visible.
 *
 * Globals:
 *  React and JSX are declared as global variables so ESLint doesn't flag them
 *  as undefined (needed even in non-JSX files that may import React indirectly).
 *
 * Environment:
 *  node: true — tells ESLint that Node.js global variables (process, __dirname, etc.)
 *               are available. Appropriate for server-side / tooling packages.
 *
 * Import resolver:
 *  Configured to resolve TypeScript path aliases using the local tsconfig.json.
 *  This enables ESLint's import plugin to validate cross-package imports.
 *
 * Ignored paths:
 *  - Dotfiles (.*js) — usually config files not meant to be linted
 *  - node_modules/   — third-party dependencies
 *  - dist/           — compiled output (should not be linted)
 */
const { resolve } = require("node:path");

// Resolve the tsconfig.json relative to the package that consumes this config
const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "prettier", "eslint-config-turbo"],
  plugins: ["only-warn"],
  globals: {
    React: true,  // React is globally available (JSX transform)
    JSX: true,    // JSX types are globally available
  },
  env: {
    node: true,  // Enable Node.js global variables
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,  // use the package's tsconfig.json for path resolution
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      // Apply this config to both JS/JSX and TS/TSX files
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
};
