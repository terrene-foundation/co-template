#!/usr/bin/env node
"use strict";

/**
 * Hook: destructive-op-guard
 * Event: PreToolUse
 * Matcher: Bash
 *
 * Structural destructive-op guard (design principle 4: STRUCTURE NOT
 * SEMANTICS). BLOCKS — via the structured-halt shape — ONLY on an unambiguous
 * destructive command that carries NO clean-tree guard in the same compound
 * line. Everything else is allowed. Per principle 1 (FAIL-OPEN ALWAYS) every
 * path is wrapped in runtime.withFailOpen: any error, malformed input, or
 * timeout degrades to allow + exit 0.
 *
 * The three structural danger classes (and ONLY these):
 *
 *   1. `rm -rf` (in any -r/-f flag order, long or short) targeting an
 *      absolute, home (~), or root (/) path. A relative-path rm is NOT
 *      blocked — it is scoped to the cwd and routinely legitimate.
 *
 *   2. `git reset --hard` or `git clean -f[d]` with NO `git status
 *      --porcelain` check anywhere in the SAME compound command. The new
 *      git.md rule names the porcelain check as the structural clean-tree
 *      guard; its presence in the same line means the agent gated the
 *      destructive op and we allow. Its absence is the block trigger.
 *
 *   3. `git push --force` / `git push -f` / `git push --force-with-lease`
 *      targeting main/master (the protected branch).
 *
 * SKIP unexpanded shell variables ($VAR, ${VAR}, $(...), backticks): the hook
 * MUST NOT block or re-expand them (principle 4 — no shell evaluation). A
 * destructive form hidden behind a variable is left to the runtime; we never
 * guess what a variable expands to.
 *
 * Node built-ins only; CommonJS. Reads the JSON event from stdin (via the
 * runtime), writes the result to stdout.
 */

const runtime = require("./lib/runtime.js");

/**
 * True if the string contains an unexpanded shell variable / substitution:
 * $VAR, ${VAR}, $(...), or a backtick. When present we SKIP the structural
 * check entirely for that command — never block, never re-expand (principle 4).
 * @param {string} s
 * @returns {boolean}
 */
