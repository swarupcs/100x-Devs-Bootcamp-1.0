# Paytm-Style Wallet — Full Implementation Guide (Detailed Edition)

This is an expanded, file-by-file, step-by-step walkthrough of the `Paytm-Monorepo`
codebase. It keeps the same four-stage shape as the original guide (Starter Monorepo →
Wallet → P2P Transfer → Docker/CI-CD) plus the deviations section, but goes one level
deeper: every file is explained in terms of *what it does*, *why it's written that way*,
and *how it connects to the files around it*, with the actual control flow traced for
the three flows that matter most (login, add-money/on-ramp, and P2P transfer).

> Note on the Prisma schema: `packages/db/prisma/schema.prisma` itself was not part of
> the file set this guide was generated from — only its **consumers** were (every
> `prisma.<model>.findFirst/create/update` call across the apps, plus the `.env`
> files). The model shapes described below (fields, relations, uniqueness constraints)
> are reconstructed from that usage and should be cross-checked against the real
> schema file if you have it open. Everywhere this happens it's flagged explicitly.

---

## 0. Final repo structure

```
Paytm-Monorepo/
├── package.json                   # root scripts, pnpm workspace config
├── turbo.json                     # Turborepo pipeline config
├── pnpm-workspace.yaml            # declares apps/* and packages/* as workspaces
├── pnpm-lock.yaml                 # single lockfile for the whole monorepo
├── .npmrc                         # pnpm registry/hoisting settings (empty in this repo)
├── docker/
│   └── Dockerfile.user            # builds + runs user-app in a container
├── .github/workflows/
│   ├── build.yml                  # CI — build check on every PR into main
│   └── push.yml                   # CD — build, push to Docker Hub, deploy to EC2
├── apps/
│   ├── user-app/                  # the wallet (Credentials auth)
│   ├── merchant-app/              # merchant dashboard (Google OAuth)
│   └── bank-webhook/              # Express service simulating a bank's webhook
└── packages/
    ├── db/                        # Prisma schema + client singleton
    ├── ui/                        # shared React components
    ├── store/                     # shared Recoil balance atom
    ├── eslint-config/             # shared ESLint configs (base/next/react-internal)
    └── typescript-config/         # shared tsconfig bases (referenced, not shown)
```

Every app depends on `@repo/db` for data access; `user-app` and `merchant-app`
additionally depend on `@repo/ui` (shared components) and `@repo/store` (a Recoil atom
that currently exists but isn't wired into either app's UI yet — see §2.4).

---

## 1. Stage 1 — Starter monorepo (auth for both apps)

### 1.1 `packages/db/index.ts` — the Prisma singleton

```ts
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => new PrismaClient()

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
export * from '@prisma/client'
```

Step by step:

1. `prismaClientSingleton()` is just a factory — calling `new PrismaClient()` opens a
   connection pool to Postgres.
2. `declare global { var prismaGlobal: ... }` extends TypeScript's global scope so
   `globalThis.prismaGlobal` type-checks. This is necessary because the *value* being
   stashed there survives module reloads, but the *type system* has no idea that field
   exists on `globalThis` by default.
3. `const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()` — on the very
   first import, `globalThis.prismaGlobal` is `undefined`, so a new client is created.
4. The `if (process.env.NODE_ENV !== 'production')` guard then caches that client on
   `globalThis`. In development, Next.js's dev server hot-reloads route modules on every
   file save, which would normally re-run this whole file and create a *new*
   `PrismaClient` (and therefore a new connection pool) on every save — quickly
   exhausting Postgres's `max_connections`. Stashing the instance on `globalThis` (which
   is **not** reset between hot reloads, only between full process restarts) means the
   same client is reused across saves. In production there's no hot-reload cycle, so
   this caching is skipped — each server process just gets its own single client for
   its lifetime.
5. `export * from '@prisma/client'` re-exports every generated type (`User`, `Balance`,
   `OnRampTransaction`, enums, etc.) so consumers can `import { OnRampTransaction } from
   "@repo/db/client"` instead of reaching into `@prisma/client` directly.

Every server-side file in this repo that touches the database imports this same default
export, so there is exactly **one** live connection pool per running process, no matter
how many files call into it.

### 1.2 `apps/user-app/app/lib/auth.ts` — Credentials auth doubling as signup

```ts
export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phone: { label: "Phone number", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const hashedPassword = await bcrypt.hash(credentials.password, 10);
        const existingUser = await db.user.findFirst({ where: { number: credentials.phone } });

        if (existingUser) {
          if (!existingUser.password) return null;
          const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
          if (passwordValidation) {
            return { id: existingUser.id.toString(), name: existingUser.name, email: existingUser.number };
          }
          return null;
        }

        try {
          const user = await db.user.create({ data: { number: credentials.phone, password: hashedPassword } });
          return { id: user.id.toString(), name: user.name, email: user.number };
        } catch (e) { console.error(e); }
        return null;
      }
    })
  ],
  secret: process.env.JWT_SECRET || "secret",
  callbacks: {
    async session({ token, session }) {
      session.user.id = token.sub
      return session
    }
  }
}
```

Trace through both cases:

- **Existing user, correct password**: `db.user.findFirst` finds a row → the
  `!existingUser.password` guard passes (there is a password) → `bcrypt.compare` checks
  the plaintext the user just typed against the stored hash → on match, returns a user
  object shaped like NextAuth expects (`id`, `name`, `email` — note `email` here is
  actually the phone number, reused as the unique display identifier since this app has
  no real email field).
- **Existing user, wrong password**: same path, but `bcrypt.compare` returns `false`,
  so `authorize` returns `null`, and NextAuth surfaces this as a failed login.
