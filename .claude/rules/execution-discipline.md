---
paths:
  - "workspaces/**"
  - "**/specs/**"
---

# Execution Discipline Rules

## Scope

These rules apply during the **execute** and **review** phases of any CO workflow.

## MUST Rules

### 1. Spec Coverage Verification

During review, the reviewer MUST verify that each deliverable **fulfills** the specification that prompted it — not merely that a deliverable exists.

```
# DO:
Brief says "compare 3 pricing models with pros/cons."
Review checks: does the deliverable actually compare 3 models with pros/cons?

# DO NOT:
Brief says "compare 3 pricing models with pros/cons."
Review checks: does a file named "pricing-comparison.md" exist? (existence is not fulfillment)
```

**Why**: A deliverable can exist without covering what was specified. Review must read the source brief and verify point-by-point coverage, not just check that output was produced.

### 2. Context Anchoring Before Each Deliverable

Before starting work on each deliverable, the executing agent MUST re-read the source brief or requirements for that item.

```
# DO:
Plan has 5 deliverables. Before deliverable #3, re-read the brief section that specifies #3.

# DO NOT:
Plan has 5 deliverables. After finishing #2, start #3 from memory of what the brief said.
```

**Why**: Agents drift from specifications over long execution sequences. Re-reading the source material before each unit of work prevents accumulated deviation.

### 3. Draft/Integrate Split

Separate "draft the artifact" from "verify it integrates with the ecosystem." Do not treat both as a single step.

```
# DO:
Step A: Draft the deliverable (content is correct and complete).
Step B: Verify integration (cross-references resolve, dependencies exist, downstream consumers can use it).

# DO NOT:
Write the deliverable and call it done without checking that references, dependencies, and consumers are intact.
```

**Why**: A deliverable can be internally correct but break the ecosystem — dangling cross-references, missing dependencies, or formats that downstream consumers cannot parse. Splitting the steps ensures both content quality and integration quality are explicitly verified.

### 4. Gate-Level Reviews at Phase Boundaries

Reviews MUST run at specific phase boundaries, not per-edit. Phase boundary reviews use background agents for near-zero parent context cost.

| Gate | After Phase | Enforcement | Reviewers |
| --- | --- | --- | --- |
| Execution done | `/execute` | **MUST** | claude-code-architect + quality-reviewer (background) |
| Before delivery | `/deliver` | **MUST** | claude-code-architect + gold-standards-validator (blocking) |
| Analysis complete | `/analyze` | RECOMMENDED | quality-reviewer |
| Review passed | `/vet` | RECOMMENDED | domain-expert |
| Knowledge captured | `/codify` | RECOMMENDED | gold-standards-validator |

```markdown
# DO:
At end of /execute, spawn reviews as background agents:
Agent({subagent_type: "claude-code-architect", run_in_background: true, prompt: "Review all changes..."})
Agent({subagent_type: "quality-reviewer", run_in_background: true, prompt: "Quality audit..."})
# Parent continues; reviews arrive as notifications.

# DO NOT:
"Skipping review to save time"
"Reviews will happen in a follow-up session"
"The changes are straightforward, no review needed"
"Already reviewed informally during implementation"
```

**BLOCKED responses when skipping MUST gates:**
- "Skipping review to save time"
- "Reviews will happen in a follow-up session"
- "The changes are straightforward, no review needed"
- "Already reviewed informally during implementation"

**Why**: Reviews phrased as "recommended" were skipped 6/6 times under time pressure. Background agents make reviews nearly free — the review runs in a separate context and the parent sees only the verdict.

### 5. Specs Context in Delegation

Every specialist delegation prompt MUST include relevant spec file content from `specs/`. The orchestrator reads `specs/_index.md`, selects relevant files, and includes them inline. See `rules/specs-authority.md` MUST Rule 7 for the full protocol.

```markdown
# DO:

Agent(prompt: "Draft the user schema.\n\nFrom specs/data-model.md:\n[relevant section content]\n\nFrom specs/tenant-isolation.md:\n[relevant section content]")

# DO NOT:

Agent(prompt: "Draft the user schema.")
```

**BLOCKED responses:**

- "The specialist can read specs/ itself"
- "Specs context is optional for small delegations"
- "I remember the spec content from earlier"

**Why**: Specialists without domain context produce technically correct but intent-misaligned output. The delegation prompt is the specialist's only window into the project's domain truth. Origin: loom specs-authority system, failure mode FM-4 (agent delegation context loss).
