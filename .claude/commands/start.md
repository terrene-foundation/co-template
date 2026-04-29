---
name: start
description: "New session orientation. Explains atelier's role, the 6-phase workflow, and how to begin a project."
---

# /start

Present this orientation in a warm, clear way. Adapt tone — if the user seems new, take more time; if they're experienced, be concise.

## What is atelier?

Atelier is the **CO + CC methodology authority**. It's where the canonical patterns for Cognitive Orchestration and Claude Code artifacts are designed, reviewed, and shipped to downstream consumers (loom for codegen, lyceum for education, terrene for governance and research, plus all the co-\* domain repos).

Atelier is NOT a codegen shop. It produces methodology — agents, skills, rules, commands, hooks — that other repos consume.

## What you do here

You direct the AI to do CO methodology work. That work follows 6 phases:

| #   | Phase   | Command    | What happens                                                                |
| --- | ------- | ---------- | --------------------------------------------------------------------------- |
| 1   | Analyze | `/analyze` | Research the problem space. Surface findings and gaps. No decisions yet.    |
| 2   | Plan    | `/plan`    | Decompose findings into approved tasks. **STOPS for your approval.**        |
| 3   | Execute | `/execute` | Draft artifacts one task at a time, with verification.                      |
| 4   | Vet     | `/vet`     | Spec coverage + adversarial review. Promotes drafts to canonical artifacts. |
| 5   | Codify  | `/codify`  | Extract reusable patterns into atelier's own .claude/ for future runs.      |
| 6   | Deliver | `/deliver` | Package the work and identify which downstream syncs are needed.            |

Plus cross-cutting commands you'll use along the way:

- `/ws` — workspace status dashboard
- `/journal` — knowledge trail (decisions, discoveries, risks)
- `/wrapup` — save session notes before ending
- `/cc-audit` — audit CC+CO artifacts for quality
- `/sync`, `/sync-to-coc` — push artifacts downstream

## Getting started

### If you have an idea but no workspace yet

1. Create a workspace from the template:

   ```bash
   cp -r workspaces/_template workspaces/<your-project>
   ```

2. Edit `workspaces/<your-project>/brief.md` — describe what you want to do, in your own words. Include why it matters and what success looks like. The brief is the user's input surface.

3. Run `/analyze` — this kicks off the research phase.

### If you already have a workspace

Run `/ws` to see current status, or jump straight to the next phase command if you know where you left off.

## Tips for working with atelier

- **You don't need to write rules yourself.** Describe what you want; the AI proposes the artifacts and you approve.
- **The plan gate is the only mandatory stop.** Phases 1, 3, 4, 5, 6 run autonomously between gates. Phase 2 (`/plan`) MUST stop for your approval.
- **The journal is the memory.** Every session should produce journal entries — DECISION, DISCOVERY, TRADE-OFF, RISK, CONNECTION, GAP. This is how knowledge compounds across sessions.
- **Atelier is the source.** Changes here propagate downstream via `/sync` and `/sync-to-coc`. Take care — what you ship from atelier becomes the canonical reference for every domain that consumes it.
- **Domain neutrality matters.** Atelier methodology MUST work for codegen, research, finance, education, governance, and any future domain. Per `rules/domain-independence.md`, no domain-specific assumptions in CC/CO artifacts.

## Where to learn more

- `CLAUDE.md` — atelier's identity and absolute directives
- `.claude/skills/co-reference/` — CO methodology reference (8 principles, 5 layers, 6 phases)
- `.claude/skills/cc-artifact-patterns/` — CC artifact quality reference
- `.claude/skills/atelier-broker-model/` — atelier's role in the ecosystem
- `.claude/rules/` — the enforced rules (artifact-flow, cc-artifacts, communication, domain-independence, execution-discipline, git, independence, journal, no-stubs, rule-authoring, specs-authority, terrene-naming)

Start with `/ws` to see current state, then `/analyze` if you have a brief ready.
