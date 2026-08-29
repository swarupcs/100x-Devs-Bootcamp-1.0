# PayTM-Style Wallet — Stage 4 Guide (Full Detail)
### `week-18-2-final` — continuation of Stage 3 (`week-18-live-1-final`)

This is the **fully expanded** version of the Stage 4 guide: every new file is shown
in full, with a line-by-line explanation of what it does and why. Stage 3 finished
the feature set — on-ramp deposits and P2P transfers, both working end-to-end. Stage
4 doesn't touch application code at all (a couple of exceptions are called out
explicitly below) — it takes the finished `user-app` and makes it **shippable**: one
command builds a Docker image, and a GitHub Actions pipeline builds, pushes, and
redeploys that image automatically on every merge to `master`.

> **A note on scope, read before you start:** the source snapshot this stage is
> captured from does not include Stage 3's P2P feature in its application code — its
> `user-app` sidebar only has Home/Transfer/Transactions, and there's no `/p2p`
> route or `p2pTransfer` action present. In practice this means Stage 4's
> infrastructure work was captured against a slightly earlier point in the codebase
> than Stage 3 ended at. None of that matters for what this guide teaches — Docker
> and CI/CD are agnostic to which features `user-app` happens to contain — but if
> you're building your own repo by following Stage 1 → 2 → 3 → 4 in order, apply
> this stage's Dockerfile/workflows on top of your Stage 3 code as-is; don't roll
> back the P2P feature to match the source snapshot exactly.

---

## 0. Final Structure (new relative to Stage 3)

```
week-18-2-final/
├── package.json                        # CHANGED — + start-user-app script
├── docker/
│   └── Dockerfile.user                 # ENTIRELY NEW
├── .github/
│   └── workflows/
│       ├── build.yml                   # ENTIRELY NEW — CI
│       └── push.yml                    # ENTIRELY NEW — CD
├── apps/                                # unchanged application code
└── packages/                            # unchanged application code
```

Everything else in `apps/` and `packages/` is untouched by this stage — only the
repo root and two new directories are added.

---

## 1. Prerequisites

