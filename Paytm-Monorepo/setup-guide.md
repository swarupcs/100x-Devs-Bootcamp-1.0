# PayTM-Style Wallet — Stage 1 Guide (Full Detail)

### `paytm-project-starter-monorepo` — build it from an empty folder to the exact starter state

This is the **fully expanded** version of the Stage 1 guide: every file below is the
*complete* file, not an excerpt, and every step explains not just *what* to run but
*why* that command/file exists. By the end you'll have a Turborepo with two Next.js
apps (`user-app` on Credentials auth, `merchant-app` on Google OAuth) and four shared
packages (`@repo/db`, `@repo/ui`, `@repo/store`, `@repo/eslint-config`) — with **no**
wallet logic yet. That's Stage 2.

---

## 0. Final Folder Structure (what you're building toward)

```
paytm-project-starter-monorepo/
├── .eslintrc.js
├── .npmrc
├── package.json
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   ├── merchant-app/
│   │   ├── .eslintrc.js
│   │   ├── .env
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   │   └── user/route.ts
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── page.module.css
│   │   │   └── page.tsx
│   │   ├── lib/auth.ts
│   │   ├── next-env.d.ts
│   │   ├── next.config.js
│   │   ├── package.json
│   │   ├── postcss.config.js
│   │   ├── provider.tsx
│   │   ├── public/{circles,next,turborepo,vercel}.svg
│   │   ├── README.md
│   │   └── tailwind.config.js
│   └── user-app/
│       ├── .eslintrc.js
│       ├── .env
│       ├── app/
│       │   ├── api/
│       │   │   ├── auth/[...nextauth]/route.ts
│       │   │   └── user/route.ts
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── lib/auth.ts
│       │   ├── page.module.css
│       │   └── page.tsx
│       ├── next-env.d.ts
│       ├── next.config.js
│       ├── package.json
│       ├── postcss.config.js
│       ├── provider.tsx
│       ├── public/{circles,next,turborepo,vercel}.svg
│       ├── README.md
│       └── tailwind.config.js
└── packages/
    ├── db/
    │   ├── index.ts
    │   ├── package.json
    │   └── prisma/
    │       ├── .env
    │       └── schema.prisma
    ├── eslint-config/
    │   ├── library.js
    │   ├── next.js
    │   ├── react-internal.js
    │   ├── package.json
    │   └── README.md
    ├── store/
    │   ├── package.json
    │   └── src/
    │       ├── atoms/balance.ts
    │       └── hooks/useBalance.ts
    └── ui/
        ├── .eslintrc.js
        ├── package.json
        ├── src/
        │   ├── Appbar.tsx
        │   ├── button.tsx
        │   ├── card.tsx
        │   └── code.tsx
        └── turbo/generators/
            ├── config.ts
            └── templates/component.hbs
```

Notice one asymmetry that's easy to miss and worth calling out up front: `user-app`
**puts its NextAuth config at** `app/lib/auth.ts`, while `merchant-app` **puts it at**
`lib/auth.ts` (one level up, outside `app/`). This isn't a typo — it's simply how the
starter was scaffolded, and it means the relative import paths in each app's
`api/auth/[...nextauth]/route.ts` are different (`../../../lib/auth` vs
`../../../../lib/auth`). Keep this in mind when you create the folders.

---

## 1. Prerequisites (official installers only)

```bash
# Node.js 20+ via nvm (official Node version manager)
nvm install 20
nvm use 20

# pnpm via the official install script
curl -fsSL https://get.pnpm.io/install.sh | sh -

node -v   # confirm >= 20
pnpm -v   # confirm pnpm is on PATH
```

**Why pnpm instead of npm/yarn?** In a monorepo, pnpm's content-addressable store
means every package's `node_modules` are hard-linked from one global cache instead of
duplicated per-workspace, which matters a lot once you have 2 apps + 4 packages all
depending on overlapping things like `react`, `typescript`, `eslint`. It also *refuses*
to let a package import something it didn't explicitly declare as a dependency
("phantom dependency" protection) — which catches real bugs in monorepos where it's
easy to accidentally rely on a package hoisted in by a sibling.

---

## 2. Step 1 — Scaffold with the Official Turborepo CLI

```bash
pnpm dlx create-turbo@latest
```

Prompts:

```
? Where would you like to create your Turborepo?  ./paytm-project-starter-monorepo
? Which package manager do you want to use?        pnpm
```

```bash
cd paytm-project-starter-monorepo
pnpm install
pnpm dev   # sanity check — should start the default `web` and `docs` apps
```

### What this command generates, and why each file matters

`pnpm-workspace.yaml` — tells pnpm which folders are workspaces (so
`workspace:*` dependencies resolve locally instead of hitting the npm registry):

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`turbo.json` — the task pipeline. This is the file that lets `pnpm build` build
every app/package in the correct dependency order (e.g. `@repo/db` before
`user-app`, since `user-app` imports it) and cache results so unchanged packages
don't rebuild:

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local", "**/.env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- `"dependsOn": ["^build"]` — the `^` means "build this package's dependencies
first." That's what guarantees `@repo/db`'s Prisma client is generated before
`user-app` tries to import it.
- `"cache": false, "persistent": true"` on `dev` — dev servers never finish running
and shouldn't be cached; this tells Turbo to just stream their output live instead
of trying to cache/replay them.

**Root** `package.json` — delegates every script to `turbo`, so `pnpm build` at the
root fans out to every workspace's own `build` script:

```jsonc
{
  "name": "paytm-project-starter-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\""
  },
  "devDependencies": {
    "prettier": "^3.2.5",
    "turbo": "^1.13.0"
  },
  "packageManager": "pnpm@8.15.6",
  "engines": {
    "node": ">=18"
  }
}
```

**Root** `.eslintrc.js` — deliberately *ignores* `apps/`** and `packages/`**. Each
workspace has its own `.eslintrc.js` extending the shared config, so the root config
only lints stray files that live directly at the repo root:

