# Closure-Parity Specialist Discipline

Procedural depth for the `rules/delegation-orchestration.md` MUST §4 clause "Verify a Delegate's Tool Inventory Before Assigning the Work" — extended from IMPLEMENTATION delegation to AUDIT / closure-parity-VERIFICATION delegation. The load-bearing MUST clause lives in the rule; this sub-file carries the BLOCKED-rationalization corpus, the delegation-time detection signals the orchestrator scans pre-launch, and the BLOCKED auto-promotion patterns.

## Why this lives in a skill (not the rule)

The MUST clause itself is load-bearing baseline content. The BLOCKED corpus, the signal enumeration, and the evidence are reference material the orchestrator needs available when it is about to delegate a `/vet` verification round — NOT on every session start. Per `rules/cc-artifacts.md` MUST NOT §1 (no knowledge dumps; extract reference to skills), depth goes here; the load-bearing tripwire stays in the rule.

## What closure parity means

A closure-parity round verifies that claimed findings map to delivered output: a `/vet` adversarial round forwarding "found X" rows and requiring the next round to convert each to "verified-fixed-in-output Y." Doing that conversion requires running commands against the delivered artifact — listing files, parsing structure, counting occurrences, diffing against a baseline — which a read-only inventory (Read / Grep / Glob) cannot do.

## BLOCKED Rationalizations (read-only analyst on closure-parity verification)

When the orchestrator considers assigning a read-only analyst (Read, Grep, Glob) to a closure-parity verification round, the following rationalizations MUST NOT be used as authority. Each has appeared as the cited justification for an audit round that then FORWARDED verification rows the next round had to redo:

- "The analyst is the audit specialist; closure parity IS audit"
- "The reviewer round can pick up the forwarded rows"
- "I'll instruct the analyst to skip rows it can't verify"
- "Read+Grep+Glob covers most verification"
- "The analyst can write a recommendation; verification can be done by the next reviewer"

## Delegation-Time Detection Signals (orchestrator self-check before launch)

Before delegating, the orchestrator MUST scan the prompt-being-drafted for closure-parity mission markers. Presence of ANY of the following obligates a Bash+Read specialist (general-purpose or a domain specialist with a full tool inventory) — selecting a read-only analyst with these markers present is BLOCKED:

- **Verification verbs**: "verify closure," "closure parity," "convert forwarded rows to verified," "map findings to delivered output," "confirm the fix landed"
- **Bash-required checks named in the mission**: list the artifact tree, parse/validate structure, count occurrences against an expected number, diff the delivered file against a baseline, confirm a referenced file exists
- **Closure-parity nouns**: "round-N closure parity," "post-merge verification," "wave-N → wave-N+1 audit," "`/vet` round-N convergence check"

The orchestrator MUST run this scan as a pre-flight before EVERY closure-parity-class delegation; surfacing the mismatch at delegation-time is O(1), while re-launching after the agent forwards rows is O(N) on row count and burns the round.

## BLOCKED Auto-Promotion Rationalizations

When the delegation-time scan surfaces a mismatch (closure-parity markers present + read-only analyst selected), the following auto-promotion rationalizations MUST NOT be used as authority to launch anyway:

- "I'll let the agent figure out it lacks the tool"
- "The analyst handles audit by name, the markers don't override"
- "Execution-time error is fine; the agent will surface it"
- "Skipping the scan saves the orchestrator one step"

## Why The Discipline Holds

Tool-inventory mismatch costs one full audit round; verifying pre-launch is O(1) while re-launch is O(N) on row count. The delegation-time scan converts the Bash+Read specialist mandate from a recall-it-yourself principle into a draft-time check the orchestrator runs every cycle.

## Evidence pattern (multi-incident)

The pattern recurs across domains: a read-only verifier assigned a closure-parity round forwards a majority of its rows; a Bash-equipped specialist re-runs the same round and converts them all in one pass.

- A read-only analyst forwarded most verification rows on a multi-round audit; a Bash-equipped specialist re-ran the round and converted them all to verified in one pass.
- A read-only analyst forwarded rows on a citation-verification chain; re-launched as general-purpose, the specialist caught a high-severity phantom citation the read-only pass could not reach.
- A read-only reviewer lacking command access forwarded verification rows for a rule-extraction cycle that the orchestrator plus a Bash-equipped reviewer then had to cover — confirming the rule generalizes to closure-parity verification of artifacts themselves.

Audit toolkits in different domains substitute their own introspection commands for one another (a research audit counts citations; a governance audit diffs a control matrix; an education audit verifies a lesson manifest). The underlying principle — Bash + Read required for runtime verification — generalizes across all of them.

## Cross-references

- `rules/delegation-orchestration.md` MUST §4 — load-bearing tool-inventory-match clause this depth extends from implementation to audit delegation
- `rules/subagent-delegation-verification.md` MUST §1 — post-exit deliverable-existence verification (the sibling discipline for trusting an agent's report)
- `SKILL.md` Pattern 4 — the orchestration-decision framing for verification-specialist tool inventory
- `worktree-orchestration.md` — parallel-pattern precedent for skill-extension of a rule's MUST-clause depth
