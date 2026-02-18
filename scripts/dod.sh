#!/usr/bin/env bash
set -euo pipefail

echo "== DoD Gate =="
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() { echo "DoD FAIL: $1" >&2; exit 1; }
run() { echo "+ $*"; "$@"; }
has() { command -v "$1" >/dev/null 2>&1; }

HAS_NODE=0
HAS_PY=0
[[ -f package.json ]] && HAS_NODE=1
[[ -f pyproject.toml || -f requirements.txt || -f requirements-dev.txt ]] && HAS_PY=1

if [[ $HAS_NODE -eq 1 ]]; then
  has npm || fail "npm not found"
  run npm ci
  if has jq && jq -e '.scripts.lint' package.json >/dev/null 2>&1; then run npm run lint; fi
  if has jq && jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then run npm run typecheck; fi
  if has jq && jq -e '.scripts.test' package.json >/dev/null 2>&1; then run npm test; fi
  if has jq && jq -e '.scripts.build' package.json >/dev/null 2>&1; then run npm run build; fi
fi

if [[ $HAS_PY -eq 1 ]]; then
  has python3 || fail "python3 not found"
  run python3 -m pip install -U pip
  if [[ -f requirements.txt ]]; then run python3 -m pip install -r requirements.txt; fi
  if [[ -f requirements-dev.txt ]]; then run python3 -m pip install -r requirements-dev.txt; fi
  if has ruff; then
    run ruff check . || true
    run ruff format --check . || true
  fi
  if has pytest; then run pytest -q || true; fi
fi

if [[ $HAS_NODE -eq 0 && $HAS_PY -eq 0 ]]; then
  echo "No package.json or Python dependency files detected."
  echo "Customize scripts/dod.sh for this repo stack."
fi

echo "DoD PASS"