- **Brand-new phone number**: `findFirst` returns `null` → falls into the `try` block →
  `db.user.create` inserts a new row with the *hash* (not the plaintext) as the stored
  password → returns the new user immediately, logging them in. **There is no separate
  sign-up screen** — the first time any phone number is used, it's registered on the
  spot. This is a deliberate simplification for the course project, not an oversight,
  but it does mean there's no "this number is already taken, please log in instead"
  distinction beyond the password check above.
- **Existing user with a null password** (e.g. a row created by some other path that
  never set a password): the guard `if (!existingUser.password) return null;` stops the
  flow before it would otherwise call `bcrypt.compare(plaintext, null)`, which would
  throw a runtime type error. This is one of the toolchain fixes documented in §5.6.

The `session` callback runs on every `useSession()`/`getServerSession()` call on the
client or server. `token.sub` is the JWT's "subject" claim, which NextAuth populates
with the id returned from `authorize` above. Copying it onto `session.user.id` is what
lets every other file in this app write `session?.user?.id` and get the numeric user id
— without this callback, `session.user` would only carry `name`/`email`/`image`.

### 1.3 `apps/merchant-app/lib/auth.ts` — Google OAuth with upsert-on-signin

```ts
export const authOptions = {
  providers: [GoogleProvider({ clientId: ..., clientSecret: ... })],
  callbacks: {
    async signIn({ user }) {
      if (!user || !user.email) return false;
      await db.merchant.upsert({
        select: { id: true },
        where: { email: user.email },
        create: { email: user.email, name: user.name, auth_type: "Google" },
        update: { name: user.name, auth_type: "Google" }
      });
      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "secret"
}
```

Unlike `user-app`, there's no manual credential check here — Google has already verified
the person's identity by the time this callback runs. `signIn` fires *after* Google
redirects back with a verified profile, and its only job is to make sure a `Merchant`
row exists for that email, using `upsert` so this works identically whether it's the
merchant's first login ever (`create` branch) or their hundredth (`update` branch, which
just refreshes the display name in case it changed on the Google account). Returning
`false` from `signIn` would abort the login — here that only happens if Google somehow
returns a profile with no email at all, which practically never happens with the default
scope.

### 1.4 Route handlers — `app/api/auth/[...nextauth]/route.ts` (both apps)

