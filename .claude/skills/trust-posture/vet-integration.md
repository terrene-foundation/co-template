# /vet Integration — Posture-Scaled Audit Depth

`/vet` audit **depth** scales with the current posture: higher trust means a lighter touch PER ROUND; lower trust means deeper checks per round. **Convergence is NOT posture-scaled** — every `/vet` at L2–L5 runs to **2 consecutive clean rounds** (per the `/vet` command's convergence criteria). Posture sets how deep each round digs; it never changes whether convergence is reached.

`session-start.js` injects the current level into context at session start (the `[TRUST-POSTURE]` banner — live since the GH #16 engine landed), and a mid-session read is one command away (`node .claude/hooks/lib/posture.js status`). **The depth SCALING itself is not mechanical:** `commands/vet.md` contains no posture-read step — depth scaling was deliberately excluded from the GH #16 engine build (issue re-scope trail, 2026-06-10), so the depth floor is the agent's BEHAVIORAL obligation, honored by orchestrator discipline + the `/vet` reviewer team. Wiring an automatic posture-read step into `commands/vet.md` (and the explicit override at the bottom of this file) requires a new `/codify` proposal.

## Audit depth by posture

Depth is **cumulative down the ladder** — each lower level's per-round floor includes every higher level's. The convergence target is **invariant** at L2–L5.

| Posture          | Per-round audit DEPTH floor (cumulative)                                                      | Convergence target             |
| ---------------- | --------------------------------------------------------------------------------------------- | ------------------------------ |
| L5 Delegated     | Mechanical sweeps (grep/count parity, cross-reference resolution, marker scrub, fixture exec) | **2 consecutive clean rounds** |
| L4 Trusted       | **+ closure-parity** verification of every prior-round finding                                | **2 consecutive clean rounds** |
| L3 Collaborative | **+ spec-compliance** audit (literal assertions verified against `specs/`)                    | **2 consecutive clean rounds** |
| L2 Supervised    | **+ full spec-compliance** sweep against every rule in an active grace window                 | **2 consecutive clean rounds** |
| L1 Observed      | **N/A** — no autonomous execution to audit; `/vet` at L1 is advisory simulation only          | N/A (no convergence loop)      |

The depth sections below name the depth RUNGS, not a per-round count. At L5 every round applies at least the Mechanical-Sweeps rung and the loop runs until two rounds are clean; at L2 every round applies all rungs. **Under-applying the posture's depth floor** (e.g. skipping closure-parity at L4) OR **stopping before 2 consecutive clean rounds** at L2–L5 is a violation of the `/vet`-depth contract. That contract is the agent's BEHAVIORAL obligation — honored by the orchestrator and checked by the gate reviewers, NOT by a mechanical detector. No `/vet`-depth detector exists in `detect-violations.js` (deliberately excluded from the GH #16 engine scope); adding one is a `/codify` proposal. A depth-floor under-audit recorded at a gate and probe-confirmed counts toward the live engine's cumulative thresholds like any other confirmed violation.

The asymmetry is deliberate: a low-trust posture is the system's signal that recent output was unreliable, so each round digs harder to catch what slipped — but the bar for "done" (two clean rounds) is the same evidence standard at every level. Scaling convergence too would let a high-trust posture declare victory on a single clean round, which is exactly the over-confidence a graduated-trust system exists to prevent.

## Mechanical sweeps (the L5 floor, applied at every level)

The lightest rung, run on every round at every active posture:

- `grep -c` parity on critical patterns the change touched — counts match expectation.
- Every cross-reference added by the change resolves to a file that exists on disk.
- No placeholder/stub markers remain in canonical artifacts (per `rules/no-stubs.md`).
- For a contract that documents more than one canonical form, every documented form has at least one green fixture under `.claude/audit-fixtures/` — a documented-but-unfixtured form is a HIGH finding regardless of "the existing fixtures pass."
- Grep `violations.jsonl` for entries from the current session that carry no `adjudicated:` marker and that no rule has addressed.

## Closure-parity (added at L4 and below)

For every finding raised in a prior round, re-run the check that produced it and record the verdict with command-output evidence — convert each "forwarded" finding to "verified-closed" or "still-open." The specialist running this rung MUST be Bash + Read equipped (a read-only review agent cannot re-run the checks; see `rules/delegation-orchestration.md` on matching tools to work).

## Spec compliance (added at L3 and below)

For every promise in `specs/`, extract the literal assertions (a field name, a documented behavior, a success criterion) and verify the actual artifact against them. Less than full compliance blocks and feeds the gaps back to `/execute`. At L2 the sweep additionally covers every rule currently inside an active grace window — the rules in grace get the strictest spec-level scrutiny because they are the least-proven.

## Cross-round resolution discipline (applies at every posture)

Two `/vet` reviewers disagreeing on a high-severity finding (one flags, another says clean) MUST be resolved by **construction** — re-deriving the finding from the underlying contract, spec, or artifact and tracing the failure mode end-to-end — NEVER by averaging severities, taking the majority view, or running a third reviewer as a tiebreaker. Procedural tiebreakers preserve the disagreement as residue: the shipped verdict then corresponds to no actual state of the artifact. Construction forces the orchestrator back to the contract, which is the only falsifiable ground truth.

A companion discipline: when a heuristic or text-parsing check produces high-severity findings across three or more rounds on the SAME gate — including findings that are regressions-from-fix of prior rounds — treat the heuristic itself as the failure mode. The default disposition is to DELETE the heuristic and replace it with a structural contract that makes the failure class impossible, rather than tightening the heuristic for one more round.

## Self-referential carve-out

When a `/vet` round audits a `/codify` proposal that touches the trust system's own surface — the trust-posture rule, `lib/posture.js`, `detect-violations.js`, or this skill family — every round MUST dispatch the full reviewer team in parallel (`claude-code-architect` + `intermediate-reviewer`, plus `gold-standards-validator` where naming/licensing is in scope) REGARDLESS of posture, rather than the posture-reduced per-round depth above. Convergence (two consecutive clean rounds) is already invariant; this carve-out additionally raises the per-round depth to the full team on the self-referential surface, because a defect in the trust machinery corrupts every later posture decision.

## Posture-aware /vet invocation (design target — not wired)

In the DESIGNED model `/vet` reads `posture.json` automatically and an explicit override forces a stricter (lower) audit depth even when the posture is higher. `commands/vet.md` parses no `--posture` flag — this override was deliberately excluded from the GH #16 engine build and requires a new `/codify` proposal to wire:

```bash
/vet --posture L3   # forces L3 audit depth (adds spec-compliance) even if posture.json says L5
```

The override may only TIGHTEN, never loosen — a request to audit at a SHALLOWER depth than the current posture warrants is rejected, and an attempt to under-audit (skipping a depth-floor rung, or stopping before two consecutive clean rounds at L2–L5) breaches the `/vet`-depth contract. That breach is caught at the gate by the `/vet` reviewer team and the orchestrator's own discipline, NOT by a mechanical detector — no `/vet`-depth detector exists in `detect-violations.js` (excluded from the GH #16 engine scope; a new `/codify` proposal would add one).

Origin: adapts loom's redteam-integration sub-file to atelier's `/vet` phase command and hook substrate (`lib/posture.js`, `detect-violations.js`); the convergence-invariant and depth-cumulative model is preserved, the vendor and codegen specifics stripped.
