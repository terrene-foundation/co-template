#!/usr/bin/env node
"use strict";

/**
 * run-fixtures.js — exercises the trust-posture ENFORCEMENT ENGINE
 * (.claude/hooks/lib/posture.js + its wiring into detect-violations.js,
 * session-start.js, and the gate CLI) against the GH #16 acceptance list.
 *
 * Every scenario runs in a throwaway sandbox project dir under os.tmpdir() —
 * the repo's own .claude/learning state is NEVER touched. Library scenarios
 * call the engine functions directly; the banner, CLI, and grace-escalation
 * scenarios spawn the REAL consumer surface as a child process (the consumer
 * path IS the test path, rules/user-flow-validation.md MUST §1).
 *
 * Scenario map → acceptance:
 *   01-03  advisory hits never move posture (probe-confirmed only)
 *   04-07  cumulative thresholds: 3x same-type, 5x total, 30d window,
 *          once-per-downgrade consumption
 *   08-10  adjudication: structural marker, idempotency, retired-never-counts
 *   11-12  emergency: regression_within_grace (-1), emergency class (→ L1)
 *   13     grace bookkeeping: writePosture preserves grace; expiry honored
 *   14     pruning: mirror trimmed to window, violations.jsonl untouched
 *   15     session-start banner walk (real child process)
 *   16     CLI adjudication walk (real child process)
 *   17     grace escalation walk through the real detect-violations.js hook
 *
 * Node built-ins only; CommonJS. Run: node run-fixtures.js
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const HOOKS = path.join(__dirname, "..", "..", "hooks");
const posture = require(path.join(HOOKS, "lib", "posture.js"));

let pass = 0;
let fail = 0;

function check(name, cond, detail) {
  if (cond) {
    console.log(`PASS ${name}`);
    pass++;
  } else {
    console.log(`FAIL ${name}${detail ? " — " + detail : ""}`);
    fail++;
  }
}

/** Fresh sandbox project dir with an empty .claude/learning. */
function sandbox(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `posture-engine-${name}-`));
  fs.mkdirSync(path.join(dir, ".claude", "learning"), { recursive: true });
  return dir;
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

/** Append a raw violation line with a controlled timestamp (sandbox only). */
function seedViolation(dir, entry) {
  fs.appendFileSync(
    posture.violationsPath(dir),
    JSON.stringify(entry) + "\n",
    "utf8",
  );
  const cur = posture.readPosture(dir);
  cur.violations.push(entry);
  posture.writePosture(dir, cur);
}

// ── 01-03: advisory hits never move posture ────────────────────────────────
{
  const dir = sandbox("advisory");
  for (let i = 0; i < 6; i++) {
    posture.recordViolation(dir, {
      type: "repo-scope-drift",
      detail: `advisory hit ${i}`,
      severity: "warn",
    });
  }
  const p = posture.readPosture(dir);
  check(
    "01 six advisory warns leave level at default",
    p.level === "L3",
    p.level,
  );
  check(
    "02 advisory entries recorded to the audit log",
    posture.countRecent(dir).total === 6,
    JSON.stringify(posture.countRecent(dir)),
  );
  check(
    "03 all six await adjudication (mechanical unadjudicated filter)",
    posture.countRecent(dir).unadjudicated === 6,
  );
}

// ── 04: 3x same-type probe-confirmed → one-level drop ──────────────────────
{
  const dir = sandbox("sametype");
  const tss = [];
  for (let i = 0; i < 3; i++) {
    const ts = new Date(Date.now() - (3 - i) * 1000).toISOString();
    tss.push(ts);
    seedViolation(dir, {
      ts,
      type: "repo-scope-drift",
      detail: `hit ${i}`,
      severity: "warn",
    });
  }
  posture.adjudicateViolation(dir, {
    ts: tss[0],
    verdict: "confirmed",
    probe: "probe:repo-scope-drift",
    by: "test",
  });
  posture.adjudicateViolation(dir, {
    ts: tss[1],
    verdict: "confirmed",
    probe: "probe:repo-scope-drift",
    by: "test",
  });
  const before = posture.readPosture(dir).level;
  posture.adjudicateViolation(dir, {
    ts: tss[2],
    verdict: "confirmed",
    probe: "probe:repo-scope-drift",
    by: "test",
  });
  const after = posture.readPosture(dir);
  check(
    "04 third same-type confirmation drops one level",
    before === "L3" && after.level === "L2",
    `${before}→${after.level}`,
  );
}

