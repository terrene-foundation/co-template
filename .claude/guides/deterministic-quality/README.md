# Deterministic Quality — From Rules to Mechanisms

Quality that depends on someone (human or agent) reading and following a rule is **probabilistic**. Quality enforced by tooling, gates, or API design is **deterministic**. This guide documents both — how to author rules that actually work, how to structure sessions for maximum leverage, and how to systematically promote quality properties from rules into deterministic enforcement.

**Origin**: loom journal/0052-DISCOVERY-session-productivity-patterns.md, validated by subprocess A/B tests.

## The Core Discovery

A high-throughput session shipped 6 workstreams, 15 commits, 6 issues, and 2 deploys with **nothing falling on the floor**. The root cause was not raw model capability — it was artifact design. Specifically:

1. **Rules that target the agent's own wording** (linguistic tripwires) flip behavior deterministically.

2. **A meta-rule for rule authoring** changes output quality from 2/6 to 6/6 on the Loud/Linguistic/Layered criteria.

3. **Session architecture matters more than individual rules.** The 4-layer loading model is what makes 25+ rules feasible without context crowding.

4. **Rules and deterministic mechanisms compound.** A rule says WHY; a mechanism enforces HOW. Neither replaces the other.

## Guide Index

| File | What it covers |
| --- | --- |
| [01-rule-authoring-principles.md](01-rule-authoring-principles.md) | **"Loud, Linguistic, Layered"** — the meta-pattern for writing rules that actually change behavior. Includes subprocess test evidence, anti-patterns, and reproduction protocol. |
| [02-session-architecture.md](02-session-architecture.md) | **The 4-layer loading model** — how CLAUDE.md, path-scoped rules, specialists, and gate reviews compose into sessions where nothing falls on the floor. |
| [03-enforcement-ladder.md](03-enforcement-ladder.md) | **The promotion lifecycle** — how a quality property climbs from documentation (Rung 1) to deterministic enforcement (Rung 6). Includes case studies. |

## The Rule -> Mechanism Lifecycle

```
DISCOVERY -> RULE (Rung 2) -> fires 3+ times -> MECHANISM (Rung 4-6) -> rule stays as backstop
```

**The rule is never deleted.** It transitions from primary enforcement to backstop. This is why rules carry `Why:` lines — the Why survives if the mechanism is ever removed.

## Cross-References

- `rules/rule-authoring.md` — the meta-rule for authoring rules (Rung 2)
- `rules/cc-artifacts.md` — CC artifact quality rules (includes Clause 10: rules MUST follow meta-rule)
- `rules/execution-discipline.md` — gate-level review enforcement
- `rules/no-stubs.md` — zero-tolerance for placeholder content
