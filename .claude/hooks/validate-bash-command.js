#!/usr/bin/env node
/**
 * Hook: validate-bash-command
 * Event: PreToolUse
 * Matcher: Bash
 * Purpose: Block destructive bash commands via lexical danger-pattern matching
 *          on the command string. This is command-string safety (does the
 *          command text contain a known-dangerous construct), NOT semantic
 *          analysis of what the command computes.
 *
 * Domain-agnostic — inspects the bash command string only; no language,
 * framework, or toolchain assumptions.
 *
 * Exit Codes:
 *   0 = success / continue — AND the fail-open floor (error, timeout, malformed
 *       input all degrade here per runtime principle 1: FAIL-OPEN ALWAYS)
 *   2 = blocking error (stop tool execution) — ONLY the deny path, when a
 *       command matches a dangerous-command pattern
 */

const {
  logObservation: logLearningObservation,
} = require("./lib/learning-utils");
const runtime = require("./lib/runtime.js");

// FAIL-OPEN via runtime.withFailOpen: any error, malformed input, or timeout
// degrades to allow + exit 0 (the uniform fail-open floor used by
// destructive-op-guard.js / journal-write-guard.js). The DENY path below is the
// only branch that exits 2 — a command matching a dangerous-command pattern.
runtime.withFailOpen((data) => {
  const result = validateBashCommand(data);
  if (result.block) {
    // Halting branch: hand the agent the full structured handoff via
    // runtime.emitHalt (the six fields packed into the host's reason
    // channel) BEFORE exiting 2 — per `rules/hook-output-discipline.md`
    // MUST §1. A raw process.exit(2) with an empty payload is BLOCKED there.
    halt(result);
    process.exit(2);
    return;
  }
  if (result.advisory) {
    // Non-blocking advisory (e.g. curl|sh): route the warning through
    // additionalContext — the channel the host actually delivers to the agent.
    // The prior `validation:` sibling field was silently dropped by the host
    // (rules/hook-output-discipline.md MUST §1), so the warning reached no one.
    runtime.emit({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: `[BASH-ADVISORY] ${result.advisory}`,
      },
    });
    return;
  }
  return runtime.allow();
});

/**
 * Emit the PreToolUse structured-halt via runtime.emitHalt so all six handoff
 * fields reach the agent through permissionDecisionReason (sibling fields are
 * ignored by the host). Mirrors destructive-op-guard.js's halt().
 *
 * severity is 'halt-and-report', NOT 'block': the detection is a PURELY LEXICAL
 * regex match on the command string (no environment variable, exit code, file
 * existence, or parsed state grounds it), so per `rules/hook-output-discipline.md`
 * MUST §2 a lexical signal MUST NOT carry blocking severity. The agent surfaces
 * the match and the user adjudicates; the false-positive risk of a regex coinciding
 * with a legitimate command is why block severity is reserved for structural facts.
 * @param {{command:string, why:string, userSummary:string}} r
 */
function halt(r) {
  const snippet = String(r.command).slice(0, 120);
  runtime.emitHalt({
    event: "PreToolUse",
    severity: "halt-and-report",
    what_happened: `Bash command matched a dangerous-command pattern: ${snippet}`,
    why: r.why,
    agent_must_report: [
      "Quote the exact command and the dangerous construct it contains",
      "Confirm the destructive action is intentional and the user authorized it IN THIS CONVERSATION",
      "Propose a safer, scoped alternative if the intent is legitimate",
    ],
    agent_must_wait:
      "Do not retry. A command matching a dangerous-command pattern requires explicit per-action user authorization.",
    user_summary: r.userSummary,
  });
}

/**
 * detectProtectedStateWrite — the hard block on Bash-path writes to the
 * trust-posture state files (rules/trust-posture.md MUST NOT §1; GH #16).
 * Edit/Write/MultiEdit are already denied by settings.json permissions.deny;
 * this closes the rm / redirection / tee / sed -i loophole that rule names.
 *
 * Lexical tripwire discipline: the detection is a command-string match, so
 * the deny ships severity 'halt-and-report' (never 'block' —
 * hook-output-discipline MUST §2) and its probe counterpart is
 * probe:protected-state-write in audit-fixtures/violation-patterns/probes.md.
 * Tokens carrying unexpanded shell constructs are SKIPPED, never re-expanded
 * (MUST §3). Read-shaped commands (cat/grep/jq, cp FROM the file) stay
 * allowed — the engine and the gates need to read state freely.
 *
 * Returns a {why, userSummary} message object, or null.
 */