// ── 05: 5x total mixed-type confirmed → one-level drop ─────────────────────
{
  const dir = sandbox("total");
  const types = ["a-type", "a-type", "b-type", "b-type", "c-type"];
  const tss = types.map((t, i) => {
    const ts = new Date(Date.now() - (9 - i) * 1000).toISOString();
    seedViolation(dir, { ts, type: t, detail: "x", severity: "warn" });
    return ts;
  });
  for (let i = 0; i < 4; i++) {
    posture.adjudicateViolation(dir, {
      ts: tss[i],
      type: types[i],
      verdict: "confirmed",
      by: "test",
    });
  }
  const before = posture.readPosture(dir).level;
  posture.adjudicateViolation(dir, {
    ts: tss[4],
    type: types[4],
    verdict: "confirmed",
    by: "test",
  });
  const after = posture.readPosture(dir).level;
  check(
    "05 fifth total confirmation drops one level (2+2+1 mixed types)",
    before === "L3" && after === "L2",
    `${before}→${after}`,
  );
}

// ── 06: confirmations outside the 30-day window never count ────────────────
{
  const dir = sandbox("window");
  const oldTs = [daysAgo(40), daysAgo(35)];
  for (const ts of oldTs) {
    seedViolation(dir, {
      ts,
      type: "repo-scope-drift",
      detail: "old",
      severity: "warn",
    });
  }
  const freshTs = daysAgo(0.001);
  seedViolation(dir, {
    ts: freshTs,
    type: "repo-scope-drift",
    detail: "new",
    severity: "warn",
  });
  for (const ts of oldTs.concat([freshTs])) {
    posture.adjudicateViolation(dir, { ts, verdict: "confirmed", by: "test" });
  }
  check(
    "06 3 confirmed same-type but only 1 in-window → no drop",
    posture.readPosture(dir).level === "L3",
    posture.readPosture(dir).level,
  );
}

// ── 07: consumed entries never re-trigger (once per downgrade) ─────────────
{
  const dir = sandbox("consume");
  const tss = [];
  for (let i = 0; i < 4; i++) {
    const ts = new Date(Date.now() - (9 - i) * 1000).toISOString();
    tss.push(ts);
    seedViolation(dir, {
      ts,
      type: "repo-scope-drift",
      detail: `hit ${i}`,
      severity: "warn",
    });
  }
  for (let i = 0; i < 3; i++) {
    posture.adjudicateViolation(dir, {
      ts: tss[i],
      verdict: "confirmed",
      by: "test",
    });
  }
  const afterFirst = posture.readPosture(dir).level; // L2
  // 4th confirmation: only ONE unconsumed confirmed entry remains → no drop.
  posture.adjudicateViolation(dir, {
    ts: tss[3],
    verdict: "confirmed",
    by: "test",
  });
  const afterFourth = posture.readPosture(dir).level;
  check(
    "07 consumed entries excluded — 4th confirmation alone causes no second drop",
    afterFirst === "L2" && afterFourth === "L2",
    `${afterFirst} then ${afterFourth}`,
  );
}