- The Stage 3 repo, feature-complete and passing `pnpm dev` locally.
- A [Docker Hub](https://hub.docker.com/) account — the image registry this pipeline
  pushes to. Free tier is sufficient.
- An AWS account with permission to launch an EC2 instance (any Linux VM you can SSH
  into with Docker installed would work; this guide follows the source pipeline's
  choice of EC2 + Ubuntu specifically).
- Docker installed locally, if you want to build/test the image before wiring up CI:
  ```bash
  docker --version
  ```

---

## 2. Step 1 — Add the `start-user-app` Script

The Docker image needs one command to boot `user-app` after everything is built.
Add it to the **root** `package.json` — not `apps/user-app/package.json`.

### Root `package.json` (full file)

```jsonc
{
  "name": "wallet-monorepo",
  "private": true,
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "turbo build",
    "dev": "turbo dev",
    "lint": "turbo lint",
    "format": "prettier --write \"**/*.{ts,tsx,md}\"",
    "start-user-app": "cd ./apps/user-app && npm run start"
  },
  "devDependencies": {
    "prettier": "^3.2.5",
    "turbo": "^1.13.0"
  },
  "packageManager": "pnpm@8.15.6"
}
```

Only one line changed from Stage 1/2/3's root `package.json`: the new
`"start-user-app"` entry. It's deliberately a raw `cd && npm run start` rather than
something more elaborate — its only job is to be a single, stable command the
`CMD` instruction in the Dockerfile can invoke, regardless of how the rest of the
monorepo's scripts evolve.

Note it shells out to `npm run start`, not `pnpm run start` — inside the Docker
image (built in the next step) dependencies get installed with plain `npm install`,
not `pnpm`, so `npm run start` is what's actually available inside the container even
though your local dev workflow throughout Stages 1–3 has been pnpm-based. This is a
deliberate simplification for the container image, not an inconsistency to "fix" —
Docker images benefit from minimizing the number of toolchains they need to have
installed, and `npm` ships with Node by default while `pnpm` would be an extra
install step in the Dockerfile.

---

## 3. Step 2 — Write the Dockerfile

```bash
mkdir docker
touch docker/Dockerfile.user
```

**Why a `docker/` subdirectory instead of a root-level `Dockerfile`?** It keeps the
repo root uncluttered and leaves room for a `Dockerfile.merchant` or
`Dockerfile.webhook` later, one per deployable app, without them colliding on the
same filename. The tradeoff (explained in Step 4 below) is that Docker's build
context rules require the Dockerfile to be copied to the root before building — this
guide's CI workflow automates that copy step so you never have to remember it
manually in normal use.

### `docker/Dockerfile.user` (full file)

```dockerfile
FROM node:20.12.0-alpine3.19

WORKDIR /usr/src/app

COPY package.json package-lock.json turbo.json tsconfig.json ./

COPY apps ./apps
COPY packages ./packages

# Install all monorepo dependencies
RUN npm install

# Generate prisma client inside the db package
RUN cd packages/db && npx prisma generate && cd ../..

# Build the apps (Turbo will build everything by default)
# Note: To speed up CI, you can change this to `npm run build --filter=docs`
RUN npm run build

# Start the user-app using the script we added to the root package.json
CMD ["npm", "run", "start-user-app"]
```

Line by line:

- **`FROM node:20.12.0-alpine3.19`** — Alpine Linux is chosen for its small base
  image size (a few MB vs. hundreds for a full Debian-based Node image), which
  matters for how fast the image builds, pushes to Docker Hub, and pulls down onto
  the EC2 box on every deploy. The tradeoff: Alpine uses `musl` libc instead of
  `glibc`, which occasionally trips up native Node addons that expect glibc — worth
  knowing if you ever add a dependency that fails mysteriously only inside Docker.
- **`WORKDIR /usr/src/app`** — every subsequent `COPY`/`RUN` is relative to this
  directory inside the image.
- **`COPY package.json package-lock.json turbo.json tsconfig.json ./`** followed
  immediately by **`COPY apps ./apps` / `COPY packages ./packages`** — notice this
  copies *everything* (all app/package source) before running `npm install`, rather
  than copying only the various `package.json` files first, installing, and *then*
  copying source code. That ordering choice means Docker's layer cache gets
  invalidated by *any* source file change, not just a dependency change — so every
  build reinstalls all dependencies from scratch even if you only tweaked a single
  line of a `.tsx` file. This is the single biggest optimization opportunity for
  this Dockerfile in a real project (a proper multi-stage build would copy
  `package.json`s, install, `COPY` source, then build) — deliberately left simple
  here for a course project rather than production-grade.
- **`RUN npm install`** — a single flat install across the entire monorepo (no
  `pnpm`/workspace-aware install here, just plain npm against whatever
  `package-lock.json` exists at the root).
- **`RUN cd packages/db && npx prisma generate && cd ../..`** — the Prisma Client is
  generated **at image-build time**, not at container-start time. This matters:
  Prisma generates TypeScript types and a native query engine binary specific to the
  schema *and* the platform it runs on — running `prisma generate` once during the
  build, rather than on every container start, means the generated client is already
  baked into the image and doesn't need regenerating (and doesn't need `prisma` CLI
  access) at runtime.
- **`RUN npm run build`** — this runs the root `turbo build` script, which (per
  `turbo.json`'s pipeline) builds `@repo/db`, `@repo/ui`, `@repo/store`, and *both*
  Next.js apps, plus `bank-webhook` — even though only `user-app` ever actually gets
  started by this image. The inline comment
  (`// Note: To speed up CI, you can change this to npm run build --filter=docs`)
  flags this directly as the obvious first optimization: scoping the build to just
  `user-app` (and its dependencies) with Turborepo's `--filter` flag would cut build
  time meaningfully, at the cost of a slightly more fragile Dockerfile if you ever
  add another deployable app that needs building too.
- **`CMD ["npm", "run", "start-user-app"]`** — the container's entrypoint. This runs
  once, when the container starts (not at build time like the `RUN` lines above),
  and is what actually boots the Next.js production server.

### Test the image locally before wiring up CI

Docker needs the Dockerfile at the build context root to see `apps/`/`packages/`,
so copy it there temporarily — exactly what the CI workflow will do automatically:

```bash
cp docker/Dockerfile.user Dockerfile
docker build -t wallet-user-app .
docker run -p 3005:3000 wallet-user-app
```

Visit `http://localhost:3005` — you should see the same `user-app` `pnpm dev` gives
you (minus hot reload, since this is a production build). Clean up the temporary
root Dockerfile once confirmed:

```bash
rm Dockerfile
```

---

## 4. Step 3 — Continuous Integration: Build-Check Every PR

Goal: every pull request into `master` fails loudly if the monorepo doesn't build,
*before* anyone merges it — catching broken builds at review time instead of
discovering them after they've already reached `master` (or worse, after Step 4's
deploy pipeline has already shipped them to production).

