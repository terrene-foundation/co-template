#!/usr/bin/env node
/**
 * Fixture runner for .claude/hooks/validate-bash-command.js.
 *
 * Unlike the violation-patterns runner (which imports detector functions),
 * this runner exercises the REAL hook contract: it spawns the hook as a child
 * process, streams each fixture's bytes to stdin, and asserts on the exit
 * code and stdout — the exact surface the Claude Code host consumes. No test
 * seam is exported from the hook; the consumer path IS the test path
 * (rules/user-flow-validation.md MUST §1).
 *
 * Fixture contract: <name>.txt is the raw stdin payload (JSON for normal
 * cases; deliberately malformed bytes for the fail-open case). <name>.expected
 * is JSON: {exit, stdout_contains: [...], stdout_not_contains: [...]}.
 * Fixture payloads set cwd to /tmp/gh16-vbc-fixture so the hook's learning
 * side-channel never writes into the repo.
 *
 * Exit: 0 when every fixture passes; 1 on any mismatch (prints per-fixture
 * PASS/FAIL with the observed exit code and the failed assertion).
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const FIXTURE_DIR = __dirname;
const HOOK = path.join(
  __dirname,
  "..",
  "..",
  "hooks",
  "validate-bash-command.js",
);

let passed = 0;
let failed = 0;

const inputs = fs
  .readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith(".txt"))
  .sort();

for (const input of inputs) {
  const name = input.replace(/\.txt$/, "");
  const expectedPath = path.join(FIXTURE_DIR, `${name}.expected`);
  if (!fs.existsSync(expectedPath)) {
    console.log(`FAIL ${input} — missing ${name}.expected`);
    failed++;
    continue;
  }
  const payload = fs.readFileSync(path.join(FIXTURE_DIR, input));
  const expected = JSON.parse(fs.readFileSync(expectedPath, "utf8"));

  const res = spawnSync("node", [HOOK], {
    input: payload,
    encoding: "utf8",
    timeout: 15000,
  });
  const stdout = res.stdout || "";
  const exit = typeof res.status === "number" ? res.status : -1;

  const problems = [];
  if (exit !== expected.exit) {
    problems.push(`exit ${exit} != expected ${expected.exit}`);
  }
  for (const s of expected.stdout_contains || []) {
    if (!stdout.includes(s)) problems.push(`stdout missing "${s}"`);
  }
  for (const s of expected.stdout_not_contains || []) {
    if (stdout.includes(s))
      problems.push(`stdout unexpectedly contains "${s}"`);
  }

  if (problems.length === 0) {
    console.log(`PASS ${input}`);
    passed++;
  } else {
    console.log(`FAIL ${input} — ${problems.join("; ")}`);
    console.log(`     stdout: ${stdout.slice(0, 300).replace(/\n/g, "\\n")}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
