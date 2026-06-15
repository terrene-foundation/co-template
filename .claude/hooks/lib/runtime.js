#!/usr/bin/env node
"use strict";

/**
 * lib/runtime.js — the minimal, agnostic hook runtime every atelier hook uses.
 *
 * Design principle 1 (FAIL-OPEN ALWAYS): the universal contract here is that
 * any error, exception, missing file, malformed input, or timeout degrades to
 * "allow / continue" and exit 0. `withFailOpen` is the wrapper EVERY hook
 * wraps its logic in — a hook MUST NEVER break, block, or hang a session.
 *
 * Agnostic: no codegen, no SDK, no crypto, no operator/provenance machinery.
 * Node built-ins only (fs is not even needed here); CommonJS.
 *
 * Host runtime is Claude Code. The hook protocol: read a JSON event payload
 * from stdin, write a JSON result to stdout, signal disposition via exit code
 * (0 = continue; 2 = block, only meaningful at PreToolUse). Atelier hooks
 * almost never block — they WARN or record (design principle 4).
 */

/**
 * Resolve the project root directory.
 * CLAUDE_PROJECT_DIR is set by the host runtime; fall back to cwd.
 * @returns {string}
 */
function projectDir() {
  try {
    return process.env.CLAUDE_PROJECT_DIR || process.cwd();
  } catch {
    // process.cwd() can throw if the cwd was unlinked — degrade to ".".
    return ".";
  }
}

/**
 * Read and parse the hook event payload from stdin, synchronously.
 * Returns {} on ANY error (no stdin, empty, malformed JSON, read failure) so
 * callers never have to guard the parse themselves — fail-open at the source.
 * @returns {object}
 */
function readInput() {
  try {
    const fs = require("fs");
    // fd 0 is stdin. readFileSync on it blocks until EOF, which is what the
    // hook protocol delivers (the host closes stdin after writing the event).
    const raw = fs.readFileSync(0, "utf8");
    if (!raw || !raw.trim()) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Emit an object to stdout as a single JSON line (the hook result channel).
 * Swallows serialization errors — emitting nothing is a valid "continue".
 * @param {object} obj
 */
function emit(obj) {
  try {
    console.log(JSON.stringify(obj));
  } catch {
    // Circular structure or stdout EPIPE — emitting nothing degrades to allow.
  }
}

/**
 * The universal "continue": emit nothing blocking and exit 0.
 * Every fail-open path and every clean no-op path ends here.
 */
function allow() {
  try {
    process.exit(0);
  } catch {
    // process.exit can be intercepted in tests; ensure we still return.
  }
}

/**
 * Run a hook's main function under the fail-open contract.
 *
 * - Parses stdin once and passes the input object to mainFn.
 * - If mainFn throws (sync) or rejects (async), or does not settle within
 *   timeoutMs, the wrapper calls allow() + exit 0. The session is NEVER
 *   broken, blocked, or hung by a hook fault.
 * - mainFn is responsible for its own emit() on the success path. The wrapper
 *   only guarantees the fail-open floor.
 *
 * @param {(input: object) => (void|Promise<void>)} mainFn
 * @param {number} [timeoutMs=5000]
 */
function withFailOpen(mainFn, timeoutMs) {
  const limit =
    typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 5000;
  let settled = false;
  const finishAllow = () => {
    if (settled) return;
    settled = true;
    allow();
  };

  // Hard ceiling: if mainFn hangs (e.g. an unexpected blocking call), the
  // timer fires and we fail open. unref() so the timer itself never keeps the
  // process alive past a clean, fast exit.
  let timer = null;
  try {
    timer = setTimeout(finishAllow, limit);
    if (timer && typeof timer.unref === "function") timer.unref();
  } catch {
    // setTimeout unavailable — proceed without the ceiling.
  }

  let input = {};
  try {
    input = readInput();
  } catch {
    input = {};
  }

  try {
    const result = mainFn(input);
    // Support async mainFn without requiring it.
    if (result && typeof result.then === "function") {
      result.then(
        () => {
          if (timer) clearTimeout(timer);
        },
        () => {
          if (timer) clearTimeout(timer);
          finishAllow();
        },
      );
    } else {
      if (timer) clearTimeout(timer);
    }
  } catch {
    if (timer) clearTimeout(timer);
    finishAllow();
  }
}

/**
 * Emit additionalContext for SessionStart / UserPromptSubmit events.
 *
 * These two events (and PreToolUse/PostToolUse) support
 * `hookSpecificOutput.additionalContext`, which is injected into Claude's
 * context. This is the agnostic surface atelier hooks use to PRIME the agent
 * (inject workspace state, journal status, posture) — never to block.
 *
 * No-ops on empty/whitespace text. Reads the event name from the parsed input
 * when available so the output carries the correct hookEventName.
 *
 * @param {string} text - context to inject
 * @param {object} [input] - the parsed hook payload (for hookEventName)
 */
function addContext(text, input) {
  if (!text || typeof text !== "string" || !text.trim()) return;
  let hookEventName = "UserPromptSubmit";
  try {
    if (
      input &&
      typeof input === "object" &&
      typeof input.hook_event_name === "string"
    ) {
      hookEventName = input.hook_event_name;
    } else if (process.env.HOOK_EVENT_NAME) {
      hookEventName = process.env.HOOK_EVENT_NAME;
    }
  } catch {
    // keep the default event name
  }
  emit({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: text,
    },
  });
}

/**
 * Emit a structured HALT per `rules/hook-output-discipline.md` MUST §1.
 *
 * A halting hook gives the agent ONLY what it emits, so the six handoff fields
 * (severity, what_happened, why, agent_must_report, agent_must_wait,
 * user_summary) MUST reach the agent. Claude Code's hook protocol carries a
 * halt reason as a single string field — `hookSpecificOutput.permissionDecisionReason`
 * for PreToolUse (`permissionDecision: "deny"`), or `reason` for the
 * `{continue:false, decision:"block"}` shape used at PostToolUse / Stop. This
 * helper formats the six fields into that reason string and emits the correct
 * shape for the event, so the structured handoff is actually delivered rather
 * than dropped into fields the host ignores.
 *
 * @param {{event?: string, severity?: string, what_happened?: string,
 *   why?: string, agent_must_report?: string[], agent_must_wait?: string,
 *   user_summary?: string}} o
 */
function emitHalt(o) {
  const opts = o && typeof o === "object" ? o : {};
  const event = opts.event || "PreToolUse";
  const severity = opts.severity || "halt-and-report";
  const lines = [];
  lines.push(
    `[${severity}] ${opts.what_happened || "a hook halted this action"}`,
  );
  if (opts.why) lines.push(`Rule: ${opts.why}`);
  const report = Array.isArray(opts.agent_must_report)
    ? opts.agent_must_report
    : [];
  if (report.length) {
    lines.push("You MUST report, in this turn:");
    for (const r of report) lines.push(`  - ${r}`);
  }
  if (opts.agent_must_wait) lines.push(`Wait: ${opts.agent_must_wait}`);
  if (opts.user_summary) lines.push(`Summary: ${opts.user_summary}`);
  const reason = lines.join("\n");

  if (event === "PreToolUse") {
    emit({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    });
  } else {
    // PostToolUse / Stop / UserPromptSubmit: continue:false + decision:block.
    emit({
      continue: false,
      decision: "block",
      reason,
      stopReason: opts.user_summary || reason,
    });
  }
}

module.exports = {
  projectDir,
  readInput,
  emit,
  emitHalt,
  allow,
  withFailOpen,
  addContext,
};
