"use strict";

/**
 * lib/posture.js — the agnostic L1-L5 trust-posture state store AND the
 * enforcement engine (GH #16, landed).
 *
 * Posture is a single repo-wide trust level on a 5-rung ladder:
 *
 *   L1 (lowest trust)  ──────────────────────────────►  L5 (highest trust)
 *
 * The level governs how much latitude the agent is granted before a human
 * gate is required. Hooks READ the posture to prime context and to decide
 * whether to warn; the only WRITES happen here, through writePosture /
 * recordViolation / adjudicateViolation / setGrace / pruneViolations /
 * downgrade. settings.json denies agent edits to posture.json and
 * violations.jsonl, and validate-bash-command.js denies Bash-path writes to
 * them, so this lib (invoked from hooks, or via its CLI by a gate review) is
 * the sole writer — the trust-state store's integrity depends on that.
 *
 * THE ENGINE (rules/trust-posture.md MUST §1–§3, mechanically enforced here):
 *
 * - Downgrades are automatic; upgrades need a human (no upgrade API exists).
 * - Cumulative (graceful): only probe-CONFIRMED violations — entries carrying
 *   `adjudicated: {verdict:"confirmed"}` written by adjudicateViolation —
 *   count toward the thresholds: 3× same-type or 5× total inside a 30-day
 *   window → drop one level. Raw lexical hits (severity 'warn'/'advisory'/
 *   'info', or unadjudicated entries of any severity) NEVER count
 *   (rules/probe-driven-verification.md MUST §4: the probe verdict, never the
 *   lexical hit, is authoritative). Entries consumed by a downgrade are
 *   marked `counted_in_downgrade` and never count twice.
 * - Emergency (instant): type `regression_within_grace` (a detector hit on a
 *   rule still inside its grace window, recorded non-advisory by
 *   detect-violations.js) drops one level immediately; a probe-confirmed
 *   violation adjudicated with an emergency class (destructive-op-unconfirmed,
 *   secret-leak, cross-repo-write-unauthorized) drops straight to L1. Neither
 *   routes through the cumulative count.
 * - Grace windows: setGrace records {rule, type, until} against posture.json;
 *   detect-violations.js consults activeGraceFor() to escalate a fresh rule's
 *   detector to halt-and-report during the window (trust-posture MUST §3).
 * - Adjudication: adjudicateViolation annotates an existing violations.jsonl
 *   entry with a structural `adjudicated:` field (verdict, probe, by, at) so
 *   /cc-audit step 15's "not yet adjudicated" filter is mechanical. The ENGINE
 *   writes the marker; the agent supplies only the probe verdict via the CLI
 *   below. Violation entries themselves are append-only — adjudication adds
 *   the marker field and never removes or rewrites a violation record.
 * - Pruning: pruneViolations trims the posture.json MIRROR (and expired grace
 *   entries) to the 30-day window. violations.jsonl is the durable append-only
 *   audit log and is NEVER pruned.
 *
 * CLI (for gate reviews — /cc-audit step 15 records probe verdicts here, and
 * /codify registers grace windows; the engine, not the agent, touches state):
 *   node .claude/hooks/lib/posture.js status
 *   node .claude/hooks/lib/posture.js adjudicate --ts <iso> --verdict confirmed|retired \
 *        --probe <probe-id> --by <gate> [--emergency <class>]
 *   node .claude/hooks/lib/posture.js grace --rule <rule-file> --type <detector-type> [--days 7]
 *   node .claude/hooks/lib/posture.js prune [--days 30]
 * Project root: CLAUDE_PROJECT_DIR, else cwd.
 *
 * Design principle 1 (FAIL-OPEN / FAIL-SAFE): readPosture DEFAULTS to L3 when
 * the file is absent or corrupt — fail-SAFE (a sane middle of the ladder), NOT
 * fail-closed (L1). Every library write path swallows all errors: failing to
 * persist trust state MUST NEVER break a session. (The CLI reports errors —
 * it is a gate tool, not a hook.)
 *
 * Agnostic (principle 2): no operators, no repo_floor, no trust-root, no
 * crypto. A single level + violations + grace windows.
 *
 * Node built-ins only (fs, path); CommonJS.
 */

const fs = require("fs");
const path = require("path");