```js
// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  ignorePatterns: ["apps/**", "packages/**"],
  extends: ["@repo/eslint-config/library.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
};
```

**Root** `.npmrc` — present but empty in this starter. It exists as a placeholder
you'd fill in later (e.g. `auto-install-peers=true`, or private registry auth) — for
now it does nothing and can stay empty:

```
(empty file)
```

---

## 3. Step 2 — Rename the Default Apps

`create-turbo` ships `apps/web` and `apps/docs`. Rename with `git mv` so history
follows the files instead of showing them as deleted+created:

```bash
git mv apps/web apps/user-app
git mv apps/docs apps/merchant-app
```

Update the `"name"` field in each app's `package.json` to match (you'll write the
full `package.json` for each app from scratch in Steps 8–9 anyway, so this is really
just about not leaving a stale `"name": "web"` around if you're doing this
incrementally rather than building the files fresh).

---

## 4. Step 3 — Add New Packages with Turborepo's Generator

```bash
npx turbo gen workspace
? What is the name of the workspace?      @repo/db
? Which type of workspace should be added? package
? Where should "@repo/db" be located?     packages/db
? Would you like to copy content from another workspace? No
```

```bash
npx turbo gen workspace
? What is the name of the workspace?      @repo/store
? Which type of workspace should be added? package
? Where should "@repo/store" be located?  packages/store
? Would you like to copy content from another workspace? No
```

Non-interactive equivalents, if you'd rather script this:

```bash
pnpm turbo gen workspace --name @repo/db --type package --destination packages/db --empty

pnpm turbo gen workspace --name @repo/store --type package --destination packages/store --empty 

```

**Why use the generator instead of** `mkdir packages/db && pnpm init`**?** The generator
registers the new folder as a pnpm workspace member correctly on the first try (no
forgetting to check `pnpm-workspace.yaml` matches the glob), and it stamps out a
minimal `package.json` + `tsconfig.json` that already point at the shared configs —
one less place to make a typo.

---

## 5. Step 4 — `@repo/db`: Prisma Client Singleton

```bash
cd packages/db
pnpm add @prisma/client@6
pnpm add -D prisma@6
npx prisma init --datasource-provider postgresql
cd ../..

```

`npx prisma init` is the **official Prisma scaffolding command** — it creates
`prisma/schema.prisma` and `prisma/.env` for you rather than you hand-writing the
folder structure.

### `packages/db/package.json`

```json
{
  "name": "@repo/db",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./client": "./index.ts"
  },
  "scripts": {
    "generate": "prisma generate",
    "migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@prisma/client": "^5.13.0"
  },
  "devDependencies": {
    "prisma": "^5.13.0",
    "typescript": "^5.4.5"
  }
}
```

The `"exports"` field is what makes `import db from "@repo/db/client"` work from
inside `user-app`/`merchant-app` — pnpm's workspace linking + this exports map
together mean the internal package behaves just like an npm package, without ever
being published.

### `packages/db/index.ts`

```ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma: ReturnType<typeof prismaClientSingleton> = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
```

**Why the** `globalThis` **dance instead of just** `export default new PrismaClient()`**?**
In Next.js dev mode, every hot-reload re-executes your module code, which would
create a brand-new `PrismaClient` (and a brand-new pool of DB connections) on every
single file save — you'd exhaust Postgres's connection limit within a few minutes of
active development. Stashing the instance on `globalThis` means hot reloads reuse the
same client instead of creating a new one. This pattern is lifted directly from
Prisma's own official Next.js integration guide, not invented for this project.

### `packages/db/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id       Int     @id @default(autoincrement())
  email    String? @unique
  name     String?
  number   String? @unique
  password String?
}

model Merchant {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  auth_type AuthType @default(Google)
}

enum AuthType {
  Google
  Github
}
```

Why only these two models at this stage? Because that's all the *starter's actual
code* touches: `user-app`'s Credentials provider reads/writes `User` (by phone
`number`), and `merchant-app`'s Google `signIn` callback upserts `Merchant` (by
`email`). `Balance` and `OnRampTransaction` don't exist yet — those are Stage 2.

### `packages/db/prisma/.env`

```
DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5432/postgres"
```

Start Postgres locally the official Docker way:

```bash
docker run -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres
```

Then run the migration and generate the client:

```bash
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
cd ../..
```

---

## 6. Step 5 — `@repo/store`: Shared Recoil Balance Atom

```bash
cd packages/store
pnpm add recoil
cd ../..
```

### `packages/store/package.json`

```json
{
  "name": "@repo/store",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./balance": "./src/hooks/useBalance.ts"
  },
  "dependencies": {
    "recoil": "^0.7.7"
  },
  "devDependencies": {
    "typescript": "^5.4.5"
  }
}
```

### `packages/store/src/atoms/balance.ts`

```ts
import { atom } from "recoil";

export const balanceAtom = atom<number>({
    key: "balance",
    default: 0,
})
```

### `packages/store/src/hooks/useBalance.ts`

```ts
import { useRecoilValue } from "recoil"
import { balanceAtom } from "../atoms/balance"

