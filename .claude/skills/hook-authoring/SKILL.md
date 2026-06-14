---
name: hook-authoring
description: Authoring or auditing Claude Code lifecycle hooks. Use for settings.json registration, timeout fail-open discipline, the structured halt-output shape, structural-not-regex severity, hook audit.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Hook Authoring

Reference for authoring and auditing Claude Code lifecycle hooks. Hooks are guardrail artifacts — alongside rules, but distinguished by deterministic runtime invocation on tool and session lifecycle events. A rule is always-on prose the model reads; a hook is a script the harness runs, deterministically, whether or not the model "remembers" to.

Use this skill when:

- Authoring a new hook script registered in `settings.json`.
- Auditing an existing hook for timeout discipline, output shape, severity grounding, or path resolution.
- Deciding whether enforcement belongs in a hook (runtime tripwire, deterministic), an agent (judgment, tools), or a rule (always-on prose guardrail).

## Where Each Enforcement Mechanism Belongs

The first authoring decision is whether a hook is even the right artifact. Picking wrong is the most expensive mistake — a hook that should have been a rule produces brittle false positives; a rule that should have been a hook gets forgotten under pressure.

| Mechanism | Runs when                     | Sees                           | Use for                                                            |
| --------- | ----------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| **Hook**  | Deterministically, on events  | Structured payload (tool, cwd) | Tripwires on facts the model can't rationalize away (env, paths)   |
| **Agent** | When delegated, with judgment | Whatever it reads              | Semantic review, meaning, intent — anything needing interpretation |
| **Rule**  | Every relevant turn, as prose | The conversation               | Always-on guardrails the model should internalize                  |

A hook is the right home only when the decision is **mechanical** — derivable from structure (a path prefix, an environment variable, an exit code, a file's existence) without interpreting meaning. The moment a check needs to understand _what the work means_, it belongs to an agent at a review gate, not a hook.

## Quick Reference

| Concern               | Rule                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| Registration          | Declared in `settings.json` under the `hooks` block, keyed by lifecycle event         |
| Event surface         | `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`               |
| Project-dir env       | `CLAUDE_PROJECT_DIR` exported at hook launch; cwd is the project root                 |
| Stdin / stdout        | Read JSON payload from stdin; emit JSON on stdout                                     |
| Timeout fallback      | Mandatory — `setTimeout` emits `{continue: true}`, then `process.exit(1)` (fail-open) |
| Halting (PreToolUse)  | `process.exit(2)` — but ONLY through the structured emit shape below                  |
| Halting (PostToolUse) | `{continue: false}` — ONLY through the same structured emit shape                     |
| Block severity        | Requires a structural / behavioral signal — a lexical regex match MUST NOT block      |

## Registration

A hook is inert until it is registered. Registration lives in `settings.json` under the `hooks` block, keyed by the lifecycle event that should fire it:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "node ./.claude/hooks/<name>.js" }
        ]
      }
    ]
  }
}
```

Two registration pitfalls dominate:

- **Path form.** Register with a working-directory-relative path (`node ./.claude/hooks/<name>.js`), not a path built from an environment variable that may be unset. An unset variable in the command string expands to an empty segment, the path resolves to a non-existent root location, and the hook exits with a module-not-found error that is easy to misread as "hook ran and passed." Resolve any project-relative paths _inside_ the script from `CLAUDE_PROJECT_DIR` or the stdin `cwd`, not in the registration string.
- **Event matching.** The `matcher` scopes which tool invocations fire the hook. A hook registered on the wrong event simply never runs — and a silently-never-running hook is indistinguishable from a passing one. Confirm the hook actually fires before trusting it.

## Reading the Payload

The harness passes a JSON payload on stdin. Parse it once, defensively, and branch off canonical fields rather than re-reading raw stdin in multiple places:

```javascript
// DO — parse once, branch off named fields
const payload = JSON.parse(rawStdin);
const event = payload.hook_event_name;
const toolName = payload.tool_name;
const toolInput = payload.tool_input;

// DO NOT — re-parse stdin repeatedly, or assume a field is always present
const cmd = JSON.parse(rawStdin).tool_input.command; // throws when tool_input absent
```

Project-root resolution is a common pitfall. Resolve it in priority order so the hook still works when the env var is absent (manual invocation, an unusual launch context):

```javascript
const projectDir = process.env.CLAUDE_PROJECT_DIR || payload.cwd;
```

The stdin `cwd` is the durable fallback — it is present in the payload regardless of which environment variables the launch context happened to export.

## Output Discipline — The Structured Halt Shape

Every halting branch (a `PostToolUse` `{continue: false}` or a `PreToolUse` `process.exit(2)`) MUST emit a structured payload, never a bare exit. A bare halt shows the user only "Execution stopped by hook" and shows the agent nothing actionable — so the agent files a follow-up issue, the rule the hook enforces gets re-asked next session, and the halt accomplishes nothing but friction.

The structured shape converts a silent flow-stop into a handoff that both the user and the agent can act on. All six fields MUST be populated:

```javascript
// DO — structured halt; the agent gets an actionable report
emitHalt({
  hookEvent: "PostToolUse",
  severity: "halt-and-report",
  what_happened: "Write flagged — target is outside the active workspace",
  why: "workspace-scope/MUST-NOT-1",
  agent_must_report: [
    "Quote the exact action that triggered detection",
    "State which rule was violated and its origin",
    "Propose remediation in this turn — no follow-up issue",
  ],
  agent_must_wait: "Do not retry until the user instructs.",
  user_summary: "workspace-scope/MUST-NOT-1 — write outside active workspace",
});

