#!/usr/bin/env node

const { installSkill } = require("../lib/installer");

function usage() {
  console.log(`Chrome Gemini Repair

Usage:
  chrome-gemini-repair install [options]

Options:
  --target <dir>      Install into an explicit skill directory
  --codex-home <dir>  Use a custom CODEX_HOME instead of ~/.codex
  --force             Replace an existing installation
  -h, --help          Show this help
`);
}

function parseInstallArgs(args) {
  const options = {};

  function readValue(index, flag) {
    const value = args[index + 1];
    if (!value || value.startsWith("-")) {
      throw new Error(`${flag} requires a directory`);
    }
    return value;
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--target") {
      options.targetDir = readValue(index, arg);
      index += 1;
    } else if (arg.startsWith("--target=")) {
      options.targetDir = arg.slice("--target=".length);
    } else if (arg === "--codex-home") {
      options.CODEX_HOME = readValue(index, arg);
      index += 1;
    } else if (arg.startsWith("--codex-home=")) {
      options.CODEX_HOME = arg.slice("--codex-home=".length);
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function main(argv) {
  const args = argv.slice(2);
  const command = args[0];

  if (!command || command === "-h" || command === "--help") {
    usage();
    return 0;
  }

  if (command !== "install") {
    throw new Error(`Unknown command: ${command}`);
  }

  const options = parseInstallArgs(args.slice(1));
  if (options.help) {
    usage();
    return 0;
  }

  installSkill({
    targetDir: options.targetDir,
    env: options.CODEX_HOME ? { ...process.env, CODEX_HOME: options.CODEX_HOME } : process.env,
    force: options.force,
  });
  return 0;
}

try {
  process.exitCode = main(process.argv);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
