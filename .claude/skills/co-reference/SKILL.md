---
name: co-reference
description: CO (Cognitive Orchestration) methodology reference. Use for the 8 principles, 5 layers, 6 phases, or domain applications (COC, COR, COE, COG).
allowed-tools:
  - Read
  - Glob
  - Grep
---

# CO (Cognitive Orchestration) Methodology Reference

This skill provides the reference for CO — the domain-agnostic base methodology for structuring human-AI collaboration in any domain where AI agents operate under human oversight.

## Knowledge Sources

This skill is self-contained — all essential CO knowledge is distilled below from the CO Core Thesis by Dr. Jack Hong and the CO specification. If Foundation source docs exist in this repo, read them for additional depth.

## What is CO?

CO (Cognitive Orchestration) is a methodology for structuring institutional knowledge, guardrails, and processes so that AI agents produce trustworthy output in any domain. It is the base methodology from which domain-specific applications are derived.

CO sits in the trinity alongside CARE and EATP:

- **CARE** tells you _what the human is for_
- **EATP** tells you _how to keep the human accountable_
- **CO** tells you _how the human structures AI's work_

## The Eight First Principles

1. **Institutional Knowledge Thesis** — AI capability is commodity; institutional knowledge is the differentiator
2. **Brilliant New Hire Principle** — AI without context = most capable hire with zero onboarding
3. **Three Failure Modes** — Amnesia, Convention Drift, Safety Blindness
4. **Human-on-the-Loop Position** — Human defines/maintains context, not in/out of execution chain
5. **Deterministic Enforcement** — Critical rules enforced outside AI context, not probabilistically
6. **Bainbridge's Irony** — More automation requires deeper human understanding
7. **Knowledge Compounds** — Institutional knowledge accumulates across sessions
8. **Authentic Voice and Responsible Co-Authorship** — Output reflects genuine human intellectual direction; AI assistance disclosed per venue requirements; detection bias mitigated through style, not concealment

## The Five-Layer Architecture

```
Layer 5: LEARNING      — Observe, capture, evolve knowledge across sessions
Layer 4: INSTRUCTIONS  — Structured workflows with approval gates
Layer 3: GUARDRAILS    — Deterministic enforcement outside AI context
Layer 2: CONTEXT       — Organization's institutional knowledge, machine-readable
Layer 1: INTENT        — Route to domain-specialized agents
```

Each layer encodes a different aspect of human judgment:

- Layer 1 encodes organizational structure
- Layer 2 encodes institutional knowledge
- Layer 3 encodes risk tolerance
- Layer 4 encodes process maturity
- Layer 5 encodes everything above, compounding over time

## The Six-Phase Workflow Model (CO v1.2)

Layer 4 (Instructions) is implemented through a six-phase workflow:

| Phase | Name    | Canonical Command | Workspace Dir             | Purpose                                                                         |
| ----- | ------- | ----------------- | ------------------------- | ------------------------------------------------------------------------------- |
| 01    | Analyze | `/analyze`        | `01-analyze/`             | Research the problem space                                                      |
| 02    | Plan    | `/plan`           | `02-plan/`                | Structure the work; **human approves** (the structural gate)                    |
| 03    | Execute | `/execute`        | `03-execute/`             | Carry out the work one task at a time                                           |
| 04    | Review  | `/vet`            | `04-vet/` → `06-deliver/` | Spec coverage + adversarial critique; produces finalized output                 |
| 05    | Codify  | `/codify`         | `05-codify/` + `.claude/` | Modify validated patterns into canonical practice (per-proposal human approval) |
| 06    | Deliver | `/deliver`        | `06-deliver/` → recipient | Package and hand off the finalized output                                       |

**Phase 04 (Review)** produces the finalized work. The canonical command is `/vet` because Claude Code reserves `/review`. On convergence, vetted artifacts are promoted to wherever the domain's deliverable lives: in atelier (whose deliverable IS a `.claude/` artifact) `/vet` promotes them to canonical `.claude/`; in a domain whose deliverable is a document, they move to `06-deliver/`.

