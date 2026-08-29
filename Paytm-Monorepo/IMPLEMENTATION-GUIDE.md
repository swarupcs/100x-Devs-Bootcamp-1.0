# Paytm-Style Wallet — Full Implementation Guide

This document records exactly how this repository (`Paytm-Monorepo`) was built, in the
same four-stage shape as the original course guides (Starter Monorepo → Wallet → P2P
Transfer → Docker/CI-CD), plus a fifth section listing every place this implementation
had to **deviate** from those guides to actually build, run, and deploy — with the
reasoning for each change. It is meant to be read alongside the code, not instead of it:
every file mentioned below exists in this repo at the path given.

> This repo did not start from `create-turbo` by hand — a prior pass had already
> scaffolded Stage 1 (auth for both apps, shared UI/store/db packages) using a newer
> Turborepo/Next.js/Prisma toolchain than the original course captured. This guide
> covers what was added on top of that to reach full feature + deployment parity with
> Stages 2–4, and documents the toolchain-version fixes that were needed to make the
> whole thing actually compile and run.

---

## 0. Final repo structure

```
Paytm-Monorepo/
├── package.json                   # root scripts, pnpm.onlyBuiltDependencies
├── turbo.json
├── pnpm-workspace.yaml
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
    ├── eslint-config/
    └── typescript-config/
```

---

## 1. Stage 1 — Starter monorepo (auth only)

Already in place before this pass: a pnpm-workspace Turborepo with `user-app` (Next.js
14, Credentials auth via NextAuth + bcrypt + Prisma) and `merchant-app` (Next.js 14,
Google OAuth), sharing `@repo/db`, `@repo/ui`, `@repo/store`, `@repo/eslint-config`, and
`@repo/typescript-config`. Key pieces:

- `packages/db/index.ts` — a Prisma Client **singleton** stashed on `globalThis` so
  Next.js's dev-mode hot reload doesn't spin up a new connection pool on every save.
- `apps/user-app/app/lib/auth.ts` — a `CredentialsProvider` whose `authorize()` doubles
  as login *and* implicit sign-up: if the phone number exists, it verifies the bcrypt
  hash; if not, it creates the user on the spot.
- `apps/merchant-app/lib/auth.ts` — `GoogleProvider` whose `signIn` callback upserts a
  `Merchant` row keyed by email once Google confirms the identity.
- The `session` callback in `user-app`'s `authOptions` copies `token.sub` onto
  `session.user.id` — every wallet query added below depends on that ID being present.

No wallet logic (`Balance`, `OnRampTransaction`, `P2pTransfer`) existed yet — that's
Stages 2–3, added below.

---

## 2. Stage 2 — Balances, on-ramp deposits, dashboard

### 2.1 Prisma schema — `packages/db/prisma/schema.prisma`

Added `Balance` (one-to-one with `User`, `userId` marked `@unique`) and
`OnRampTransaction` (status enum `Processing | Success | Failure`, with a `@unique`
`token` used to correlate a locally-created transaction with the bank's later webhook
call). Money is stored as an `Int` in **paise**, never a float — every UI component that
displays an amount divides by 100.

```bash
cd packages/db
npx prisma migrate dev --name add_wallet_features   # applied together with Stage 3's P2P model, see below
npx prisma generate
```

### 2.2 Seed script — `packages/db/prisma/seed.ts`

Seeds two demo users so P2P (Stage 3) has someone to send money to out of the box:

- `1111111111` / `alice` — balance ₹200.00 (20000 paise)
- `2222222222` / `bob` — balance ₹0.00

Both `Balance` rows are created via `upsert`, so re-running the seed is idempotent.
Registered as Prisma's official seed hook in `packages/db/package.json`:

```json
"prisma": { "seed": "tsx prisma/seed.ts" }
```

```bash
npx prisma db seed
```

### 2.3 `apps/bank-webhook` — simulated bank payment callback

A tiny standalone Express app (`apps/bank-webhook/src/index.ts`), bundled with esbuild
(a single-file service doesn't need `tsc`'s incremental build machinery) and listening
on port 3003:

```ts
app.post("/hdfcWebhook", async (req, res) => {
  const paymentInformation = {
    token: req.body.token,
    userId: req.body.user_identifier,
    amount: req.body.amount
  };
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
});
```

