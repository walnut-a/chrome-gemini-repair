#!/usr/bin/env bash
set -euo pipefail

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for secret scanning." >&2
  exit 2
fi

paths=("$@")
if [ "${#paths[@]}" -eq 0 ]; then
  paths=(".")
fi

failed=0

scan_pattern() {
  local label="$1"
  local pattern="$2"
  local matches

  matches="$(
    rg \
      --files-with-matches \
      --hidden \
      --no-ignore \
      --glob '!.git/**' \
      --glob '!node_modules/**' \
      --regexp "$pattern" \
      -- "${paths[@]}" || true
  )"

  if [ -n "$matches" ]; then
    failed=1
    echo "$label:" >&2
    printf '%s\n' "$matches" | sed 's/^/  /' >&2
  fi
}

scan_pattern "Potential npm token" 'npm_[A-Za-z0-9]{36,}'
scan_pattern "Potential npm auth token config" '_authToken[[:space:]]*=[[:space:]]*[^[:space:]]+'
scan_pattern "Potential npm registry auth line" '//registry\.npmjs\.org/:_authToken'

if [ "$failed" -ne 0 ]; then
  echo "Secret scan failed. Remove the credential before committing or publishing." >&2
  exit 1
fi

echo "Secret scan passed."
