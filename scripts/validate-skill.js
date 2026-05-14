#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function fail(message) {
  console.error(`Skill validation failed: ${message}`);
  process.exitCode = 1;
}

function readRequired(relativePath) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) {
    fail(`missing ${relativePath}`);
    return "";
  }
  return fs.readFileSync(file, "utf8");
}

const skill = readRequired("SKILL.md");
readRequired("README.md");
readRequired("README.zh-CN.md");

const repairScript = path.join(root, "scripts", "repair-chrome-gemini.sh");
if (!fs.existsSync(repairScript)) {
  fail("missing scripts/repair-chrome-gemini.sh");
} else if ((fs.statSync(repairScript).mode & 0o111) === 0) {
  fail("scripts/repair-chrome-gemini.sh is not executable");
}

const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/);
if (!frontmatter) {
  fail("SKILL.md is missing YAML frontmatter");
} else {
  const fields = Object.fromEntries(
    frontmatter[1]
      .split("\n")
      .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim()])
  );

  if (fields.name !== packageJson.name) {
    fail(`SKILL.md name must be ${packageJson.name}`);
  }
  if (!fields.description || fields.description.length < 20) {
    fail("SKILL.md description is missing or too short");
  }
}

for (const requiredText of [
  "scripts/repair-chrome-gemini.sh --dry-run",
  "variations_country",
  "chrome://settings/ai",
]) {
  if (!skill.includes(requiredText)) {
    fail(`SKILL.md should mention ${requiredText}`);
  }
}

if (!process.exitCode) {
  console.log("Skill is valid!");
}
