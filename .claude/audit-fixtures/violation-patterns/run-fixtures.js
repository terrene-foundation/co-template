#!/usr/bin/env node
"use strict";

/**
 * run-fixtures.js — exercises every committed violation-patterns fixture
 * against the real detectors in
 * `.claude/hooks/lib/violation-patterns.js` and compares each detector's
 * return value to the paired `.expected` file.
 *
 * Convention (mirrors `.claude/audit-fixtures/frontmatter-lint/`):
 *   - one directory per exported detector, named exactly as the export.
 *   - each fixture is `<name>.txt` (the detector INPUT) paired with
 *     `<name>.expected` (the EXPECTED return, serialized).
 *   - an empty `.expected` means the detector MUST return null.
 *   - a non-empty `.expected` is the compact JSON of the returned object.
 *
 * Input decoding per detector signature:
 *   - detectRepoScopeDrift(command, projectDir): the `.txt` is the command;
 *     projectDir is fixed to PROJECT_DIR below so the sibling-repo prefix
 *     check is deterministic.
 *   - detectDestructiveBash / detectTimePressureShortcut /
 *     detectSweepSubstitution(arg): the `.txt` is the single string arg.
 *   - detectFalseCommitClaim(toolInput): the `.txt` is a JSON object passed
 *     as-is (the detector is a no-op stub and MUST return null for any input).
 *
 * Node built-ins only; CommonJS. Run: node run-fixtures.js
 */

const fs = require("fs");
const path = require("path");

// Deterministic cwd repo for the prefix-based scope-drift detector. The
// fixtures under detectRepoScopeDrift/ are authored against this exact root.
const PROJECT_DIR = "/Users/esperie/repos/atelier";

const here = __dirname;
const vp = require(
  path.join(here, "..", "..", "hooks", "lib", "violation-patterns.js"),
);

// Map each detector directory to a function that turns the raw `.txt`
// contents into the detector's return value.
const RUNNERS = {
  detectRepoScopeDrift: (raw) => vp.detectRepoScopeDrift(raw, PROJECT_DIR),
  detectDestructiveBash: (raw) => vp.detectDestructiveBash(raw),
  detectTimePressureShortcut: (raw) => vp.detectTimePressureShortcut(raw),
  detectSweepSubstitution: (raw) => vp.detectSweepSubstitution(raw),
  detectFalseCommitClaim: (raw) => vp.detectFalseCommitClaim(JSON.parse(raw)),
};

// Serialize a detector return value the same way the `.expected` files are
// authored: compact JSON for an object, empty string for null/undefined.
function serialize(result) {
  if (result === null || result === undefined) return "";
  return JSON.stringify(result);
}

let pass = 0;
let fail = 0;

for (const detector of Object.keys(RUNNERS)) {
  const dir = path.join(here, detector);
  if (!fs.existsSync(dir)) {
    console.log(`MISSING DIR ${detector}`);
    fail++;
    continue;
  }
  const fixtures = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".txt"))
    .sort();
  for (const f of fixtures) {
    const inputPath = path.join(dir, f);
    const expectedPath = path.join(dir, f.replace(/\.txt$/, ".expected"));
    const raw = fs.readFileSync(inputPath, "utf8").replace(/\n$/, "");
    const expected = fs.existsSync(expectedPath)
      ? fs.readFileSync(expectedPath, "utf8").replace(/\n$/, "")
      : "";
    let actual;
    try {
      actual = serialize(RUNNERS[detector](raw));
    } catch (e) {
      actual = `THREW: ${e.message}`;
    }
    if (actual === expected) {
      console.log(`PASS ${detector}/${f}`);
      pass++;
    } else {
      console.log(`FAIL ${detector}/${f}`);
      console.log(`  expected: ${expected}`);
      console.log(`  actual:   ${actual}`);
      fail++;
    }
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