export const useBalance = () => {
    const value = useRecoilValue(balanceAtom);
    return value;
}
```

**Why is this a hook wrapping an atom rather than exporting the atom directly?**
Exporting `useBalance()` instead of `balanceAtom` means consuming components never
import from `recoil` directly — they just call a hook. That gives you a seam: later,
if the balance moves to a different state library, or starts fetching from the
server instead of being a static default, every consumer keeps working unchanged.
Right now it's a placeholder — nothing ever calls `useSetRecoilState(balanceAtom)`, so
`merchant-app`'s `useBalance()` will always render `0` until Stage 2 wires it up to
something real.

---

## 7. Step 6 — `@repo/eslint-config`: Shared Lint Rules

This package was already scaffolded by `create-turbo` in Step 1 (it's one of the
default packages, alongside `ui` and `typescript-config`) — you're just filling in
its actual content here to match what the starter uses.

### `packages/eslint-config/package.json`

```json
{
  "name": "@repo/eslint-config",
  "version": "1.0.0",
  "private": true,
  "devDependencies": {
    "@vercel/style-guide": "^5.2.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-config-turbo": "^1.13.0",
    "eslint-plugin-only-warn": "^1.1.0",
    "typescript": "^5.4.5"
  }
}
```

### `packages/eslint-config/library.js`

Used by plain TypeScript packages (like `@repo/db`, `@repo/store`) that have no
React/browser concerns:

```js
const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["eslint:recommended", "prettier", "eslint-config-turbo"],
  plugins: ["only-warn"],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
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
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
};
```

### `packages/eslint-config/next.js`

Used by the two Next.js apps. Pulls in `@vercel/style-guide`'s Next.js rules on top
of the base rules, and turns on the `browser` env since these run client-side too:

```js
const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    "eslint:recommended",
    "prettier",
    require.resolve("@vercel/style-guide/eslint/next"),
    "eslint-config-turbo",
  ],
  globals: {
    React: true,
    JSX: true,
  },
  env: {
    node: true,
    browser: true,
  },
  plugins: ["only-warn"],
  settings: {
    "import/resolver": {
      typescript: {
        project,
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
```

### `packages/eslint-config/react-internal.js`

Used by `@repo/ui` — a React component library that's *consumed* by other apps
rather than run directly, so it only needs `browser` env, not `node`:

```js
const { resolve } = require("node:path");

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
    React: true,
    JSX: true,
  },
  env: {
    browser: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
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
    // Force ESLint to detect .tsx files
    { files: ["*.js?(x)", "*.ts?(x)"] },
  ],
};
```

**Why three separate configs instead of one?** Each target has a genuinely different
runtime: `library.js` is for code that only ever runs in Node (no `window`, no JSX
runtime assumptions beyond the `React`/`JSX` globals), `next.js` is for code that
runs in both the Next.js server *and* the browser, and `react-internal.js` is for a
component library that's never executed on its own — it's always bundled into
whatever consumes it, so it only needs the `browser` env. Splitting them means a
config change to "how we lint Next.js apps" can't accidentally break linting for the
plain `@repo/db` package.

Every one of them uses `eslint-plugin-only-warn` — this **downgrades every ESLint
error to a warning**. The rationale: you still see every issue in your editor and CI
output, but a lint problem never blocks a build or fails a commit hook outright — a
deliberate tradeoff for developer velocity over strictness in this course project.

### `packages/eslint-config/README.md`

```md
# `@turbo/eslint-config`

Collection of internal eslint configurations.
```

---

## 8. Step 7 — `@repo/ui`: Shared Component Library

This package is also already scaffolded by `create-turbo`, complete with its own
Turborepo *code generator* for adding new components (`turbo/generators/`). You're
filling in the components the starter actually ships with.

### `packages/ui/package.json`

```json
{
  "name": "@repo/ui",
  "version": "1.0.0",
  "private": true,
  "exports": {
    "./button": "./src/button.tsx",
    "./card": "./src/card.tsx",
    "./code": "./src/code.tsx",
    "./appbar": "./src/Appbar.tsx"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@turbo/gen": "^1.13.0",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "eslint": "^8.57.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.4.5"
  },
  "peerDependencies": {
    "react": "^18.2.0"
  }
}
```

### `packages/ui/.eslintrc.js`

```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/react-internal.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.lint.json",
    tsconfigRootDir: __dirname,
  },
};
```

### `packages/ui/src/button.tsx`

```tsx
"use client";

import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick: () => void;
}