```bash
mkdir -p .github/workflows
touch .github/workflows/build.yml
```

### `.github/workflows/build.yml` (full file)

```yaml
name: Build on PR

on:
  pull_request:
    branches:
      - master

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install Dependencies
        run: npm install

      - name: Run Build
        run: npm run build
```

Breaking down each step:

- **`on: pull_request: branches: [master]`** — this workflow only *triggers* on PRs
  targeting `master`; pushes directly to `master` or PRs into any other branch don't
  run it (that's what `push.yml` in the next step is for).
- **`actions/checkout@v3`** — GitHub Actions runners start with an empty filesystem;
  this step is what actually clones your repo's code (at the PR's merge commit) onto
  the runner so subsequent steps have something to build.
- **`actions/setup-node@v3` with `node-version: '20'`** — matches the same Node
  major version (`20.x`) as the Dockerfile's `node:20.12.0-alpine3.19` base image, so
  a build that passes CI is representative of what the Docker build will also
  produce.
- **`npm install`** then **`npm run build`** — deliberately the exact same two
  commands the Dockerfile itself runs (`RUN npm install` / `RUN npm run build`),
  just executed directly on the runner instead of inside a container. That
  parity is intentional: if this step passes, you have good evidence the Docker
  build in Step 4's `push.yml` will also succeed, without needing to actually build
  a Docker image on every single PR (which would be slower and consume more CI
  minutes than a plain Node build).

Push this file on a branch and open a PR into `master` to see the "Build on PR"
check appear — green if `turbo build` succeeds, red if anything in the monorepo
fails to compile.

---

## 5. Step 4 — Continuous Deployment: Build, Push, Deploy on Merge

Goal: once code lands on `master`, automatically build the Docker image, push it to
Docker Hub, then SSH into the EC2 box and swap the running container for the new
one — with zero manual steps.

```bash
touch .github/workflows/push.yml
```

### `.github/workflows/push.yml` (full file)

```yaml
name: Build and Deploy to Docker Hub

on:
  push:
    branches:
      - master  # Triggers on pushes/merges to master

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
    - name: Check Out Repo
      uses: actions/checkout@v2

    - name: Prepare Dockerfile
      # Moves the Dockerfile to the root so Docker finds the correct build context
      run: cp ./docker/Dockerfile.user ./Dockerfile

    - name: Log in to Docker Hub
      uses: docker/login-action@v1
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Build and Push Docker image
      uses: docker/build-push-action@v2
      with:
        context: .
        file: ./Dockerfile
        push: true
        # IMPORTANT: Replace '100xdevs' with your actual Docker Hub username!
        tags: 100xdevs/web-app:latest

    - name: Verify Pushed Image
      # Ensure it successfully made it to Docker Hub
      run: docker pull 100xdevs/web-app:latest

    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        key: ${{ secrets.SSH_KEY }}
        script: |
          sudo docker pull 100xdevs/web-app:latest
          sudo docker stop web-app || true
          sudo docker rm web-app || true
          # Run the new container, mapping EC2 port 3005 to container port 3000
          sudo docker run -d --name web-app -p 3005:3000 100xdevs/web-app:latest
```

Breaking down each step:

- **`on: push: branches: [master]`** — triggers on every push that lands on
  `master`, whether from a merged PR or a direct push (assuming your branch
  protection rules allow that).
