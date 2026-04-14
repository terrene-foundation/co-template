---
name: codify
description: "Phase 05. Extract knowledge from the project and codify into CO artifacts. The compounding loop."
argument-hint: "[project name]"
---

# /codify

Extract what was learned during this project and modify it into canonical practice — updating the CO system itself.

## Workspace Resolution

1. If `$ARGUMENTS` specifies a project name, use `workspaces/$ARGUMENTS/`
2. Otherwise, use the most recently modified directory (excluding `_template/`)
3. If no workspace exists, ask the user to create one first

## Protocol

### 1. Consume learning digest (if present)

If `.claude/learning/learning-digest.json` exists:

1. Read the digest — structured summary of corrections, error patterns, decisions, accomplishments, workflow patterns
2. Read `.claude/learning/learning-codified.json` — skip already-processed digests via `digest_hash` dedup
3. Read recent journal entries referenced in the digest's `decisions` array
4. Read `.session-notes`

Analyze for actionable findings:

- **Corrections** → rules or skills need updating to match user preferences?
- **Error patterns** → recurring violations need new rule sections with DO/DO NOT?
- **Decisions** → architectural decisions worth promoting to agent/skill knowledge?
- **Accomplishments** → completed work needing documentation?
- **Workflow patterns** → recurring sequences worth command refinement?

If the digest does not exist, proceed to step 2.

### 2. Review the full project trail

Read `journal/`, `specs/`, `04-vet/`, and `03-execute/`. Specs contain the nuanced decisions, contracts, and constraints that should inform agent and skill updates. Identify patterns worth keeping:

- Recurring decisions that could become rules
- Specialized tasks that could become agents
- Reference knowledge that could become skills
- Workflow improvements that could become updated commands

### 3. For each proposed codification, present:

- What it is (agent, skill, rule, or command)
- Why it matters (what problem it solves)
- Where it would go (specific `.claude/` path)
- Draft content

Write each proposal to `05-codify/proposals/NN-<slug>.md` with status frontmatter.

### 4. Human approves each proposal

**HARD GATE**: The system proposes. The human disposes. No pattern becomes institutional knowledge without explicit human approval. Present each proposal individually.

### 5. Apply approved codifications to `.claude/`

### 6. Track codification

Write `.claude/learning/learning-codified.json` recording what was analyzed and what actions were taken. This closes the feedback loop: observe → digest → codify.

## What /codify Produces

/codify's output goes into TWO places:

- **`05-codify/`** — the codification log + intermediate proposals (audit trail, resumable)
- **`.claude/`** — the actual codified artifacts (agents, skills, rules, commands)

```
.claude/
  agents/      <- new or refined specialists
  skills/      <- new or refined knowledge
  rules/       <- new or refined guardrails
  commands/    <- refined workflows
```

This is Principle 7 (Knowledge Compounds) made concrete. Next run, the system is stronger.

## Journal Entry

Record what was codified in `journal/`. Type: DECISION or CONNECTION.

## Next Step

After codification, recommend `/deliver` to package and hand off the finalized output.
