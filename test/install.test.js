const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { installSkill, resolveTargetDir } = require("../lib/installer");

function makeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-fixture-"));
  fs.mkdirSync(path.join(root, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(root, "agents"), { recursive: true });
  fs.writeFileSync(path.join(root, "SKILL.md"), "# Skill\n");
  fs.writeFileSync(path.join(root, "README.md"), "# English\n");
  fs.writeFileSync(path.join(root, "README.zh-CN.md"), "# 中文\n");
  fs.writeFileSync(path.join(root, "LICENSE"), "MIT\n");
  fs.writeFileSync(path.join(root, "agents", "openai.yaml"), "name: test\n");
  const script = path.join(root, "scripts", "repair-chrome-gemini.sh");
  fs.writeFileSync(script, "#!/usr/bin/env bash\necho repair\n");
  fs.chmodSync(script, 0o755);
  return root;
}

test("installs required skill files into the target directory", () => {
  const packageRoot = makeFixture();
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-target-"));

  const result = installSkill({ packageRoot, targetDir, stdout: () => {} });

  assert.equal(result.status, "installed");
  assert.equal(fs.readFileSync(path.join(targetDir, "SKILL.md"), "utf8"), "# Skill\n");
  assert.equal(fs.readFileSync(path.join(targetDir, "README.zh-CN.md"), "utf8"), "# 中文\n");
  assert.equal(fs.readFileSync(path.join(targetDir, "agents", "openai.yaml"), "utf8"), "name: test\n");
  assert.equal(fs.readFileSync(path.join(targetDir, "scripts", "repair-chrome-gemini.sh"), "utf8"), "#!/usr/bin/env bash\necho repair\n");
  assert.equal(fs.statSync(path.join(targetDir, "scripts", "repair-chrome-gemini.sh")).mode & 0o111, 0o111);
});

test("does not overwrite an existing skill without force", () => {
  const packageRoot = makeFixture();
  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-existing-"));
  fs.writeFileSync(path.join(targetDir, "SKILL.md"), "# Local edit\n");

  const result = installSkill({ packageRoot, targetDir, stdout: () => {} });

  assert.equal(result.status, "already-installed");
  assert.equal(fs.readFileSync(path.join(targetDir, "SKILL.md"), "utf8"), "# Local edit\n");
});

test("resolves the default install directory from CODEX_HOME", () => {
  const codexHome = path.join(os.tmpdir(), "codex-home-for-test");

  assert.equal(
    resolveTargetDir({ env: { CODEX_HOME: codexHome }, homeDir: "/home/example" }),
    path.join(codexHome, "skills", "chrome-gemini-repair")
  );
});