export const Button = ({ onClick, children }: ButtonProps) => {
  return (
    <button onClick={onClick} type="button" className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2">
      {children}
    </button>

  );
};
```

Note the `"use client"` directive at the top — this component takes an `onClick`
callback, which means it needs to run in the browser (React Server Components can't
attach event handlers). Every component in this file that's interactive needs this
marker or Next.js's App Router will error when a Server Component tries to render it
with a function prop.

### `packages/ui/src/card.tsx`

```tsx
export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}): JSX.Element {
  return (
    <a
      className={className}
      href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo"`}
      rel="noopener noreferrer"
      target="_blank"
    >
      <h2 className="text-sm">
        {title} <span>-></span>
      </h2>
      <p>{children}</p>
    </a>
  );
}
```

This is the **stock** `create-turbo` ****`Card` — an outbound link card with UTM tracking
params baked in, meant for the default "Docs / Learn / Templates / Deploy" links on
the placeholder homepage. It is *not* the content-container `Card` you'll build in
Stage 2 (title + children, no link) — that's a breaking rewrite that happens later.
Leaving it as-is here is intentional: it proves this package really is the
unmodified starter output.

### `packages/ui/src/code.tsx`

```tsx
export function Code({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  return <code className={className}>{children}</code>;
}
```

Another stock `create-turbo` component — a thin wrapper around `<code>`. Nothing in
the starter's actual pages uses it yet, but it ships by default and nothing removes
it.

### `packages/ui/src/Appbar.tsx`

```tsx
import { Button } from "./button";

interface AppbarProps {
    user?: {
        name?: string | null;
    },
    // TODO: can u figure out what the type should be here?
    onSignin: any,
    onSignout: any
}

export const Appbar = ({
    user,
    onSignin,
    onSignout
}: AppbarProps) => {
    return <div className="flex justify-between border-b px-4">
        <div className="text-lg flex flex-col justify-center">
            PayTM
        </div>
        <div className="flex flex-col justify-center pt-2">
            <Button onClick={user ? onSignout : onSignin}>{user ? "Logout" : "Login"}</Button>
        </div>
    </div>
}
```

This is the one genuinely *product-specific* component in the starter's UI package —
everything else came from `create-turbo`'s template. It's intentionally generic about
*how* sign-in/sign-out happens: `onSignin`/`onSignout` are typed `any` (with a TODO
comment left in on purpose) because `user-app` passes NextAuth's `signIn`/`signOut`
functions and `merchant-app` does the same, but the exact function signatures differ
slightly enough that nailing the type down isn't trivial — a deliberate "figure this
out yourself" exercise left in the source.

### `packages/ui/turbo/generators/config.ts`

```ts
import type { PlopTypes } from "@turbo/gen";

// Learn more about Turborepo Generators at https://turbo.build/repo/docs/core-concepts/monorepos/code-generation

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  // A simple generator to add a new React component to the internal UI library
  plop.setGenerator("react-component", {
    description: "Adds a new react component",
    prompts: [
      {
        type: "input",
        name: "name",
        message: "What is the name of the component?",
      },
    ],
    actions: [
      {
        type: "add",
        path: "src/{{kebabCase name}}.tsx",
        templateFile: "templates/component.hbs",
      },
      {
        type: "append",
        path: "package.json",
        pattern: /"exports": {(?<insertion>)/g,
        template: '"./{{kebabCase name}}": "./src/{{kebabCase name}}.tsx",',
      },
    ],
  });
}
```

This is what powers `pnpm turbo gen react-component` — it's built on
[Plop](https://plopjs.com/), a code-generator microframework. Two things happen when
you run it: (1) a new `.tsx` file is created from the Handlebars template below, and
(2) a regex `append` action inserts a matching line into `package.json`'s `exports`
map automatically, immediately after the opening `"exports": {`. That's why adding a
new shared component never requires manually touching `package.json` — the generator
does it for you, and does it identically every time.

### `packages/ui/turbo/generators/templates/component.hbs`

```hbs
export const {{ pascalCase name }} = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <h1>{{ pascalCase name }} Component</h1>
      {children}
    </div>
  );
};
```

`{{ pascalCase name }}` is a Handlebars helper bundled with Plop — type `select` at
the prompt and you get a component literally named `Select`, file named
`select.tsx`. This stock template is deliberately minimal; you rewrite the body every
time you generate something real (as you will in Stage 2 for `Center`, `Select`,
`TextInput`).

---

## 9. Step 8 — `user-app`: Credentials Auth

```bash
cd apps/user-app
pnpm add next react react-dom next-auth bcrypt recoil
pnpm add -D typescript @types/node @types/react @types/react-dom @types/bcrypt tailwindcss postcss autoprefixer eslint
cd ../..
```

Link the internal workspace packages by hand in `package.json` (shown in full
below), then reinstall from the root so pnpm creates the symlinks:

```bash
pnpm install
```

### `apps/user-app/package.json`

```json
{
  "name": "user-app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint"
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "@repo/store": "workspace:*",
    "@repo/ui": "workspace:*",
    "bcrypt": "^5.1.1",
    "next": "^14.2.3",
    "next-auth": "^4.24.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recoil": "^0.7.7"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@types/bcrypt": "^5.0.2",
    "@types/node": "^20.12.7",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5"
  }
}
```

`"dev": "next dev -p 3001"` — pinned to port 3001 specifically because
`merchant-app` will run on Next's default 3000, and both apps run simultaneously
under `turbo dev`.

### `apps/user-app/.eslintrc.js`

```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/next.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
};
```

### `apps/user-app/next.config.js`

```js
/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@repo/ui"],
};
```

**Why** `transpilePackages`**?** `@repo/ui` ships raw, un-built `.tsx` source (there's
no separate build step that compiles it to `.js` first) — it's consumed directly from
`packages/ui/src`. Next.js's compiler (SWC) by default only transpiles code inside
the app itself; `transpilePackages` tells it to also run its TypeScript/JSX
transform over this specific workspace package before bundling it, since otherwise
Next.js would try to serve raw untranspiled TSX straight to the bundler and fail.

### `apps/user-app/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

The last `content` glob — `../../packages/ui/**/*...` — is the one line that's easy
to forget when wiring up a shared UI package: without it, Tailwind's JIT compiler
only scans `user-app`'s own files for class names, so any utility class used
*exclusively* inside `@repo/ui` components (like `Appbar`'s `flex justify-between border-b px-4`) would get purged from the final CSS and silently render unstyled.

### `apps/user-app/postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### `apps/user-app/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `apps/user-app/provider.tsx`

```tsx
"use client"
import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";

export const Providers = ({children}: {children: React.ReactNode}) => {
    return <RecoilRoot>
        <SessionProvider>
            {children}
        </SessionProvider>
    </RecoilRoot>
}
```

Two providers, nested, both needed for the app to function: `RecoilRoot` so
`useBalance()` (and anything else built on Recoil later) has state to read from, and
`SessionProvider` so client components can call `useSession()`/`signIn()`/`signOut()`
from `next-auth/react` without each one having to fetch the session manually.

### `apps/user-app/app/layout.tsx`

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "../provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Turborepo",
  description: "Generated by create turbo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <Providers>
        <body className={inter.className}>{children}</body>
      </Providers>
    </html>
  );
}
```

Note the `metadata` still says `"Create Turborepo"` / `"Generated by create turbo"` —
this is the *default* metadata `create-turbo` scaffolds, left completely untouched.
It's another marker (like the `Card` component above) that confirms this is the raw
starter, not a polished product — Stage 2 changes this to `"Wallet"` /
`"Simple wallet app"` once the app actually has a personality.

### `apps/user-app/app/page.tsx`

```tsx
"use client"
import { signIn, signOut, useSession } from "next-auth/react";
import { Appbar } from "@repo/ui/appbar";

