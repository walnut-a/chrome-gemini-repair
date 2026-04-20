# Chrome Gemini Repair

[English](README.md) | [中文](README.zh-CN.md)

这是一个小型 Codex skill 和 macOS 修复脚本，用来恢复 Chrome 里的 **Gemini in Chrome**、**Ask Gemini** 工具栏按钮、Glic、Chrome AI innovations，以及 AI 驱动的历史记录搜索。适用于 Chrome 更新后只显示 **Help me write**、Gemini 侧边栏消失，或者相关入口被隐藏的情况。

本项目与 Google 无关。脚本会修改本机 Chrome profile 状态。运行前建议先阅读脚本内容，并保留脚本输出的备份路径。

## 功能

- 修改 profile 文件前退出 Chrome。
- 备份 `Local State`、`Default/Preferences` 和 Chrome 语言默认值。
- 将 `is_glic_eligible` 设为 `true`。
- 将 `variations_country` 设为 `us`。
- 将 `variations_permanent_consistency_country` 设为 `[<Last Version>, "us"]`。
- 添加 Glic 相关 labs experiments，例如 `glic@1`、`glic-side-panel@1`、`glic-actor@1` 和 `glic-pre-warming@1`。
- 可选择把 Chrome 语言设为 `en-US`。
- 重新启动 Chrome，并打开 `chrome://settings/ai` 方便肉眼验证。

## 安装为 Codex Skill

把这个仓库 clone 到 Codex skills 目录：

```bash
git clone https://github.com/walnut-a/chrome-gemini-repair.git ~/.codex/skills/chrome-gemini-repair
```

然后对 Codex 说：

```text
Use $chrome-gemini-repair to repair Gemini in Chrome.
```

## 直接运行

在仓库根目录运行：

```bash
scripts/repair-chrome-gemini.sh --dry-run
scripts/repair-chrome-gemini.sh
```

如果想保留当前 Chrome 语言设置：

```bash
scripts/repair-chrome-gemini.sh --keep-language
```

如果要修复其他 Chrome 渠道版本：

```bash
scripts/repair-chrome-gemini.sh --channel beta
scripts/repair-chrome-gemini.sh --channel dev
scripts/repair-chrome-gemini.sh --channel canary
scripts/repair-chrome-gemini.sh --channel all
```

## 验证

成功运行后，`chrome://settings/ai` 里应该能看到：

- `Gemini in Chrome`
- `History search, powered by AI`
- `Help me write`
- `Ask Gemini` 工具栏按钮

点击 `Ask Gemini` 后，应该打开由 `gemini.google.com/glic` 支持的 `chrome://glic/` 侧边栏。

## 注意事项

- 脚本仅支持 macOS。
- 不要在 Chrome 正在运行时修改 `Local State`，否则 Chrome 可能会覆盖 profile 里的改动。
- Chrome 启动后可能会移除不可用的实验 flags，这是正常现象。
- English (`en-US`) 是这个修复方式目前最可靠的启用语言。较新的 Chrome 灰度可能会在启用后支持更多语言。
- 备份文件会写入 `~/.codex/backups/chrome-gemini-repair/`。

## 参考来源

这个仓库把本机调试流程和以下公开资料中的做法整理成了可重复运行的修复流程：

- [`lcandy2/enable-chrome-ai`](https://github.com/lcandy2/enable-chrome-ai)：记录并脚本化了 `Local State` 中 `variations_country`、`variations_permanent_consistency_country` 和 `is_glic_eligible` 的核心修改方式。
- 微信文章：[自带 Nano 改图，一键总结 N 个网页！Chrome 这次更新，让所有 AI 插件都下岗了（附国内开启方法）](https://mp.weixin.qq.com/s/g3sFstE99pEnnw9kWCMeJg?clicktime=1771282478&enterid=1771282478&scene=126&sessionid=1771282476&subscene=307)。原始页面在部分环境里可能需要微信验证。
- 原微信页面需要验证时用于对照的公开镜像：[53AI mirror](https://www.53ai.com/news/LargeLanguageModel/2026013069547.html)。

## License

MIT。详见 [LICENSE](LICENSE)。
