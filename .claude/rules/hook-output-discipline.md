---
paths:
  - ".claude/hooks/**"
---

# Hook Output Discipline Rules

Origin: inbound sync from atelier (item-7 hook-cluster propagation, GH #15) — lifts the no-raw-exit(2) + structural-block-severity pattern from loom rules/hook-output-discipline.md, adapted for atelier (loom hook/crypto machinery rewired to atelier's substrate; phase names remapped to CO v1.2). NOW load-bearing — atelier's hook substrate (`.claude/hooks/`, `lib/runtime.js`, `detect-violations.js`) was built this cycle.

## Scope

These rules apply to every hook in `.claude/hooks/**` and every detector in `.claude/hooks/lib/violation-patterns.js`. A hook is the structural enforcement layer of the trust-posture system: when a hook halts the agent's flow, the agent receives ONLY what the hook emits, so an empty payload destroys the institutional knowledge of WHY the block fired. These rules bind every halting hook to a full structured handoff and forbid the false-positive class that ships a blocking severity from a lexical regex match alone.

## MUST Rules

### 1. Every Halting Hook MUST Emit The Full Structured Handoff

Any hook that returns `continue: false` (PostToolUse / UserPromptSubmit / SessionStart) OR exits with code `2` (PreToolUse only) MUST construct its output via `.claude/hooks/lib/runtime.js`'s `emitHalt()` with all six fields populated: `severity`, `what_happened`, `why`, `agent_must_report` (≥1 entry), `agent_must_wait`, `user_summary`. `emitHalt` packs those six into the host's single reason channel (`permissionDecisionReason` for a PreToolUse `permissionDecision:"deny"`; `reason` for the PostToolUse/Stop `{continue:false, decision:"block"}` shape) — the host ignores arbitrary sibling fields, so the reason string is the only carrier that reaches the agent. A bare `process.exit(2)` and a raw `process.stdout.write(JSON.stringify({continue: false}))` are BLOCKED.

```javascript
// DO — emitHalt() packs the six fields into the host's reason channel (sibling fields are dropped)
const runtime = require("./lib/runtime.js");
runtime.emitHalt({
  event: "PreToolUse", // or "PostToolUse" / "Stop"
  severity: "halt-and-report",
  what_happened: `Command flagged: ${cmd.slice(0, 80)}`,
  why: "resolve-on-discovery/MUST-1",
  agent_must_report: [
    "Quote the exact input that triggered the detection",
    "State which rule was violated and its origin date",
    "Propose remediation in this turn (do not file a follow-up)",
  ],
  agent_must_wait: "Do not retry until the user instructs.",
  user_summary: `resolve-on-discovery/MUST-1 — ${cmd.slice(0, 60)}`,
}); // PreToolUse also exits 2 after emitHalt; PostToolUse/Stop does not.

// DO NOT — raw exit, empty payload, agent sees only "Execution stopped"
if (flagged) {
  process.stdout.write(JSON.stringify({ continue: false }) + "\n");
  process.exit(2);
}
```

**BLOCKED responses:**

- "The user_summary on stderr is enough; the agent doesn't need agent_must_report"
- "Raw exit is faster; the structured handoff is overhead"
- "The hook name is in the error message, that's the why"
- "Populating six fields for a one-line detector is bureaucracy"
- "Exit 2 is the documented mechanism; that IS the contract"

**Why:** When a hook halts, the agent's next message receives the hook's output as authoritative context — an empty payload leaves the agent with no idea why it halted, what to report, or what the user expects, so it guesses wrong, files a follow-up (violating `rules/autonomous-execution.md` MUST §6 and `rules/resolve-on-discovery.md`), or asks the user to re-explain the rule the hook just enforced. The structured handoff converts a silent flow-stop into a report-and-wait protocol both the user and the agent can act on.

### 2. Blocking Severity MUST Come From A Structural Signal, Never Lexical Regex Alone

A finding with `severity: "block"` MUST be grounded in a structural / behavioral / state signal that surface rewrites cannot evade — an environment variable, an exit code, file existence, a parsed-state field. Lexical regex matches against command strings, file contents, or agent prose MUST emit `severity: "halt-and-report"` or `severity: "advisory"`, never `block`.

```javascript
// DO — block grounded in a structural signal (parsed posture state)
function detectProtectedStateEdit(filePath) {
  const protectedPaths = [
    ".claude/learning/posture.json",
    ".claude/learning/violations.jsonl",
  ];
  if (!protectedPaths.some((p) => filePath.endsWith(p))) return null;
  return {
    rule_id: "trust-posture/MUST-NOT-1",
    severity: "block", // structural: the path IS the protected state file
    evidence: `agent attempted to hand-edit ${filePath}`,
  };
}

// DO — lexical regex emits halt-and-report (agent surfaces and acknowledges, not blocked)
function detectScopeDriftText(prose) {
  if (!/\bout of scope\b/i.test(prose)) return null;
  return {
    rule_id: "resolve-on-discovery/MUST-1",
    severity: "halt-and-report",
    evidence: "...",
  };
}

// DO NOT — block from a lexical regex; a surface rewrite flips a false positive into a hard block
function detectScopeDriftText(prose) {
  if (/\bout of scope\b/i.test(prose)) {
    return {
      rule_id: "resolve-on-discovery/MUST-1",
      severity: "block",
      evidence: "...",
    };
  }
}
```

**Pairs with** `rules/probe-driven-verification.md` MUST §4: a lexical hook detector MAY flag advisory BUT MUST have a probe-driven counterpart at a gate review (`/vet`, `/cc-audit`). The hook is the tripwire; the probe is the authoritative verdict.

**BLOCKED responses:**

- "The regex is tight, false positives are rare"
- "Block is the appropriate teeth for this discipline"
- "halt-and-report lets the agent rationalize and proceed"
- "Lexical match plus posture-gate is structural enough"
- "If the regex false-positives, we tighten the regex"

**Why:** Lexical regex against a command or prose string cannot see what the string evaluates to — shell expansion, substitution, paraphrase, or context all defeat it — so a block from a lexical match hard-stops in-scope work whenever the surface form coincidentally matches. Block severity is reserved for facts the regex cannot misread (environment variables, exit codes, file existence, parsed state); lexical signals are advisory or halt-and-report, where the agent surfaces and the user adjudicates. This closes at the detector layer the same loophole `detect-violations.js` closes at the state-write boundary: a downgrade or block from a lexical match alone is structurally unsound.

### 3. Command-String Detectors MUST Skip Unexpanded Shell Variables And MUST NOT Re-Expand Them

Any detector inspecting a shell command string (`payload.tool_input.command` from PreToolUse/PostToolUse Bash) MUST skip captured groups that reference unexpanded shell constructs — `$VAR`, `${VAR}`, `$(...)`, and backtick substitution — by returning a structural `null` BEFORE evaluating the captured value. The detector MUST NOT attempt to re-expand the construct (no `child_process`, no shell-out) to "resolve" it.

```javascript
// DO — skip when the captured group references an unexpanded shell construct
const m = command.match(/--target\s+([^\s]+)/);
if (!m) return null;
const target = m[1];
if (/^\$\{?\w+\}?$/.test(target) || /\$\(/.test(target) || /`/.test(target)) {
  return null; // pre-expansion form cannot be evaluated at hook time
}
// ... proceed with literal-string comparison

