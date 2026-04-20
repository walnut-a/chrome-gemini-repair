# Chrome Gemini Repair

[English](README.md) | [中文](README.zh-CN.md)

A small Codex skill and macOS repair script for restoring **Gemini in Chrome**, the **Ask Gemini** toolbar button, Glic, Chrome AI innovations, and AI-powered history search when Chrome only shows **Help me write** or hides the Gemini side panel after an update.

This is not affiliated with Google. It edits your local Chrome profile state, so read the script and keep the generated backup path.

## What It Does

- Quits Chrome before editing profile files.
- Backs up `Local State`, `Default/Preferences`, and Chrome language defaults.
- Sets `is_glic_eligible` values to `true`.
- Sets `variations_country` to `us`.
- Sets `variations_permanent_consistency_country` to `[<Last Version>, "us"]`.
- Adds Glic-related labs experiments such as `glic@1`, `glic-side-panel@1`, `glic-actor@1`, and `glic-pre-warming@1`.
- Optionally sets Chrome language to `en-US`.
- Relaunches Chrome and opens `chrome://settings/ai` for visual verification.

## Install As A Codex Skill

Use `npx` to install from GitHub:

```bash
npx --yes github:walnut-a/chrome-gemini-repair install
```

The installer copies this skill into:

```text
~/.codex/skills/chrome-gemini-repair
```

To use a custom Codex home:

```bash
CODEX_HOME=/path/to/codex npx --yes github:walnut-a/chrome-gemini-repair install
```

You can also clone this repository directly into your Codex skills directory:

```bash
git clone https://github.com/walnut-a/chrome-gemini-repair.git ~/.codex/skills/chrome-gemini-repair
```

Then ask Codex:

```text
Use $chrome-gemini-repair to repair Gemini in Chrome.
```

## Run Directly

From the repository root:

```bash
scripts/repair-chrome-gemini.sh --dry-run
scripts/repair-chrome-gemini.sh
```

To preserve your current Chrome language setting:

```bash
scripts/repair-chrome-gemini.sh --keep-language
```

To repair other Chrome channels:

```bash
scripts/repair-chrome-gemini.sh --channel beta
scripts/repair-chrome-gemini.sh --channel dev
scripts/repair-chrome-gemini.sh --channel canary
scripts/repair-chrome-gemini.sh --channel all
```

## Verification

After a successful run, `chrome://settings/ai` should show:

- `Gemini in Chrome`
- `History search, powered by AI`
- `Help me write`
- an `Ask Gemini` toolbar button

Clicking `Ask Gemini` should open the `chrome://glic/` side panel backed by `gemini.google.com/glic`.

## Notes

- The script is macOS-only.
- Do not edit `Local State` while Chrome is running; Chrome can overwrite profile changes.
- Chrome may remove unavailable experimental flags after launch. That is expected.
- English (`en-US`) is the most reliable activation language for this workaround. Newer Chrome rollouts may support more languages after activation.
- Backups are written to `~/.codex/backups/chrome-gemini-repair/`.

## References

This repository packages a repair workflow derived from local debugging and the following public references:

- [`lcandy2/enable-chrome-ai`](https://github.com/lcandy2/enable-chrome-ai), which documents and scripts the core `Local State` patching approach for `variations_country`, `variations_permanent_consistency_country`, and `is_glic_eligible`.
- WeChat article: [自带 Nano 改图，一键总结 N 个网页！Chrome 这次更新，让所有 AI 插件都下岗了（附国内开启方法）](https://mp.weixin.qq.com/s/g3sFstE99pEnnw9kWCMeJg?clicktime=1771282478&enterid=1771282478&scene=126&sessionid=1771282476&subscene=307). The original page may require WeChat verification in some environments.
- Public mirror used for comparison when the original WeChat page required verification: [53AI mirror](https://www.53ai.com/news/LargeLanguageModel/2026013069547.html).

## License

MIT. See [LICENSE](LICENSE).