/** Ladder in ascending trust order. Index 0 = L1, index 4 = L5. */
const LEVELS = ["L1", "L2", "L3", "L4", "L5"];

/** Fail-safe default posture (middle of the ladder, NOT L1). */
const DEFAULT_LEVEL = "L3";

/** Per-type confirmed-violation count that triggers a one-level downgrade. */
const SAME_TYPE_THRESHOLD = 3;

/** Total confirmed-violation count that triggers a one-level downgrade. */
const TOTAL_THRESHOLD = 5;

/** Rolling window (days) for cumulative counting AND mirror pruning. */
const WINDOW_DAYS = 30;

/** Default grace-window length (days) for freshly codified rules. */
const GRACE_DAYS = 7;

/** Severity tags that carry NO trust-moving weight on their own. */
const ADVISORY = new Set(["warn", "advisory", "info"]);

/** Violation type whose single non-advisory occurrence drops one level. */
const GRACE_REGRESSION_TYPE = "regression_within_grace";

/**
 * Emergency classes that drop the posture straight to L1 (trust-posture
 * MUST §2). Reached via adjudicateViolation({emergency}) — a probe-confirmed
 * verdict — or a recorded entry whose type IS the class at a non-advisory
 * severity (a future structural detector).
 */
const EMERGENCY_L1 = new Set([
  "destructive-op-unconfirmed",
  "secret-leak",
  "cross-repo-write-unauthorized",
]);

function _isValidLevel(lvl) {
  return typeof lvl === "string" && LEVELS.indexOf(lvl) !== -1;
}

function _learningDir(projectDir) {
  const root = typeof projectDir === "string" && projectDir ? projectDir : ".";
  return path.join(root, ".claude", "learning");
}

function posturePath(projectDir) {
  return path.join(_learningDir(projectDir), "posture.json");
}

function violationsPath(projectDir) {
  return path.join(_learningDir(projectDir), "violations.jsonl");
}

function _windowCutoff(days) {
  const d = typeof days === "number" && days > 0 ? days : WINDOW_DAYS;
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Read the current posture state. Returns a well-formed object ALWAYS:
 *   { level, since, violations: [], grace: [] }
 * Never throws; absent/corrupt state degrades to the fail-safe default.
 */
function readPosture(projectDir) {
  const fallback = {
    level: DEFAULT_LEVEL,
    since: null,
    violations: [],
    grace: [],
  };
  try {
    const raw = fs.readFileSync(posturePath(projectDir), "utf8");
    if (!raw || !raw.trim()) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return fallback;
    }
    return {
      level: _isValidLevel(parsed.level) ? parsed.level : DEFAULT_LEVEL,
      since: typeof parsed.since === "string" ? parsed.since : null,
      violations: Array.isArray(parsed.violations) ? parsed.violations : [],
      grace: Array.isArray(parsed.grace) ? parsed.grace : [],
    };
  } catch {
    return fallback;
  }
}

/**
 * Persist a posture object atomically (tmp-write + rename). Normalizes the
 * on-disk shape; PRESERVES the grace array. Swallows ALL errors.
 */
function writePosture(projectDir, obj) {
  try {
    const dir = _learningDir(projectDir);
    fs.mkdirSync(dir, { recursive: true });

    const src = obj && typeof obj === "object" ? obj : {};
    const out = {
      level: _isValidLevel(src.level) ? src.level : DEFAULT_LEVEL,
      since: typeof src.since === "string" ? src.since : null,
      violations: Array.isArray(src.violations) ? src.violations : [],
      grace: Array.isArray(src.grace) ? src.grace : [],
    };

    const finalPath = posturePath(projectDir);
    const tmpPath = finalPath + ".tmp-" + process.pid + "-" + Date.now();
    fs.writeFileSync(tmpPath, JSON.stringify(out, null, 2) + "\n", "utf8");
    try {
      fs.renameSync(tmpPath, finalPath);
    } catch {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // nothing more to do
      }
    }
  } catch {
    // mkdir/write failure — degrade silently.
  }
}

