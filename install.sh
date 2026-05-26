#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

find_npm() {
  for candidate in npm npm.cmd; do
    if command -v "$candidate" >/dev/null 2>&1; then
      command -v "$candidate"
      return
    fi
  done

  echo "Node.js and npm are required. Install Node.js 20 or newer, then run this installer again." >&2
  exit 1
}

NPM_BIN="$(find_npm)"

cd "$ROOT_DIR"

if [[ -f package-lock.json ]]; then
  "$NPM_BIN" ci
else
  "$NPM_BIN" install
fi

"$NPM_BIN" run build

cat <<'NEXT'

Mianotes dashboard installed.
Built files are available in:
  dist/
NEXT
