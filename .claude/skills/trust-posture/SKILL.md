---
name: trust-posture
description: "Graduated-trust posture system (L1-L5). Use for posture state, grace-period mechanics, rule-authoring trust wiring, and codify/vet integration."
allowed-tools:
  - Read
  - Glob
  - Grep
---

# Trust Posture — Implementation Skill

The graduated-trust posture system gives the agent an earned, machine-tracked autonomy level (L1-L5). The level drops automatically when violations are confirmed and only a human may raise it. The enforcement engine is LIVE (GH #16, landed — `rules/trust-posture.md` § Enforcement Status): lexical detector hits record at advisory `severity: "warn"` and never move posture by themselves; probe-CONFIRMED verdicts (recorded at `/cc-audit` step 15 via the engine CLI) count toward the cumulative downgrade thresholds; grace regressions and emergency classes drop instantly; `session-start.js` injects the posture/grace banner and prunes the mirror. The state lives in `.claude/learning/posture.json` and `.claude/learning/violations.jsonl` — protected by `permissions.deny` in `settings.json` (Edit/Write/MultiEdit) and by `validate-bash-command.js`'s state-write deny (Bash), so the agent cannot hand-edit its own trust state. **The engine (`lib/posture.js`, invoked by hooks or via its gate CLI) is the sole posture-state WRITER.** (Reads are not exclusive — `/vet` and the agent read `posture.json` via `lib/posture.js` to know the ceiling.) `session-end.js` and `stop.js` write checkpoint and `.session-notes` files, not `posture.json`. This skill is the **how** — what `/codify`, `/vet`, and rule authors do to wire a rule into the graduated-trust loop.

## When To Use This Skill

- Authoring a new rule (anywhere in `/codify`) — to attach its Trust Posture Wiring section.
- Designing audit depth at `/vet` — depth scales with the current posture.
- Interpreting gate behavior — why a session is read-only, why a banner fired, why the posture dropped.
- Reading or recommending a posture change.
- Reviewing whether a violation pattern should trigger automatic downgrade.

If your task is none of the above, this skill is not for you.

## The Five Levels

Posture is a single level `L1`-`L5` in `posture.json`. **Default is `L3`** for a repo with no earned history. Levels are domain-agnostic: the autonomy each grants applies to research, governance, education, finance, or any CO workflow — see `posture-spec.md` for the full autonomy-per-level table.

| Level | Name          | Autonomy posture (summary)                                              |
| ----- | ------------- | ----------------------------------------------------------------------- |
| L5    | Delegated     | Full autonomy; confirm only cross-repo writes + destructive ops         |
| L4    | Trusted       | L5 plus mandatory per-shard journaling and a `/vet` round before merge  |
| L3    | Collaborative | One shard at a time; plan approval per shard; no unprompted publishing  |
| L2    | Supervised    | Read-only by default; each mutation needs an instruction the prior turn |
| L1    | Observed      | Propose-only; zero working-tree mutation; the human runs everything     |

Detail on what each level permits, and how the level is read from `posture.json`, is in `posture-spec.md`.

## The Five-Question Rule-Authoring Checklist

> **Read first.** The engine behind this checklist is LIVE (GH #16, landed): violation recording, the grace lifecycle (`node .claude/hooks/lib/posture.js grace ...` at `/codify`), `regression_within_grace` → instant one-level drop, probe-confirmed cumulative downgrade, the `session-start.js` posture/grace banner, and the state-file write blocks. Two checklist items remain AUTHORING decisions without a mechanical enforcer — the `[ack: <rule_id>]` receipt token and `post-mortem` (stop-scan) detection were deliberately excluded from the GH #16 engine build (issue re-scope trail, 2026-06-10); wiring either mechanically requires a new `/codify` proposal.

Every rule authored by `/codify` MUST answer these in a "Trust Posture Wiring" section. See `rule-authoring-checklist.md` for the canonical format and field reference.

1. **Severity** — `block` / `halt-and-report` / `advisory` / `post-mortem`. Use `block` only when the action MUST be physically prevented (a destructive op caught before it runs). Use `halt-and-report` when the action already happened and the agent must surface and wait. Use `advisory` for soft warnings. Use `post-mortem` for end-of-session detections (forensic only; surfaces next session via `session-start.js`).
2. **Grace period** — `0` days (teeth-from-day-one), `7` days (standard for newly codified rules), `30` days (large surface change needing migration time). During grace the engine holds a `grace` entry (registered via the posture CLI at `/codify`); the session-start banner lists it; a matching detector hit records `regression_within_grace` → instant one-level drop.
3. **Receipt requirement** — does the rule warrant a `[ack: <rule_id>]` token in the first response of every new session? Reserve for high-stakes rules where evidence shows the agent ignores the session-start banner.
4. **Cumulative threshold** — default `3×` same-rule in 30 days = 1 posture downgrade; PLUS `5×` total across all rules in 30 days = 1 downgrade (the all-types cumulative path, matching `rules/trust-posture.md` MUST §2). Override only if the failure mode is so severe that `1×` should emergency-downgrade (e.g. a destructive op without confirmation, a secret leak).
5. **Detection mechanism** — lexical (regex on text), structural (a non-semantic shape check), behavioral (cross-reference of state), or human-only. Lexical alone is `advisory`/`post-mortem`. Automatic downgrade requires a structural or behavioral signal, never a lexical guess.

These five **decisions** populate the **eight required wiring fields** the `/codify` gate validates: the five above PLUS **Regression-within-grace policy**, **Originating violation**, and **Evidence date** (required in addition). See `rule-authoring-checklist.md` for the canonical 8-field format — a "Trust Posture Wiring" section missing any field is rejected at the gate.

## Severity Decision Matrix

The hook substrate fires at a small set of events. Severity is a function of WHEN the agnostic detector in `detect-violations.js` can catch the action.

| If the action is…                                   | Detected at…            | Severity                         |
| --------------------------------------------------- | ----------------------- | -------------------------------- |
| Destructive + caught before it runs                 | pre-tool (PreToolUse)   | `block`                          |
| Already executed; policy violated, artifact on disk | post-tool (PostToolUse) | `halt-and-report`                |
| Soft warning; work may continue                     | pre/post-tool           | `advisory`                       |
| Detected only in the agent's final message          | session stop            | `post-mortem`                    |
| A user regression signal in the prompt              | prompt submit           | context injection (no log entry) |

`detect-violations.js` runs **agnostic detectors only** (structural and behavioral shape checks from `lib/violation-patterns.js`) — never semantic regex that tries to understand meaning, per `rules/cc-enforcement.md` MUST NOT §1.

## What This Skill Does NOT Do

- It does NOT define the posture ladder's enforcement contract — that lives in the trust-posture rule and the hook substrate.
- It does NOT define the CO methodology (8 principles, 5 layers, 6 phases) — that is `skills/co-reference/`.
- It does NOT implement the hooks — those are `.claude/hooks/detect-violations.js` plus `lib/posture.js` and `lib/violation-patterns.js`.
- It does NOT author the `permissions.deny` entries that protect the state files — that is the settings layer (the `settings-manager` agent).

## Sub-File Index

- **[posture-spec.md](posture-spec.md)** — data shapes for `posture.json` (level, since, violations[]) and `violations.jsonl`; the autonomy-per-level table; file-system layout and `permissions.deny` protection.
- **[grace-period-mechanics.md](grace-period-mechanics.md)** — the `grace[]` window lifecycle, regression-within-grace, graduation, multi-rule coordination.
- **[rule-authoring-checklist.md](rule-authoring-checklist.md)** — the canonical "Trust Posture Wiring" section format a codified rule carries, with a field reference and a worked example.
- **[codify-integration.md](codify-integration.md)** — what `/codify` reads, writes, and emits to wire a new rule into the trust loop.
- **[vet-integration.md](vet-integration.md)** — how `/vet` audit DEPTH scales with the current posture (lighter touch per round at high trust; deeper per round at low trust), while convergence stays invariant.

Origin: inbound sync from atelier (item-7 hook-cluster propagation, GH #15) — adapts loom's 32-trust-posture skill family, rewired to atelier's hook substrate (`detect-violations.js`, `lib/posture.js`) and CO v1.2 phase commands (`/codify`, `/vet`).