/** Read violations.jsonl as an array of entries (malformed lines skipped). */
function _readViolationLines(projectDir) {
  try {
    const raw = fs.readFileSync(violationsPath(projectDir), "utf8");
    const out = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        if (e && typeof e === "object") out.push(e);
      } catch {
        // skip malformed line, keep the rest
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Atomically rewrite violations.jsonl from an entry array (engine-only). */
function _writeViolationLines(projectDir, entries) {
  try {
    const dir = _learningDir(projectDir);
    fs.mkdirSync(dir, { recursive: true });
    const finalPath = violationsPath(projectDir);
    const tmpPath = finalPath + ".tmp-" + process.pid + "-" + Date.now();
    const body = entries.map((e) => JSON.stringify(e)).join("\n");
    fs.writeFileSync(tmpPath, body ? body + "\n" : "", "utf8");
    try {
      fs.renameSync(tmpPath, finalPath);
    } catch {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // nothing more to do
      }
    }
  } catch {
    // degrade silently
  }
}

/**
 * Record one violation. Appends a JSON line to violations.jsonl, mirrors a
 * compact record into posture.json, then applies the EMERGENCY paths only:
 *
 * - type regression_within_grace at non-advisory severity → one-level drop.
 * - type in EMERGENCY_L1 at non-advisory severity → straight to L1.
 *
 * Cumulative thresholds are NOT applied here — they count probe-CONFIRMED
 * entries only, and confirmation happens in adjudicateViolation (the probe
 * verdict, never the lexical hit, moves posture). Never throws.
 *
 * @param {string} projectDir
 * @param {{type:string, detail?:string, severity?:string, grace_rule?:string}} v
 */
function recordViolation(projectDir, v) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      type: v && typeof v.type === "string" && v.type ? v.type : "unspecified",
      detail: v && typeof v.detail === "string" ? v.detail : "",
      severity: v && typeof v.severity === "string" ? v.severity : "warn",
    };
    if (v && typeof v.grace_rule === "string" && v.grace_rule) {
      entry.grace_rule = v.grace_rule;
    }

    // 1. Append to the JSON-lines audit log (best-effort).
    try {
      const dir = _learningDir(projectDir);
      fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(
        violationsPath(projectDir),
        JSON.stringify(entry) + "\n",
        "utf8",
      );
    } catch {
      // Audit-log append failed — continue; posture mirror is still attempted.
    }

    // 2. Mirror into posture.json and re-persist.
    const current = readPosture(projectDir);
    const violations = current.violations.slice();
    violations.push(entry);
    writePosture(projectDir, {
      level: current.level,
      since: current.since,
      violations,
      grace: current.grace,
    });

    // 3. EMERGENCY enforcement only. Advisory severities carry no
    //    trust-moving weight (probe-driven-verification MUST §4); cumulative
    //    counting waits for a probe-confirmed adjudication.
    if (!ADVISORY.has(entry.severity)) {
      if (entry.type === GRACE_REGRESSION_TYPE) {
        downgrade(
          projectDir,
          GRACE_REGRESSION_TYPE +
            (entry.grace_rule ? ":" + entry.grace_rule : "") +
            " — " +
            entry.detail.slice(0, 100),
        );
      } else if (EMERGENCY_L1.has(entry.type)) {
        _emergencyToL1(
          projectDir,
          entry.type + " — " + entry.detail.slice(0, 100),
        );
      }
    }
  } catch {
    // Any failure in the record path degrades to a no-op. Never throw.
  }
}

/**
 * Adjudicate a recorded violation with a probe verdict (the gate's call —
 * /cc-audit step 15). Annotates the matching violations.jsonl entry (matched
 * by exact `ts`, optionally disambiguated by `type`) with a structural
 * `adjudicated:` marker, mirrors the marker into posture.json, then applies
 * enforcement:
 *
 * - verdict "confirmed" + emergency class → straight to L1 (no counting).
 * - verdict "confirmed" → cumulative sweep (3× same-type / 5× total
 *   confirmed-and-unconsumed entries inside the 30-day window → one-level
 *   drop; consumed entries are marked counted_in_downgrade).
 * - verdict "retired" → the lexical hit was a false positive; never counts.
 *
 * Returns {ok, reason, level} and never throws.
 *
 * @param {string} projectDir
 * @param {{ts:string, type?:string, verdict:string, probe?:string, by?:string,
 *          emergency?:string}} a
 */
