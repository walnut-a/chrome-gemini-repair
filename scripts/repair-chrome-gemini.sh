#!/usr/bin/env bash
set -euo pipefail

CHANNEL="stable"
DRY_RUN=0
KEEP_LANGUAGE=0
NO_LAUNCH=0
OPEN_SETTINGS=1

usage() {
  cat <<'EOF'
Repair Gemini in Chrome availability on macOS.

Usage:
  repair-chrome-gemini.sh [options]

Options:
  --channel stable|beta|dev|canary|all  Chrome build to repair (default: stable)
  --dry-run                             Print current state without changing files
  --keep-language                       Do not set Chrome application/profile language to en-US
  --no-launch                           Do not relaunch Chrome after patching
  --no-open-settings                    Do not open chrome://settings/ai after launch
  -h, --help                            Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --channel)
      CHANNEL="${2:-}"
      shift 2
      ;;
    --channel=*)
      CHANNEL="${1#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --keep-language)
      KEEP_LANGUAGE=1
      shift
      ;;
    --no-launch)
      NO_LAUNCH=1
      shift
      ;;
    --no-open-settings)
      OPEN_SETTINGS=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

case "$CHANNEL" in
  stable|beta|dev|canary|all) ;;
  *)
    echo "Unsupported channel: $CHANNEL" >&2
    exit 2
    ;;
esac

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This script is macOS-only." >&2
  exit 2
fi

timestamp() {
  date +%Y%m%d-%H%M%S
}

channel_app() {
  case "$1" in
    stable) echo "Google Chrome" ;;
    beta) echo "Google Chrome Beta" ;;
    dev) echo "Google Chrome Dev" ;;
    canary) echo "Google Chrome Canary" ;;
  esac
}

channel_bundle() {
  case "$1" in
    stable) echo "com.google.Chrome" ;;
    beta) echo "com.google.Chrome.beta" ;;
    dev) echo "com.google.Chrome.dev" ;;
    canary) echo "com.google.Chrome.canary" ;;
  esac
}

channel_user_data() {
  case "$1" in
    stable) echo "$HOME/Library/Application Support/Google/Chrome" ;;
    beta) echo "$HOME/Library/Application Support/Google/Chrome Beta" ;;
    dev) echo "$HOME/Library/Application Support/Google/Chrome Dev" ;;
    canary) echo "$HOME/Library/Application Support/Google/Chrome Canary" ;;
  esac
}

selected_channels() {
  if [ "$CHANNEL" = "all" ]; then
    printf '%s\n' stable beta dev canary
  else
    printf '%s\n' "$CHANNEL"
  fi
}

chrome_processes_for_app() {
  local app="$1"
  ps -axww -o pid=,command= | awk -v app="/Applications/"$app".app" 'index($0, app) {print}'
}

quit_app_and_wait() {
  local app="$1"
  osascript -e "tell application \"$app\" to quit" >/dev/null 2>&1 || true
  for _ in $(seq 1 40); do
    if [ -z "$(chrome_processes_for_app "$app")" ]; then
      return 0
    fi
    sleep 0.25
  done
  echo "Chrome is still running for $app; refusing to edit profile files." >&2
  chrome_processes_for_app "$app" >&2
  return 1
}

print_state() {
  local channel="$1"
  local user_data="$2"
  local local_state="$user_data/Local State"
  local prefs="$user_data/Default/Preferences"
  local app bundle
  app="$(channel_app "$channel")"
  bundle="$(channel_bundle "$channel")"

  echo "== $channel =="
  echo "app=$app"
  echo "user_data=$user_data"
  if [ -f "$user_data/Last Version" ]; then
    echo "last_version=$(cat "$user_data/Last Version")"
  else
    echo "last_version=missing"
  fi

  if [ -f "$local_state" ]; then
    python3 - "$local_state" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)

def walk(obj):
    if isinstance(obj, dict):
        yield obj
        for value in obj.values():
            yield from walk(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk(value)

false_count = sum(
    1 for obj in walk(data)
    if "is_glic_eligible" in obj and obj.get("is_glic_eligible") is not True
)
print("variations_country=" + str(data.get("variations_country", "missing")))
print("variations_permanent_consistency_country=" + str(data.get("variations_permanent_consistency_country", "missing")))
print("is_glic_eligible_false_count=" + str(false_count))
experiments = data.get("browser", {}).get("enabled_labs_experiments", [])
print("enabled_labs_experiments=" + ",".join(map(str, experiments)))
PY
  else
    echo "local_state=missing"
  fi

  if [ -f "$prefs" ]; then
    python3 - "$prefs" <<'PY'
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
print("intl.accept_languages=" + str(data.get("intl", {}).get("accept_languages", "missing")))
PY
  else
    echo "preferences=missing"
  fi

  local app_lang
  app_lang="$(defaults read "$bundle" AppleLanguages 2>/dev/null || true)"
  if [ -n "$app_lang" ]; then
    echo "AppleLanguages=$app_lang"
  else
    echo "AppleLanguages=missing"
  fi
  echo
}

