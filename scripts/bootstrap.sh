#!/usr/bin/env bash
# Foyer bootstrap. Idempotent. Run from the repo root on a fresh clone.
set -euo pipefail

cd "$(dirname "$0")/.."

say() { printf '\033[1m==>\033[0m %s\n' "$1"; }

say "Checking toolchain"
command -v node >/dev/null || { echo "node not found"; exit 1; }
command -v pnpm >/dev/null || { echo "pnpm not found: npm i -g pnpm@10"; exit 1; }
node -e 'const [maj,min]=process.versions.node.split(".").map(Number); if(maj<20||(maj===20&&min<11)){console.error("node >=20.11 required, found "+process.version);process.exit(1)}'

if [ ! -f .env ]; then
  say "Creating .env from .env.example"
  cp .env.example .env
  echo "    Fill DATABASE_URL and FLINT_* in .env before running migrations."
else
  say ".env already present, leaving it alone"
fi

say "Installing workspace dependencies"
pnpm install

say "Generating Prisma client"
pnpm db:generate

say "Validating Prisma schema"
pnpm db:validate

say "Typechecking workspace"
pnpm typecheck

cat <<'MSG'

Bootstrap done. Next:

  pnpm db:migrate        # needs a reachable DATABASE_URL
  pnpm dev               # web on :3000, api on :4000
  pnpm eval              # rubric regression over the golden set

MSG