function adjudicateViolation(projectDir, a) {
  try {
    const ts = a && typeof a.ts === "string" ? a.ts : "";
    const verdict =
      a && a.verdict === "confirmed"
        ? "confirmed"
        : a && a.verdict === "retired"
          ? "retired"
          : "";
    if (!ts || !verdict) {
      return {
        ok: false,
        reason: "ts and verdict (confirmed|retired) are required",
        level: readPosture(projectDir).level,
      };
    }
    const entries = _readViolationLines(projectDir);
    // Match the FIRST UNADJUDICATED entry at this ts(/type). Skipping
    // already-adjudicated matches makes same-millisecond ts collisions
    // resolvable: a second same-ts same-type entry is reached by a second
    // adjudicate call instead of being permanently shadowed by the first.
    let idx = -1;
    let adjudicatedMatch = null;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (
        e.ts === ts &&
        (!a.type || e.type === a.type) &&
        e.type !== "downgrade"
      ) {
        if (e.adjudicated) {
          adjudicatedMatch = e;
          continue;
        }
        idx = i;
        break;
      }
    }
    if (idx === -1) {
      return {
        ok: false,
        reason: adjudicatedMatch
          ? "entry already adjudicated (" +
            adjudicatedMatch.adjudicated.verdict +
            ")"
          : "no violation entry with ts " + ts,
        level: readPosture(projectDir).level,
      };
    }
    const marker = {
      verdict,
      probe: a && typeof a.probe === "string" ? a.probe : "",
      // No fabricated provenance: an adjudication that does not name its
      // gate is recorded as "unattributed" — itself a review flag. cc-audit
      // step 15 always passes --by cc-audit-step15 (EATP audit-anchor
      // integrity: the trace must come from the caller, never a default).
      by: a && typeof a.by === "string" && a.by ? a.by : "unattributed",
      at: new Date().toISOString(),
    };
    if (
      verdict === "confirmed" &&
      a &&
      typeof a.emergency === "string" &&
      EMERGENCY_L1.has(a.emergency)
    ) {
      marker.emergency = a.emergency;
    }
    entries[idx] = Object.assign({}, entries[idx], { adjudicated: marker });
    _writeViolationLines(projectDir, entries);
    _mirrorMarker(projectDir, entries[idx]);

    if (verdict === "confirmed") {
      if (marker.emergency) {
        _emergencyToL1(
          projectDir,
          marker.emergency + " (probe-confirmed " + ts + ")",
        );
      } else {
        _cumulativeSweep(projectDir);
      }
    }
    return { ok: true, reason: verdict, level: readPosture(projectDir).level };
  } catch (e) {
    return {
      ok: false,
      reason: "adjudication failed: " + (e && e.message),
      level: DEFAULT_LEVEL,
    };
  }
}

/**
 * Copy an entry's adjudicated/counted markers onto the posture.json mirror.
 * Matches on ts+type, so a same-millisecond same-type pair over-marks BOTH
 * mirror entries — tolerated by design: the mirror is advisory display state
 * and is pruned; violations.jsonl (where the unadjudicated-skip in
 * adjudicateViolation disambiguates) is the sole counting source.
 */
function _mirrorMarker(projectDir, entry) {
  try {
    const current = readPosture(projectDir);
    const violations = current.violations.map((m) =>
      m && m.ts === entry.ts && m.type === entry.type
        ? Object.assign({}, m, {
            adjudicated: entry.adjudicated,
            counted_in_downgrade: entry.counted_in_downgrade,
          })
        : m,
    );
    writePosture(projectDir, {
      level: current.level,
      since: current.since,
      violations,
      grace: current.grace,
    });
  } catch {
    // mirror failure never blocks
  }
}

/**
 * Cumulative threshold sweep over violations.jsonl: probe-confirmed,
 * not-yet-consumed entries inside the window. Fires at most one downgrade
 * per call (the consumed entries can no longer re-trigger).
 */