// ── 08-10: structural marker, idempotency, retired ──────────────────────────
{
  const dir = sandbox("marker");
  const ts = new Date().toISOString();
  seedViolation(dir, {
    ts,
    type: "destructive-bash",
    detail: "x",
    severity: "warn",
  });
  const r1 = posture.adjudicateViolation(dir, {
    ts,
    verdict: "retired",
    probe: "probe:destructive-bash",
    by: "test-gate",
  });
  const lines = fs
    .readFileSync(posture.violationsPath(dir), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const entry = lines.find((e) => e.ts === ts);
  check(
    "08 adjudication writes the structural adjudicated: marker (verdict/probe/by/at)",
    r1.ok === true &&
      entry &&
      entry.adjudicated &&
      entry.adjudicated.verdict === "retired" &&
      entry.adjudicated.probe === "probe:destructive-bash" &&
      entry.adjudicated.by === "test-gate" &&
      typeof entry.adjudicated.at === "string",
    JSON.stringify(entry),
  );
  const r2 = posture.adjudicateViolation(dir, {
    ts,
    verdict: "confirmed",
    by: "test",
  });
  check(
    "09 re-adjudication of the same entry is a refused no-op",
    r2.ok === false && /already adjudicated/.test(r2.reason),
    JSON.stringify(r2),
  );
}
{
  const dir = sandbox("retired");
  for (let i = 0; i < 3; i++) {
    const ts = new Date(Date.now() - (9 - i) * 1000).toISOString();
    seedViolation(dir, {
      ts,
      type: "repo-scope-drift",
      detail: "fp",
      severity: "warn",
    });
    posture.adjudicateViolation(dir, { ts, verdict: "retired", by: "test" });
  }
  check(
    "10 three RETIRED verdicts never move posture",
    posture.readPosture(dir).level === "L3",
  );
}

// ── 11: regression_within_grace → instant one-level drop ───────────────────
{
  const dir = sandbox("grace-regress");
  posture.setGrace(dir, {
    rule: "rules/example-fresh.md",
    type: "repo-scope-drift",
  });
  posture.recordViolation(dir, {
    type: posture.GRACE_REGRESSION_TYPE,
    detail: "repo-scope-drift during grace of rules/example-fresh.md",
    severity: "halt-and-report",
    grace_rule: "rules/example-fresh.md",
  });
  check(
    "11 regression_within_grace drops one level instantly (no cumulative routing)",
    posture.readPosture(dir).level === "L2",
    posture.readPosture(dir).level,
  );
}

// ── 12: emergency class on a confirmed verdict → straight to L1 ────────────
{
  const dir = sandbox("emergency");
  const ts = new Date().toISOString();
  seedViolation(dir, {
    ts,
    type: "repo-scope-drift",
    detail: "actual sibling write",
    severity: "warn",
  });
  posture.adjudicateViolation(dir, {
    ts,
    verdict: "confirmed",
    probe: "probe:repo-scope-drift",
    by: "test",
    emergency: "cross-repo-write-unauthorized",
  });
  check(
    "12 emergency-class confirmation drops straight to L1",
    posture.readPosture(dir).level === "L1",
    posture.readPosture(dir).level,
  );
}

// ── 13: grace bookkeeping — preserved by writes, expiry honored ─────────────
{
  const dir = sandbox("grace-keep");
  posture.setGrace(dir, { rule: "rules/fresh.md", type: "t-active", days: 7 });
  // Inject an EXPIRED grace entry directly (engine-internal shape).
  const cur = posture.readPosture(dir);
  cur.grace.push({
    rule: "rules/old.md",
    type: "t-expired",
    until: daysAgo(1),
    set_at: daysAgo(8),
  });
  posture.writePosture(dir, cur);
  posture.recordViolation(dir, {
    type: "unrelated",
    detail: "x",
    severity: "warn",
  });
  const after = posture.readPosture(dir);
  check(
    "13a grace array survives unrelated state writes",
    after.grace.length === 2,
    JSON.stringify(after.grace),
  );
  check(
    "13b activeGraceFor honors the window",
    posture.activeGraceFor(dir, "t-active") !== null &&
      posture.activeGraceFor(dir, "t-expired") === null,
  );
}

// ── 14: pruning trims the mirror, never the audit log ───────────────────────
{
  const dir = sandbox("prune");
  seedViolation(dir, {
    ts: daysAgo(45),
    type: "old-type",
    detail: "old",
    severity: "warn",
  });
  seedViolation(dir, {
    ts: daysAgo(1),
    type: "new-type",
    detail: "new",
    severity: "warn",
  });
  const jsonlBefore = fs.readFileSync(posture.violationsPath(dir), "utf8");
  const res = posture.pruneViolations(dir);
  const after = posture.readPosture(dir);
  const jsonlAfter = fs.readFileSync(posture.violationsPath(dir), "utf8");
  check(
    "14a prune removes mirror entries older than the window",
    res.pruned === 1 &&
      after.violations.length === 1 &&
      after.violations[0].type === "new-type",
    JSON.stringify(res),
  );
  check(
    "14b violations.jsonl (audit log) untouched by prune",
    jsonlBefore === jsonlAfter,
  );
}

// ── 15: session-start banner walk (real child process) ──────────────────────
{
  const dir = sandbox("banner");
  posture.writePosture(dir, {
    level: "L2",
    since: new Date().toISOString(),
    violations: [],
    grace: [],
  });
  seedViolation(dir, {
    ts: daysAgo(2),
    type: "repo-scope-drift",
    detail: "x",
    severity: "warn",
  });
  const res = spawnSync("node", [path.join(HOOKS, "session-start.js")], {
    input: JSON.stringify({
      hook_event_name: "SessionStart",
      session_id: "fixture",
      cwd: dir,
    }),
    encoding: "utf8",
    timeout: 15000,
  });
  const stdout = res.stdout || "";
  const stderr = res.stderr || "";
  let ctx = "";
  try {
    const parsed = JSON.parse(stdout.trim().split("\n").pop());
    ctx =
      (parsed.hookSpecificOutput &&
        parsed.hookSpecificOutput.additionalContext) ||
      "";
  } catch {}
  check(
    "15a banner reaches the agent via additionalContext with the live level",
    ctx.includes("[TRUST-POSTURE] L2") &&
      ctx.includes("awaiting probe adjudication"),
    ctx.slice(0, 120) || stdout.slice(0, 120),
  );
  check(
    "15b banner reaches the human via stderr",
    stderr.includes("[TRUST-POSTURE] L2"),
  );
}

// ── 16: CLI adjudication walk (real child process) ──────────────────────────
{
  const dir = sandbox("cli");
  const ts = new Date().toISOString();
  seedViolation(dir, {
    ts,
    type: "destructive-bash",
    detail: "x",
    severity: "warn",
  });
  const res = spawnSync(
    "node",
    [
      path.join(HOOKS, "lib", "posture.js"),
      "adjudicate",
      "--ts",
      ts,
      "--verdict",
      "retired",
      "--probe",
      "probe:destructive-bash",
      "--by",
      "cc-audit-step15",
    ],
    {
      encoding: "utf8",
      timeout: 15000,
      env: Object.assign({}, process.env, { CLAUDE_PROJECT_DIR: dir }),
    },
  );
  const lines = fs
    .readFileSync(posture.violationsPath(dir), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
  const entry = lines.find((e) => e.ts === ts);
  check(
    "16 gate CLI records the verdict (exit 0, marker on disk, engine-written)",
    res.status === 0 &&
      entry &&
      entry.adjudicated &&
      entry.adjudicated.by === "cc-audit-step15",
    `exit ${res.status}`,
  );
}

// ── 17: grace escalation through the REAL detect-violations.js hook ─────────
{
  const dir = sandbox("grace-hook");
  // Sibling layout so the drift detector fires: parent/<cwd-repo> + parent/<sibling>.
  const parent = fs.mkdtempSync(
    path.join(os.tmpdir(), "posture-engine-siblings-"),
  );
  const cwdRepo = path.join(parent, "cwd-repo");
  fs.mkdirSync(path.join(cwdRepo, ".claude", "learning"), { recursive: true });
  posture.setGrace(cwdRepo, {
    rule: "rules/repo-scope-discipline.md",
    type: "repo-scope-drift",
  });
  const res = spawnSync("node", [path.join(HOOKS, "detect-violations.js")], {
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      cwd: cwdRepo,
      tool_input: {
        command: `touch ${path.join(parent, "sibling-repo", "file.txt")}`,
      },
    }),
    encoding: "utf8",
    timeout: 15000,
  });
  const p = posture.readPosture(cwdRepo);
  const logged = fs.existsSync(posture.violationsPath(cwdRepo))
    ? fs.readFileSync(posture.violationsPath(cwdRepo), "utf8")
    : "";
  check(
    "17a grace-window hit recorded as regression_within_grace at halt-and-report",
    logged.includes(posture.GRACE_REGRESSION_TYPE) &&
      logged.includes("halt-and-report"),
    logged.slice(0, 160),
  );
  check(
    "17b posture dropped one level by the real hook (emergency path)",
    p.level === "L2",
    p.level,
  );
  check(
    "17c hook surfaced the regression loudly in additionalContext",
    (res.stdout || "").includes("REGRESSION WITHIN GRACE WINDOW"),
    (res.stdout || "").slice(0, 160),
  );
  check(
    "17d sandbox grace untouched in the unrelated sandbox",
    posture.readPosture(dir).level === "L3",
  );
}