function detectProtectedStateWrite(command) {
  if (!command || typeof command !== "string") return null;
  const PROT = /(posture\.json|violations\.jsonl)$/;
  const SHELLVAR = /\$\{?\w+\}?|\$\(|`/;

  // (0) Interpreter-mediated writes: inline-eval code (node -e, python -c,
  // perl/ruby -e, sh -c, deno eval) can write the state files or call the
  // engine's write APIs without any shell write-verb shape, evading arms
  // (a)-(b) below AND the PostToolUse detectors — so the tripwire record the
  // probe layer depends on never exists. Deny inline-eval commands that
  // reference the state surface. The SANCTIONED engine CLI
  // (`node .claude/hooks/lib/posture.js <subcmd>`) is a file-path invocation,
  // not inline eval, and never matches here. A read-only inline eval naming a
  // state file is an accepted false positive: severity is halt-and-report and
  // sanctioned read paths (cat, the CLI `status`) exist.
  const EVAL_FLAG =
    /\b(?:node\s+(?:-e|--eval|-p|--print)|python3?\s+-c|perl\s+-e|ruby\s+-e|deno\s+eval|sh\s+-c|bash\s+-c)\b/;
  const STATE_SURFACE =
    /posture\.json|violations\.jsonl|\b(?:writePosture|recordViolation|adjudicateViolation|setGrace|pruneViolations|downgrade)\s*\(/;
  if (EVAL_FLAG.test(command) && STATE_SURFACE.test(command)) {
    return _stateWriteMsg(
      "interpreter inline-eval referencing",
      "the trust-posture state surface",
    );
  }
  // Verbs whose mere argument position over the state file is destructive.
  const DESTRUCTIVE = new Set([
    "rm",
    "mv",
    "shred",
    "truncate",
    "unlink",
    "tee",
    "install",
  ]);
  // Segment on pipe/seq/background separators; each segment is one command.
  for (const seg of command.split(/[|;&]+/)) {
    const toks = seg
      .trim()
      .split(/\s+/)
      .map((t) => t.replace(/^["'(]+/, "").replace(/["');,]+$/, ""));
    const protTokens = [];
    toks.forEach((t, i) => {
      if (SHELLVAR.test(t)) return; // unexpanded — unresolvable, skip (never re-expand)
      if (PROT.test(t)) protTokens.push(i);
    });
    if (!protTokens.length) continue;

    // (a) redirection INTO the file: "> path" / ">>path" (span must be
    //     shell-var free — already guaranteed by the token skip above).
    const redir = seg.match(/>>?\s*["']?([^\s"']+)/);
    if (redir && PROT.test(redir[1]) && !SHELLVAR.test(redir[1])) {
      return _stateWriteMsg("shell redirection into", redir[1]);
    }
    // (b) a destructive verb anywhere before the protected token.
    for (const idx of protTokens) {
      for (let j = 0; j < idx; j++) {
        const verb = toks[j];
        if (DESTRUCTIVE.has(verb)) {
          return _stateWriteMsg(verb + " targeting", toks[idx]);
        }
        // sed only with an in-place flag; cp/sort/dd only when the protected
        // token sits in the WRITE position (cp dest = last arg; dd of=).
        if (
          verb === "sed" &&
          toks.slice(j + 1, idx).some((t) => /^(-\w*i\w*|--in-place)/.test(t))
        ) {
          return _stateWriteMsg("sed -i targeting", toks[idx]);
        }
        if (verb === "cp" && idx === toks.length - 1) {
          return _stateWriteMsg("cp into", toks[idx]);
        }
        if (verb === "sort" && toks[idx - 1] === "-o") {
          return _stateWriteMsg("sort -o into", toks[idx]);
        }
      }
      // dd of=<state-file> carries the target inside one token.
      const ddOf = toks.find((t) => t.startsWith("of=") && PROT.test(t));
      if (toks.includes("dd") && ddOf) {
        return _stateWriteMsg("dd of= into", ddOf);
      }
    }
  }
  return null;
}

function _stateWriteMsg(how, target) {
  const msg =
    `Blocked: Bash-path write (${how} ${target}) to a trust-posture state file. ` +
    "posture.json and violations.jsonl are written ONLY by the enforcement engine " +
    "(.claude/hooks/lib/posture.js) — rules/trust-posture.md MUST NOT §1. " +
    "Gate adjudication goes through `node .claude/hooks/lib/posture.js adjudicate ...`.";
  return { why: msg, userSummary: msg.slice(0, 140) };
}

function validateBashCommand(data) {
  const command = data.tool_input?.command || "";
  const cwd = data.cwd || process.cwd();

  // Hard block on trust-state writes (GH #16 item 4) — checked before the
  // generic dangerous-command patterns so the state-file message wins.
  const stateWrite = detectProtectedStateWrite(command);
  if (stateWrite) {
    try {
      logLearningObservation(cwd, "rule_violation", {
        rule: "trust-posture-state-write",
        message: stateWrite.userSummary.substring(0, 200),
        blocked: true,
      });
    } catch {}
    return {
      block: true,
      command,
      why: stateWrite.why,
      userSummary: stateWrite.userSummary,
    };
  }

  // Dangerous-command patterns. Each carries an EXPLICIT `block` disposition —
  // the deny-vs-advise decision is a data field, NOT a substring test on the
  // human-readable `message` (editing copy must never silently flip a hard block
  // into a passthrough). block:true → emitHalt + exit 2; block:false → advisory
  // surfaced via additionalContext (the host delivers that channel; the prior
  // `validation:` sibling field was dropped — hook-output-discipline MUST §1).
  const dangerousPatterns = [
    {
      pattern: /rm\s+(-[rRf]+\s+)*\/($|\s|\*)/,
      block: true,
      message: "Blocked: rm on root filesystem",
    },
    {
      pattern: /rm\s+--(?:recursive|force)\b/,
      block: true,
      message: "Blocked: rm recursive/force with long flags",
    },
    {
      pattern: />\s*\/dev\/sd/,
      block: true,
      message: "Blocked: Writing to block device",
    },
    {
      pattern: /mkfs\./,
      block: true,
      message: "Blocked: Filesystem formatting",
    },
    {
      pattern: /dd\s+if=.*of=\/dev\/sd/,
      block: true,
      message: "Blocked: dd to disk",
    },
    {
      pattern: /:\(\)\{\s*:\|:&\s*\};:/,
      block: true,
      message: "Blocked: Fork bomb",
    },
    {
      pattern: /(\w+)\(\)\s*\{\s*\1\s*\|\s*\1\s*&\s*\}\s*;\s*\1/,
      block: true,
      message: "Blocked: Fork bomb variant",
    },
    {
      pattern: /chmod\s+-R\s+777\s+\//,
      block: true,
      message: "Blocked: chmod 777 on root",
    },
    {
      pattern: /curl.*\|\s*(ba)?sh/,
      block: false,
      message: "WARNING: Piping curl to shell is dangerous",
    },
    {
      pattern: /wget.*\|\s*(ba)?sh/,
      block: false,
      message: "WARNING: Piping wget to shell is dangerous",
    },
  ];

  for (const { pattern, block, message } of dangerousPatterns) {
    if (pattern.test(command)) {
      // Log dangerous command observation
      try {
        logLearningObservation(cwd, "rule_violation", {
          rule: "security-dangerous-command",
          message: message.substring(0, 200),
          blocked: block,
        });
      } catch {}

      if (block) {
        // Carry the matched rule's message as `why` and user_summary so the
        // handler's halt() packs the full structured handoff. `block:true`
        // routes to the emitHalt + exit 2 path.
        return {
          block: true,
          command,
          why: message,
          userSummary: message,
        };
      }
      // Non-blocking advisory (e.g. curl|sh): surfaced to the agent, not denied.
      return { block: false, advisory: message };
    }
  }

  return { block: false };
}