- **`Check Out Repo`** — same purpose as `build.yml`'s checkout step.
- **`Prepare Dockerfile` (`cp ./docker/Dockerfile.user ./Dockerfile`)** — this is
  the automated version of the manual `cp` you ran in Step 2 to test locally.
  Docker's build context is always the directory containing the Dockerfile (or the
  directory passed as `context:`), and this Dockerfile's `COPY apps ./apps` /
  `COPY packages ./packages` instructions need the repo root as that context — so
  the file has to physically live at the root at build time, even though it's
  organized under `docker/` the rest of the time.
- **`docker/login-action@v1`** — authenticates the runner against Docker Hub using
  the `DOCKER_USERNAME`/`DOCKER_PASSWORD` secrets (set up in Step 6 below), so the
  subsequent push step is authorized to publish to your account's namespace.
- **`docker/build-push-action@v2`** — builds the image from the just-copied root
  `Dockerfile` and, because `push: true`, immediately pushes it to Docker Hub under
  the tag `100xdevs/web-app:latest`. **You must replace `100xdevs` with your own
  Docker Hub username** before this will work for your account — pushing to a
  namespace you don't own will fail authentication even with valid credentials for
  your own account.
- **`Verify Pushed Image` (`docker pull ...`)** — a lightweight sanity check: if the
  push silently failed for some reason, this pull step fails loudly right here,
  before the workflow ever attempts to touch the production server.
- **`Deploy to EC2` (`appleboy/ssh-action@master`)** — this is a community GitHub
  Action that wraps the mechanics of SSHing into a remote host and running a script,
  using the `SSH_HOST`/`SSH_USERNAME`/`SSH_KEY` secrets. The `script:` block is what
  actually runs on the EC2 box:
  - `docker pull` — fetches the image just pushed.
  - `docker stop web-app || true` and `docker rm web-app || true` — stop and remove
    any previously running container named `web-app`. The `|| true` on both is what
    makes this step **idempotent**: the very first deploy has no existing `web-app`
    container, so `docker stop`/`docker rm` would normally exit with a nonzero
    status and — without `|| true` — abort the rest of the script (and fail the
    whole job) on what should be a harmless "nothing to stop" situation.
  - `docker run -d --name web-app -p 3005:3000 ...` — starts the new container
    detached (`-d`), named `web-app` (so the *next* deploy's `stop`/`rm` can find
    it), mapping the host's port `3005` to the container's port `3000` (Next.js's
    default production port, matching what `next start` listens on inside the
    container).

---

## 6. Step 5 — Infrastructure & Secrets Setup (one-time, manual)

The two workflow files are inert without real secrets and a real server behind
them. This step happens outside of Git, directly in the GitHub and AWS consoles.

### 6a. GitHub repository secrets

**GitHub repo → Settings → Secrets and variables → Actions → New repository
secret**, add each of:

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | Your Docker Hub username |
| `DOCKER_PASSWORD` | A Docker Hub **access token** — Docker Hub → Account Settings → Security → New Access Token. Prefer this over your literal account password: it's revocable independently and scoped just to registry access. |
| `SSH_HOST` | Public IP address of your EC2 instance |
| `SSH_USERNAME` | `ubuntu` (default for Ubuntu EC2 AMIs) |
| `SSH_KEY` | The **entire contents** of your `.pem` private key file, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines |

These never appear in workflow logs or the repo itself — GitHub Actions injects them
as environment values at run time and automatically redacts any accidental echo of
their literal contents in logs.

### 6b. Prepare the EC2 server

1. Launch an EC2 instance (an Ubuntu AMI is simplest to match the commands below)
   and download its `.pem` key pair.
2. SSH in **once, manually**, to install Docker — this is the only step that isn't
   automated by the pipeline, since it's provisioning the server itself, not
   deploying to it:
   ```bash
   ssh -i your-key.pem ubuntu@<EC2-IP>
   sudo apt-get update
   sudo apt-get install docker.io -y
   sudo systemctl start docker
   sudo systemctl enable docker
   # optional: let the ubuntu user run docker without sudo
   sudo usermod -aG docker ubuntu
   ```
3. **AWS Console → EC2 → Security Groups** → find the security group attached to
   your instance → **Inbound rules** → add a rule:
   - Type: **Custom TCP**
   - Port: **3005**
   - Source: **Anywhere (0.0.0.0/0)** — or your own IP specifically, if you'd rather
     not expose it publicly while testing.

