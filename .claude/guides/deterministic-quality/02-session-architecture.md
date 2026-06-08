# Session Architecture — What Makes a Session "Sharp"

The layered loading model that produces high-throughput, zero-drop sessions. Distilled from first-hand observation of sessions that shipped multiple workstreams with nothing falling on the floor.

**Origin**: loom journal/0052-DISCOVERY-session-productivity-patterns.md §§1-2, atelier journal/0007-DISCOVERY-rule-path-scoping-model.md

## The Four Layers

A sharp session loads context in four layers, each catching what the previous missed:

```
Layer 1: SESSION-START (always loaded, every turn)
  ├── CLAUDE.md absolute directives (3-6 numbered rules)
  ├── Auto-memory index (MEMORY.md)
  ├── Session notes from previous session
  └── Universal rules (communication, git, independence, terrene-naming)
  │
  │ Cost: 15-30K tokens. Pays every turn. Must be minimal and high-leverage.
  │
Layer 2: PATH-SCOPED (loaded once on first matching file read, sticky)
  ├── Domain rules (cc-artifacts, execution-discipline, journal, etc.)
  ├── Scoped via paths: frontmatter to relevant file patterns
  └── Path patterns: **/.claude/**, **/workspaces/**, **/journal/**
  │
  │ Cost: 0 tokens until triggered; then one-time cost per rule. Scales to 25+ rules.
  │
Layer 3: TOOL-SCOPED (loaded on specialist delegation)
  ├── Specialist agents (domain experts, methodology validators)
  ├── Skills (reference material loaded on demand)
  └── Loaded when domain-specific work is detected
  │
  │ Cost: Only loaded in the subagent's context, never in the parent's.
  │
Layer 4: GATE-SCOPED (loaded at phase boundaries)
  ├── Review agents (quality, compliance, methodology validators)
  ├── Triggered at: end of /execute, before /deliver, after /vet
  └── Run as background agents (parent context stays clean)
  │
  │ Cost: Separate context per review agent. Parent sees only the verdict.
```

## Layer 1: Session-Start Context

### CLAUDE.md Absolute Directives

The highest-leverage artifact in any project. 3-6 numbered directives loaded into context on every turn. These frame every decision the agent makes.

**What makes a good directive:**

- Phrased as prohibition + imperative, not guideline
- Applies to EVERY decision in the session, not just some
- References a specific rule file for full detail
- Under 3 lines each; the block fits in 20 lines total

**Canonical structure (validated in practice):**

```markdown
## Absolute Directives

### 0. Methodology Management Only

No domain work. Work here: design, vet, codify, deliver CC and CO artifacts.

### 1. Domain Independence

CO is domain-agnostic. Artifacts MUST work for codegen, research, finance,
compliance, education, governance. See `rules/domain-independence.md`.

### 2. CC Authority

CC patterns are developed here. Changes flow: atelier → Loom → USE templates.

### 3. CO Specification Compliance

CO v1.2 (CC BY 4.0, Terrene Foundation). Eight first principles, five-layer
architecture, six-phase workflow. See `rules/terrene-naming.md`.
```

**Where directives fire**: A domain-independence directive prevents the agent from embedding codegen-specific assumptions in methodology artifacts. Without it, the agent defaults to the most recent domain context, which contaminates cross-domain patterns.

### Auto-Memory (MEMORY.md)

User preferences and project facts that persist across sessions. The index file is always loaded; individual memory files are read on demand.

**What belongs in memory:**

- User preferences that prevent friction ("prefers terse responses with no trailing summaries")
- Project state that prevents re-discovery ("merge freeze begins 2026-03-05 for mobile release cut")
- External references ("pipeline bugs tracked in Linear project INGEST")

**What does NOT belong in memory:**

- Code patterns (derive from the code)
- Git history (use `git log`)
- Debugging solutions (the fix is in the code)
- Anything in CLAUDE.md (loads every turn anyway)

**Where memory fires**: Project-specific preferences (methodology approach, sync routing, naming conventions) are active from turn 1 — the agent doesn't re-ask questions that were settled in prior sessions.

### Session Notes

