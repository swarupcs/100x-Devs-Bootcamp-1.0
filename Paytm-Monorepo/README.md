# Paytm-Style Wallet Monorepo

A Turborepo + pnpm monorepo implementing a PayTM-style digital wallet: a Credentials-auth
user app with balances, bank on-ramp deposits and P2P transfers, a Google-OAuth merchant
app, a simulated bank webhook service, and a Docker + GitHub Actions CI/CD pipeline.

See [`IMPLEMENTATION-GUIDE.md`](./IMPLEMENTATION-GUIDE.md) for the full build log: every
command run, every file explained, and every deviation from the original course guides
(and why).

## Quick start

```bash
# 1. Start Postgres (use a port that isn't already taken locally)
docker run --name paytm-postgres -e POSTGRES_PASSWORD=mysecretpassword -d -p 5433:5432 postgres

# 2. Copy env files
cp packages/db/.env.example packages/db/.env
cp apps/user-app/.env.example apps/user-app/.env
cp apps/merchant-app/.env.example apps/merchant-app/.env
# edit apps/merchant-app/.env with real Google OAuth credentials if you need merchant login

# 3. Install deps
pnpm install

# 4. Migrate + seed the database
cd packages/db
npx prisma migrate dev --name init
npx prisma db seed
cd ../..

# 5. Run everything
pnpm dev
```

- `user-app` → http://localhost:3001 — log in with `1111111111` / `alice` (or `2222222222` / `bob`)
- `merchant-app` → http://localhost:3000 — Google OAuth login
- `bank-webhook` → http://localhost:3003/hdfcWebhook — simulated bank payment callback

## Apps and packages

- `apps/user-app` — Next.js wallet UI (Credentials auth, dashboard, transfer, P2P)
- `apps/merchant-app` — Next.js merchant UI (Google OAuth)
- `apps/bank-webhook` — Express service simulating a bank's payment-confirmation webhook
- `packages/db` — Prisma schema + generated client, shared via `@repo/db/client`
- `packages/ui` — shared React components (`Button`, `Card`, `Appbar`, `Center`, `Select`, `TextInput`)
- `packages/store` — shared Recoil balance atom/hook
- `packages/eslint-config`, `packages/typescript-config` — shared lint/TS configs

## Useful commands

| Task | Command |
|---|---|
| Run everything | `pnpm dev` |
| Run only `user-app` | `pnpm dev:user-app` |
| Run only `merchant-app` | `pnpm dev:merchant-app` |
| Run only `bank-webhook` | `pnpm dev:bank-webhook` |
| Build everything | `pnpm build` |
| Build only `user-app` | `pnpm build:user-app` |
| Build only `merchant-app` | `pnpm build:merchant-app` |
| Build only `bank-webhook` | `pnpm build:bank-webhook` |
| Open Prisma Studio | `cd packages/db && npx prisma studio` |
| Build the Docker image locally | `cp docker/Dockerfile.user Dockerfile && docker build -t wallet-user-app -f Dockerfile . && rm Dockerfile` |