Without this inbound rule, the container can be running perfectly on the instance
and still be completely unreachable from outside AWS's network — this is the single
most common reason a first deploy "doesn't work" despite every GitHub Actions step
showing green.

---

## 7. Step 6 — Ship It

```bash
git checkout -b add-docker-cicd
git add .
git commit -m "Add Docker + CI/CD pipeline"
git push origin add-docker-cicd
```

Open a PR into `master` — `build.yml` should run and (assuming Stage 3's code
builds cleanly) pass. Merge it — `push.yml` then runs automatically:

1. Builds the Docker image from `docker/Dockerfile.user`.
2. Pushes it to Docker Hub as `<your-username>/web-app:latest`.
3. SSHes into your EC2 box, pulls the new image, and (re)starts the `web-app`
   container.

Visit `http://<EC2-IP>:3005` — you should see the live `user-app`, running from the
just-built container, including everything from Stage 2 (on-ramp) and Stage 3 (P2P
transfers), assuming you built this stage on top of Stage 3's actual code as
recommended in the note at the top of this guide.

### Verifying and debugging on the server

```bash
ssh -i your-key.pem ubuntu@<EC2-IP>
sudo docker ps                 # confirm `web-app` is Up
sudo docker logs web-app       # check for runtime errors (e.g. missing env vars)
```

A very likely first-deploy issue: this Dockerfile never copies any `.env` files into
the image, and the `docker run` command in `push.yml` never passes any `-e`
environment variables either — so `NEXTAUTH_URL`, `JWT_SECRET`, and
`DATABASE_URL` are all **unset inside the container**, falling back to whatever
hardcoded defaults exist in the source (`"secret"` for `JWT_SECRET`, and no fallback
at all for `DATABASE_URL`, which will cause Prisma to throw immediately on first
query). Fixing this properly means passing `-e DATABASE_URL=... -e NEXTAUTH_URL=...`
etc. in the `docker run` line, or using an env file mounted into the container — left
as a next step, not something this pipeline handles for you out of the box.

---

## 8. Official-Command Cheat Sheet (Stage 4 additions)

| Task | Official command |
|---|---|
| Build the Docker image locally | `cp docker/Dockerfile.user Dockerfile && docker build -t wallet-user-app .` |
| Run the built image locally | `docker run -p 3005:3000 wallet-user-app` |
| Create a Docker Hub access token | Docker Hub → Account Settings → Security → New Access Token |
| Add a GitHub Actions secret | Repo → Settings → Secrets and variables → Actions → New repository secret |
| SSH into the EC2 box manually | `ssh -i your-key.pem ubuntu@<EC2-IP>` |
| Check what's running on the server | `sudo docker ps` |
| View the deployed container's logs | `sudo docker logs web-app` |
| Manually redeploy without waiting for CI | `sudo docker pull <user>/web-app:latest && sudo docker stop web-app && sudo docker rm web-app && sudo docker run -d --name web-app -p 3005:3000 <user>/web-app:latest` |

---

## 9. What Changed vs. Stage 3 — Quick Diff Summary

- ✅ **Added**: `docker/Dockerfile.user`, `.github/workflows/build.yml`,
  `.github/workflows/push.yml`, the `start-user-app` root script, plus two new
  pieces of external infrastructure (a Docker Hub repository, an EC2 instance) and
  five new GitHub repository secrets.
- ♻️ **Changed**: nothing in `apps/*` or `packages/*` application source — this
  stage is infrastructure-only, aside from the one-line root `package.json` addition.
- ➖ **Unchanged**: every feature from Stage 2 (on-ramp) and Stage 3 (P2P
  transfers); `merchant-app` and `bank-webhook` are **not** containerized or
  deployed by this pipeline — only `user-app` is.
- 🚧 **Still TODO**: passing real environment variables into the deployed container
  (currently silently falls back to insecure defaults or fails outright), a
  multi-stage Docker build to shrink the image and speed up rebuilds, containerizing
  `merchant-app`/`bank-webhook` too, and running database migrations as part of the
  deploy step rather than assuming the target database is already migrated.