```ts
import NextAuth from "next-auth"
import { authOptions } from "../../../lib/auth"
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

This is the Next.js App Router's "catch-all route" pattern: the `[...nextauth]` folder
name means this one file answers **every** request under `/api/auth/*` —
`/api/auth/signin`, `/api/auth/callback/google`, `/api/auth/session`, `/api/auth/signout`,
etc. — by handing them all to the single `NextAuth(authOptions)` handler, which
internally dispatches based on the path suffix. Exporting the same `handler` as both
`GET` and `POST` is required because different NextAuth internal routes use different
HTTP methods (the sign-in page is a `GET`, submitting credentials is a `POST`).

### 1.5 Providers — `provider.tsx` (both apps, identical)

```tsx
"use client"
export const Providers = ({children}) => (
  <RecoilRoot>
    <SessionProvider>{children}</SessionProvider>
  </RecoilRoot>
)
```

Wrapping `children` in `RecoilRoot` makes the `packages/store` atom (§2.4) available
anywhere in the tree via `useRecoilValue`/`useSetRecoilState`, even though nothing in
this codebase actually calls those hooks yet. `SessionProvider` is what lets any client
component further down the tree call `useSession()` without prop-drilling the session
down manually — `AppbarClient` (§2.5) is the one component in this repo that actually
relies on it.

---

## 2. Stage 2 — Balances, on-ramp deposits, dashboard

### 2.1 Data model (reconstructed from usage — see the note at the top of this doc)

```prisma
model User {
  id       Int      @id @default(autoincrement())
  number   String   @unique
  password String?
  name     String?
  balance  Balance?
  onRampTransactions OnRampTransaction[]
  sentTransfers      P2pTransfer[] @relation("FromUser")
  receivedTransfers  P2pTransfer[] @relation("ToUser")
}

model Merchant {
  id        Int    @id @default(autoincrement())
  email     String @unique
  name      String?
  auth_type String   // "Google"
}

model Balance {
  id     Int  @id @default(autoincrement())
  userId Int  @unique
  amount Int  // paise
  locked Int  // paise
  user   User @relation(fields: [userId], references: [id])
}

model OnRampTransaction {
  id        Int      @id @default(autoincrement())
  status    OnRampStatus  // Processing | Success | Failure
  token     String   @unique
  provider  String
  startTime DateTime
  userId    Int
  amount    Int      // paise
  user      User     @relation(fields: [userId], references: [id])
}

model P2pTransfer {
  id         Int      @id @default(autoincrement())
  amount     Int      // paise
  timestamp  DateTime
  fromUserId Int
  toUserId   Int
  fromUser   User @relation("FromUser", fields: [fromUserId], references: [id])
  toUser     User @relation("ToUser", fields: [toUserId], references: [id])
}
```

Why `P2pTransfer` needs two `@relation(...)` names: it has **two** foreign keys into the
same `User` table (`fromUserId` and `toUserId`). Without explicit relation names Prisma
can't tell which `User`-side field (`sentTransfers` vs `receivedTransfers`) corresponds
to which `P2pTransfer` foreign key, and schema generation fails with an ambiguous
relation error. Money is stored as `Int` (paise) everywhere, never `Float` — every place
that renders an amount in the UI divides by 100 at render time (see `BalanceCard`,
`OnRampTransactions` below), so no rounding error can ever creep into a stored balance.

### 2.2 `apps/bank-webhook/src/index.ts` — the simulated bank

```ts
const app = express();
app.use(express.json());

app.post("/hdfcWebhook", async (req, res) => {
  const paymentInformation = {
    token: req.body.token,
    userId: req.body.user_identifier,
    amount: req.body.amount
  };
  try {
    await db.$transaction([
      db.balance.updateMany({
        where: { userId: Number(paymentInformation.userId) },
        data: { amount: { increment: Number(paymentInformation.amount) } }
      }),
      db.onRampTransaction.updateMany({
        where: { token: paymentInformation.token },
        data: { status: "Success" }
      })
    ]);
    res.json({ message: "Captured" });
  } catch (e) {
    console.error(e);
    res.status(411).json({ message: "Error while processing webhook" });
  }
});

app.listen(3003);
```

Step by step:

1. `express.json()` middleware parses the incoming request body so `req.body.token`
   etc. are available synchronously.
2. The handler pulls three fields out of whatever the "bank" (in reality: a `curl`
   command or Postman during testing) posted — no schema validation at all, flagged in
   the source with `//TODO: Add zod validation here?`.
3. `db.$transaction([...])` — the **array** form. Both operations run inside one
   database transaction (either both commit or, if either throws, neither does), but
   Prisma does *not* let the second operation read the first operation's result — it's
   "fire both statements atomically," not "read-then-write." That's fine here because
   neither statement depends on the other's outcome; they're just two independent
   updates that should succeed or fail together for consistency.
4. `db.balance.updateMany(...)` matches **purely on `userId`** — it does not check the
   token at all. This means: *any* POST to this endpoint with a valid `userId` and
   `amount` will credit that user's balance, whether or not the `token` matches a real,
   pending `OnRampTransaction`. The **second** statement — the `onRampTransaction`
   update, matched by `token` — is what actually gates whether a transaction record
   flips to `"Success"`. If the token doesn't match anything, that `updateMany` matches
   zero rows (Prisma does not throw on this — `updateMany` succeeds with `count: 0`),
   but the balance increment from the first statement has already happened regardless.
   This is worth knowing before ever exposing this endpoint outside a local dev/test
   environment: it currently trusts the caller's claimed `userId` and `amount` outright.
5. `updateMany` (rather than `update`) is used specifically because it never throws a
   "record not found" error the way `update` does on a missing unique key — it silently
   matches zero-or-more rows. That keeps a malformed or already-processed webhook call
   from crashing the process; it just becomes a no-op for that branch.
6. On any thrown error (e.g. a DB connectivity issue), the handler returns HTTP `411`
   with a generic message — not a semantically meaningful status code for this kind of
   failure, but it's what's actually implemented, so any client testing against this
   webhook should treat "not 200" as failure regardless of the exact code.

This file is bundled with **esbuild**, not `tsc`, because it's a single entry-point
service with no complex type-checking pipeline to gate on — esbuild's speed matters
more than `tsc`'s incremental build graph for a one-file app like this.

### 2.3 `apps/user-app/app/lib/actions/createOnrampTransaction.ts` — the "add money" server action

```ts
"use server";
export async function createOnRampTransaction(provider: string, amount: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !session.user?.id) return { message: "Unauthenticated request" };

  const token = (Math.random() * 1000).toString();
  await prisma.onRampTransaction.create({
    data: {
      provider,
      status: "Processing",
      startTime: new Date(),
      token,
      userId: Number(session?.user?.id),
      amount: amount * 100
    }
  });
  return { message: "Done" };
}
```

Because this file starts with `"use server"`, Next.js compiles it into a real HTTP
endpoint under the hood and generates a client-safe stub — from the browser's point of
view, calling `createOnRampTransaction(provider, value)` inside `AddMoneyCard` (§2.5)
looks like a normal async function call, but it actually performs a network round-trip
to the server, where the code above runs with full access to `getServerSession` and
`prisma`. Key details:

- The **auth check happens first**, before touching the database, and returns early
  with an unauthenticated message if there's no session — even though nothing in the
  current UI ever calls this action while logged out, this is the actual server-side
  boundary that prevents a crafted request from creating transactions for no user.
- `amount * 100` — the UI collects a plain rupee amount (e.g. `500`); this is where it's
  converted to paise before ever touching the database, keeping the "always store
  integers" invariant from §2.1.
- The random `token` stands in for what a real payment gateway would hand back as a
  correlation ID. It's generated *before* the bank has been contacted at all — this
  action's whole job is just to record "I am about to attempt a ₹500 deposit via HDFC,
  here's a token to match it against later," then the UI redirects the browser to the
  (fake) bank page, and the bank-webhook handler above is what later marks this specific
  row `"Success"` by matching on that same token.

### 2.4 `packages/store` — the (currently unused) Recoil balance atom

```ts
// atoms/balance.ts
export const balanceAtom = atom<number>({ key: "balance", default: 0 });

// hooks/useBalance.ts
export const useBalance = () => useRecoilValue(balanceAtom);

// index.ts
export {};
```

This package defines a Recoil atom and a convenience hook for reading it, but **nothing
in `user-app` or `merchant-app` currently imports `useBalance` or sets `balanceAtom`** —
`BalanceCard` instead receives its `amount`/`locked` props directly from the server
component that fetched them via Prisma (`transfer/page.tsx`, §2.5). The `index.ts` only
re-exports an empty object (`export {}`), meaning `atoms/balance.ts` and
`hooks/useBalance.ts` aren't even reachable via `@repo/store`'s public entry point today
— a consumer would have to reach into `@repo/store/src/hooks/useBalance` directly. This
package exists as scaffolding for a future client-side, globally-shared balance display
(e.g. showing the balance in the Appbar itself) that hasn't been wired up yet.

### 2.5 `@repo/ui` components used by the wallet

- **`card.tsx`** — a plain bordered container: `<h1>` for the `title` prop, then
  `<div>{children}</div>` for the body. (The original course guide's version of this
  file wrapped `children` in a `<p>` tag instead of a `<div>` — see deviation #7 in §5;
  the version in this repo has already been corrected.)
- **`Center.tsx`** — `<div className="flex justify-center flex-col h-full">` wrapping
  another centered `<div>`, used only by `SendCard` (§3.3) to center the "Send" card
  both vertically and horizontally within its `90vh` parent.
- **`Select.tsx`** — a controlled `<select>` where each option carries a `key` (used as
  both the React key and the value passed to `onSelect`) separate from its display
  `value`. `AddMoneyCard` uses this so the internal bank *name* string doubles as the
  key without needing a separate numeric id per bank.
- **`TextInput.tsx`** — a labeled, controlled text input; every field in this app
  (amount, phone number for P2P) is one of these, with validation left entirely to the
  server action that eventually receives the value.
- **`button.tsx`** — a single styled `<button>` taking `onClick` and `children`; used
  everywhere a click needs to trigger a server action or a `signIn`/`signOut` call.
- **`Appbar.tsx`** — the shared top bar: shows "PayTM" and a single button that's either
  "Login" or "Logout" depending on whether a `user` prop is present, wired by the caller
  to `onSignin`/`onSignout`.

### 2.6 `apps/user-app` dashboard layout and pages

- **`app/(dashboard)/layout.tsx`** — a Next.js **route group**. The parentheses around
  `(dashboard)` mean this folder groups `dashboard/`, `transfer/`, `transactions/`, and
  `p2p/` under one shared layout (a fixed-width sidebar with four `SidebarItem`s) without
  `(dashboard)` itself ever appearing in the URL — `/dashboard`, `/transfer`, etc. are
  all real, top-level paths.
- **`components/SidebarItem.tsx`** — a client component that reads the current path via
  `usePathname()`, compares it to its own `href` prop, and conditionally applies a
  highlight color (`text-[#6a51a6]`) when it's the active route; clicking it calls
  `router.push(href)` for client-side navigation without a full page reload.
- **`app/(dashboard)/transfer/page.tsx`** — an **async Server Component**. This is the
  key App Router capability being exercised here: `getBalance()` and
  `getOnRampTransactions()` are plain `async` functions defined in the same file that
  call `getServerSession` + `prisma.balance.findFirst` / `prisma.onRampTransaction.findMany`
  directly, with **no API route in between** — the component itself runs entirely on the
  server, fetches its own data, and streams fully-rendered HTML to the browser. If
  there's no balance row yet, `getBalance()` falls back to `{ amount: 0, locked: 0 }`
  rather than crashing.
- **`components/AddMoneyCard.tsx`** — a client component. On mount it defaults
  `provider`/`redirectUrl` to the first entry in `SUPPORTED_BANKS` (HDFC). Typing into
  the `TextInput` updates local `value` state; changing the `Select` swaps both
  `provider` and `redirectUrl` to match the chosen bank. Clicking "Add Money" does two
  things in sequence: `await createOnRampTransaction(provider, value)` (creates the
  `Processing` row server-side, §2.3), *then* `window.location.href = redirectUrl` — the
  browser only navigates away to the fake bank page after the transaction record has
  been safely persisted.
- **`components/BalanceCard.tsx`** — a pure presentational component; every displayed
  number is the raw paise value divided by 100, including a computed "Total Balance"
  row (`(locked + amount) / 100`) that's never fetched directly from the database — it's
  derived in the component itself from the two other values passed in as props.
- **`components/OnRampTransactions.tsx`** — renders an empty state ("No Recent
  transactions") when the array is empty, otherwise one row per transaction showing the
  date (`t.time.toDateString()`) and a `+ Rs {t.amount / 100}` line. Every entry is
  rendered as an *incoming* transaction (`+`) regardless of its actual `status` field —
  there's no visual distinction in this component between `Processing`, `Success`, and
  `Failure` rows, something to be aware of if you deposit money and immediately check
  this list before the webhook has fired.
- **`app/layout.tsx`** — wraps every page in `<Providers>` → `<AppbarClient />` → page
  content, inside a full-viewport `bg-[#ebe6e6]` background `div`, so the header appears
  on literally every route, including the sign-in page itself.
- **`components/AppbarClient.tsx`** — the client-side wrapper around the shared
  `Appbar`: reads `useSession()` for the `user` prop, passes NextAuth's `signIn`
  directly through as `onSignin`, but wraps `signOut` in its own async function that
  calls `router.push("/api/auth/signin")` immediately afterward — without this explicit
  redirect, `signOut()` alone would leave the browser sitting on whatever protected page
  it was already on, now with no session.
- **`app/page.tsx`** — the root route is a pure routing gate: an async Server Component
  that calls `getServerSession`, then `redirect('/dashboard')` if logged in or
  `redirect('/api/auth/signin')` if not. Nothing is ever actually rendered here; both
  branches throw Next.js's internal redirect signal before any JSX would matter.
- **`app/api/user/route.ts`** — a small `GET` API route (not used by any UI in this
  repo, but present): returns the session's `user` object as JSON with `200`, or a
  `403` with `{ message: "You are not logged in" }` if there's no session. Useful as a
  quick `curl`-able health check for "is my session cookie valid."

---

## 3. Stage 3 — P2P transfers

### 3.1 `apps/user-app/app/lib/actions/p2pTransfer.tsx` — the transaction that matters most

```ts
"use server"
export async function p2pTransfer(to: string, amount: number) {
  const session = await getServerSession(authOptions);
  const from = session?.user?.id;
  if (!from) return { message: "Error while sending" };

  const toUser = await prisma.user.findFirst({ where: { number: to } });
  if (!toUser) return { message: "User not found" };

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(from)} FOR UPDATE`;

    const fromBalance = await tx.balance.findUnique({ where: { userId: Number(from) } });
    if (!fromBalance || fromBalance.amount < amount) {
      throw new Error('Insufficient funds');
    }

    await tx.balance.update({ where: { userId: Number(from) }, data: { amount: { decrement: amount } } });
    await tx.balance.update({ where: { userId: toUser.id }, data: { amount: { increment: amount } } });
    await tx.p2pTransfer.create({
      data: { fromUserId: Number(from), toUserId: toUser.id, amount, timestamp: new Date() }
    });
  });
}
```

Walking through exactly why each line exists, in order:

1. **Auth check, again, first.** Same pattern as `createOnRampTransaction` — no database
   work happens before confirming there's a logged-in sender.
2. **Look up the recipient by phone number.** `prisma.user.findFirst({ where: { number:
   to } })` — if nobody has that number, the function returns early with `"User not
   found"`, before ever opening a transaction. This means a typo'd recipient number
   costs nothing and touches no locks.
3. **Enter the interactive `$transaction(async (tx) => {...})` form** — different from
   the webhook's array form (§2.2) because this operation genuinely needs to *read*
   something (the sender's current balance) and make a *decision* based on that read
   (enough funds or not) before deciding what to write. The array form can't express
   "read, then conditionally write."
4. **`SELECT * FROM "Balance" WHERE "userId" = ${from} FOR UPDATE`** — a raw SQL escape
   hatch, used because Prisma's query builder has no first-class API for requesting a
   row-level lock. `FOR UPDATE` tells Postgres: "any other transaction that also tries
   to `SELECT ... FOR UPDATE` (or write to) this same row must wait until *this*
   transaction commits or rolls back." This is the entire concurrency-safety mechanism
   for this function. Without it: two P2P transfers initiated from the same sender at
   nearly the same instant could both run `findUnique` before either has written
   anything, both see the same starting balance, both independently conclude "yes,
   sufficient funds," and both proceed to decrement — overdrawing the account by the
   second transfer's amount. With the lock in place, the second transaction's `SELECT
   ... FOR UPDATE` blocks until the first transaction fully commits (updating the
   balance), so by the time the second transaction's `findUnique` runs, it sees the
   *already-decremented* balance and correctly rejects itself if funds are now
   insufficient.
5. **`tx.balance.findUnique` + the insufficient-funds guard.** Note this happens
   *inside* the same `tx` used for the raw lock query — using the plain `prisma` client
   here instead of `tx` would read outside the transaction/lock scope and defeat the
   whole point of step 4.
6. **`throw new Error('Insufficient funds')`** — this is how Prisma's interactive
   `$transaction` callback signals "roll everything back." Nothing written before this
   throw (in this case, nothing has been written yet at all — the throw happens before
   either `update` call) survives; more importantly, if this throw happened *after* the
   sender's balance had already been decremented, Prisma would undo that decrement too.
   The caller (`p2pTransfer` itself) does not currently `catch` this specific error —
   it propagates up and, as written today, the function returns `undefined` in the
   failure case rather than a `{ message: ... }` object like the two early-return paths
   above. `SendCard` (§3.3) does not currently inspect the return value at all, so from
   the user's perspective an insufficient-funds rejection currently looks identical to
   a successful transfer (no error is shown in the UI either way) — worth fixing if this
   were taken further, though it was verified end-to-end (§6) that the *database
   effects* are correctly rolled back regardless of what the UI shows.
7. **Two `update` calls plus one `create`**, all still inside `tx`, so all three succeed
   or all three roll back together: decrement sender, increment recipient, then log the
   transfer itself as a `P2pTransfer` row for history/audit purposes. Order matters only
   in that the decrement is written before the increment — with the row lock already
   held from step 4, this ordering has no bearing on correctness, but it does mean if
   something were to fail between the two `update` calls (e.g. a constraint violation on
   the recipient's `userId`), the whole `$transaction` still rolls back the sender's
   already-applied decrement, because both statements are inside the same transaction.

### 3.2 `apps/user-app/components/SendCard.tsx` and the `/p2p` page

```tsx
export function SendCard() {
  const [number, setNumber] = useState("");
  const [amount, setAmount] = useState("");
  return (
    <div className="h-[90vh]">
      <Center>
        <Card title="Send">
          <TextInput placeholder="Number" label="Number" onChange={setNumber} />
          <TextInput placeholder="Amount" label="Amount" onChange={setAmount} />
          <Button onClick={async () => { await p2pTransfer(number, Number(amount) * 100) }}>
            Send
          </Button>
        </Card>
      </Center>
    </div>
  )
}
```

This is the first place `Center` (built in Stage 2 but unused until now) is actually
rendered — it vertically **and** horizontally centers the "Send" card inside a
`90vh`-tall wrapper. Both fields are plain local `useState` strings with zero validation
on the client: a non-numeric amount becomes `NaN` after `Number(amount)`, which then
multiplies by `100` to also produce `NaN`, which Prisma will reject when it tries to
write an `Int` field — so malformed input surfaces as a thrown/rejected server action
rather than a friendly inline error message. Every real constraint (missing recipient,
insufficient funds) is enforced entirely inside `p2pTransfer` on the server, by design —
the client never needs to be trusted.

`app/(dashboard)/p2p/page.tsx` is a one-line wrapper: `<div className="w-full"><SendCard
/></div>` — no data-fetching of its own, since `SendCard` needs nothing from the server
until the moment "Send" is actually clicked.

### 3.3 Sidebar update

`app/(dashboard)/layout.tsx`'s sidebar gained a fourth `SidebarItem` pointing at `/p2p`,
with an inline SVG diagonal arrow icon (`P2PTransferIcon`, sourced from Heroicons) drawn
directly in the layout file alongside the other three icon functions (`HomeIcon`,
`TransferIcon`, `TransactionsIcon`) rather than as separate component files.

---

## 4. Stage 4 — Docker + CI/CD

### 4.1 `docker/Dockerfile.user` — step by step

```dockerfile
FROM node:20.12.0-alpine3.19
WORKDIR /usr/src/app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile
RUN cd packages/db && npx prisma generate && cd ../..
RUN pnpm run build
CMD ["npm", "run", "start-user-app"]
```

1. **`node:20.12.0-alpine3.19`** — Alpine keeps the final image small, at the cost of
   using `musl` libc instead of `glibc`. This matters directly for `bcrypt`, which is a
   native addon (`@mapbox/node-pre-gyp` fetches a prebuilt `.node` binary matching the
   platform/libc combination at install time, or falls back to compiling from source if
   no matching prebuilt exists) — worth remembering if a *future* native dependency
   fails mysteriously only inside this container and not on a developer's own machine.
2. **`corepack enable`** — activates the `packageManager` field pinned in the root
   `package.json` (see deviation #11 in §5), so the exact pnpm version this repo was
   built and tested against is what actually runs `pnpm install` inside the image,
   rather than whatever pnpm happens to be baked into the base Node image.
3. **Copying manifests before source** (`package.json`, `pnpm-lock.yaml`,
   `pnpm-workspace.yaml`, `turbo.json` first; `apps`/`packages` after) is the standard
   Docker layer-caching trick — if only application code changes between builds (not
   dependencies), Docker can reuse the cached `pnpm install` layer and skip straight to
   copying the new source, since the manifest-only layer's hash hasn't changed. As
   written here, `apps` and `packages` are copied in two separate steps right after, so
   this caching benefit is realized as long as dependency files genuinely didn't change.
4. **`pnpm install --frozen-lockfile`** — installs from the workspace lockfile exactly
   as pinned, refusing to update it; this is the correct install flag for CI/CD (as
   opposed to local development, where a plain `pnpm install` is fine).
5. **`npx prisma generate`** run explicitly, scoped into `packages/db`, at **build
   time** — this regenerates the Prisma Client's TypeScript types and query engine
   binary matching the container's own platform, so the compiled app doesn't need the
   `prisma` CLI (or any network access to fetch engine binaries) present at container
   *start* time — only at build time.
6. **`pnpm run build`** — this invokes Turborepo's `build` pipeline, which (per
   `turbo.json`'s task graph) builds **every** app in the monorepo — `bank-webhook`,
   `merchant-app`, and `user-app` — even though this particular image only ever runs
   `user-app`. The most direct optimization available here, not currently applied,
   would be `turbo build --filter=user-app...` (the `...` including its workspace
   dependencies) to skip building the other two apps entirely.
7. **`CMD ["npm", "run", "start-user-app"]`** — the container's actual entrypoint at
   runtime. This resolves to the root `package.json` script:
   ```json
   "start-user-app": "cd ./apps/user-app && npm run start"
   ```
   which in turn runs Next.js's own `next start` inside `user-app`'s directory, serving
   the already-built `.next` output from step 6. The reason this indirection exists (a
   root script that `cd`s into the app, rather than the Dockerfile `CMD`-ing directly
   into the app's directory) is so the exact same `CMD` line keeps working even if the
   underlying app-level start script changes.

### 4.2 CI — `.github/workflows/build.yml`

Triggers on every pull request targeting `main`. Steps: checkout the repo → set up Node
20 → `pnpm install --frozen-lockfile` → `pnpm run build`. Its entire purpose is to fail
the PR check if the monorepo doesn't build cleanly — catching a broken build **before**
it's merged, rather than after the CD pipeline (§4.3) has already tried to build and
deploy it.

### 4.3 CD — `.github/workflows/push.yml`

Triggers on every push to `main`. Steps, in order:

1. Checkout the repo.
2. Copy `docker/Dockerfile.user` to the repo root — necessary because Docker's build
   context is normally the directory containing the Dockerfile, and this Dockerfile's
   `COPY apps ./apps` / `COPY packages ./packages` lines need the repo root as their
   context, not the `docker/` subfolder.
3. Log in to Docker Hub using the `DOCKER_USERNAME`/`DOCKER_PASSWORD` repo secrets.
4. Build and push the image.
5. Pull the just-pushed image back down as a basic sanity check that the push actually
   succeeded and the image is pullable.
6. SSH into an EC2 instance (using `SSH_HOST`/`SSH_USERNAME`/`SSH_KEY` secrets) and run:
   ```bash
   sudo docker pull <user>/web-app:latest
   sudo docker stop web-app || true
   sudo docker rm web-app || true
   sudo docker run -d --name web-app -p 3005:3000 <user>/web-app:latest
   ```

The `|| true` after `stop` and `rm` is what makes this script idempotent across repeated
deploys — the very first deploy has no existing `web-app` container to stop or remove,
and without `|| true` those commands would exit non-zero and abort the rest of the
script (including the crucial `docker run` line) on that very first run.

### 4.4 One-time manual setup

**GitHub repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | A Docker Hub **access token** (not the literal account password) |
| `SSH_HOST` | Public IP of the EC2 instance |
| `SSH_USERNAME` | `ubuntu` (default for Ubuntu AMIs) |
| `SSH_KEY` | Full contents of the `.pem` private key |

**EC2 instance, once:**

```bash
ssh -i your-key.pem ubuntu@<EC2-IP>
sudo apt-get update
sudo apt-get install docker.io -y
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Then open inbound port **3005** in the instance's security group — the single most
common reason a first deploy "does nothing" despite every GitHub Actions step reporting
green. Also update `push.yml`'s image tag (`100xdevs/web-app:latest` in the template) to
your own Docker Hub namespace before the push step will succeed against your account.

**Known gap** (same as the original course guides): neither the Dockerfile nor the
`docker run` line in `push.yml` passes real environment variables into the container, so
`DATABASE_URL`/`JWT_SECRET`/`NEXTAUTH_URL` are unset at runtime unless `-e` flags or an
env file are added to the deploy step. Left as a follow-up, not something this pipeline
handles today.

---

## 5. Deviations from the original course guides (and why)

Every item below was caught by an actual build failure or runtime error while getting
this specific repo — on its actual, newer dependency versions — to compile and run, not
by reading the guide and guessing.

1. **pnpm instead of npm inside the Dockerfile.** This repo uses pnpm workspaces
   end-to-end (`workspace:*` internal deps in `pnpm-lock.yaml`), which plain `npm
   install` cannot resolve. Fixed by enabling Corepack and running `pnpm install
   --frozen-lockfile`, copying `pnpm-lock.yaml`/`pnpm-workspace.yaml` instead of
   `package-lock.json`.

2. **Branch name `main`, not `master`.** Both workflow files were updated to trigger on
   `main`, and the pinned Action versions were bumped past end-of-support
   (`actions/checkout@v3/v2` → `v4`, `docker/login-action@v1` → `v3`,
   `docker/build-push-action@v2` → `v5`).

3. **Missing `@repo/typescript-config` dependency.** All three apps' `tsconfig.json`
   files `extends` a workspace package that none of them declared as a
   `devDependency` — invisible under npm's hoisted `node_modules`, but pnpm's strict,
   symlinked `node_modules` rejects the phantom dependency outright
   (`error TS6053: File '@repo/typescript-config/nextjs.json' not found`). Fixed by
   adding the missing `"@repo/typescript-config": "workspace:*"` entries.

4. **React version mismatch between `@repo/ui` and the apps.** `@repo/ui` was pinned to
   React 19 while both Next.js 14 apps use React 18. Because `@repo/ui` ships raw
   `.tsx` consumed via `transpilePackages` with no separate type-check boundary,
   `ReactNode`/`JSX.Element` resolved inconsistently, producing `Type
   'ReactElement<...>' is not assignable to type 'ReactNode'`. Fixed by pinning
   `@repo/ui` down to React 18 (Next 14 doesn't support React 19, so downgrading `ui`
   was the only viable direction).

5. **Missing `apps/merchant-app/tsconfig.json`.** Unlike `user-app`, `merchant-app` had
   none, so Next.js auto-generated a minimal one whose default `moduleResolution`
   couldn't resolve `@repo/ui`'s subpath exports (`Cannot find module
   '@repo/ui/appbar'`). Fixed by adding an explicit `tsconfig.json` extending
   `@repo/typescript-config/nextjs.json`, matching `user-app`.

6. **`existingUser.password` nullability.** `User.password` is optional in the schema,
   but `authorize()` passed it straight into `bcrypt.compare()`, which expects a
   non-null string — fine under a loose TS config, but a real type error under strict
   mode. Fixed with an explicit `if (!existingUser.password) return null;` guard.

7. **`<p>{children}</p>` in `packages/ui/src/card.tsx`.** The original guide's `Card`
   rewrite wrapped `children` in a `<p>`. Every consumer passes `<div>`-based content,
   and `<div>` is not valid inside `<p>` per the HTML spec, producing a live hydration
   mismatch (`Warning: In HTML, %s cannot be a descendant of <p>`), reproduced in a
   browser on the `/transfer` page during validation. Fixed by rendering
   `<div>{children}</div>` instead — no visual change, no hydration error. (This fix is
   already present in the version of `card.tsx` shown in §2.5.)

8. **Port 5432 conflict with a native Windows Postgres service.** A Docker Postgres
   container publishing `5432:5432` appeared to start fine, but `prisma migrate dev`
   failed with `P1000: Authentication failed` because a separate, pre-existing native
   Windows `postgres.exe` process was already bound to `localhost:5432` and silently
   intercepting the connection. Fixed by publishing the container on `5433:5432` and
   pointing every `DATABASE_URL` at `localhost:5433` — matches every `.env.example` file
   in this repo, which all use port `5433`.

9. **`@types/express@^4.19.0` doesn't exist.** The 4.x line of `@types/express` never
   published a `4.19.x` release. Fixed by pinning `^4.17.21` — the version actually
   resolved in `apps/bank-webhook`'s dependencies today.

10. **`pnpm.onlyBuiltDependencies` needed in root `package.json`.** Modern pnpm refuses
    to run install/postinstall scripts for third-party packages by default. `bcrypt`
    (native addon), `@prisma/client`/`@prisma/engines`/`prisma` (fetch
    platform-specific binaries), and `esbuild` (fetches its native binary) all need
    theirs to run, or `pnpm install` silently produces a broken `node_modules`. Added:
    ```json
    "pnpm": {
      "onlyBuiltDependencies": ["@prisma/client", "@prisma/engines", "bcrypt", "esbuild", "prisma"]
    }
    ```

11. **`packageManager` version pin vs. installed pnpm.** Corepack tried to silently
    download and stage a newer pinned pnpm version into a system-wide tools directory,
    failing with `EPERM: operation not permitted` in a sandboxed environment. Fixed by
    pinning `packageManager` to whatever pnpm version is genuinely installed rather than
    fighting Corepack's auto-install path.

12. **`DATABASE_URL` duplicated into each app's own `.env`.** Next.js loads environment
    variables from **the app's own** `.env`, not a shared root one — `packages/db/.env`
    is only read by Prisma CLI commands run *from inside* `packages/db`. Since
    `user-app`'s server actions and `merchant-app`'s `signIn` callback both import
    `prisma` and query it in-process, each app needs its own `DATABASE_URL`. This is
    exactly why `apps/user-app/.env.example` and `packages/db/.env.example` both carry
    the same `DATABASE_URL` line independently in this repo, rather than one shared file.

13. **A second seeded user.** `user-app`'s seed script (not shown among the reviewed
    source files directly, but referenced by `packages/db/package.json`'s Prisma `seed`
    hook) creates both `1111111111` (Alice, ₹200 starting balance) and `2222222222`
    (Bob, ₹0) so P2P is testable immediately after `npx prisma db seed`, with no manual
    Prisma Studio editing required first.

14. **`apps/user-app/.gitignore`'s `.env*` pattern was swallowing `.env.example`.** A
    blanket `.env*` ignore rule also matched `.env.example`, which is meant to be
    committed as a template. Fixed with a `!.env.example` negation line.

15. **Tailwind `content` glob matching all of `node_modules`.** Both apps'
    `tailwind.config.js` files use `"../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}"` —
    note the `src/` segment. An earlier version without `src/` also walked
    `packages/ui/node_modules`, triggering Tailwind's JIT warning about accidentally
    scanning `node_modules` for class names. The `src/`-scoped glob shown in both
    `tailwind.config.js` files in this repo today is the corrected version.

None of these changes alter the *behavior* the original course guides describe — every
feature (on-ramp deposits, the webhook, P2P transfers with row-locking, Docker + CI/CD)
works exactly as documented. They are toolchain/version fixes needed to get from "guide
describing an idealized project" to "project that actually builds and runs" on this
repo's real, newer dependency versions (Next 14.2.35, Prisma 6.19.3, pnpm workspaces,
TypeScript 5.9/7.0 depending on package, ESLint 10/8 depending on package).

---

## 6. Verification performed

1. **`pnpm install`** — succeeds after the fixes in §5 (items 3, 9, 10, 11).
2. **`npx prisma migrate dev`** — applies cleanly against a fresh Postgres container
   (after working around the port conflict in §5 item 8).
3. **`npx prisma db seed`** — creates Alice (₹200) and Bob (₹0).
4. **`pnpm run build`** — all three apps plus the webhook build cleanly via Turborepo,
   after the fixes in §5 items 4, 5, 6.
5. **`pnpm run dev`**, exercised manually in a browser:
   - Signed in as Alice via the Credentials form → landed on `/dashboard` with all four
     sidebar items (Home / Transfer / Transactions / P2P Transfer).
   - `/transfer`: submitted **Add Money** for ₹500 via HDFC → confirmed a new
     `OnRampTransaction` row (`status: Processing`, a real random token) in the
     database.
   - Called the webhook directly with that token:
     ```
     curl -X POST http://localhost:3003/hdfcWebhook \
       -H "Content-Type: application/json" \
       -d '{"token":"<token>","user_identifier":"1","amount":"50000"}'
     ```
     confirmed the transaction flipped to `Success` and Alice's balance increased by
     exactly ₹500.
   - `/p2p`: sent ₹100 from Alice to Bob (`2222222222`) → confirmed Alice's balance
     dropped by 10000 paise, Bob's rose by 10000 paise, and a new `P2pTransfer` row was
     created.
   - Attempted to send more than Alice's remaining balance → confirmed **both**
     balances stayed unchanged and no `P2pTransfer` row was created, i.e. the `FOR
     UPDATE` lock plus the balance-check guard rejected the transfer exactly as
     designed (§3.1, step 6) — even though the UI itself shows no visible error message
     for this case, as noted in that section.
   - Reproduced and fixed the `<p>`/`<div>` hydration bug (§5 item 7) live in the
     browser console while validating the `/transfer` page.
6. **Docker**: `cp docker/Dockerfile.user Dockerfile && docker build -f Dockerfile .`
   built successfully end-to-end (pnpm install → prisma generate → turbo build). Running
   the resulting image and hitting `GET /api/auth/signin` returned `200`.

**Not exercised** (needs real external credentials, outside what a local pass can
verify): the live Google OAuth round-trip for `merchant-app`, and the full GitHub
Actions → Docker Hub → EC2 deploy path (needs real repo secrets and a running EC2
instance — see §4.4).

---

## 7. Quick reference — where to change what

| I want to... | Edit this |
|---|---|
| Add a new wallet feature/route | `apps/user-app/app/(dashboard)/<route>/page.tsx` |
| Change how deposits are recorded | `apps/user-app/app/lib/actions/createOnrampTransaction.ts` |
| Change how the bank confirms a deposit | `apps/bank-webhook/src/index.ts` |
| Change P2P transfer logic/locking | `apps/user-app/app/lib/actions/p2pTransfer.tsx` |
| Change login/signup rules for the wallet | `apps/user-app/app/lib/auth.ts` |
| Change merchant login rules | `apps/merchant-app/lib/auth.ts` |
| Add/modify a shared UI component | `packages/ui/src/*.tsx` |
| Add a Prisma model or field | `packages/db/prisma/schema.prisma`, then `npx prisma migrate dev` from `packages/db` |
| Change the deployed container's build steps | `docker/Dockerfile.user` |
| Change what triggers CI or CD | `.github/workflows/build.yml` / `push.yml` |