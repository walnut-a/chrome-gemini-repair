---
name: chrome-gemini-repair
description: Use when Gemini in Chrome, Ask Gemini, Glic, Chrome AI innovations, AI-powered history search, or the Gemini side panel disappears, only shows Help me write, reports region/language unavailability, or breaks after a Chrome update on macOS.
---

# Chrome Gemini Repair

## Overview

Repair the local Chrome profile state that controls Gemini in Chrome availability. Prefer the bundled script for repeatable backups, profile edits, launch arguments, and verification.

## Quick Start

Run a dry check first:

```bash
scripts/repair-chrome-gemini.sh --dry-run
```

Apply the standard repair:

```bash
scripts/repair-chrome-gemini.sh
```

By default this repairs Google Chrome Stable. Use `--channel beta`, `--channel dev`, `--channel canary`, or `--channel all` only when the user is using those builds.

## Workflow

1. Inspect the symptom in the real Chrome UI when possible: `chrome://settings/ai` should show `Gemini in Chrome`, and the toolbar should show `Ask Gemini`.
2. Check current state before changing files:

```bash
scripts/repair-chrome-gemini.sh --dry-run
```

3. Apply the repair. The script quits Chrome, waits for processes to exit, backs up profile files, patches JSON, optionally sets Chrome app language to `en-US`, starts Chrome, and opens `chrome://settings/ai`.
4. Verify visually. A successful repair shows:
   - `Gemini in Chrome` row under AI innovations.
   - `Ask Gemini` toolbar button.
   - Clicking it opens the `chrome://glic/` side panel backed by `gemini.google.com/glic`.

## What The Script Changes

The repair targets Chrome user data, not the browser app bundle.

- Recursively sets `is_glic_eligible` to `true` in `Local State`.
- Sets `variations_country` to `us`.
- Sets `variations_permanent_consistency_country` to `[<Last Version>, "us"]` when a version is available.
- Adds Glic-related labs experiments such as `glic@1`, `glic-side-panel@1`, `glic-actor@1`, `glic-pre-warming@1`, `glic-z-order-changes@1`, and `glic-fre-pre-warming@1`. Chrome may drop unavailable flags after launch.
- Sets Chrome language to `en-US` unless `--keep-language` is passed.
- Launches Chrome once with `--variations-override-country=us` unless `--no-launch` is passed.

## Important Notes

- Do not edit `Local State` while Chrome is running; Chrome can overwrite the changes.
- Keep the backup path from the script output. Backups live under `~/.codex/backups/chrome-gemini-repair/`.
- If the UI still only shows `Help me write`, compare against these blockers: Chrome not actually restarted, Chrome language not English, Google account not eligible, Workspace/admin policy, VPN/IP not seen as a supported region, or Chrome server-side rollout changed.
- If the user asks whether Chinese UI is allowed, explain that current rollouts support more languages, but this workaround is most reliable with `en-US`; after activation, testing Chinese UI is reversible.

## Script

Use [scripts/repair-chrome-gemini.sh](scripts/repair-chrome-gemini.sh). Run with `--help` for options.
