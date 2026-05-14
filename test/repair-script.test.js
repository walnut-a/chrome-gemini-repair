const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const repairScript = path.join(repoRoot, "scripts", "repair-chrome-gemini.sh");

function extractBashFunction(name) {
  const source = fs.readFileSync(repairScript, "utf8");
  const start = source.indexOf(`${name}() {`);
  assert.notEqual(start, -1, `missing ${name}`);

  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`unterminated ${name}`);
}

function writeExecutable(file, content) {
  fs.writeFileSync(file, content);
  fs.chmodSync(file, 0o755);
}

function makeFakeMacCommands(dir, psOutput = "") {
  fs.mkdirSync(dir, { recursive: true });
  const psBody = psOutput.endsWith("\n") ? psOutput : `${psOutput}\n`;
  writeExecutable(path.join(dir, "uname"), "#!/usr/bin/env bash\nprintf 'Darwin\\n'\n");
  writeExecutable(path.join(dir, "osascript"), "#!/usr/bin/env bash\nexit 0\n");
  writeExecutable(path.join(dir, "open"), "#!/usr/bin/env bash\nexit 0\n");
  writeExecutable(path.join(dir, "sleep"), "#!/usr/bin/env bash\nexit 0\n");
  writeExecutable(path.join(dir, "ps"), `#!/usr/bin/env bash\ncat <<'EOF'\n${psBody}EOF\n`);
  writeExecutable(path.join(dir, "defaults"), `#!/usr/bin/env bash
case "$1" in
  read)
    exit 1
    ;;
  export)
    printf '<plist/>' > "$3"
    ;;
  write)
    exit 0
    ;;
esac
`);
}

test("detects Chrome process names with spaces while ignoring crashpad and awk self matches", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-ps-"));
  const psFixture = path.join(tempDir, "ps.txt");
  fs.writeFileSync(
    psFixture,
    [
      "111 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --type=browser",
      "222 /Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Helpers/chrome_crashpad_handler --monitor-self",
      "333 awk -v needle=/Applications/Google Chrome.app index($0, needle)",
      "444 /Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta",
      "",
    ].join("\n")
  );

  const bash = `
set -euo pipefail
ps() { cat "$PS_FIXTURE"; }
${extractBashFunction("chrome_processes_for_app")}
chrome_processes_for_app "Google Chrome"
`;
  const result = spawnSync("bash", ["-c", bash], {
    env: { ...process.env, PS_FIXTURE: psFixture },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), "111 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --type=browser");
});

test("patch run verifies Local State and prints before to after dry check", () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-home-"));
  const binDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-gemini-bin-"));
  makeFakeMacCommands(binDir);

  const userData = path.join(home, "Library", "Application Support", "Google", "Chrome");
  const defaultDir = path.join(userData, "Default");
  fs.mkdirSync(defaultDir, { recursive: true });
  fs.writeFileSync(path.join(userData, "Last Version"), "148.0.7778.97\n");
  fs.writeFileSync(
    path.join(userData, "Local State"),
    JSON.stringify({
      variations_country: "cn",
      variations_permanent_consistency_country: ["148.0.7778.97", "cn"],
      browser: { enabled_labs_experiments: [] },
      nested: { is_glic_eligible: false },
    })
  );
  fs.writeFileSync(
    path.join(defaultDir, "Preferences"),
    JSON.stringify({ intl: { accept_languages: "zh-CN,zh" } })
  );

  const result = spawnSync(repairScript, ["--no-launch", "--no-open-settings"], {
    cwd: repoRoot,
    env: { ...process.env, HOME: home, PATH: `${binDir}:${process.env.PATH}` },
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /verified_local_state=stable/);
  assert.match(result.stdout, /== stable final dry check ==/);
  assert.match(result.stdout, /variations_country: cn -> us/);
  assert.match(
    result.stdout,
    /variations_permanent_consistency_country: \['148\.0\.7778\.97', 'cn'\] -> \['148\.0\.7778\.97', 'us'\]/
  );

  const localState = JSON.parse(fs.readFileSync(path.join(userData, "Local State"), "utf8"));
  assert.equal(localState.variations_country, "us");
  assert.deepEqual(localState.variations_permanent_consistency_country, ["148.0.7778.97", "us"]);
  assert.equal(localState.nested.is_glic_eligible, true);
});
