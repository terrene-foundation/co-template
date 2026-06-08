---
paths:
  - ".claude/agents/**"
  - ".claude/commands/**"
  - ".claude/skills/**"
  - "**/workspaces/**"
---

# Governed-Throughput Rules

Origin: inbound sync from loom 2026-06-05 — lifts the three-layer governed-parallelism model from loom rules/governed-throughput.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply whenever an orchestrator delegates work to parallel or orchestrated subagents — during `/analyze`, `/execute`, or `/vet` on any CO workflow, in any domain (research, governance, education, finance, codegen).

A parallel subagent runs LEAN by default: its delegation prompt carries the task and the tool/skill listing, NOT the repo's rule corpus. Subagents do NOT auto-inherit the rules the orchestrator operates under. The obligation to convey governance is the ORCHESTRATOR's. This is by design — lean prompts produce the highest-quality raw output, and over-injecting the full corpus measurably degrades it. The job is to add back ONLY the load-bearing invariants the orchestrator is accountable for, and to keep a full-context review at the merge as the quality backstop.

### The three layers

- **L1 — specialist agent type (OPTIONAL, insufficient alone).** Naming a specialist subagent type sets useful context but does NOT carry the rule corpus. Never the governance mechanism on its own.
- **L2 — curated rule-slice injection (LOAD-BEARING MUST, for compliance).** Inject the matching rules' load-bearing clauses, sliced and minimal. This is the compliance lever.
- **L3 — full-context merge gate (BACKSTOP MUST).** The existing review gate, run full-context. An invariant the minimal L2 slice DROPPED is precisely what L3 exists to catch; L2-minimal is safe ONLY because L3 is non-negotiable.

## MUST Rules

### 1. Governed-Path Shards Carry Curated, Minimal Rule-Slices (L2)