// DO NOT — evaluate the literal "$TARGET" string, or shell out to expand it
const cwdBase = path.basename(cwd);
if (!target.includes(cwdBase)) return { severity: "block" /* ... */ }; // false positive
const resolved = execSync(`echo ${target}`).toString(); // confused-deputy hazard
```

**BLOCKED responses:**

- "We can `child_process.execSync` to expand the variable"
- "Shell variables are rare; the detector catches the common case"
- "The hook is post-tool, so the variable is already expanded" (FALSE — `payload.tool_input.command` is the pre-expansion string sent to bash)

**Why:** `payload.tool_input.command` is the literal pre-expansion string — shell variables, substitution, and pipes are evaluated by bash, not by the hook — so checking substring membership against `"$TARGET"` asks "does this literal contain my name?" when the real question is "what does this evaluate to at runtime?", which the hook cannot answer. Re-running the string inside the hook to find out is a confused-deputy security hole and breaks anyway on variables the hook's shell does not have. The skip — emit nothing when the captured group is shell-variable-shaped — is the only correct disposition.

### 4. Detectors MUST Ship With Committed Audit Fixtures

Every detector in `.claude/hooks/lib/violation-patterns.js` MUST ship with at least one committed fixture per scope-restriction predicate it relies on, under `.claude/audit-fixtures/violation-patterns/<detector>/` with a per-fixture expected-output file. Fixtures MUST cover: (a) clean input that MUST NOT flag, (b) flagging input that MUST flag, and (c) for command-string detectors, at least one unexpanded-shell-variable input that MUST NOT flag (Rule 3 enforcement).

```text
# DO — fixture set covers the three predicate classes (the real on-disk shape for the shipped detector)
.claude/audit-fixtures/violation-patterns/detectRepoScopeDrift/
  clean-read-only-sibling.txt   ← in-scope read; expects null
  clean-read-only-sibling.expected
  flag-sibling-repo-write.txt   ← out-of-cwd write, no receipt; expects flag
  flag-sibling-repo-write.expected
  skip-shell-variable.txt       ← "--target \"$TARGET\""; expects null (Rule 3)
  skip-shell-variable.expected
  skip-command-substitution.txt ← "--target $(resolve-target)"; expects null (Rule 3)
  skip-command-substitution.expected

