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

## Prudence — the permission envelope

Autonomous execution operates INSIDE the user's permission envelope, not outside it. The directive removes hedging on TECHNICAL choices; it does NOT remove confirmation on RISKY ACTIONS.

**You MUST still confirm before:**

- **Destructive operations**: `rm -rf`, branch deletion (especially across repos), dropping anything from disk that has not been committed, killing processes, force-deleting files in shared trees, overwriting uncommitted changes.
- **Hard-to-reverse operations**: force-push, `git reset --hard` on commits already shared with the user's eye, amending published commits, dependency removal, CI/CD pipeline edits.
- **Shared-state changes visible to others**: pushing to remote (any repo), opening/closing/commenting on PRs or issues, posting to Slack/email/external services, modifying shared infrastructure or permissions, uploading content to third-party renderers.
- **Multi-repo distribution**: running `/sync` to multiple downstream repos at once (co-template + 3 domain repos + loom) is high-blast-radius — recommend, then confirm. Single-repo sync IS within envelope.
- **Out-of-envelope scope expansion**: work exceeding the user's stated request by more than one reasonable session shard — state the expansion and confirm before continuing.
- **Downstream-of-atelier repos**: never push remotely on the user's behalf to terrene-foundation/co-{template,research,education,governance} OR Integrum-Global/aegis OR loom — local commits OK, push stays with the user.

Confirmation here is NOT hedging. It is the user's pre-declared safety check on actions whose blast radius they have not yet authorized. Skipping this confirmation violates `CLAUDE.md` § "Executing actions with care".

## Rigor — verify before you commit

Autonomous execution does NOT mean reckless. Before declaring a pick optimal:

- Run mechanical sweeps that VERIFY the claim (grep, file existence, JSON parse, diff) — not only LLM judgment.
- Cite specific file paths, line numbers, or commit SHAs when recommending a change — never gesture at "the audit rule" without naming `rules/cc-artifacts.md:198`.
- Distinguish what you OBSERVED from what you ASSUMED. If the claim rests on memory, verify against the current artifact on disk.
- For high-blast-radius technical choices (multi-repo sync, version bumps, rule corpus changes), state your confidence level and the evidence behind it.

## If `/autonomize` fired WHILE you were mid-question

Re-answer the underlying choice yourself:

- Pick the optimal option with rigor and evidence.
- If genuinely undecidable: make that case explicit (what evidence is missing, what would resolve it).
- Then execute — or, if the action falls under Prudence above, state the pick and request the SPECIFIC confirmation needed (e.g., "ready to push 5 repos to remote: confirm").

Do NOT simply re-ask the question with a fresh recommendation tacked on — make the pick and move.

Origin: absorbed from loom/.claude/commands/autonomize.md (loom 2.10.x), adapted for atelier's repo network — BUILD/USE/SDK references replaced with atelier→co-template→domain-repos+loom; LOC-budget framing dropped (atelier produces methodology artifacts, not code).