export default function Page(): JSX.Element {
  const session = useSession();
  return (
   <div>
      <Appbar onSignin={signIn} onSignout={signOut} user={session.data?.user} />
   </div>
  );
}
```

The entire homepage, at this stage, is just the shared `Appbar` wired to NextAuth's
`signIn`/`signOut` and the current session's user. `useSession()` returns a loading
state initially, then either `{ data: { user: {...} } }` or `{ data: null }` — the
`session.data?.user` optional chain is what lets `Appbar` fall back to showing
"Login" before the session has resolved.

### `apps/user-app/app/lib/auth.ts`

```ts
import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";

export const authOptions = {
    providers: [
      CredentialsProvider({
          name: 'Credentials',
          credentials: {
            phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
            password: { label: "Password", type: "password", required: true }
          },
          // TODO: User credentials type from next-aut
          async authorize(credentials: any) {
            // Do zod validation, OTP validation here
            const hashedPassword = await bcrypt.hash(credentials.password, 10);
            const existingUser = await db.user.findFirst({
                where: {
                    number: credentials.phone
                }
            });

            if (existingUser) {
                const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                if (passwordValidation) {
                    return {
                        id: existingUser.id.toString(),
                        name: existingUser.name,
                        email: existingUser.number
                    }
                }
                return null;
            }

            try {
                const user = await db.user.create({
                    data: {
                        number: credentials.phone,
                        password: hashedPassword
                    }
                });
            
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.number
                }
            } catch(e) {
                console.error(e);
            }

            return null
          },
        })
    ],
    secret: process.env.JWT_SECRET || "secret",
    callbacks: {
        // TODO: can u fix the type here? Using any is bad
        async session({ token, session }: any) {
            session.user.id = token.sub

            return session
        }
    }
  }
```

Walking through `authorize` line by line, because the logic order here is
non-obvious and worth understanding rather than just copying:

1. It **hashes the incoming password unconditionally**, before it even knows if the
  user exists. This is genuinely wasted work on the login path (the hash gets
   thrown away) — a small inefficiency inherited as-is in the starter, not something
   to fix here since Stage 1/2 leave it exactly as shipped.
2. It looks up a `User` row by phone `number`.
3. **If the user exists** — this acts as a *login*: `bcrypt.compare` checks the
  supplied password against the stored hash. Match → return a NextAuth user object.
   No match → return `null` (NextAuth treats this as "invalid credentials").
4. **If the user does NOT exist** — this acts as *implicit sign-up*: it creates a new
  `User` row on the spot with the (correctly, this time) hashed password. There's no
   separate "Create Account" screen; the credentials form doubles as both login and
   registration, distinguishing the two paths purely by whether the phone number is
   already in the database.

The `session` callback copies `token.sub` (the JWT subject, i.e. the user's ID) onto
`session.user.id`. Without this, `session.user` would only ever have `name`/`email`
from the default NextAuth session shape — no `id` field — and every downstream query
in Stage 2 that does `where: { userId: Number(session.user.id) }` would break.

### `apps/user-app/app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth"
import { authOptions } from "../../../lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

The `[...nextauth]` catch-all route is NextAuth's own required convention — it
handles every auth-related URL (`/api/auth/signin`, `/api/auth/callback/credentials`,
`/api/auth/session`, etc.) through this one file. The relative import path
`../../../lib/auth` climbs from `app/api/auth/[...nextauth]/` up to `app/lib/auth.ts`
— three levels, matching `user-app`'s "auth lives inside `app/`" layout.

### `apps/user-app/app/api/user/route.ts`

```ts
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server";
import { authOptions } from "../../lib/auth";

export const GET = async () => {
    const session = await getServerSession(authOptions);
    if (session.user) {
        return NextResponse.json({
            user: session.user
        })
    }
    return NextResponse.json({
        message: "You are not logged in"
    }, {
        status: 403
    })
}
```