// ── 18: same-millisecond ts collision — both entries adjudicable ───────────
{
  const dir = sandbox("ts-collision");
  const ts = new Date(Date.now() - 5000).toISOString();
  seedViolation(dir, {
    ts,
    type: "repo-scope-drift",
    detail: "first",
    severity: "warn",
  });
  seedViolation(dir, {
    ts,
    type: "repo-scope-drift",
    detail: "second",
    severity: "warn",
  });
  const r1 = posture.adjudicateViolation(dir, {
    ts,
    verdict: "retired",
    by: "test",
  });
  const r2 = posture.adjudicateViolation(dir, {
    ts,
    verdict: "confirmed",
    by: "test",
  });
  const r3 = posture.adjudicateViolation(dir, {
    ts,
    verdict: "confirmed",
    by: "test",
  });
  const counts = posture.countRecent(dir);
  check(
    "18 same-ts same-type pair: both reachable (no permanent shadow), third refused",
    r1.ok === true &&
      r2.ok === true &&
      r3.ok === false &&
      counts.unadjudicated === 0,
    JSON.stringify({ r1, r2, r3, counts }),
  );
}

// ── 19: no fabricated gate provenance — missing by → "unattributed" ─────────
{
  const dir = sandbox("unattributed");
  const ts = new Date().toISOString();
  seedViolation(dir, {
    ts,
    type: "destructive-bash",
    detail: "x",
    severity: "warn",
  });
  posture.adjudicateViolation(dir, { ts, verdict: "retired" });
  const entry = fs
    .readFileSync(posture.violationsPath(dir), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l))
    .find((e) => e.ts === ts);
  check(
    '19 adjudication without --by records by:"unattributed" (never a gate name)',
    entry && entry.adjudicated && entry.adjudicated.by === "unattributed",
    JSON.stringify(entry && entry.adjudicated),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
