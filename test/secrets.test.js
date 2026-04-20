const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const scanner = path.join(repoRoot, "scripts", "check-secrets.sh");

function runScanner(target) {
  return spawnSync(scanner, [target], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

test("secret scanner fails without printing the secret value", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-secret-"));
  const secret = "npm_" + "A".repeat(36);
  fs.writeFileSync(path.join(tempDir, "fixture.txt"), `token=${secret}\n`);

  const result = runScanner(tempDir);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Potential npm token/);
  assert.match(result.stderr, /fixture\.txt/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});

test("secret scanner passes on clean files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-clean-"));
  fs.writeFileSync(path.join(tempDir, "fixture.txt"), "no credentials here\n");

  const result = runScanner(tempDir);

  assert.equal(result.status, 0, result.stderr);
});

test("secret scanner checks hidden npm config files", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-npmrc-"));
  const secret = "npm_" + "B".repeat(36);
  const authKey = "_auth" + "Token";
  fs.writeFileSync(path.join(tempDir, ".npmrc"), `//registry.npmjs.org/:${authKey}=${secret}\n`);

  const result = runScanner(tempDir);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Potential npm token/);
  assert.match(result.stderr, /\.npmrc/);
  assert.doesNotMatch(result.stdout + result.stderr, new RegExp(secret));
});
