#!/usr/bin/env node
"use strict";

/**
 * detect-violations.js — PostToolUse(Bash) advisory detector.
 *
 * Runs agnostic STRUCTURAL detectors over a Bash command and, on a hit,
 * records the violation (which may downgrade the posture per the threshold
 * logic in lib/posture.js) AND injects an advisory additionalContext note
 * naming the concern. It does NOT hard-block — blocking is the job of the
 * PreToolUse validate-bash-command hook (design principle 4: detectors WARN
 * or record; they do not hard-block on a regex alone).
 *
 * Matcher: Bash. Detectors:
 *   - violation-patterns.detectRepoScopeDrift  (write/mutate outside cwd repo)
 *   - violation-patterns.detectDestructiveBash (rm -rf abs/home, unguarded
 *                                               git reset --hard / clean -f)
 *
 * Design principle 1 (FAIL-OPEN ALWAYS): all logic runs under
 * runtime.withFailOpen — any error, missing field, or timeout degrades to
 * allow/continue. A hook MUST NEVER break, block, or hang a session.
 *
 * Node built-ins only; CommonJS. Host runtime is Claude Code.
 */

const path = require("path");
const runtime = require(path.join(__dirname, "lib", "runtime.js"));
const violationPatterns = require(
  path.join(__dirname, "lib", "violation-patterns.js"),
);
const posture = require(path.join(__dirname, "lib", "posture.js"));

runtime.withFailOpen((input) => {
  // Only act on PostToolUse(Bash). Anything else: clean no-op continue.
  const event = input && input.hook_event_name;
  const tool = input && input.tool_name;
  if (event !== "PostToolUse" || tool !== "Bash") {
    return runtime.allow();
  }

  const toolInput =
    input && typeof input.tool_input === "object" ? input.tool_input : {};
  const command =
    typeof toolInput.command === "string" ? toolInput.command : "";
  if (!command) {
    return runtime.allow();
  }

  // Resolve the project root for both the scope-drift prefix check and the
  // posture state store.
  const projectDir =
    typeof input.cwd === "string" && input.cwd
      ? input.cwd
      : runtime.projectDir();

  // Run the agnostic structural detectors. Each returns {type, detail,
  // severity} or null. Collect every hit so the advisory note names all
  // concerns (one command can drift AND be destructive).
  const findings = [];
  try {
    const drift = violationPatterns.detectRepoScopeDrift(command, projectDir);
    if (drift) findings.push(drift);
  } catch {
    // detector fault — skip this detector, stay fail-open.
  }
  try {
    const destructive = violationPatterns.detectDestructiveBash(command);
    if (destructive) findings.push(destructive);
  } catch {
    // detector fault — skip this detector, stay fail-open.
  }

  if (findings.length === 0) {
    return runtime.allow();
  }

  // Grace-window escalation (rules/trust-posture.md MUST §3): a hit on a
  // detector type whose rule is still inside its grace window is recorded as
  // regression_within_grace at halt-and-report severity — recordViolation
  // applies the emergency one-level drop. Outside grace, findings stay
  // advisory ('warn') and carry no trust-moving weight on their own.
  const escalated = findings.map((f) => {
    try {
      const g = posture.activeGraceFor(projectDir, f.type);
      if (!g) return f;
      return {
        type: posture.GRACE_REGRESSION_TYPE,
        detail: `${f.type} during grace window of ${g.rule} (until ${g.until}): ${f.detail}`,
        severity: "halt-and-report",
        grace_rule: g.rule,
      };
    } catch {
      return f; // grace lookup fault — record the original advisory finding
    }
  });

  // Record each finding. recordViolation applies the EMERGENCY paths
  // (regression_within_grace → one-level drop; emergency classes → L1);
  // cumulative thresholds move only on probe-confirmed adjudication
  // (lib/posture.js). Best-effort state write — never throws, never blocks.
  for (const f of escalated) {
    posture.recordViolation(projectDir, f);
  }

  // Emit an additionalContext note naming the concern(s). This is the PRIME
  // surface (principle 4) — it informs the agent without blocking the
  // already-completed tool call. A grace regression is flagged LOUDLY: the
  // posture has already dropped one level (emergency path, trust-posture
  // MUST §2-§3) and the agent must surface that in its next message.
  const lines = escalated.map((f) => `- ${f.type}: ${f.detail}`);
  const hadGraceRegression = escalated.some(
    (f) => f.type === posture.GRACE_REGRESSION_TYPE,
  );
  const note = hadGraceRegression
    ? "[halt-and-report] REGRESSION WITHIN GRACE WINDOW — a freshly codified " +
      "rule's detector fired; the trust posture has been downgraded one level " +
      "(emergency path):\n" +
      lines.join("\n") +
      "\nYou MUST report this regression and the posture drop to the user in " +
      "this turn, quote the triggering command, and propose remediation. Only " +
      "a human may restore the prior level."
    : "ADVISORY — structural violation pattern(s) detected in the Bash command " +
      "(recorded to the trust-posture log; not blocked):\n" +
      lines.join("\n") +
      "\nThis is a non-blocking warning. Confirm the command targeted the " +
      "intended scope; hard-blocking of destructive/out-of-scope commands is " +
      "handled at PreToolUse.";

  runtime.addContext(note, input);
}, 5000);
