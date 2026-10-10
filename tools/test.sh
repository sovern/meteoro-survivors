#!/usr/bin/env bash
# Testes headless do METEORO via gjs (sem node, sem browser).
#   tools/test.sh          # rápido (~5s): botglue — 12k frames, bot precisa progredir
#   tools/test.sh full     # lento (~8min): bot100 — 100 sessões com meta-progressão
# Os harnesses em ml/ têm ROOT fixo; aqui eles rodam apontando para este repo.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
command -v gjs >/dev/null || { echo "precisa de gjs (apt install gjs)"; exit 2; }

run() {
  sed "s#/home/wellington/meteoro/#$REPO/#g" "$REPO/ml/$1" > "$TMP/$1"
  gjs "$TMP/$1"
}

case "${1:-quick}" in
  quick) run botglue.js ;;
  full)  run bot100.js | tail -3 ;;
  *) echo "uso: tools/test.sh [quick|full]"; exit 2 ;;
esac