It uses the **array** form of `$transaction` (not the interactive callback form) because
neither write depends on reading the other's result first — it's just "increment this
balance AND flip this transaction's status, both or neither." `updateMany` (not
`update`) is deliberate: it matches zero-or-more rows and never throws on "not found",
so an unrecognized token fails silently rather than crashing the webhook — flagged
in the source with `//TODO: Add zod validation` and `//TODO: a shared secret so we know
this is really the bank`, neither of which is implemented (this is a course project, not
a production bank integration).

**Note on how `db.balance.updateMany` is written**: it matches purely on `userId`, not
on `token` — so it always credits the balance regardless of whether the token matches
anything. The token-based `updateMany` on `OnRampTransaction` is what actually gates
whether the transaction record flips to `Success`. This is the original design; it means
a webhook call with a bogus token still (silently) credits the target user's balance.
Worth knowing if you ever expose this endpoint publicly.

### 2.4 `@repo/ui` additions

- `Center.tsx` — a flex wrapper that centers its child both ways; unused until Stage 3's
  `SendCard`.
- `Select.tsx` — thin wrapper around `<select>`, `{key, value}` options so the internal
  id can differ from the display label.
- `TextInput.tsx` — controlled-from-outside text input with a label.
- `card.tsx` — **rewritten**, breaking change: Stage 1's `Card` was a stock
  `create-turbo` outbound link card; Stage 2 needs a plain content container
  (`title` + `children`, no `href`). See §5 for the one bugfix made to this file beyond
  what the original guide had.

### 2.5 `apps/user-app` dashboard

- `app/(dashboard)/layout.tsx` — a Next.js **route group** (`(dashboard)`) so
  `/dashboard`, `/transfer`, `/transactions`, `/p2p` share one sidebar layout without
  `(dashboard)` appearing in the URL.
- `app/(dashboard)/transfer/page.tsx` — an async Server Component that calls
  `getServerSession` + `prisma.balance.findFirst` / `prisma.onRampTransaction.findMany`
  **directly**, no API route in between — this is the App Router's core capability.
- `components/AddMoneyCard.tsx` — captures the typed amount and selected bank, then on
  click calls the `createOnRampTransaction` server action **before** redirecting to the
  (fake) bank page.
- `components/BalanceCard.tsx`, `components/OnRampTransactions.tsx` — plain Server
  Components rendering balance rows / transaction history.
- `app/layout.tsx` — now wraps every page in `<AppbarClient />` plus a background color,
  so the header is present on every route including the sign-in page.
- `app/page.tsx` — repurposed as a pure routing gate: logged-in → `/dashboard`,
  logged-out → `/api/auth/signin`.

### 2.6 `app/lib/actions/createOnrampTransaction.ts`

```ts
"use server";
export async function createOnRampTransaction(provider: string, amount: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { message: "Unauthenticated request" };
  const token = (Math.random() * 1000).toString();
  await prisma.onRampTransaction.create({
    data: { provider, status: "Processing", startTime: new Date(), token,
             userId: Number(session.user.id), amount: amount * 100 }
  });
  return { message: "Done" };
}
```

The random-number token is a stand-in for what a real bank integration would hand back
as a correlation ID — it exists purely so the webhook above has something to match
against during manual testing.

---

## 3. Stage 3 — P2P transfers

### 3.1 Prisma schema — `P2pTransfer`

```prisma
model P2pTransfer {
  id         Int      @id @default(autoincrement())
  amount     Int
  timestamp  DateTime
  fromUserId Int
  toUserId   Int
  fromUser   User     @relation("FromUser", fields: [fromUserId], references: [id])
  toUser     User     @relation("ToUser", fields: [toUserId], references: [id])
}
```

`User` gets two named back-relations (`sentTransfers` / `receivedTransfers`) because
`P2pTransfer` has **two** foreign keys into the same `User` table — Prisma can't
disambiguate which `User` field pairs with which `P2pTransfer` field without the
explicit `@relation("FromUser"/"ToUser")` names.