// DO NOT — bare exit; the agent sees only "Execution stopped by hook"
process.stdout.write(JSON.stringify({ continue: false }) + "\n");
process.exit(2);
```

| Field               | Purpose                                                             |
| ------------------- | ------------------------------------------------------------------- |
| `severity`          | `block` / `halt-and-report` / `advisory` — see grounding rule below |
| `what_happened`     | One line: what the hook observed                                    |
| `why`               | The rule id the halt enforces (`<rule-file>/<clause>`)              |
| `agent_must_report` | ≥1 concrete instruction the agent must execute before proceeding    |
| `agent_must_wait`   | The wait condition — what the agent must not do until the user acts |
| `user_summary`      | The single line surfaced to the user; without it the halt is opaque |

This skill is the source of the emit-shape discipline: every halting branch routes through the structured emitter, and raw `process.exit(2)` or a bare `{continue: false}` write outside that emitter (other than the timeout fail-open path below) is an authoring defect the audit checklist flags. The no-semantic-analysis and timeout-fallback halves of this discipline are also enforced as MUST clauses in `rules/cc-enforcement.md` (timeout MUST §2, no-semantic-analysis MUST NOT §1).

## Severity Grounding — No Block From Regex

A finding with `severity: "block"` MUST be grounded in a **structural or behavioral signal** that a surface rewrite cannot evade — an environment variable, an exit code, a file's existence, a path prefix, an abstract-syntax-tree shape. A lexical regex match against a command string, file contents, or model prose MUST emit `halt-and-report` or `advisory`, never `block`.

The reason is adversarial robustness: `block` is the severity that hard-stops work, so it must be reserved for facts the agent cannot rationalize away. A regex span is not such a fact — the same intent can be re-expressed to dodge the pattern, so a regex-grounded block produces false positives on legitimate work while failing to catch evasions.

```javascript
// DO — block grounded in env var + path prefix (structural)
if (worktreePath && !filePath.startsWith(worktreePath)) {
  return { rule_id: "workspace-isolation/MUST-1", severity: "block", evidence };
}