A tiny diagnostic endpoint: hit `/api/user` and it echoes back your session (or a 403
if you're not logged in). Useful for confirming the `session.user.id` callback above
is actually populating correctly, without needing a UI for it.

### `apps/user-app/app/page.module.css`

Scoped CSS Modules for the (currently unused, since `page.tsx` doesn't reference
`styles.main` etc.) default `create-turbo` homepage layout — kept in the starter
because deleting it isn't necessary and it costs nothing to leave in place:

```css
.main {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 6rem;
  min-height: 100vh;
}

.vercelLogo {
  filter: invert(1);
}

.description {
  display: inherit;
  justify-content: inherit;
  align-items: inherit;
  font-size: 0.85rem;
  max-width: var(--max-width);
  width: 100%;
  z-index: 2;
  font-family: var(--font-mono);
}

.description a {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.description p {
  position: relative;
  margin: 0;
  padding: 1rem;
  background-color: rgba(var(--callout-rgb), 0.5);
  border: 1px solid rgba(var(--callout-border-rgb), 0.3);
  border-radius: var(--border-radius);
}

.code {
  font-weight: 700;
  font-family: var(--font-mono);
}

.hero {
  display: flex;
  position: relative;
  place-items: center;
}

.heroContent {
  display: flex;
  position: relative;
  z-index: 0;
  padding-bottom: 4rem;
  flex-direction: column;
  gap: 2rem;
  justify-content: space-between;
  align-items: center;
  width: auto;
  font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial,
    "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji",
    "Segoe UI Symbol", "Noto Color Emoji";
  padding-top: 48px;

  @media (min-width: 768px) {
    padding-top: 4rem;
    padding-bottom: 6rem;
  }
  @media (min-width: 1024px) {
    padding-top: 5rem;
    padding-bottom: 8rem;
  }
}

.logos {
  display: flex;
  z-index: 50;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(25%, auto));
  max-width: 100%;
  width: var(--max-width);
}

.card {
  padding: 1rem 1.2rem;
  border-radius: var(--border-radius);
  background: rgba(var(--card-rgb), 0);
  border: 1px solid rgba(var(--card-border-rgb), 0);
  transition: background 200ms, border 200ms;
}

.card span {
  display: inline-block;
  transition: transform 200ms;
}

.card h2 {
  font-weight: 600;
  margin-bottom: 0.7rem;
}

.card p {
  margin: 0;
  opacity: 0.6;
  font-size: 0.9rem;
  line-height: 1.5;
  max-width: 30ch;
}

@media (prefers-reduced-motion) {
  .card:hover span {
    transform: none;
  }
}

/* Mobile */
@media (max-width: 700px) {
  .content {
    padding: 4rem;
  }

  .grid {
    grid-template-columns: 1fr;
    margin-bottom: 120px;
    max-width: 320px;
    text-align: center;
  }

  .card {
    padding: 1rem 2.5rem;
  }

  .card h2 {
    margin-bottom: 0.5rem;
  }

  .center {
    padding: 8rem 0 6rem;
  }

  .center::before {
    transform: none;
    height: 300px;
  }

  .description {
    font-size: 0.8rem;
  }

  .description a {
    padding: 1rem;
  }

  .description p,
  .description div {
    display: flex;
    justify-content: center;
    position: fixed;
    width: 100%;
  }

  .description p {
    align-items: center;
    inset: 0 0 auto;
    padding: 2rem 1rem 1.4rem;
    border-radius: 0;
    border: none;
    border-bottom: 1px solid rgba(var(--callout-border-rgb), 0.25);
    background: linear-gradient(
      to bottom,
      rgba(var(--background-start-rgb), 1),
      rgba(var(--callout-rgb), 0.5)
    );
    background-clip: padding-box;
    backdrop-filter: blur(24px);
  }

  .description div {
    align-items: flex-end;
    pointer-events: none;
    inset: auto 0 0;
    padding: 2rem;
    height: 200px;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgb(var(--background-end-rgb)) 40%
    );
    z-index: 1;
  }
}

/* Enable hover only on non-touch devices */
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    background: rgba(var(--card-rgb), 0.1);
    border: 1px solid rgba(var(--card-border-rgb), 0.15);
  }

  .card:hover span {
    transform: translateX(4px);
  }
}

.circles {
  position: absolute;
  min-width: 614px;
  min-height: 614px;
  pointer-events: none;
}

.logo {
  z-index: 50;
  width: 120px;
  height: 120px;
}

.logoGradientContainer {
  display: flex;
  position: absolute;
  z-index: 50;
  justify-content: center;
  align-items: center;
  width: 16rem;
  height: 16rem;
}

.turborepoWordmarkContainer {
  display: flex;
  z-index: 50;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  flex-direction: column;
  gap: 1.25rem;
  justify-content: center;
  align-items: center;
  text-align: center;

  @media (min-width: 1024px) {
    gap: 1.5rem;
  }
}

.turborepoWordmark {
  width: 160px;
  fill: white;

  @media (min-width: 768px) {
    width: 200px;
  }
}

.code {
  font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
  font-weight: 700;
}

/* Tablet and Smaller Desktop */
@media (min-width: 701px) and (max-width: 1120px) {
  .grid {
    grid-template-columns: repeat(2, 50%);
  }
}

/* Gradients */
.gradient {
  position: absolute;
  mix-blend-mode: normal;
  will-change: filter;
  pointer-events: none;
}

.gradientSmall {
  filter: blur(32px);
}

.gradientLarge {
  filter: blur(75px);
}

.glowConic {
  background-image: var(--glow-conic);
}

.logoGradient {
  opacity: 0.9;
  width: 120px;
  height: 120px;
}

.backgroundGradient {
  top: -500px;
  width: 1000px;
  height: 1000px;
  opacity: 0.15;
}

.button {
  background-color: #ffffff;
  border-radius: 8px;
  border-style: none;
  box-sizing: border-box;
  color: #000000;
  cursor: pointer;
  display: inline-block;
  font-size: 16px;
  height: 40px;
  line-height: 20px;
  list-style: none;
  margin: 0;
  outline: none;
  padding: 10px 16px;
  position: relative;
  text-align: center;
  text-decoration: none;
  transition: color 100ms;
  vertical-align: baseline;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.button:hover,
.button:focus {
  background-color: #e5e4e2;
}
```

`apps/merchant-app/app/page.module.css` (below) is **byte-for-byte identical** to
this file — both apps got it from the same `create-turbo` template, and neither app
has customized it, so you can literally copy this file across rather than retyping
it.

### `apps/user-app/next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

Auto-generated by Next.js the first time you run `next dev` — you technically don't
need to hand-create this; it regenerates itself. Listed here purely for completeness
since it is genuinely part of the file tree.

### `apps/user-app/public/*.svg`

Four stock icons ship with every `create-turbo` app: `circles.svg` (the animated
background rings on the homepage), `next.svg`, `turborepo.svg`, and `vercel.svg`
(logo marks). None of the starter's actual pages render any of these yet (`page.tsx`
doesn't `<Image>` them in) — they're just present because `create-turbo` puts them in
`public/` by default and nothing deletes them. If you want the exact bytes, grab them
from the official `create-turbo` template output (`npx create-turbo@latest` will
produce identical files) rather than hand-copying SVG paths here — they're pure
static assets with no logic to explain.

### `apps/user-app/README.md`

```md
## Getting Started

First, run the development server:

\`\`\`bash
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

To create [API routes](https://nextjs.org/docs/app/building-your-application/routing/router-handlers) add an `api/` directory to the `app/` directory with a `route.ts` file. For individual endpoints, create a subfolder in the `api` directory, like `api/hello/route.ts` would map to [http://localhost:3000/api/hello](http://localhost:3000/api/hello).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn/foundations/about-nextjs) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_source=github.com&utm_medium=referral&utm_campaign=turborepo-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
```

Left completely stock — it still says `yarn dev` and port 3000, even though this
project uses `pnpm` and this specific app runs on port 3001. Another honest marker
that this is the unedited generator output; feel free to correct it in your own repo,
but the starter as captured does not.

### `apps/user-app/.env`

```
JWT_SECRET=test
NEXTAUTH_URL=http://localhost:3001
```

`JWT_SECRET` backs the `secret` field in `authOptions` (falls back to the literal
string `"secret"` if unset — fine for local dev, never for production).
`NEXTAUTH_URL` tells NextAuth what its own base URL is, which it needs to construct
correct OAuth callback URLs and cookies — critical to set correctly once you deploy
somewhere that isn't `localhost:3001`.

Sanity-check this app in isolation:

```bash
pnpm --filter user-app dev
```

---

## 10. Step 9 — `merchant-app`: Google OAuth

```bash
cd apps/merchant-app
pnpm add next react react-dom next-auth recoil
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer eslint
cd ../..
pnpm install
```

### `apps/merchant-app/package.json`

```json
{
  "name": "merchant-app",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "@repo/store": "workspace:*",
    "@repo/ui": "workspace:*",
    "next": "^14.2.3",
    "next-auth": "^4.24.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recoil": "^0.7.7"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@types/node": "^20.12.7",
    "@types/react": "^18.2.79",
    "@types/react-dom": "^18.2.25",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "typescript": "^5.4.5"
  }
}
```

No `-p` flag on `dev` this time — `merchant-app` runs on Next.js's default port
3000, distinct from `user-app`'s 3001.

### `apps/merchant-app/.eslintrc.js`

```js
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@repo/eslint-config/next.js"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
  },
};
```

### `apps/merchant-app/next.config.js`

```js
/** @type {import('next').NextConfig} */
module.exports = {
  transpilePackages: ["@repo/ui"],
};
```

### `apps/merchant-app/tailwind.config.js`

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### `apps/merchant-app/postcss.config.js`

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### `apps/merchant-app/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### `apps/merchant-app/provider.tsx`

```tsx
"use client"
import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";
export const Providers = ({children}: {children: React.ReactNode}) => {
    return <RecoilRoot>
        <SessionProvider>
            {children}
        </SessionProvider>
    </RecoilRoot>
}
```

Identical in purpose and near-identical in code to `user-app`'s version (only
whitespace differs) — both apps need Recoil + NextAuth context regardless of which
auth *provider* (Credentials vs Google) they use underneath.