### 3.2 `app/lib/actions/p2pTransfer.tsx` — the interesting part

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
    if (!fromBalance || fromBalance.amount < amount) throw new Error('Insufficient funds');

    await tx.balance.update({ where: { userId: Number(from) }, data: { amount: { decrement: amount } } });
    await tx.balance.update({ where: { userId: toUser.id }, data: { amount: { increment: amount } } });
    await tx.p2pTransfer.create({ data: { fromUserId: Number(from), toUserId: toUser.id, amount, timestamp: new Date() } });
  });
}
```

Why this needs the **interactive** `$transaction` callback (unlike the webhook's array
form): it genuinely has to *read* the sender's balance and make a decision *before*
deciding what writes to perform. And why the raw `SELECT ... FOR UPDATE`: Prisma's
high-level API has no built-in row-lock primitive, so this drops into raw SQL
specifically to invoke Postgres's row lock. Once that line executes, any concurrent
transfer from the same sender has to wait for this transaction to commit or roll back
before it can read the balance — without it, two simultaneous transfers could both read
the same starting balance, both see "sufficient funds," and both succeed, overdrawing
the account. Throwing inside the callback is how Prisma is told to roll back everything
that ran before the throw.

Verified in this repo (see §6) with three cases: a normal transfer (both balances move,
a `P2pTransfer` row is logged), an over-limit transfer (both balances stay untouched,
`Error('Insufficient funds')` is thrown), and confirmed the row lock is in the code path
that protects concurrent transfers from the same sender.

### 3.3 UI — `components/SendCard.tsx`, `app/(dashboard)/p2p/page.tsx`

`SendCard` is the first place `Center` (built in Stage 2 but unused until now) actually
gets rendered — it centers the "Send" card in a `90vh` wrapper. Two plain `TextInput`s
(number, amount) feed local `useState`; no client-side validation — everything (a
missing recipient, a non-numeric amount, an over-limit transfer) is handled server-side
in `p2pTransfer`.

### 3.4 Sidebar

`app/(dashboard)/layout.tsx` gets a fourth `SidebarItem` for `/p2p`, with a diagonal
arrow icon (Heroicons `arrow-up-right`).

---

## 4. Stage 4 — Docker + CI/CD

### 4.1 `docker/Dockerfile.user`

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

Alpine is chosen for image size; the tradeoff is `musl` libc occasionally tripping up
native addons (worth knowing if a future dependency fails mysteriously only inside
Docker — `bcrypt`, notably, needs a Linux-glibc/musl-compatible prebuilt binary, which
`node-pre-gyp` fetches automatically at `pnpm install` time inside the container).
`prisma generate` runs at **image-build time**, not container-start time, so the
generated client + query engine are already baked in and don't need regenerating (or
`prisma` CLI access) at runtime. `pnpm run build` runs `turbo build` for every app
(`bank-webhook`, `merchant-app`, `user-app`) even though only `user-app` is ever
started — the biggest optimization opportunity here would be `turbo build
--filter=user-app...` to only build what's actually needed.

Root `package.json` has the one-line addition Stage 4 needs, a stable command the `CMD`
can invoke regardless of how the rest of the scripts evolve:

```json
"start-user-app": "cd ./apps/user-app && npm run start"
```

### 4.2 CI — `.github/workflows/build.yml`

Runs on every PR into `main`: checks out the repo, sets up Node 20, `pnpm install
--frozen-lockfile`, `pnpm run build`. Its job is to fail loudly if the monorepo doesn't
build *before* anyone merges — catching broken builds at review time instead of after
Stage 4's deploy pipeline has already shipped them.

### 4.3 CD — `.github/workflows/push.yml`

Runs on every push to `main`: copies `docker/Dockerfile.user` to the repo root (Docker's
build context has to contain the Dockerfile's `COPY apps ./apps` targets), logs in to
Docker Hub, builds + pushes the image, pulls it back down as a sanity check, then SSHes
into an EC2 box and does a zero-downtime-ish swap:

```bash
sudo docker pull <user>/web-app:latest
sudo docker stop web-app || true
sudo docker rm web-app || true
sudo docker run -d --name web-app -p 3005:3000 <user>/web-app:latest
```

The `|| true` on `stop`/`rm` is what makes this idempotent — the very first deploy has
no existing `web-app` container to stop, and without `|| true` that "nothing to stop"
condition would abort the whole job.

### 4.4 One-time manual setup (not automated, documented here for completeness)

**GitHub repo secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | A Docker Hub **access token** (Account Settings → Security → New Access Token), not your literal password |
| `SSH_HOST` | Public IP of your EC2 instance |
| `SSH_USERNAME` | `ubuntu` (default for Ubuntu AMIs) |
| `SSH_KEY` | Full contents of your `.pem` private key |

**EC2 box, once**:

```bash
ssh -i your-key.pem ubuntu@<EC2-IP>
sudo apt-get update
sudo apt-get install docker.io -y
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu
```

Then open port 3005 in the instance's security group (Inbound rules → Custom TCP →
3005 → 0.0.0.0/0 or your own IP) — the single most common reason a first deploy "does
nothing" despite every GitHub Actions step going green.

Also update `push.yml`'s `tags: 100xdevs/web-app:latest` to your own Docker Hub
namespace before this will actually push successfully to your account.

**Known gap, same as the original course guides**: neither the Dockerfile nor
`push.yml`'s `docker run` line passes real environment variables into the container, so
`DATABASE_URL`/`JWT_SECRET`/`NEXTAUTH_URL` are unset at runtime unless you add `-e` flags
or an env file to the deploy step. Fixing that properly is left as a next step, not
something this pipeline handles out of the box.

---

## 5. Deviations from the original course guides (and why)

The four stage guides this repo was built from describe an **idealized** version of the
project. Actually compiling and running it on a real, newer toolchain surfaced a number
of gaps that had to be fixed. Every one of these is a genuine correction, not a
stylistic preference — each was caught by either a build failure or a runtime error
while validating this repo end-to-end.

1. **pnpm instead of npm inside the Dockerfile.** The original guide's Dockerfile runs
   `npm install` inside the container and explains this as "fewer toolchains to
   install." That only works if the rest of the monorepo also uses npm workspaces (the
   actual upstream course repo does — `"workspaces": [...]` in its root `package.json`,
   internal deps pinned to `"*"`). This repo uses **pnpm workspaces** end-to-end
   (`workspace:*` internal dependencies), which plain `npm install` cannot resolve.
   Fixed by enabling Corepack and running `pnpm install --frozen-lockfile` inside the
   image instead, and copying `pnpm-lock.yaml`/`pnpm-workspace.yaml` rather than
   `package-lock.json`. Verified by actually building the image and running the
   resulting container (§6).

2. **Branch name `main`, not `master`.** Both workflow files' original guide text
   triggers on `master`; this repo's default branch is `main`. Updated both
   `build.yml` and `push.yml` accordingly, and bumped the pinned Action versions
   (`actions/checkout@v3/v2` → `v4`, `docker/login-action@v1` → `v3`,
   `docker/build-push-action@v2` → `v5`) since the originals are past end-of-support.

3. **Missing `@repo/typescript-config` dependency.** `user-app`, `merchant-app`, and
   `bank-webhook`'s `tsconfig.json` files all `extends` a workspace package
   (`@repo/typescript-config/nextjs.json` or `.../base.json`) that none of them actually
   declared as a `devDependency`. This "worked" in a loose npm-workspaces setup that
   hoists everything into one `node_modules`, but pnpm's strict, symlinked
   `node_modules` refuses phantom dependencies — Next's build failed with
   `error TS6053: File '@repo/typescript-config/nextjs.json' not found`. Fixed by adding
   the missing `"@repo/typescript-config": "workspace:*"` entries. This is exactly the
   category of bug pnpm's strictness is designed to catch, called out directly in
   Stage 1 of the original guide's own rationale for choosing pnpm.

4. **React version mismatch between `@repo/ui` and the apps.** The scaffolded
   `packages/ui/package.json` pinned React 19 (matching a newer `create-turbo` default),
   while both Next.js 14 apps use React 18. Because `@repo/ui` ships raw `.tsx` source
   consumed directly via `transpilePackages` (no separate build/type-check boundary),
   TypeScript resolved `ReactNode`/`JSX.Element` from whichever `@types/react` happened
   to be nearest on disk when compiling `button.tsx`, and the two versions' `ReactNode`
   types aren't structurally compatible (`Type 'ReactElement<...>' is not assignable to
   type 'ReactNode'`). Fixed by pinning `@repo/ui` to the same React 18 range as the
   apps. Next.js 14 does not support React 19, so downgrading `ui` (not upgrading the
   apps) was the correct direction.

5. **Missing `apps/merchant-app/tsconfig.json`.** Unlike `user-app`, `merchant-app` had
   no `tsconfig.json` at all; Next.js auto-generated a minimal one at build time, and
   its default `moduleResolution` couldn't resolve `@repo/ui`'s subpath exports
   (`Cannot find module '@repo/ui/appbar' ... Consider updating to 'node16', 'nodenext',
   or 'bundler'`). Fixed by adding an explicit `tsconfig.json` extending
   `@repo/typescript-config/nextjs.json`, matching `user-app`'s.

6. **`existingUser.password` nullability.** `User.password` is optional in the schema
   (`password String?`), but `apps/user-app/app/lib/auth.ts`'s `authorize()` passed it
   straight into `bcrypt.compare()`, which expects a non-null `string`. This type-checks
   loosely under an older/looser TS config but fails strict-mode compilation
   (`Type 'string | null' is not assignable to type 'string'`). Fixed with an explicit
   `if (!existingUser.password) return null;` guard before the compare — a real
   null-safety fix, not a suppression.

7. **`<p>{children}</p>` in `packages/ui/src/card.tsx` — an actual HTML-nesting bug.**
   The original guide's Stage 2 `Card` rewrite wraps `children` in a `<p>` tag. Every
   consumer (`AddMoneyCard`, `BalanceCard`, `OnRampTransactions`, `SendCard`) passes
   `<div>`-based content as children, and `<div>` is not valid inside `<p>` per the HTML
   spec — React hydration failed with `Warning: In HTML, %s cannot be a descendant of
   <p>` followed by a full hydration-mismatch error, reproduced live in a browser while
   validating the `/transfer` page (§6). Fixed by rendering `<div>{children}</div>`
   instead — same visual result (no styling depended on the tag being a `<p>`), no
   hydration error.

8. **Port 5432 conflict with a native Windows Postgres service.** On the machine this
   was built on, `docker run -p 5432:5432 postgres` appeared to start fine, but Prisma's
   `migrate dev` failed with `P1000: Authentication failed` even though the Docker
   container's own credentials were correct — a **separate, pre-existing native
   Windows** `postgres.exe` process was also bound to port 5432 and was the one actually
   answering connections on `localhost:5432`. Fixed by publishing the container on
   `5433:5432` instead and pointing every `DATABASE_URL` at `localhost:5433`. Not a code
   bug, but worth knowing if `prisma migrate dev` ever reports auth failures against
   credentials you're sure are correct — check `Get-NetTCPConnection -LocalPort 5432`
   for a second, unrelated listener before assuming the container itself is
   misconfigured.

9. **`@types/express@^4.19.0` doesn't exist** (`apps/bank-webhook/package.json`, copied
   from the guide as-written). The 4.x line of `@types/express` never published a
   `4.19.x`; the closest real release is `4.17.21` (later 5.x majors track Express 5).
   Fixed by pinning `^4.17.21`.

10. **`pnpm.onlyBuiltDependencies` needed in root `package.json`.** Modern pnpm
    (10.x/11.x) refuses to run install/postinstall scripts for third-party packages by
    default as a supply-chain-security measure — `bcrypt` (native addon),
    `@prisma/client`/`@prisma/engines`/`prisma` (fetch platform-specific binaries), and
    `esbuild` (fetches its native binary) all need theirs to run. Without explicitly
    allow-listing them, `pnpm install` silently produces a broken `node_modules` (no
    `bcrypt_lib.node`, no Prisma query engine). Added:
    ```json
    "pnpm": {
      "onlyBuiltDependencies": ["@prisma/client", "@prisma/engines", "bcrypt", "esbuild", "prisma"]
    }
    ```

11. **`packageManager` version pin vs. installed pnpm.** The scaffolded root
    `package.json` pinned `"packageManager": "pnpm@11.23.0"`, but the actually-installed
    global pnpm was `10.28.1`. Corepack tried to silently download and stage pnpm
    11.23.0 into a system-wide tools directory on first `turbo run build`, which failed
    with `EPERM: operation not permitted` in this sandboxed environment. Fixed by
    pinning `packageManager` to the pnpm version genuinely installed (`10.28.1`) rather
    than fighting Corepack's auto-install path. If you have permission to let Corepack
    install pnpm versions freely, either pin works.

12. **`DATABASE_URL` duplicated into each app's own `.env`**, not only
    `packages/db/.env`. The guides only ever show one `DATABASE_URL`, implicitly assumed
    global. In practice, Next.js loads environment variables from **the app's own**
    `.env` file at both build and runtime — `packages/db/.env` is only read by Prisma
    CLI commands you run *from inside* `packages/db` (`migrate`, `db seed`, `studio`).
    Since `user-app`'s server actions and `merchant-app`'s `signIn` callback both import
    `prisma` directly and query it in-process, each app needs its own `DATABASE_URL` in
    its own `.env` or every DB call inside that app throws at runtime. Added
    `DATABASE_URL` to `apps/user-app/.env(.example)` and `apps/merchant-app/.env(.example)`
    alongside `packages/db/.env(.example)`.

13. **A second seeded user.** The original guide seeds only `1111111111` (Alice) and
    tells you to create a second user manually via Prisma Studio before you can test
    P2P. This repo's seed script also creates `2222222222` (Bob, ₹0 balance) so P2P is
    testable immediately after `npx prisma db seed`, no manual DB editing required.

14. **`apps/user-app/.gitignore`'s `.env*` pattern was swallowing `.env.example`.**
    A blanket `.env*` ignore rule (present in the `create-turbo`-generated
    `apps/user-app/.gitignore`) also matches `.env.example`, which is meant to be
    committed as a template. Added a `!.env.example` negation line so the example file
    is actually tracked by git while the real `.env` stays ignored.

15. **Tailwind `content` glob matching all of `node_modules`.** Both apps' Tailwind
    configs included `../../packages/ui/**/*.{js,ts,jsx,tsx,mdx}` — with no `src/`
    segment, this pattern also walks `packages/ui/node_modules`, and Tailwind's JIT
    warned about it as a real performance hazard on every build
    (`Your content configuration includes a pattern which looks like it's accidentally
    matching all of node_modules`). Narrowed to `../../packages/ui/src/**/*...`, which
    is also more correct (the package's own `node_modules` was never meant to be
    scanned for class names).

None of the above changes touch the *behavior* the original guides describe — every
feature (on-ramp deposits, the webhook, P2P transfers with row-locking, Docker + CI/CD)
works exactly as documented. These are toolchain/version fixes needed to get from
"guide describing an idealized project" to "project that actually builds and runs" on
this repo's real dependency versions.

---

## 6. Verification performed

Everything below was actually run against this repo, not assumed from reading the code:

1. **`pnpm install`** — succeeded after fixing #3, #9, #10, #11 above.
2. **`npx prisma migrate dev --name add_wallet_features`** — applied cleanly against a
   fresh Postgres container (after working around #8).
3. **`npx prisma db seed`** — created Alice (₹200) and Bob (₹0).
4. **`pnpm run build`** — all three apps + the webhook build cleanly via Turborepo,
   after fixing #4, #5, #6.
5. **`pnpm run dev`** then, in a real browser:
   - Signed in as Alice via the Credentials form → landed on `/dashboard` with the
     sidebar (Home / Transfer / Transactions / P2P Transfer).
   - `/transfer`: submitted **Add Money** for ₹500 via HDFC → confirmed a new
     `OnRampTransaction` row (`status: Processing`, real random token) in the database.
   - Called the webhook directly with that real token:
     `curl -X POST http://localhost:3003/hdfcWebhook -d '{"token":"<token>","user_identifier":"1","amount":"50000"}'`
     → confirmed the transaction flipped to `Success` and Alice's balance increased by
     exactly ₹500 (20100 → 70100 paise, after an earlier +100 paise wired-token test).
   - `/p2p`: sent ₹100 from Alice to Bob (`2222222222`) → confirmed Alice's balance
     dropped by 10000 paise, Bob's rose by 10000 paise, and a `P2pTransfer` row was
     created.
   - Attempted to send ₹9,999.99 from Alice (more than her remaining balance) →
     confirmed **both** balances were unchanged and no new `P2pTransfer` row was
     created — the `FOR UPDATE` + balance-check guard rejected it as designed.
   - Caught and fixed the real `<p>`/`<div>` hydration bug (#7) live in the browser
     console during this pass.
6. **Docker**: `cp docker/Dockerfile.user Dockerfile && docker build -f Dockerfile .`
   — built successfully end-to-end (pnpm install → prisma generate → turbo build).
   Ran the resulting image with `docker run -p 3005:3001 ... wallet-user-app` and
   confirmed `GET /api/auth/signin` returned `200`.

Not exercised (needs real external credentials, outside what a local dev pass can
verify): the actual Google OAuth round-trip for `merchant-app`, and the live GitHub
Actions → Docker Hub → EC2 deploy path (needs real repo secrets and a running EC2 box —
see §4.4).