function _cumulativeSweep(projectDir) {
  try {
    const cutoff = _windowCutoff(WINDOW_DAYS);
    const entries = _readViolationLines(projectDir);
    const countable = entries.filter(
      (e) =>
        e.adjudicated &&
        e.adjudicated.verdict === "confirmed" &&
        !e.counted_in_downgrade &&
        typeof e.ts === "string" &&
        e.ts >= cutoff,
    );
    if (!countable.length) return;

    const byType = {};
    for (const e of countable) {
      byType[e.type] = (byType[e.type] || []).concat([e]);
    }
    let consumed = null;
    let reason = "";
    for (const t of Object.keys(byType)) {
      if (byType[t].length >= SAME_TYPE_THRESHOLD) {
        consumed = byType[t];
        reason =
          "violation-threshold:" +
          t +
          " (" +
          byType[t].length +
          "x probe-confirmed in " +
          WINDOW_DAYS +
          "d)";
        break;
      }
    }
    if (!consumed && countable.length >= TOTAL_THRESHOLD) {
      consumed = countable;
      reason =
        "violation-threshold:total (" +
        countable.length +
        "x probe-confirmed in " +
        WINDOW_DAYS +
        "d)";
    }
    if (!consumed) return;

    const stamp = new Date().toISOString();
    const consumedKeys = new Set(consumed.map((e) => e.ts + "|" + e.type));
    const updated = entries.map((e) =>
      consumedKeys.has(e.ts + "|" + e.type)
        ? Object.assign({}, e, { counted_in_downgrade: stamp })
        : e,
    );
    _writeViolationLines(projectDir, updated);

    // Mirror the consumption markers, then downgrade.
    const current = readPosture(projectDir);
    const violations = current.violations.map((m) =>
      m && consumedKeys.has(m.ts + "|" + m.type)
        ? Object.assign({}, m, { counted_in_downgrade: stamp })
        : m,
    );
    writePosture(projectDir, {
      level: current.level,
      since: current.since,
      violations,
      grace: current.grace,
    });
    downgrade(projectDir, reason);
  } catch {
    // sweep failure degrades to no enforcement this round
  }
}

/**
 * Move the posture one rung toward L1 (lower trust) and persist. Floor at L1.
 * Records the reason as a `downgrade` marker entry in the mirror. Returns the
 * new level; never throws.
 */
function downgrade(projectDir, reason) {
  try {
    const current = readPosture(projectDir);
    const idx = LEVELS.indexOf(current.level);
    const safeIdx = idx === -1 ? LEVELS.indexOf(DEFAULT_LEVEL) : idx;
    const newIdx = safeIdx > 0 ? safeIdx - 1 : 0; // floor at L1
    const newLevel = LEVELS[newIdx];

    const violations = current.violations.slice();
    if (typeof reason === "string" && reason) {
      violations.push({
        ts: new Date().toISOString(),
        type: "downgrade",
        detail: reason,
        severity: "warn",
      });
    }

    writePosture(projectDir, {
      level: newLevel,
      since: new Date().toISOString(),
      violations,
      grace: current.grace,
    });
    return newLevel;
  } catch {
    return DEFAULT_LEVEL;
  }
}

/** Emergency drop straight to L1 (trust-posture MUST §2, instant path). */
function _emergencyToL1(projectDir, reason) {
  try {
    const current = readPosture(projectDir);
    const violations = current.violations.slice();
    violations.push({
      ts: new Date().toISOString(),
      type: "downgrade",
      detail: "EMERGENCY→L1: " + (reason || "unspecified"),
      severity: "warn",
    });
    writePosture(projectDir, {
      level: "L1",
      since: new Date().toISOString(),
      violations,
      grace: current.grace,
    });
  } catch {
    // degrade silently
  }
}

/**
 * Register a grace window for a freshly codified rule (trust-posture MUST §3;
 * invoked by /codify via the CLI when a landed rule addresses a detected or
 * self-reported violation). detect-violations.js consults activeGraceFor() to
 * escalate that detector type to halt-and-report during the window.
 *
 * @param {string} projectDir
 * @param {{rule:string, type:string, days?:number}} g
 * @returns {{ok:boolean, until?:string, reason?:string}}
 */
function setGrace(projectDir, g) {
  try {
    const rule = g && typeof g.rule === "string" ? g.rule : "";
    const type = g && typeof g.type === "string" ? g.type : "";
    if (!rule || !type)
      return { ok: false, reason: "rule and type are required" };
    const days =
      g && typeof g.days === "number" && g.days > 0 ? g.days : GRACE_DAYS;
    const until = new Date(
      Date.now() + days * 24 * 60 * 60 * 1000,
    ).toISOString();
    const current = readPosture(projectDir);
    const grace = current.grace.filter(
      (e) => !(e && e.type === type && e.rule === rule),
    );
    grace.push({ rule, type, until, set_at: new Date().toISOString() });
    writePosture(projectDir, {
      level: current.level,
      since: current.since,
      violations: current.violations,
      grace,
    });
    return { ok: true, until };
  } catch (e) {
    return { ok: false, reason: "setGrace failed: " + (e && e.message) };
  }
}