# DO NOT — only the happy-path fixture; the shell-variable regression silently returns
.claude/audit-fixtures/violation-patterns/detectRepoScopeDrift/
  flag-sibling-repo-write.txt
```

**BLOCKED responses:**

- "The detector is too simple to need fixtures"
- "The trust-posture tests cover the detector indirectly"
- "Fixture maintenance overhead exceeds the regression risk"
- "We'll add the shell-variable fixture when the bug recurs"

**Why:** A scope-restriction predicate (the literal-vs-variable distinction of Rule 3, a structural gate for Rule 2) ships its regression the moment no fixture forces it into the test surface — and the cost of a violation-patterns regression is measured in user-blocked sessions, not advisory false-positives. This is the violation-patterns-specific application of `rules/cc-enforcement.md` MUST §4 (audit tools ship with committed fixtures).

## MUST NOT Rules

### 1. No Raw `process.exit(2)` Or `process.exit(1)` At Any Halting Branch

```javascript
// DO — the only legitimate raw exit is the timeout fallback, and it emits continue:true first
const timeout = setTimeout(() => {
  process.stdout.write(JSON.stringify({ continue: true }) + "\n");
  process.exit(1);
}, TIMEOUT_MS);

// DO NOT — raw halting exit with an empty payload
if (flagged) process.exit(2);
```

**Why:** A raw halting exit bypasses the structured handoff and ships an empty payload to both the user and the agent. The `setTimeout` fallback (`rules/cc-enforcement.md` MUST §2) is the ONLY legitimate raw-exit path, and it MUST emit `{continue: true}` first.

### 2. No `severity: "block"` On A Finding Whose Evidence Is The Matched Regex Span

**Why:** A regex-span evidence field is lexical by definition; block severity demands structural evidence (env var, exit code, file presence, parsed state). Lexical evidence plus block severity together define the false-positive failure mode Rule 2 blocks. (No in-hook shell expansion to "resolve" the input either — that is a confused-deputy hole; the skip in Rule 3 is the only correct disposition.)

### 3. No Detector That Blocks Work The Agent Was Instructed To Perform When The Structural Fact Confirms It Is In-Scope

**Why:** A detector whose false-positive rate on legitimate sessions exceeds its true-positive rate IS a worse failure mode than the rule it enforces — a belt-and-suspenders bash detector MUST NOT block when the structural signal (cwd, environment, parsed posture state) confirms the work is in-scope. Prose-discipline detectors carry the primary enforcement; the bash surface stays advisory unless it has structural grounding.

## Trust-Posture Wiring

- **Severity of this rule's own enforcement:** `halt-and-report` (the agent surfaces the rule and remediation in-turn; not a block).
- **State files:** the trust posture lives in `.claude/learning/posture.json` (level `L1`–`L5`, default `L3`) and `.claude/learning/violations.jsonl`; the Edit/Write/MultiEdit paths are protected by `settings.json` `permissions.deny` and the Bash path is denied by `validate-bash-command.js`'s `detectProtectedStateWrite` (per `rules/trust-posture.md` § Enforcement Status — the engine is the sole writer), so the agent cannot hand-edit its own trust state. A hook authored or modified in `.claude/hooks/**` that ships a raw-exit halting branch OR a `severity: "block"` finding without structural evidence is caught by the `claude-code-architect` mechanical sweep at `/codify` (Detection at `/codify`, below); a violation recorded there and probe-confirmed at a gate counts toward the enforcement engine's cumulative downgrade thresholds (GH #16, landed).
- **Detection at `/codify`:** the `claude-code-architect` mechanical sweep verifies (1) every `process.exit([12])` hit in `.claude/hooks/` is the timeout fallback (commented as such) or the structured emit from `lib/runtime.js`; (2) every `severity: "block"` return in `lib/violation-patterns.js` has an environment-variable / exit-code / file-existence / parsed-state guard above it; (3) no detector returning `severity: "block"` has a `match()` group as its `evidence`.

## Cross-References

- `rules/cc-enforcement.md` MUST NOT §1 — hooks check structure, agents check semantics; this rule is the output-side corollary (a hook that halts MUST hand the semantic work to the agent via the structured report, never assert a verdict it cannot compute).
- `rules/cc-enforcement.md` MUST §2 (timeout fallback) and MUST §4 (committed audit fixtures) — the raw-exit exemption and the fixture requirement this rule specializes for `violation-patterns.js`.
- `rules/probe-driven-verification.md` MUST §4 — every lexical hook detector needs a probe-driven counterpart at a gate (hook advisory, probe authoritative); see also the hook-authoring skill for the canonical emit shape, timeout-fallback template, and detector-fixture layout.
