# Session Architecture — What Makes a Session "Sharp"

The layered loading model that produces high-throughput, zero-drop sessions. Distilled from first-hand observation of sessions that shipped multiple workstreams with nothing falling on the floor.

**Origin**: loom journal/0052-DISCOVERY-session-productivity-patterns.md §§1-2

## The Four Layers

A sharp session loads context in four layers, each catching what the previous missed:

```
Layer 1: SESSION-START (always loaded, every turn)
  ├── CLAUDE.md absolute directives (3-6 numbered rules)
  ├── Auto-memory index (MEMORY.md)
  ├── Session notes from previous session
  └── Universal rules (communication, git, domain-integrity)
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
  ├── Specialist agents (domain experts, quality reviewers)
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

**Canonical structure:**

```markdown
## Absolute Directives

### 1. [Domain] Integrity First

[Your most critical integrity rule — what must NEVER happen.]
See `rules/domain-integrity.md`.

### 2. Human Judgment Stays Visible

The AI assists with [what AI does]. The human makes the
[key decisions]. See `rules/communication.md`.

### 3. Create, Don't Note

Discover a gap → fix it. Never write "TODO" or "noted for future."

### 4. Quality Gates

Reviews at /execute and /deliver phase boundaries.
See `rules/execution-discipline.md`.
```

**Where directives fire**: A domain integrity directive prevents the agent from cutting corners on quality. Without it, the agent defaults to speed, skipping validation that your domain requires.

### Auto-Memory (MEMORY.md)

User preferences and project facts that persist across sessions. The index file is always loaded; individual memory files are read on demand.

**What belongs in memory:**

- User preferences that prevent friction
- Project state that prevents re-discovery
- External references (where things live outside the repo)

**What does NOT belong in memory:**

- Code patterns (derive from the code)
- Git history (use `git log`)
- Debugging solutions (the fix is in the code)
- Anything in CLAUDE.md (loads every turn anyway)

### Session Notes

State + intent from the previous session. NOT a recap of what was done (that's in git). The three things nothing else captures:

1. **Priority ordering** — which files to read first
2. **In-flight state** — what's true right now that isn't committed
3. **Traps** — pitfalls the next session will walk into

**Hard cap**: 50 lines. Overflow means the content belongs in `todos/active/` or `journal/`.

## Layer 2: Path-Scoped Rules

### Loading Model

| Frontmatter | When loads | Token cost |
| --- | --- | --- |
| No `paths:` | Session start, every session | Full cost in baseline every turn |
| With `paths:` | Once on first matching file read | One-time cost, only if relevant |

**Key findings:**

- Paths-scoped rules are ABSENT from session-start prompt (Δ ≈ 0 tokens)
- No-paths rules add their full size to baseline
- No per-call accumulation (5 same-file reads ≈ 5 different-file reads)
- Wide patterns (`**/*.py`) are fine — one-time cost, not per-call

**Practical ceiling**: 25-30 path-scoped rules with 8-10 in active context at any time.

### When to Path-Scope vs Always-Load

| Always-load (no `paths:`) | Path-scope |
| --- | --- |
| communication.md | cc-artifacts.md (`**/.claude/agents/**`, `**/.claude/rules/**`, etc.) |
| git.md | execution-discipline.md (`**/workspaces/**`) |
| domain-integrity.md | journal.md (`**/journal/**`) |
| | artifact-flow.md (`**/.claude/**`) |
| | no-stubs.md (`**/.claude/**`) |

**Test**: Does the rule apply to every session regardless of what files are touched? If yes, always-load. If no, path-scope.

## Layer 3: Tool-Scoped (Specialist Delegation)

### When Specialists Fire

Specialists fire for **focused domain work** within one area: "validate this claim," "audit this artifact for quality," "check this content for compliance."

Specialists do NOT fire for **cross-cutting operations**: sync, status checks, session management, multi-domain coordination.

**Implication**: Invest in Layer 1 (rules + memory + CLAUDE.md) first. Specialists are insurance for deep domain work, not the primary quality mechanism.

### Context Isolation

The critical second-order effect of specialists (and background agents generally): **the parent's context stays clean.** A background agent can explore extensive reference material, run audits, check compliance — and the parent only sees the 200-500 word final report.

- Parent thread: narrow context, fast decisions, user-facing
- Background agents: deep context, thorough exploration, invisible to parent
- Result: parallel depth without context pollution

## Layer 4: Gate-Scoped (Phase Boundary Reviews)

### The Gap

Sessions have been observed where multiple deliverables shipped without a single review agent running. Gate reviews phrased as "recommended" were skipped under time pressure — consistently, not occasionally.

### The Fix

Upgrade specific gates from "recommended" to MUST, and make reviews cheap by running them as background agents:

| Gate | After phase | Reviewers | Mode |
| --- | --- | --- | --- |
| Execution done | `/execute` | claude-code-architect + quality-reviewer | **MUST, background** |
| Before delivery | `/deliver` | claude-code-architect + gold-standards-validator | **MUST, blocking** |
| Analysis complete | `/analyze` | quality-reviewer | RECOMMENDED |
| Review passed | `/vet` | domain-expert | RECOMMENDED |
| Knowledge captured | `/codify` | gold-standards-validator | RECOMMENDED |

**Background reviews cost nearly zero parent context.** The review agent reads the changes, produces findings, and the parent sees a 10-line verdict.

## The Throughput Multiplier

High-throughput sessions achieve 5-8x throughput vs the agent's "no-artifacts" baseline:

| Layer | Mechanism | Multiplier contribution |
| --- | --- | --- |
| 1 (session-start) | Zero-tolerance rules blocked deferral | Workstreams saved from "come back later" |
| 1 (session-start) | Auto-memory eliminated re-stating preferences | ~10 turns of friction saved |
| 1 (session-start) | Session notes eliminated re-discovery | ~20 minutes saved at session start |
| 2 (path-scoped) | Domain rules caught quality regressions | Findings that would have been missed |
| 3 (tool-scoped) | Background agents ran workstreams in parallel | 3-5x throughput from parallelism |
| 3 (tool-scoped) | Context isolation kept parent thread clean | Enabled sustained decision-making |

## Ablation Table

What breaks if each layer mechanism is removed:

| Removed | What breaks | Cost |
| --- | --- | --- |
| Domain integrity rules (Layer 1) | Quality regressions accumulate, pre-existing issues deferred | Multi-session debt |
| Domain-specific rules (Layer 2) | Artifact quality drift, inconsistent patterns | Steady quality decline |
| CLAUDE.md directives (Layer 1) | Domain assumptions leak in, quality shortcuts taken | Steady contamination |
| Path-scoped loading (Layer 2) | Either all 25 rules in baseline (crowding) or none (drift) | Unusable rule system |
| Auto-memory (Layer 1) | User restates preferences every session | +10 turns friction/session |
| Session notes (Layer 1) | First 20 minutes wasted re-discovering state | 20-minute slip/session |
| Background agents (Layer 3) | Serial execution, 1 workstream per session | 3-5x throughput loss |

## Replication Protocol

To replicate a sharp session in a new project:

1. **CLAUDE.md**: Write 3-6 absolute directives. Keep them prohibition + imperative.
2. **Rules**: Start with universal rules (communication, git, domain-integrity). Path-scope domain-specific rules.
3. **Memory**: Seed 3-5 user preference memories and 2-3 project fact memories.
4. **/wrapup**: Run at every session end. Hard cap 50 lines.
5. **Workspace structure**: `workspaces/{project}/` with numbered phase directories.
6. **Background agents**: Use `Agent({run_in_background: true})` for independent workstreams.
7. **Test**: Remove a key rule, run the same workstreams, measure whether "nothing fell on the floor" survives.