/**
 * Return the active (non-expired) grace entry covering a detector type, or
 * null. Never throws.
 */
function activeGraceFor(projectDir, type) {
  try {
    if (!type) return null;
    const now = new Date().toISOString();
    const grace = readPosture(projectDir).grace;
    for (const e of grace) {
      if (
        e &&
        e.type === type &&
        typeof e.until === "string" &&
        e.until > now
      ) {
        return e;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Prune the posture.json MIRROR to the rolling window and drop expired grace
 * entries. violations.jsonl (the durable audit log) is NEVER touched here.
 * Returns {pruned, graceDropped}; never throws.
 */
function pruneViolations(projectDir, days) {
  try {
    const cutoff = _windowCutoff(days);
    const now = new Date().toISOString();
    const current = readPosture(projectDir);
    const kept = current.violations.filter(
      (e) => e && typeof e.ts === "string" && e.ts >= cutoff,
    );
    const grace = current.grace.filter(
      (e) => e && typeof e.until === "string" && e.until > now,
    );
    const pruned = current.violations.length - kept.length;
    const graceDropped = current.grace.length - grace.length;
    if (pruned > 0 || graceDropped > 0) {
      writePosture(projectDir, {
        level: current.level,
        since: current.since,
        violations: kept,
        grace,
      });
    }
    return { pruned, graceDropped };
  } catch {
    return { pruned: 0, graceDropped: 0 };
  }
}

/**
 * Windowed counts for the session-start banner: total recorded, unadjudicated
 * (the step-15 work queue), confirmed, retired — from violations.jsonl,
 * excluding `downgrade` marker entries. Never throws.
 */
function countRecent(projectDir, days) {
  const out = { total: 0, unadjudicated: 0, confirmed: 0, retired: 0 };
  try {
    const cutoff = _windowCutoff(days);
    for (const e of _readViolationLines(projectDir)) {
      if (!e || e.type === "downgrade") continue;
      if (typeof e.ts !== "string" || e.ts < cutoff) continue;
      out.total++;
      if (!e.adjudicated) out.unadjudicated++;
      else if (e.adjudicated.verdict === "confirmed") out.confirmed++;
      else if (e.adjudicated.verdict === "retired") out.retired++;
    }
    return out;
  } catch {
    return out;
  }
}

module.exports = {
  LEVELS,
  WINDOW_DAYS,
  GRACE_DAYS,
  EMERGENCY_L1,
  GRACE_REGRESSION_TYPE,
  posturePath,
  violationsPath,
  readPosture,
  writePosture,
  recordViolation,
  adjudicateViolation,
  setGrace,
  activeGraceFor,
  pruneViolations,
  countRecent,
  downgrade,
};

// ── CLI (gate-review entry point; not a hook — errors are reported) ────────
if (require.main === module) {
  const args = process.argv.slice(2);
  const cmd = args[0] || "status";
  const opts = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      opts[args[i].slice(2)] = args[i + 1];
      i++;
    }
  }
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  let result;
  if (cmd === "status") {
    const p = readPosture(projectDir);
    result = {
      ok: true,
      level: p.level,
      since: p.since,
      grace: p.grace,
      window_days: WINDOW_DAYS,
      counts: countRecent(projectDir),
    };
  } else if (cmd === "adjudicate") {
    result = adjudicateViolation(projectDir, {
      ts: opts.ts,
      type: opts.type,
      verdict: opts.verdict,
      probe: opts.probe,
      by: opts.by,
      emergency: opts.emergency,
    });
  } else if (cmd === "grace") {
    result = setGrace(projectDir, {
      rule: opts.rule,
      type: opts.type,
      days: opts.days ? Number(opts.days) : undefined,
    });
  } else if (cmd === "prune") {
    result = pruneViolations(
      projectDir,
      opts.days ? Number(opts.days) : undefined,
    );
    result.ok = true;
  } else {
    result = { ok: false, reason: "unknown command: " + cmd };
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(result && result.ok === false ? 1 : 0);
}
