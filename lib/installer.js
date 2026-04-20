const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const SKILL_NAME = "chrome-gemini-repair";
const REQUIRED_FILES = ["SKILL.md", "README.md", "README.zh-CN.md", "LICENSE"];
const REQUIRED_DIRS = ["agents", "scripts"];

function resolveTargetDir(options = {}) {
  if (options.targetDir) {
    return path.resolve(options.targetDir);
  }

  const env = options.env || process.env;
  const homeDir = options.homeDir || os.homedir();
  const codexHome = env.CODEX_HOME ? path.resolve(env.CODEX_HOME) : path.join(homeDir, ".codex");
  return path.join(codexHome, "skills", SKILL_NAME);
}

function copyEntry(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyEntry(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  fs.chmodSync(target, stat.mode & 0o777);
}

function assertPackageRoot(packageRoot) {
  for (const file of REQUIRED_FILES) {
    const source = path.join(packageRoot, file);
    if (!fs.existsSync(source)) {
      throw new Error(`Package is missing required file: ${file}`);
    }
  }

  for (const dir of REQUIRED_DIRS) {
    const source = path.join(packageRoot, dir);
    if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
      throw new Error(`Package is missing required directory: ${dir}`);
    }
  }
}

function installSkill(options = {}) {
  const packageRoot = path.resolve(options.packageRoot || path.join(__dirname, ".."));
  const targetDir = resolveTargetDir(options);
  const stdout = options.stdout || ((line) => console.log(line));
  const force = Boolean(options.force);

  assertPackageRoot(packageRoot);

  if (fs.existsSync(targetDir)) {
    if (!force && fs.existsSync(path.join(targetDir, "SKILL.md"))) {
      stdout(`chrome-gemini-repair is already installed at ${targetDir}`);
      stdout("Use --force to replace the existing installation.");
      return { status: "already-installed", targetDir };
    }

    if (!force && fs.readdirSync(targetDir).length > 0) {
      throw new Error(`Target directory already exists and is not empty: ${targetDir}`);
    }

    if (force) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  for (const file of REQUIRED_FILES) {
    copyEntry(path.join(packageRoot, file), path.join(targetDir, file));
  }

  for (const dir of REQUIRED_DIRS) {
    copyEntry(path.join(packageRoot, dir), path.join(targetDir, dir));
  }

  stdout(`Installed chrome-gemini-repair skill at ${targetDir}`);
  stdout("Try: Use $chrome-gemini-repair to repair Gemini in Chrome.");
  return { status: "installed", targetDir };
}

module.exports = {
  installSkill,
  resolveTargetDir,
};