### `apps/merchant-app/app/layout.tsx`

```tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "../provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Turborepo",
  description: "Generated by create turbo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <Providers>
        <body className={inter.className}>{children}</body>
      </Providers>
    </html>
  );
}
```

Same untouched `create-turbo` metadata as `user-app` — `merchant-app` never gets a
custom title/description at any stage covered by these guides, unlike `user-app`
which picks up `"Wallet"` in Stage 2.

### `apps/merchant-app/app/page.tsx`

```tsx
"use client";

import { useBalance } from "@repo/store/balance";

export default function() {
  const balance = useBalance();
  return <div>
    hi there {balance}
  </div>
}
```

This is genuinely the entire merchant homepage at this stage: it reads the shared
Recoil balance atom (via `@repo/store/balance`) and renders it. Since nothing ever
calls a setter on `balanceAtom`, this will always print `hi there 0` — it exists to
prove the `@repo/store` package resolves and works across the workspace boundary,
nothing more sophisticated yet.

### `apps/merchant-app/lib/auth.ts`

Note the path: `lib/auth.ts` **at the app root**, not under `app/` — the asymmetry
called out at the top of this guide.

```ts
import GoogleProvider from "next-auth/providers/google";
import db from "@repo/db/client";

export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
        })
    ],
    callbacks: {
      async signIn({ user, account }: {
        user: {
          email: string;
          name: string
        },
        account: {
          provider: "google" | "github"
        }
      }) {
        console.log("hi signin")
        if (!user || !user.email) {
          return false;
        }

        await db.merchant.upsert({
          select: {
            id: true
          },
          where: {
            email: user.email
          },
          create: {
            email: user.email,
            name: user.name,
            auth_type: account.provider === "google" ? "Google" : "Github" // Use a prisma type here
          },
          update: {
            name: user.name,
            auth_type: account.provider === "google" ? "Google" : "Github" // Use a prisma type here
          }
        });

        return true;
      }
    },
    secret: process.env.NEXTAUTH_SECRET || "secret"
  }
```

Contrast this against `user-app`'s Credentials setup:

- **No** `authorize` **function** — Google handles the actual authentication (password,
2FA, etc. all happen on Google's side); NextAuth just receives back a verified
`user.email`/`user.name` once Google's OAuth flow completes.
- `signIn` **callback instead of** `session` **callback** — this runs once, right after
Google confirms the user's identity, and its job is to *sync* that identity into
our own database. `db.merchant.upsert` means: if a `Merchant` row with this email
already exists, update its `name`/`auth_type`; if not, create it. Returning `true`
from this callback tells NextAuth "yes, let this sign-in proceed"; returning
`false` (as happens when `user.email` is missing) blocks the login entirely.
- The inline comment `// Use a prisma type here` next to the ternary
`account.provider === "google" ? "Google" : "Github"` is a leftover TODO —
`account.provider` is already typed as the literal union `"google" | "github"` in
the function signature above it, so this ternary could just as well use the
`AuthType` enum from the Prisma schema directly instead of hand-writing the string
literals — left as an exercise rather than fixed in the starter.
- **No** `session` **callback** at all here — unlike `user-app`, `merchant-app` never
stitches a database ID onto `session.user`. Anything that needs the merchant's
numeric ID later would need to look it up by email instead.

### `apps/merchant-app/app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth"
import { authOptions } from "../../../../lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
```

Four `../` segments this time, not three — climbing from
`app/api/auth/[...nextauth]/` up past `app/` itself to reach the app-root-level
`lib/auth.ts`. Get this path wrong (e.g. copy `user-app`'s three-`../` version
verbatim) and you'll get a module-not-found error at build time — this is exactly
the kind of subtle bug the folder-layout asymmetry invites.

### `apps/merchant-app/app/api/user/route.ts`

```ts
import { NextResponse } from "next/server"
import { PrismaClient } from "@repo/db/client";

const client = new PrismaClient();

export const GET = async () => {
    await client.user.create({
        data: {
            email: "asd",
            name: "adsads"
        }
    })
    return NextResponse.json({
        message: "hi there"
    })
}
```

Flagged in the original file comments as scratch/test code, and it's worth being
explicit about *why* it's scratch: it (a) creates a **new** dummy `User` row on
**every single request** with hardcoded junk data (`"asd"`/`"adsads"`), which will
fail the second time you hit it if `User.email` has a `@unique` constraint (it does,
per the schema above) — so this endpoint actually throws after the first call — and
(b) instantiates a **fresh** `new PrismaClient()` directly here instead of importing
the shared singleton from `packages/db/index.ts`, defeating the entire point of that
singleton pattern. Left in the starter as-is; not something to build on top of.

### `apps/merchant-app/app/page.module.css`

Byte-for-byte identical to `apps/user-app/app/page.module.css` above — copy that
file across rather than retyping it.

### `apps/merchant-app/next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.
```

### `apps/merchant-app/public/*.svg`

Same four stock `create-turbo` icons as `user-app` (`circles.svg`, `next.svg`,
`turborepo.svg`, `vercel.svg`) — identical bytes, unused by any page here.

### `apps/merchant-app/README.md`

```md
## Getting Started

First, run the development server:

\`\`\`bash
yarn dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

To create [API routes](https://nextjs.org/docs/app/building-your-application/routing/router-handlers) add an `api/` directory to the `app/` directory with a `route.ts` file. For individual endpoints, create a subfolder in the `api` directory, like `api/hello/route.ts` would map to [http://localhost:3000/api/hello](http://localhost:3000/api/hello).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn/foundations/about-nextjs) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_source=github.com&utm_medium=referral&utm_campaign=turborepo-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
```

Also unedited — and this time the port number it mentions (3000) actually *is*
correct for `merchant-app`, unlike `user-app`'s copy of the same boilerplate.

### `apps/merchant-app/.env`

```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_SECRET=some-random-secret
```

Create the real credentials in the
[Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
**Create Credentials → OAuth client ID → Web application**, with an authorized
redirect URI of `http://localhost:3000/api/auth/callback/google` (NextAuth's
Google provider constructs this exact callback path automatically; the console
entry just has to match it).

Sanity-check this app in isolation:

```bash
pnpm --filter merchant-app dev
```

---

## 11. Step 10 — Run the Whole Monorepo

```bash
pnpm install
pnpm dev
```

- `user-app` → [http://localhost:3001](http://localhost:3001) — try the Credentials login with any phone
number/password; since no matching `User` row exists yet, the `authorize` function
will create one on the spot (implicit sign-up), then log you straight in.
- `merchant-app` → [http://localhost:3000](http://localhost:3000) — click Login, go through Google's OAuth
consent screen, land back on `hi there 0`, and check `npx prisma studio` to
confirm a `Merchant` row was upserted with your Google email.

Turborepo's `dev` pipeline (from `turbo.json` in Step 2) runs both dev servers
concurrently, uncached, and keeps streaming both apps' logs to your terminal.

---

## 12. Official-Command Cheat Sheet


| Task                                              | Official command                                                            |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| Scaffold the whole monorepo                       | `pnpm dlx create-turbo@latest`                                              |
| Add a new app/package to the monorepo             | `npx turbo gen workspace`                                                   |
| Add a brand-new standalone Next.js app            | `pnpm dlx create-next-app@latest`                                           |
| Init Tailwind in an app                           | `pnpm add -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`   |
| Init Prisma in `@repo/db`                         | `npx prisma init --datasource-provider postgresql`                          |
| Run a DB migration                                | `npx prisma migrate dev --name <name>`                                      |
| Regenerate Prisma Client                          | `npx prisma generate`                                                       |
| Open Prisma Studio (DB GUI)                       | `npx prisma studio`                                                         |
| Add a shared UI component via Turborepo generator | `pnpm turbo gen react-component`                                            |
| Install a dep into one workspace only             | `pnpm --filter user-app add <package>`                                      |
| Install a dev dep at the repo root                | `pnpm add -Dw <package>`                                                    |
| Run one app's dev server                          | `pnpm --filter user-app dev`                                                |
| Run everything                                    | `pnpm dev` (delegates to `turbo dev`)                                       |
| Build everything                                  | `pnpm build` (delegates to `turbo build`)                                   |
| Lint everything                                   | `pnpm lint` (delegates to `turbo lint`)                                     |
| Enable Turborepo remote caching                   | `npx turbo login` then `npx turbo link`                                     |
| Start local Postgres                              | `docker run -e POSTGRES_PASSWORD=mysecretpassword -d -p 5432:5432 postgres` |


---

## 13. What's Deliberately *Not* Here

These belong to Stage 2 and later, and are intentionally excluded so this guide
stays accurate to the raw starter:

- `apps/bank-webhook` (Express payment-callback service)
- `Balance` / `OnRampTransaction` (and later `P2pTransfer`) Prisma models and the
entire "Add Money" / wallet-transfer flow
- The `(dashboard)` route group, sidebar navigation, `/transfer`, `/transactions`,
`/p2p` pages
- `AddMoneyCard`, `BalanceCard`, `OnRampTransactions`, `SidebarItem`, `SendCard`
components, and the `Center`/`Select`/`TextInput` additions to `@repo/ui`
- `packages/typescript-config` customization and `prisma/seed.ts`
- Docker, GitHub Actions CI/CD, and any deployment infrastructure

If/when you're ready to build those, they're additive on top of exactly what's in
this guide — new Prisma models + migrations, a new `bank-webhook` app (scaffold with
`npx turbo gen workspace --name bank-webhook --type app`), and new routes/components
inside `user-app`. See the Stage 2, 3, and 4 guides for each of those in the same
level of detail as this one.