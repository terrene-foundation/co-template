---
paths:
  - "workspaces/**"
  - ".claude/agents/**"
  - ".claude/commands/**"
  - "**/02-plan/**"
  - "**/03-execute/**"
  - "**/04-vet/**"
---

# Delegation & Orchestration Rules

Origin: inbound sync from loom 2026-06-05 — lifts the agent-orchestration core from loom rules/agents.md, adapted for atelier (specialist roster, framework-first binding, and per-CLI call syntax stripped; phase names remapped to CO v1.2). Split out of `rules/execution-discipline.md` to keep both rules under the 200-line cap; execution-discipline governs spec-fidelity during execute/review, this rule governs how work is decomposed and delegated.

## Scope

These rules apply whenever an orchestrator decomposes work across subagents — during `/analyze`, `/execute`, `/vet`, and any phase that dispatches specialists. They sit beside `rules/execution-discipline.md` (spec coverage, context anchoring, gate-level reviews) and `rules/subagent-delegation-verification.md` (the full post-exit verification protocol).

## MUST Rules

### 1. Decompose Onto Parallel Delegation By Default When the Work Earns It

When the work surface is **≥3 independent items** OR has an **analyze → execute → verify shape**, the orchestrator MUST decompose onto the parallel delegation primitive by DEFAULT — not only when explicitly told to parallelize. The trigger is a real gate: a genuinely serial single-item task MUST stay serial.

```markdown
# DO — 3 independent deliverables → one parallel wave

Three source documents to summarize, no dependency between them:
Agent({subagent_type: "analyst", run_in_background: true, prompt: "Summarize source 1..."})
Agent({subagent_type: "analyst", run_in_background: true, prompt: "Summarize source 2..."})
Agent({subagent_type: "analyst", run_in_background: true, prompt: "Summarize source 3..."})

# DO NOT — one serial rewrite forced into a parallel wave, or 3 independent items run one-at-a-time

A single document that must be revised section-by-section in order → stays serial.
Three independent documents summarized sequentially → wastes the delegation multiplier.
```

**BLOCKED responses:**

- "Parallel decomposition needs an explicit autonomy signal first"
- "Serial is simpler, I'll decompose later"
- "The ≥3-item trigger is my judgment call each session"

**Why**: Parallel decomposition is the baseline throughput response, not a per-session opt-in — running independent items sequentially turns a one-pass task into a multi-pass bottleneck. The serial-single-item gate is equally load-bearing: it prevents over-decomposing genuinely sequential work into coordination overhead that costs more than it saves.

### 2. Parallel Brief-Claim Verification on Multi-Issue Briefs

When `/analyze` runs against a brief covering **≥3 distinct issues, failure modes, or workstreams**, the orchestrator MUST launch parallel verification agents — one per claim cluster — that independently re-read every factual claim the brief cites. Corrections MUST be recorded (in the workspace journal and the plan's "Brief corrections" section) BEFORE `/plan`. Single-agent analysis on a ≥3-issue brief is BLOCKED.

```markdown
# DO — one verifier per claim cluster, run concurrently, reconcile before planning

Agent({subagent_type: "analyst", run_in_background: true, prompt: "Verify brief claim cluster #1. Re-read every cited source; report TRUE / FALSE / UNCLEAR with citations."})
Agent({subagent_type: "analyst", run_in_background: true, prompt: "Verify brief claim cluster #2..."})

# Reconcile; record corrections in journal + plan BEFORE /plan.

# DO NOT — single agent inherits the brief's framing and carries its errors into the plan

Agent({subagent_type: "analyst", prompt: "Analyze the brief and produce the plan."})
```

**BLOCKED responses:**

- "The brief came from the user, so it must be accurate"
- "Sequential single-agent analysis catches inaccuracies anyway"
- "Three parallel verifiers triple the cost for the same conclusion"
- "I'll spot-check a couple of claims, that's good enough"
- "Brief verification is /vet's job, not /analyze's"

**Why**: A brief reflects its author's mental model, which decays as the underlying material evolves; a ≥3-issue brief carries ≥3× the surface area for stale or misframed claims. A single agent cannot resist the brief's framing without independent reading — parallel per-cluster verification is the structural defense, and recording corrections before planning stops a misframed root cause from propagating into every downstream task.

### 3. Gate-Level Reviewer Prompts Include a Mechanical Sweep

Every gate-level reviewer prompt MUST include an explicit mechanical sweep (grep/count/collect) that verifies the **absolute state** of the artifact set, not only the diff. Judgment-based review catches what is wrong in new content; mechanical sweeps catch what is missing from the old content the change also touched.

```markdown
# DO — reviewer prompt enumerates mechanical sweeps before judgment

Agent({subagent_type: "intermediate-reviewer", prompt: "Mechanical sweeps (run BEFORE judgment):

1. Grep the whole corpus for references to the renamed section — count must be 0 outside the new file.
2. Every cross-reference added by this change resolves to a file that exists on disk.
   Then apply judgment review."})

# DO NOT — reviewer prompt scoped only to the diff

Agent({subagent_type: "intermediate-reviewer", prompt: "Review the changes since the last gate."})
```

**BLOCKED responses:**

- "The reviewer is smart enough to spot orphans"
- "Mechanical sweeps are /vet's job"
- "Adding sweeps is repetitive"

**Why**: A reviewer reading only the diff is blind to anything the change should have updated but didn't — a stale reference or orphaned section left in untouched files is invisible at diff level. A four-second `grep -c` over the absolute corpus catches what minutes of judgment review misses.

### 4. Verify a Delegate's Tool Inventory Before Assigning the Work

Before delegating, the orchestrator MUST confirm the chosen agent's declared tool set matches the work. Agents assigned to MODIFY artifacts (file edits, writes, command invocation) MUST have the editing and command tools; read-only review or research agents MUST NOT be assigned modification work.

```markdown
# DO — match the work to the agent's declared tools

Modification task (edit the rule, run the audit) → an agent whose tools include Edit and Bash.
Read-only audit task (find violations, report) → a review/research agent (Read, Grep, Glob).

# DO NOT — assign modification work to a read-only agent

Agent({subagent_type: "intermediate-reviewer", prompt: "Now edit the rule to fix the violations you found."})
```

**BLOCKED responses:**

- "The review agent owns this domain, so the edits go there too"
- "The agent will figure out its own tool limitations"
- "I'll re-launch with a different agent if it stalls"

**Why**: A read-only agent halts at the first modification boundary — it narrates the intended edit, then exits with no change made because the editing tool is unavailable, and the work silently does not happen. Checking the tool inventory before launch is a one-time cost; re-launching after a mid-task halt repeats the entire delegation.

### 5. Verify a Subagent's Deliverables Exist After It Exits

After a delegated agent reports a file-producing task done, the parent MUST confirm the claimed deliverables exist (list or read them) before treating the work as landed and proceeding. See `rules/subagent-delegation-verification.md` for the full post-exit verification protocol.

```markdown
# DO — confirm the deliverable before building on it

Subagent reports "summary written to 03-execute/summary.md."
Parent lists/reads 03-execute/summary.md, confirms it exists and is non-empty, then continues.

# DO NOT — trust the report and proceed

Subagent reports done → parent immediately starts the next phase against a file that may be empty or absent.
```

**Why**: A subagent can report success while its final write was truncated or never reached disk — budget exhaustion cuts off the write mid-message. Verifying existence before proceeding is the cheapest defense against building the next step on a deliverable that is not there.
