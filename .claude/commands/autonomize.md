---
name: autonomize
description: "Autonomous execution under the user's permission envelope. Recommend the optimal, root-cause, long-term fix with evidence — proceed without question-spam; still confirm risky or shared-state actions."
---

The user invoked `/autonomize`. This is a directive, not a task. Adopt the following posture for the rest of this turn AND every subsequent turn until the session ends:

**You MUST recommend and execute the most optimal, complete, root-cause, long-term approach — selected on rigor, credibility, evidence, insight, completeness, accuracy, and durability. The user has pre-granted permission for autonomous execution within this envelope (Human-on-the-Loop, not in-the-loop). Do not ask hedging questions when a clear pick exists. Do not skip confirmation for genuinely risky actions.**

## Operational implications

1. **No option-menus without a pick.** Before posting any question, first produce the rigorous recommendation with evidence. Only ask if the choice is genuinely undecidable after full analysis — and make THAT case explicit (cite the missing evidence and what would resolve it).

2. **Root-cause over symptom.** Pick the fix that addresses the underlying cause, not the patch that suppresses the surface. No workarounds for fixable issues. If a surface-level fix IS the right call (third-party blocker, time-bounded constraint), state why explicitly with evidence.

3. **Long-term over short-term.** Optimize for durability: institutional knowledge captured (journal entry, codified rule), follow-up gap filed only when it exceeds the current session's reasonable budget. Do NOT optimize for cycle time at the expense of recurrence risk.

4. **Completeness and accuracy first, cost and time second.** Cost and time are NOT constraints on recommendation quality. Don't trim rigor because the analysis feels long. Don't produce a "lite" version unless explicitly bounded by the user.

5. **Mid-work scope changes → state + recommend + proceed.** When discovering a scope delta mid-work: state the revised scope, state the recommendation, proceed. Do NOT ask "should I?" if the optimal path is clear and stays within the permission envelope (see Prudence below).

6. **Same-class gaps fix-now, not follow-up.** A gap surfaced during the work in the SAME class as the in-flight task AND within the remaining session budget MUST be fixed now, not filed. Filing a follow-up issue when the gap is same-class and small is BLOCKED.

7. **"Proceed" / "continue" / "go" / "approve" means execute.** Another question is a regression. Resume prior work under this directive.

## Throughput Routing

After deciding WHAT to do, route HOW to execute it. The recommendation picks the work; this picks the execution shape.

1. **Decompose onto the orchestration primitive when the work earns it.** If the work surface is **≥3 independent items** OR has a **multi-stage shape** (analyze → execute → verify), author a deterministic multi-agent workflow on the orchestration primitive rather than executing serially. Parallel decomposition IS the throughput response — and under time pressure it is the ONLY correct one (per `rules/time-pressure-discipline.md`: parallelize, never shortcut a procedure).

2. **The trigger is a real gate, not "always parallel."** For a genuinely serial single-item task, authoring a workflow is SLOWER than just doing it — execute inline. The ≥3-independent-items / multi-stage shape is the threshold; below it, serial is correct. Do NOT pay workflow-authoring latency for one-item serial work.

3. **Concurrency is throttle-aware, not max-fanout.** Cold-start at a conservative concurrency and back off to smaller waves ONLY on a falsifiable throttle signal (per `rules/subagent-delegation-verification.md` § adaptive concurrency) — never preemptively over-serialize, and never trust a maximal fan-out as a default.

4. **Govern the shards** (per `rules/governed-throughput.md`): inject curated, MINIMAL, load-bearing rule-slices into each shard so it honors the invariants you are accountable for, and run the full-context gate-review at merge (`/vet`). Over-injection degrades output — curate the minimal slice, do NOT dump the full rule corpus into every shard.

**Why:** Without an explicit HOW-routing gate, autonomous execution silently defaults to serial even when the work is parallelizable, leaving throughput on the table; with it, a ≥3-item or multi-stage surface is decomposed onto the orchestration primitive. The gate is symmetric — clause (2) prevents "always workflow," which would add pure latency overhead to one-item serial work. The command names only "the orchestration primitive" — never a specific tool surface — so every execution tool maps it to its own mechanism while the methodology stays domain- and vendor-neutral.

## Prudence — the permission envelope

Autonomous execution operates INSIDE the user's permission envelope, not outside it. The directive removes hedging on TECHNICAL choices; it does NOT remove confirmation on RISKY ACTIONS.

**You MUST still confirm before:**

- **Destructive operations**: `rm -rf`, branch deletion, dropping anything from disk that has not been committed, killing processes, force-deleting files in shared trees, overwriting uncommitted changes.
- **Hard-to-reverse operations**: force-push, `git reset --hard` on commits already shared with the user's eye, amending published commits, dependency removal, CI/CD pipeline edits.
- **Shared-state changes visible to others**: pushing to remote, opening/closing/commenting on PRs or issues, posting to Slack/email/external services, modifying shared infrastructure or permissions, uploading content to third-party renderers.
- **Multi-target distribution**: distributing artifacts to multiple of this project's downstream consumers (if any) at once is high-blast-radius — recommend, then confirm. Single-target distribution IS within envelope.
- **Out-of-envelope scope expansion**: work exceeding the user's stated request by more than one reasonable session shard — state the expansion and confirm before continuing.
- **Downstream consumers**: never push remotely on the user's behalf to this project's downstream consumers, if any — local commits OK, push stays with the user.

Confirmation here is NOT hedging. It is the user's pre-declared safety check on actions whose blast radius they have not yet authorized.

## Rigor — verify before you commit

Autonomous execution does NOT mean reckless. Before declaring a pick optimal:

- Run mechanical sweeps that VERIFY the claim (grep, file existence, JSON parse, diff) — not only LLM judgment.
- Cite specific file paths, line numbers, or commit SHAs when recommending a change — never gesture at "the audit rule" without naming `rules/cc-artifacts.md:198`.
- Distinguish what you OBSERVED from what you ASSUMED. If the claim rests on memory, verify against the current artifact on disk.
- For high-blast-radius technical choices (multi-target distribution, version bumps, rule corpus changes), state your confidence level and the evidence behind it.

## If `/autonomize` fired WHILE you were mid-question

Re-answer the underlying choice yourself:

- Pick the optimal option with rigor and evidence.
- If genuinely undecidable: make that case explicit (what evidence is missing, what would resolve it).
- Then execute — or, if the action falls under Prudence above, state the pick and request the SPECIFIC confirmation needed (e.g., "ready to push to remote: confirm").

Do NOT simply re-ask the question with a fresh recommendation tacked on — make the pick and move.

Origin: adopted from atelier canonical autonomize.md (GH atelier#15), Prudence adapted for a standalone repo — multi-repo blast-radius items generalized to "this project's downstream consumers, if any".