**Phase 05 (Codify)** is unique — it has TWO output targets. Its workspace dir `05-codify/` keeps the codification log and intermediate proposals (audit trail). Its canonical output target is `.claude/` artifacts (agents, skills, rules, commands). This is Principle 7 (Knowledge Compounds) made concrete. Every run makes the system stronger. Proposals require human approval before modifying `.claude/`.

**Phase 06 (Deliver)** packages and ships. Domain applications rename: `/publish` (COR), `/release` or `/deploy` (COC), `/submit` (student COs).

The workspace has 6 directories (01-06). Phase 05 (Codify) has both a workspace dir for the codification audit trail AND a canonical output target (`.claude/`).

Domains rename commands to fit their vocabulary but preserve the 6-phase structure. CO does not prescribe the exact number of commands per phase — domains may split phases or add specialist commands within phases.

## CO → Domain Applications

| Application       | Short Name | Status      |
| ----------------- | ---------- | ----------- |
| CO for Codegen    | COC        | Production  |
| CO for Research   | COR        | Production  |
| CO for Education  | COE        | Analysis    |
| CO for Governance | COG        | Production  |
| CO for Compliance | COComp     | Sketch      |
| CO for Learners   | COL        | Development |
| COL for Finance   | COL-F      | Production  |

COC is the first and most mature domain application. It proves CO's principles work in practice with 29 agents, 25 skills, 8 rules, 8 hooks, and 12 commands.

COL (CO for Learners) is the subject-agnostic student CO. Subject layers (COL-F for Finance, future COL-H, COL-B, COL-L) inherit COL and add subject-specific commands, agents, skills, and rules.

## CARE → CO Connection

CO inherits CARE's Human-on-the-Loop philosophy. The mapping:

| CARE Concept                           | CO Manifestation                         |
| -------------------------------------- | ---------------------------------------- |
| Trust Plane (humans define boundaries) | Layer 2 (Context) + Layer 3 (Guardrails) |
| Execution Plane (AI at machine speed)  | Layer 1 (Intent agents)                  |
| Constraint Envelopes                   | Layer 3 enforcement mechanisms           |
| Human-on-the-Loop                      | The Human-on-the-Loop practitioner role  |
| Evolutionary Trust                     | Layer 5 (Learning pipeline)              |

## CO → EATP Connection

CO's guardrails connect to EATP's trust infrastructure:

| CO Layer               | EATP Connection                                                     |
| ---------------------- | ------------------------------------------------------------------- |
| Layer 3 (Guardrails)   | Constraint Envelopes — formal boundaries enforced deterministically |
| Layer 4 (Instructions) | Trust Postures — approval gates map to verification gradient        |
| Layer 5 (Learning)     | Audit Anchors — learning observations become audit records          |

## Honest Limitations

- CO does not help with truly novel domains where no institutional knowledge exists yet
- CO does not solve the alignment problem (agents can still achieve prohibited outcomes through individually permitted actions)
- CO's three failure modes are current AI limitations, not permanent boundaries
- Effectiveness depends on the quality of institutional knowledge the human provides

## Quick Reference

```
CO = Cognitive Orchestration
  8 Principles: Institutional Knowledge, Brilliant New Hire, Three Failures,
                Human-on-the-Loop, Deterministic Enforcement, Bainbridge's Irony,
                Knowledge Compounds, Authentic Voice
  5 Layers: Intent → Context → Guardrails → Instructions → Learning
  6 Phases: Analyze → Plan → Execute → Review (vet) → Codify → Deliver
  3 Failure Modes: Amnesia, Convention Drift, Safety Blindness
  1 Insight: Institutional knowledge > Model capability
```

## For Detailed Information

If Foundation source docs exist in this repo, read the CO Core Thesis and CO specification for additional depth. For comprehensive analysis, invoke a CO-methodology specialist agent if your repo provides one (in atelier: the **co-expert** agent). For how to CONDUCT framework discussions — grounding answers in specs, distinguishing normative from ontological claims, the traceability-vs-accountability distinction — see `behavioral-guidelines.md`.