When the orchestrator delegates a parallel or orchestrated shard whose touched-file set matches a governed path (any path-scoped rule's `paths:` glob), the orchestrator MUST inject into that shard's delegation prompt the load-bearing MUST / MUST-NOT clauses of the matching rules — sliced to clauses ONLY (NO examples, NO Origin line, NO rationale paragraphs). Injecting the FULL rule corpus is BLOCKED. Injecting ZERO governance into a shard touching a governed path is BLOCKED.

```text
# DO — curated minimal slice (the 3-5 matching MUST clauses, clauses only)
delegation prompt:
  "...task...
   GOVERNANCE (honor these — you are accountable):
   - cc-artifacts MUST §5: command files stay under 150 lines.
   - domain-independence MUST §1: no domain-specific assumptions; works for any domain.
   - no-stubs MUST §1: no [TODO]/[TBD] placeholders in canonical artifacts."

# DO NOT — full corpus dump (over-injection degrades output)
delegation prompt: "...task...\n" + every_rule_file_concatenated

# DO NOT — zero governance on a governed path (shard bypasses your invariants)
delegation prompt: "...task..."
```

**BLOCKED responses:**

- "The subagent inherits the rules" (it does NOT — the delegation prompt is its only window)
- "Inject the whole corpus to be safe" (over-injection measurably degrades output)
- "The specialist agent type already knows the rules" (L1 alone is insufficient — the agent type carries no rule corpus)
- "Lean is fine, skip injection" (lean is fine for raw quality, but the shard then bypasses the invariants you are accountable for)

**Why:** A lean shard produces the most accurate raw output yet does NOT honor the specific invariants — domain-independence, no-stubs, cross-reference integrity — the orchestrator is accountable for. Curated slices steer the shard to those invariants WITHOUT the degradation a full-corpus dump causes. The slice is a compliance mechanism, not a quality lever.

### 2. The Slice Selector Is Deterministic, Reusing On-Disk Rule Scopes (L2)

The orchestrator MUST select slices via a deterministic path-glob, NOT a free-form judgment of "which rules feel relevant." Glob the shard's touched-file set against every rule's `paths:` frontmatter; the matching rules' MUST / MUST-NOT clauses ARE the curated slice. Read each rule's frontmatter from the committed state on disk, never a sibling shard's mid-edit working copy. Selecting slices by free-form relevance is BLOCKED.

```text
# DO — path-glob the shard's touched files against rules' paths: frontmatter
touched = [".claude/commands/sync.md"]  → matches cc-artifacts, domain-independence, no-stubs
inject the MUST clauses of those three rules    # deterministic, reproducible

# DO NOT — free-form relevance guess
inject "I think cc-artifacts and domain-independence are probably relevant"  # drifts per-run
```

**Why:** Deterministic path-glob is the same computation the runtime already runs to decide which path-scoped rules load per session — front-loaded into the delegation prompt rather than left to chance. Free-form relevance judgment drifts per orchestrator and silently drops the rule that mattered.

### 3. The Merge Gate Runs Full-Context, Not Slice-Limited (L3)

Before any governed shard's work merges into the deliverable, the existing merge-time review (the `/vet`-phase reviewer team) MUST run with FULL context — the complete applicable rule corpus plus the diff — NOT limited to what L2 injected. L3 is the quality and compliance backstop for L2's deliberate minimal slicing. Skipping the merge gate, OR limiting it to the injected slices, is BLOCKED.

```text
# DO — full-context reviewer at merge (the backstop for the minimal slice)
delegate to claude-code-architect: "Review the diff against the FULL rule corpus..."

# DO NOT — "the shard had its slices, skip the gate" / "review only vs the injected slices"
```

**Why:** L2 deliberately injects a MINIMAL slice because over-injection degrades generation; the full-context gate is what catches an invariant the slice did not cover. Lean generation plus a full-context gate beats injecting everything — so the governance that does not fit the minimal slice belongs at the gate, where it does not degrade the shard's output.

## MUST NOT Rules

### 1. No Treating L1 as a Substitute for L2

MUST NOT treat the specialist agent type (L1) as a substitute for L2 slice injection.

```text
# DO — name the specialist AND inject the curated slice
delegate to claude-code-architect with the matching MUST clauses appended  # L1 + L2

# DO NOT — name the specialist and skip the slice
delegate to claude-code-architect, no clauses injected  # L1 alone is not governance
```

**Why:** The specialist's system prompt does not carry the baseline rule corpus. Only curated slice injection moves the compliance needle; the agent type is useful context at best, never the mechanism.

### 2. No Full-Corpus Injection "To Be Safe"

MUST NOT inject the full rule corpus into a shard prompt to be safe.

```text
# DO — inject only the matching rules' clauses, sliced
prompt += the 3-5 MUST clauses the path-glob matched  # minimal, load-bearing

# DO NOT — concatenate every rule file "to be safe"
prompt += every_rule_file_concatenated  # crowds the task out of working memory
```

**Why:** Over-injection measurably degrades the shard's output — a dense, undifferentiated rule dump crowds the task out of working memory. Minimal curated slices are the only correct injection.

### 3. No Claiming "Governed" From Agent Type Alone

MUST NOT call a shard "governed" because its agent type is a specialist, with no slices injected and no full-context merge gate.

```text
# DO — "governed" = slices injected (L2) AND full-context merge gate ran (L3)
shard: specialist type + curated slice + full-context /vet at merge  → governed

# DO NOT — claim "governed" from the agent type alone
"It used claude-code-architect, so it's governed"  # no L2, no L3 — ungoverned
```

**Why:** "Governed" means the invariants were injected (L2) AND the merge gate ran full-context (L3). An agent type without either is ungoverned regardless of its name.

## Cross-References

- `rules/execution-discipline.md` MUST §5 — specs context in delegation (the companion principle this rule extends to governance clauses)
- `rules/cc-artifacts.md` — a frequent slice source for shards touching `.claude/` artifacts
- `rules/domain-independence.md`, `rules/no-stubs.md` — load-bearing invariants commonly dropped by lean shards, caught at L3