patch_channel() {
  local channel="$1"
  local app bundle user_data local_state prefs last_version backup_root
  app="$(channel_app "$channel")"
  bundle="$(channel_bundle "$channel")"
  user_data="$(channel_user_data "$channel")"
  local_state="$user_data/Local State"
  prefs="$user_data/Default/Preferences"

  if [ ! -d "$user_data" ]; then
    echo "Skipping $channel: user data directory does not exist: $user_data"
    return 0
  fi

  print_state "$channel" "$user_data"

  if [ "$DRY_RUN" -eq 1 ]; then
    return 0
  fi

  if [ ! -f "$local_state" ]; then
    echo "Skipping $channel: Local State is missing. Launch $app once, then rerun." >&2
    return 1
  fi

  quit_app_and_wait "$app"

  backup_root="$HOME/.codex/backups/chrome-gemini-repair/$(timestamp)/$channel"
  mkdir -p "$backup_root"
  cp "$local_state" "$backup_root/Local_State.before.json"
  if [ -f "$prefs" ]; then
    cp "$prefs" "$backup_root/Default_Preferences.before.json"
  fi
  defaults export "$bundle" "$backup_root/${bundle}.before.plist" >/dev/null 2>&1 || true
  echo "backup_root=$backup_root"

  if [ -f "$user_data/Last Version" ]; then
    last_version="$(cat "$user_data/Last Version")"
  else
    last_version=""
  fi

  python3 - "$local_state" "$last_version" <<'PY'
import json, os, sys
path, last_version = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    data = json.load(f)

def walk(obj):
    if isinstance(obj, dict):
        if "is_glic_eligible" in obj:
            obj["is_glic_eligible"] = True
        for value in obj.values():
            walk(value)
    elif isinstance(obj, list):
        for value in obj:
            walk(value)

walk(data)
data["variations_country"] = "us"
existing = data.get("variations_permanent_consistency_country")
version = last_version or (existing[0] if isinstance(existing, list) and existing else "")
if version:
    data["variations_permanent_consistency_country"] = [version, "us"]

browser = data.setdefault("browser", {})
experiments = browser.get("enabled_labs_experiments")
if not isinstance(experiments, list):
    experiments = []
wanted = [
    "glic@1",
    "glic-side-panel@1",
    "glic-actor@1",
    "glic-pre-warming@1",
    "glic-z-order-changes@1",
    "glic-fre-pre-warming@1",
    "skills@1",
]
seen = set()
merged = []
for item in experiments + wanted:
    if item not in seen:
        merged.append(item)
        seen.add(item)
browser["enabled_labs_experiments"] = merged

tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
os.replace(tmp, path)
PY

  if [ "$KEEP_LANGUAGE" -eq 0 ]; then
    if [ -f "$prefs" ]; then
      python3 - "$prefs" <<'PY'
import json, os, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
data.setdefault("intl", {})["accept_languages"] = "en-US,en,zh-CN,zh"
tmp = path + ".tmp"
with open(tmp, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
os.replace(tmp, path)
PY
    fi
    defaults write "$bundle" AppleLanguages -array en-US
  fi

  echo "patched=$channel"

  if [ "$NO_LAUNCH" -eq 0 ]; then
    if [ "$KEEP_LANGUAGE" -eq 0 ]; then
      open -n -a "$app" --args --variations-override-country=us --lang=en-US
    else
      open -n -a "$app" --args --variations-override-country=us
    fi
    sleep 2
    if [ "$OPEN_SETTINGS" -eq 1 ]; then
      open -a "$app" "chrome://settings/ai" >/dev/null 2>&1 || true
    fi
  fi
}

for channel in $(selected_channels); do
  patch_channel "$channel"
done

echo "Done. Verify in Chrome: chrome://settings/ai should show Gemini in Chrome and the toolbar should show Ask Gemini."