function hasUnexpandedVar(s) {
  if (typeof s !== "string") return false;
  return /\$\{?\w/.test(s) || /\$\(/.test(s) || s.indexOf("`") !== -1;
}

/**
 * Split a compound command into its shell segments on the structural
 * separators (|| && ; | & newline). The clean-tree guard (the porcelain
 * check) may live in any sibling segment of the same line, so the segment
 * list is also what we scan for the guard's presence.
 * @param {string} command
 * @returns {string[]}
 */
function segments(command) {
  return String(command).split(/(?:\|\||&&|;|\n|&|\|)/);
}

/**
 * Does the WHOLE compound command contain a `git status --porcelain` check?
 * Its presence anywhere in the same line means the agent gated the
 * destructive op on a clean-tree signal — the new git.md guard — so we allow.
 * Structural (substring of the command string), never semantic.
 * @param {string} command
 * @returns {boolean}
 */
function hasPorcelainGuard(command) {
  return /git\s+status\s+[^|;&\n]*--porcelain/.test(command);
}

/**
 * rm -rf of an absolute / home / root path. Matches -r, -R, -f in any order
 * and any short-flag clustering (-rf, -fr, -r -f, --recursive --force), then
 * requires the FIRST operand to be an absolute (`/...`), home (`~...`), or
 * bare-root (`/`) path. A relative operand is NOT a match (cwd-scoped, normal).
 * @param {string} seg one shell segment (already separator-split)
 * @returns {boolean}
 */
function isDangerousRm(seg) {
  const s = seg.trim();
  if (!/^\s*rm\b/.test(s)) return false;
  // Must carry BOTH recursive and force, short or long, in any arrangement.
  const recursive =
    /(^|\s)-[a-zA-Z]*r[a-zA-Z]*\b/i.test(s) || /--recursive\b/.test(s);
  const force = /(^|\s)-[a-zA-Z]*f[a-zA-Z]*\b/i.test(s) || /--force\b/.test(s);
  if (!(recursive && force)) return false;
  // Find the first non-flag operand and test it for an absolute/home/root path.
  const toks = s.split(/\s+/).filter(Boolean).slice(1); // drop the `rm` token
  for (const t of toks) {
    if (t.startsWith("-")) continue; // a flag
    // First operand. Block on absolute (/...), home (~ or ~/...), or bare /.
    return /^\/(\S|$)/.test(t) || t === "/" || /^~($|\/)/.test(t);
  }
  return false;
}

/**
 * git reset --hard in a segment (anchored to the segment's leading `git`).
 * @param {string} seg
 * @returns {boolean}
 */
function isResetHard(seg) {
  const s = seg.trim();
  return /^git\b/.test(s) && /\breset\b/.test(s) && /(^|\s)--hard\b/.test(s);
}

/**
 * git clean with force (-f / -fd / --force), excluding a dry-run (-n /
 * --dry-run), in a segment anchored to the leading `git`.
 * @param {string} seg
 * @returns {boolean}
 */
function isCleanForce(seg) {
  const s = seg.trim();
  if (!/^git\b/.test(s) || !/\bclean\b/.test(s)) return false;
  if (/(^|\s)-[a-zA-Z]*n[a-zA-Z]*\b/.test(s) || /--dry-run\b/.test(s))
    return false;
  return /(^|\s)-[a-zA-Z]*f[a-zA-Z]*\b/.test(s) || /--force\b/.test(s);
}

/**
 * git push --force (or -f / --force-with-lease) to main/master, anchored to
 * the leading `git`.
 * @param {string} seg
 * @returns {boolean}
 */
function isForcePushMain(seg) {
  const s = seg.trim();
  if (!/^git\b/.test(s) || !/\bpush\b/.test(s)) return false;
  const force =
    /(^|\s)--force(?:-with-lease)?\b/.test(s) ||
    /(^|\s)-[a-zA-Z]*f[a-zA-Z]*\b/.test(s);
  const toMain = /(^|\s)(main|master)\b/.test(s);
  return force && toMain;
}

/**
 * Emit the PreToolUse structured-halt and exit 2 (the only blocking
 * disposition meaningful at PreToolUse). Delegates to runtime.emitHalt so all
 * six handoff fields (severity, what_happened, why, agent_must_report,
 * agent_must_wait, user_summary) are PACKED into permissionDecisionReason and
 * actually reach the agent — per `rules/hook-output-discipline.md` MUST §1.
 * (Sibling fields on hookSpecificOutput are ignored by the host, so they must
 * not be the carrier.)
 * @param {{severity?:string, what_happened:string, why:string, agent_must_report:string[], agent_must_wait:string, user_summary:string}} h
 */
function halt(h) {
  runtime.emitHalt({
    event: "PreToolUse",
    severity: h.severity || "halt-and-report",
    what_happened: h.what_happened,
    why: h.why,
    agent_must_report: h.agent_must_report,
    agent_must_wait: h.agent_must_wait,
    user_summary: h.user_summary,
  });
  try {
    process.exit(2);
  } catch {
    // process.exit interceptable in tests — withFailOpen still floors us at allow.
  }
}

runtime.withFailOpen((input) => {
  const command = (input && input.tool_input && input.tool_input.command) || "";
  if (!command || typeof command !== "string") return runtime.allow();

  // SKIP unexpanded shell variables — never block, never re-expand (principle 4).
  if (hasUnexpandedVar(command)) return runtime.allow();

  const segs = segments(command);
  const guarded = hasPorcelainGuard(command);

  for (const seg of segs) {
    // 1. rm -rf of an absolute/home/root path — unambiguous, no guard exempts it.
    if (isDangerousRm(seg)) {
      return halt({
        what_happened: `Bash command attempts \`rm\` recursive+force against an absolute/home/root path: ${command.slice(0, 120)}`,
        why: "Structural destructive-op guard — a recursive force-delete of an absolute, home (~), or root (/) path removes files irreversibly outside the cwd. No clean-tree guard can make this safe.",
        agent_must_report: [
          "Quote the exact rm command and the path it targets",
          "Confirm the path is intentional and the user authorized deleting it IN THIS CONVERSATION",
          "Prefer scoping the delete to a relative path inside the working directory",
        ],
        agent_must_wait:
          "Do not retry. A recursive force-delete of an absolute path requires explicit per-action user authorization.",
        user_summary:
          "rm -rf of an absolute/home/root path blocked — confirm intent",
      });
    }

    // 2a. git reset --hard WITHOUT a porcelain guard in the same compound line.
    if (isResetHard(seg) && !guarded) {
      return halt({
        what_happened: `Bash invoked \`git reset --hard\` with no \`git status --porcelain\` check in the same command: ${command.slice(0, 120)}`,
        why: "git.md — destructive working-tree ops MUST verify a clean tree first. A `--hard` reset on a dirty tree discards unstaged changes and untracked files with no reflog. The structural guard is a `git status --porcelain` check in the same compound command; it is absent here.",
        agent_must_report: [
          "Quote the command and confirm whether the working tree is clean",
          "Gate the reset on `git status --porcelain` (empty) in the same line, OR use `git reset --keep`",
        ],
        agent_must_wait:
          "Do not retry --hard without a clean-tree check in the same command, or switch to --keep.",
        user_summary:
          "git reset --hard blocked — add a clean-tree (git status --porcelain) check or use --keep",
      });
    }

    // 2b. git clean -f[d] WITHOUT a porcelain guard in the same compound line.
    if (isCleanForce(seg) && !guarded) {
      return halt({
        what_happened: `Bash invoked \`git clean\` with force and no \`git status --porcelain\` check in the same command: ${command.slice(0, 120)}`,
        why: "git.md — destructive working-tree ops MUST verify a clean tree first. `git clean -f[d]` deletes untracked-not-ignored files irreversibly (no git object, no reflog). The structural guard is a `git status --porcelain` check in the same compound command; it is absent here.",
        agent_must_report: [
          "Quote the command and confirm via `git clean -n` (dry-run) what would be deleted",
          "Gate the clean on `git status --porcelain` in the same line, or `git stash -u` to preserve untracked work",
        ],
        agent_must_wait:
          "Do not retry the force-clean without a clean-tree check in the same command, or dry-run first.",
        user_summary:
          "git clean -f blocked — add a clean-tree (git status --porcelain) check or dry-run first",
      });
    }

    // 3. force-push to main/master.
    if (isForcePushMain(seg)) {
      return halt({
        what_happened: `Bash attempted a force-push to a protected branch: ${command.slice(0, 120)}`,
        why: "git.md branch protection — force-push to main/master rewrites published history and is rejected server-side. The structural intent is unambiguous and carries no in-line guard.",
        agent_must_report: [
          "State which branch was force-pushed and why (history rewrite? recovery?)",
          "Confirm the user explicitly authorized force-push to main/master IN THIS CONVERSATION",
        ],
        agent_must_wait:
          "Do not retry. Force-push to main/master requires explicit per-action user authorization.",
        user_summary:
          "force-push to main/master blocked — requires explicit authorization",
      });
    }
  }

  // No structural danger matched — allow.
  return runtime.allow();
});
