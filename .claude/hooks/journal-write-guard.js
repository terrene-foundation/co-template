#!/usr/bin/env node
"use strict";

/**
 * journal-write-guard.js — PreToolUse guard enforcing journal immutability.
 *
 * Event:   PreToolUse
 * Matcher: Write | Edit | MultiEdit
 *
 * Behavior (structural, never semantic — design principle 4):
 *   A journal entry that ALREADY exists on disk is append-only per
 *   rules/journal.md MUST-NOT §1 — overwriting it destroys the audit
 *   trail. This guard BLOCKS a Write that would overwrite an existing
 *   journal entry, and a rewriting Edit (one whose old_string is empty
 *   or whitespace, i.e. a full-content replacement rather than a
 *   targeted in-place edit) against an existing journal entry.
 *
 *   The structural signal is fs.existsSync — process-local, deterministic,
 *   no interpretation of meaning. The path test is a literal regex for the
 *   journal-entry shape `.../journal/NNNN-*.md`. Everything else allows.
 *
 * Fail-open (design principle 1): any error, missing field, malformed
 * input, or uncertainty degrades to allow/continue via runtime.withFailOpen.
 * The block is the narrow, certain case only — overwrite of a file that
 * provably exists at a journal-entry path. When in doubt, allow.
 *
 * Agnostic (design principle 2): NO operator identity, slot reservation,
 * coordination log, provenance ledger, or crypto. Atelier journals are
 * single-writer; the only invariant here is on-disk immutability.
 *
 * Node built-ins only; CommonJS. Reads the hook event from stdin, writes
 * the structured-halt result to stdout per the Claude Code hook protocol.
 */

const fs = require("fs");
const path = require("path");
const runtime = require("./lib/runtime.js");

// Journal-entry path shape per rules/journal.md MUST §2 (sequential naming
// NNNN-TYPE-topic.md). Matches both top-level `journal/` and workspace
// `workspaces/<name>/journal/` directories. Structural lexical test ONLY —
// existence on disk (below) is the load-bearing block signal.
const JOURNAL_ENTRY_RE = /(?:^|\/)journal\/\d+-[^/]*\.md$/;

/**
 * Is this a journal-entry path? Normalizes backslashes for the test.
 * @param {string} p
 * @returns {boolean}
 */
function isJournalEntryPath(p) {
  if (typeof p !== "string" || p.length === 0) return false;
  return JOURNAL_ENTRY_RE.test(p.replace(/\\/g, "/"));
}

/**
 * Does this Write/Edit/MultiEdit OVERWRITE rather than append/patch?
 *
 *  - Write: always a full-content overwrite of the target.
 *  - Edit: a rewrite when old_string is absent/empty/whitespace — that
 *    is a full-content replacement, not a targeted in-place edit. A
 *    normal Edit (non-empty old_string) patches a span and is allowed:
 *    it does not destroy the entry, it amends a specific portion, which
 *    the immutability rule's "create a new entry" guidance does not gate
 *    structurally (an Edit cannot be distinguished from a legitimate typo
 *    fix without interpreting meaning — out of scope per principle 4).
 *  - MultiEdit: same as Edit, applied to the first edit's old_string.
 *
 * Conservative: only the unambiguous full-overwrite shapes return true.
 * @param {string} tool
 * @param {object} input
 * @returns {boolean}
 */
function isOverwrite(tool, input) {
  if (tool === "Write") return true;
  const edits =
    tool === "MultiEdit" && Array.isArray(input.edits) ? input.edits : [input];
  for (const e of edits) {
    const oldStr = e && typeof e.old_string === "string" ? e.old_string : null;
    // A rewriting Edit replaces the whole file: empty/whitespace old_string.
    if (oldStr !== null && oldStr.trim() === "") return true;
  }
  return false;
}

runtime.withFailOpen((input) => {
  const tool = input && input.tool_name;
  if (tool !== "Write" && tool !== "Edit" && tool !== "MultiEdit") {
    return runtime.allow();
  }

  const toolInput = (input && input.tool_input) || {};
  const filePath = toolInput.file_path || toolInput.filePath || "";

  // Not a journal entry → not our concern.
  if (!isJournalEntryPath(filePath)) return runtime.allow();

  // Only the full-overwrite shapes are structurally certain destructions.
  if (!isOverwrite(tool, toolInput)) return runtime.allow();

  // Resolve to an absolute path for the existence check.
  const absTarget = path.isAbsolute(filePath)
    ? filePath
    : path.join(runtime.projectDir(), filePath);

  // The load-bearing structural signal: the file ALREADY exists on disk.
  // A Write to a NEW journal path is the legitimate create flow — allow it.
  if (!fs.existsSync(absTarget)) return runtime.allow();

  // BLOCK: overwrite of an existing journal entry. Full structured handoff
  // (PreToolUse deny) per rules/hook-output-discipline.md MUST §1 — the six
  // fields are packed into permissionDecisionReason so the agent receives them.
  runtime.emitHalt({
    event: "PreToolUse",
    severity: "block",
    what_happened: `Write/Edit would overwrite the existing journal entry ${filePath}`,
    why: "journal.md MUST NOT §1 — journal entries are immutable; overwriting destroys the audit trail (CO Principle 5, append-only).",
    agent_must_report: [
      "State which journal entry was about to be overwritten",
      "Create a NEW sequentially-numbered entry that references the original instead",
    ],
    agent_must_wait:
      "Do not retry the overwrite. The immutability invariant is structural (the file exists on disk).",
    user_summary: `journal immutability — ${filePath} already exists; create a new entry`,
  });
  // PreToolUse deny: emitHalt emitted the permissionDecision:"deny" payload; exit 2 to
  // match the other PreToolUse guards (destructive-op-guard, validate-bash-command) — a
  // uniform deny mechanism across the substrate (belt-and-suspenders; the JSON deny alone
  // also suffices, but uniformity keeps the hooks auditable as one pattern).
  try {
    process.exit(2);
  } catch {
    // process.exit interceptable in tests — withFailOpen still floors at allow.
  }
});