State + intent from the previous session. NOT a recap of what was done (that's in git). The three things nothing else captures:

1. **Priority ordering** — which files to read first
2. **In-flight state** — what's true right now that isn't committed
3. **Traps** — pitfalls the next session will walk into

**Where session notes fire**: Previous session left work in-flight (uncommitted changes across repos). Session notes told the agent exactly where to resume. Without notes: 20-30 minutes of re-reading commits and logs.

**Hard cap**: 50 lines. Overflow means the content belongs in `todos/active/` or `journal/`.

## Layer 2: Path-Scoped Rules

### Loading Model (Verified Empirically)

| Frontmatter   | When loads                       | Token cost                       |
| ------------- | -------------------------------- | -------------------------------- |
| No `paths:`   | Session start, every session     | Full cost in baseline every turn |
| With `paths:` | Once on first matching file read | One-time cost, only if relevant  |

**Critical findings from empirical testing (atelier journal 0007):**

- Paths-scoped rules are ABSENT from session-start prompt (Δ ≈ 0 tokens)
- No-paths rules add their full size to baseline (Δ +5482 tokens for 12 rules)
- No per-call accumulation (5 same-file reads ≈ 5 different-file reads)
- Wide patterns (`**/*.py`) are fine — one-time cost, not per-call

**Practical ceiling**: 25-30 path-scoped rules with 8-10 in active context at any time. The rest are dormant until triggered.

### When to Path-Scope vs Always-Load

| Always-load (no `paths:`) | Path-scope                                                            |
| ------------------------- | --------------------------------------------------------------------- |
| communication.md          | cc-artifacts.md (`**/.claude/agents/**`, `**/.claude/rules/**`, etc.) |
| git.md                    | execution-discipline.md (`**/workspaces/**`)                          |
| independence.md           | journal.md (`**/journal/**`, `**/workspaces/**/journal/**`)           |
| terrene-naming.md         | artifact-flow.md (`**/.claude/**`)                                    |
|                           | domain-independence.md (`**/.claude/**`, `**/co-template/**`)         |

**Test**: Does the rule apply to every session regardless of what files are touched? If yes, always-load. If no, path-scope.

## Layer 3: Tool-Scoped (Specialist Delegation)

### When Specialists Fire

Specialists fire for **focused domain work** within one area: "validate this CO methodology claim," "audit this CC artifact for quality," "check this content for naming compliance."

Specialists do NOT fire for **cross-cutting operations**: sync, status checks, session management, multi-domain coordination. In maintenance-heavy sessions, zero specialist delegations may occur — all work is orchestration.

**Implication**: Don't over-invest in specialist routing for orchestration-heavy projects. Invest in Layer 1 (rules + memory + CLAUDE.md) first. Specialists are insurance for deep domain work, not the primary quality mechanism.

### Context Isolation

The critical second-order effect of specialists (and background agents generally): **the parent's context stays clean.** A background agent can explore extensive reference material, run audits, check compliance — and the parent only sees the 200-500 word final report.

This is what makes high-throughput autonomous execution achievable:

- Parent thread: narrow context, fast decisions, user-facing
- Background agents: deep context, thorough exploration, invisible to parent
- Result: parallel depth without context pollution

## Layer 4: Gate-Scoped (Phase Boundary Reviews)

### The Gap

Sessions have been observed where multiple commits shipped without a single review agent running. Gate reviews phrased as "recommended" were skipped under time pressure — consistently, not occasionally.

### The Fix

Upgrade specific gates from "recommended" to MUST, and make reviews cheap by running them as background agents:

| Gate               | After phase | Reviewers                                        | Mode                 |
| ------------------ | ----------- | ------------------------------------------------ | -------------------- |
| Execution done     | `/execute`  | claude-code-architect + intermediate-reviewer    | **MUST, background** |
| Before delivery    | `/deliver`  | claude-code-architect + gold-standards-validator | **MUST, blocking**   |
| Analysis complete  | `/analyze`  | intermediate-reviewer                            | RECOMMENDED          |
| Review passed      | `/vet`      | co-expert                                        | RECOMMENDED          |
| Knowledge captured | `/codify`   | gold-standards-validator                         | RECOMMENDED          |

**Background reviews cost nearly zero parent context.** The review agent reads the diff, produces findings, and the parent sees a 10-line verdict. The review itself (potentially 50K tokens of analysis) never touches the parent's context.

## The Throughput Multiplier

High-throughput sessions achieve 5-8x throughput vs the agent's "no-artifacts" baseline. The mechanisms, mapped to layers:

| Layer             | Mechanism                                     | Multiplier contribution                  |
| ----------------- | --------------------------------------------- | ---------------------------------------- |
| 1 (session-start) | Zero-tolerance rules blocked deferral         | Workstreams saved from "come back later" |
| 1 (session-start) | Auto-memory eliminated re-stating preferences | ~10 turns of friction saved              |
| 1 (session-start) | Session notes eliminated re-discovery         | ~20 minutes saved at session start       |
| 2 (path-scoped)   | Domain rules caught quality regressions       | Findings that would have been missed     |
| 2 (path-scoped)   | Artifact rules enforced quality standards     | Consistent output quality                |
| 3 (tool-scoped)   | Background agents ran workstreams in parallel | 3-5x throughput from parallelism         |
| 3 (tool-scoped)   | Context isolation kept parent thread clean    | Enabled sustained decision-making        |
| —                 | Rich commit bodies                            | Months of future review time saved       |

**Net**: Nothing fell on the floor. No deferred work, no missed quality check, no forgotten review, no "I'll come back to that."

## Ablation Table

What breaks if each layer mechanism is removed:

| Removed                        | What breaks                                                          | Cost                       |
| ------------------------------ | -------------------------------------------------------------------- | -------------------------- |
| Zero-tolerance rules (Layer 1) | Pre-existing issues deferred forever, quality regressions accumulate | Multi-session debt         |
| Domain rules (Layer 2)         | Artifact quality drift, inconsistent patterns                        | Steady quality decline     |
| Autonomous execution (Layer 1) | Background workstreams run serially over multiple sessions           | Hours of wall-clock slip   |
| CLAUDE.md directives (Layer 1) | Domain-specific assumptions leak in, patterns misused                | Steady contamination       |
| Path-scoped loading (Layer 2)  | Either all 25 rules in baseline (crowding) or none (drift)           | Unusable rule system       |
| Auto-memory (Layer 1)          | User restates preferences every session                              | +10 turns friction/session |
| Session notes (Layer 1)        | First 20 minutes wasted re-discovering state                         | 20-minute slip/session     |
| Background agents (Layer 3)    | Serial execution, 1 workstream per session                           | 3-5x throughput loss       |

## Replication Protocol

To replicate a sharp session in a new project:

1. **CLAUDE.md**: Write 3-6 absolute directives. Keep them prohibition + imperative.
2. **Rules**: Start with universal rules (communication, git, independence). Path-scope domain-specific rules.
3. **Memory**: Seed 3-5 user preference memories and 2-3 project fact memories.
4. **/wrapup**: Run at every session end. Hard cap 50 lines.
5. **Workspace structure**: `workspaces/{project}/` with numbered phase directories.
6. **Background agents**: Use `Agent({run_in_background: true})` for independent workstreams.
7. **Test**: Remove a key rule, run the same workstreams, measure whether "nothing fell on the floor" survives. Prediction: it won't.