// DO — lexical command-string match → halt-and-report, never block
const m = command.match(/--target\s+(\S+)/);
if (m && !m[1].startsWith(expectedPrefix)) {
  return { rule_id: "scope/MUST-NOT-1", severity: "halt-and-report", evidence };
}
```

**Shell-variable skip.** Command-string detectors MUST skip captured groups that reference unexpanded shell variables (`$VAR`, `${VAR}`, `$(...)`, backticks). The pre-expansion form cannot be evaluated at hook invocation time — the hook does not know what `$VAR` will become. The correct handling is a structural `null` return (no finding), not a downgrade to advisory and never an in-hook shell expansion (expanding untrusted input inside the hook is a security hole).

## Timeout Fallback — Fail Open

Every hook MUST install a `setTimeout` that emits `{continue: true}` and exits before the harness's kill window. This is the single most important reliability invariant: a hanging hook blocks the entire session indefinitely, and the timeout is the only structural escape.

```javascript
const TIMEOUT_MS = 5000;
const _timeout = setTimeout(() => {
  console.log(JSON.stringify({ continue: true }));
  process.exit(1);
}, TIMEOUT_MS);
```

The fallback **fails open** — on timeout it lets the session continue rather than blocking it. A guardrail that fails closed (blocks on its own malfunction) is worse than no guardrail: it converts an internal hook bug into a frozen session the user cannot escape. Per-tool hooks (`PreToolUse`, `PostToolUse`) MUST stay at 5s to avoid stalling interactive work; a `SessionStart` hook doing boot-time discovery may use up to 10s, never higher.

The `setTimeout` fallback path is the ONE legitimate place a hook calls `process.exit` outside the structured emit shape. It MUST emit `{continue: true}` first. A raw `process.exit(N)` from any other branch is an authoring defect the audit checklist flags; the timeout mandate itself is a MUST clause in `rules/cc-enforcement.md` MUST §2.

## No Semantic Analysis in Hooks

Hooks run synchronously, under a hard timeout, on every matching event. That budget forbids semantic work. A hook MUST NOT try to reason about the _meaning_ of model prose, file contents, or commit messages — meaning analysis is slow and non-deterministic, so it produces spurious failures that block legitimate work, and the timeout fallback then silently fails it open, giving the illusion of enforcement with none of the substance.

The division of labor is firm: **hooks check structure** (a path prefix, an environment variable, an exit code, an AST shape); **agents check meaning** at a review gate, where judgment and tool access are available and there is no synchronous timeout. If a check cannot be expressed as a structural predicate, it does not belong in a hook.

## Workspace-Walking Hooks Filter Meta-Dirs

Hooks that enumerate workspace directories (for example, to detect the active workspace or find session notes) MUST filter out meta-directories: any directory whose name starts with an underscore, plus any reserved literal name the convention defines.

```javascript
const projects = entries.filter(
  (e) => e.isDirectory() && !e.name.startsWith("_"),
);
```

Leading-underscore is the convention for workspace meta-dirs (`_archive`, `_template`, `_draft`). Archival operations move a workspace into `_archive/`, which bumps that directory's modification time; without the filter, a "most recently touched" heuristic surfaces `_archive` as the active workspace, and lifecycle output gets routed into the archive — invisible drift the next session has to untangle.

## Audit Fixtures

Every scope-restriction predicate a hook relies on MUST ship at least one committed test fixture. Fixtures are the mechanical regression lock: without them, a future edit can silently weaken a predicate, and the detector starts producing false positives at scale — at which point someone disables it, restoring the original bug class. Required coverage per predicate:

- A clean input that MUST NOT flag.
- A flagging input that MUST flag.
- For command-string detectors, at least one shell-variable input that MUST NOT flag (the skip from the severity-grounding rule).

This mirrors the committed-fixtures requirement in `rules/cc-enforcement.md` MUST §4 — a mechanical check is only trustworthy if its scope-restriction is itself tested.

## Common Mistakes

### 1. Bare Halt Without the Structured Shape

The highest-frequency authoring bug. A new detector ships a halting branch with `process.exit(2)` and no payload; the agent gets "Execution stopped by hook" with zero context and cannot act on it. Fix: route every halting branch through the structured emit shape with all six fields.

### 2. `block` Severity From Regex Evidence

A lexical regex against a command string cannot see shell expansion or re-expression. Reporting `block` from a regex span produces false positives that hard-stop legitimate work. Fix: lexical matches emit `halt-and-report`; `block` requires a structural signal (env var, exit code, file existence, AST shape).

### 3. Missing Timeout Fallback

Author skips the `setTimeout` block "because the work is fast." The first runtime hang freezes the whole session. Fix: install the 5s (or 10s for `SessionStart`) fail-open timeout unconditionally — it is the only legitimate raw-exit branch.

### 4. Project-Dir Path Built In the Registration String

Registering with a path built from an environment variable that may be unset expands to a broken path and exits module-not-found, which reads as a false pass. Fix: register with a working-directory-relative path; resolve project-relative paths _inside_ the script from `CLAUDE_PROJECT_DIR || payload.cwd`.

### 5. Semantic Analysis In a Hook

A hook tries to reason about the meaning of prose, file contents, or commit messages. Under a hard synchronous timeout this is slow and non-deterministic, producing spurious failures. Fix: hooks check structure; agents check meaning at a review gate.

### 6. Hook Registered on the Wrong Event

A hook wired to an event that never fires for the targeted action silently never runs — indistinguishable from passing. Fix: confirm the hook actually fires (a temporary log line) before trusting it, then remove the probe.

## Audit Checklist

When auditing an existing hook:

- [ ] Hook is registered in `settings.json` under the correct lifecycle event and matcher
- [ ] Registration uses a working-directory-relative command path (no path built from a possibly-unset env var)
- [ ] Timeout fallback installed: `setTimeout` → `{continue: true}` → `process.exit(1)` (fails open)
- [ ] Timeout ≤5s for per-tool hooks, ≤10s for `SessionStart`; never higher
- [ ] Every halting branch emits the structured shape with all six fields (`severity`, `what_happened`, `why`, `agent_must_report` ≥1, `agent_must_wait`, `user_summary`)
- [ ] No `severity: "block"` return whose evidence is a lexical regex span
- [ ] Command-string detectors skip shell-variable captures (`$VAR`, `${VAR}`, `$(...)`, backticks) via a structural `null` return
- [ ] Project-dir resolution: `CLAUDE_PROJECT_DIR || payload.cwd`
- [ ] No semantic / meaning analysis — structural predicates only
- [ ] Workspace-walking loops filter leading-underscore meta-dirs (and any reserved literal names)
- [ ] Each scope-restriction predicate has committed fixtures (clean + flag + shell-var)
- [ ] The hook actually fires for the action it claims to guard (verified, not assumed)

## Related

- `rules/cc-enforcement.md` — timeout-fallback mandate (MUST §2), no-semantic-analysis-in-hooks (MUST NOT §1), committed-fixtures requirement (MUST §4) (the enforced backstops for the disciplines this skill teaches)
- `skills/cc-artifact-patterns/` — the four quality dimensions, hard limits, and anti-patterns this skill operationalizes for the hook layer
