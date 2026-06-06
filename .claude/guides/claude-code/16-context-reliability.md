# Guide 16: Context Management & Reliability

## Introduction

Context management is the difference between an AI collaboration that works in a single demo and one that holds up across a long, multi-session project. Every other decision — how you phrase instructions, how you structure a workspace, how you coordinate subagents — degrades when the context window is mismanaged. This guide covers the patterns that keep a Claude Code collaboration reliable as a project grows past what fits in one conversation.

These patterns matter most for CO (Cognitive Orchestration) work, where a single methodology project spans many sessions and the journal is the durable memory between them. The failure modes below are exactly the ones the journal and the workspace model exist to prevent.

By the end of this guide, you will understand:

- The progressive-summarization trap and how persistent, append-only facts solve it
- The lost-in-the-middle effect and where to place critical information
- When escalating to a human is the right call (3 valid triggers) and when it is a trap (2 traps)
- Error-propagation anti-patterns and structured recovery across subagents
- Information provenance and how to annotate conflicting sources
- How long sessions degrade and what to do about it

---

## Part 1: The Progressive Summarization Trap

### The Problem

As a conversation grows, the context window fills, and the system compresses older history to make room. That compression systematically destroys **precise data** — the specific identifiers, figures, dates, and decisions that later steps depend on.

**Before compression:**

```
The analysis covers finding F-12, sourced from the 2025 sector review,
which reports a 40% year-over-year increase. The approved scope excludes
the regulatory annex. Decision: proceed with the eight verified sources;
the ninth was inaccessible. Reviewer sign-off recorded 2026-03-03.
```

**After compression:**

```
The analysis covers a sector finding about year-over-year growth.
Some sources were excluded.
```

The finding identifier, the exact percentage, the source name, the scope boundary, the count of verified sources, and the sign-off date all disappear. Any later step that needs one of those values will either stall or fabricate a plausible substitute — and a fabricated date or figure in a finalized deliverable is worse than a missing one, because it looks correct.

### The Solution: Persistent Facts

Extract the load-bearing data into a **structured block that is NEVER summarized** and is re-stated at the top of the working context:

```
PERSISTENT FACTS (do not summarize or paraphrase — restate verbatim):
- project:            sector-review-2026
- approved_scope:     8 sources, regulatory annex excluded
- key_finding F-12:   40% YoY increase, source: 2025 sector review
- excluded_source:    source #9 — inaccessible, not counted
- reviewer_signoff:   2026-03-03
- open_question:      methodology mismatch between source A and source B
```

In a CO workspace this block is not a one-off device — it is what `status.md` and the journal already do. `status.md` carries the rolling state that must survive into the next session; the journal carries the decisions and discoveries that must never be silently dropped. Both are files on disk, which is the only storage that survives context compression intact.

### Append-Only Fact Updates

Persistent facts MUST be **append-only** within a project. Never delete or overwrite an existing fact. If a fact changes — a figure is corrected, a scope decision is revised — record a new entry that supersedes the old one rather than editing it in place:

```
- key_finding F-12:   40% YoY increase   [superseded 2026-03-27]
- key_finding F-12:   38% YoY increase   (corrected — source revised its 2025 figure)
```

This is exactly the journal's append-only discipline (`rules/journal.md` MUST NOT §1: "No Overwriting"). An overwritten fact destroys the trail of how the understanding evolved; the new value passes itself off as the original. The correction entry preserves the audit trail and makes the change reviewable.

### What to Preserve vs Summarize

| Preserve (Never Summarize)        | Safe to Summarize               |
| --------------------------------- | ------------------------------- |
| Identifiers (finding, source, ID) | Exploration steps and reasoning |
| Figures, amounts, quantities      | Approaches that were ruled out  |
| Dates and timestamps              | General discussion              |
| Names, titles, citations          | Background context              |
| Decision outcomes and scope       | Alternatives considered         |
| Error messages and gap notes      | Verbose intermediate output     |

### How Claude Code Handles This

Claude Code fires a **PreCompact** step before it compresses the conversation. This is the moment to write durable state to disk — which is why a CO workspace responds to it by reminding you to capture session notes (or run `/wrapup`) before the detail is gone. A per-message reminder re-injects the active workspace state (name, phase, todo progress) every turn as an additional defense, so the most load-bearing facts are restated even after older history is compressed away.

The principle at work is that context preservation cannot depend on the model _remembering_ to preserve facts. The reliable preservation lives in files — `status.md`, the journal, `.session-notes` — and in the disciplines (`/wrapup`, `/journal`) that write to them. The conversation is volatile; the workspace is durable.

---

## Part 2: The Lost-in-the-Middle Effect

### The Problem

Models read the **beginning and end** of a long input reliably but may under-attend to information **buried in the middle**. In a context window holding dozens of pages, a constraint stated at the midpoint receives less reliable attention than the same constraint stated near the top or bottom.

### Information Placement Strategy

```
+------------------------------------------------------+
|  BEGINNING -- High attention                          |
|  -> Critical instructions and constraints             |
|  -> Key decisions and the approved plan               |
|  -> Persistent facts block                            |
+------------------------------------------------------+
|  MIDDLE -- Lower attention                            |
|  -> Detailed evidence and raw tool output             |
|  -> Historical conversation                           |
|  -> Background context                                |
+------------------------------------------------------+
|  END -- High attention                               |
|  -> The current task or question                      |
|  -> The most recent findings                          |
|  -> Explicit instructions for this turn               |
+------------------------------------------------------+
```

Practical consequence: when a constraint must hold across a long session, restate it at the end of the relevant turn rather than trusting it to survive from where it was first mentioned. This is why a per-turn reminder that re-injects the workspace state is effective — it keeps the load-bearing facts at the high-attention edge of the window instead of letting them sink into the middle.

### Trimming Verbose Results

A tool returns 40 fields when the task needs 5. The other 35 fields consume context budget and push the information that matters toward the low-attention middle.

**Pattern:** Reduce verbose results to the fields the current task needs before they accumulate in the conversation. When a lookup, a search, or a long document returns far more than the decision requires, extract the relevant slice and discard the rest. The goal is to keep the working context dense with what matters rather than padded with what doesn't.

### In Claude Code

The Explore subagent is this pattern made structural. Instead of dumping the full contents of every file and search result into the main conversation — where they would consume budget and crowd out the actual work — the Explore agent reads them in its own separate context window and returns only a summary. The main conversation receives the findings without the noise. The verbose middle never enters the window you are reasoning in.

---

## Part 3: Escalation Triggers

CO keeps the human at the key decision points (the hard gates at `/plan`, `/codify`, `/deliver`). Between gates, the question is when an in-progress task should stop and hand back to the human rather than push on. Three triggers are reliable; two commonly-used ones are traps.

### Three Valid Triggers

| Trigger              | Example                                      | Action                                                    |
| -------------------- | -------------------------------------------- | --------------------------------------------------------- |
| **Explicit request** | The human says "stop, I want to decide this" | Honor immediately. Do NOT attempt to resolve it first.    |
| **Authority gap**    | The task falls outside the approved scope    | Stop and escalate with the structured context of the gap. |
| **Progress failure** | Multiple attempts, no forward progress       | Stop and escalate with what was tried and why it failed.  |

### Two Unreliable Triggers (Traps)

**Trap 1: Tone-based escalation**

Frustrated or terse phrasing from the human does NOT by itself mean the task needs to stop. A human typing "this still isn't right" may need a specific fix that the current task can deliver — not a handoff. Escalating on tone wastes the human's attention and delays the result.

**When tone genuinely matters:** if the human explicitly says "let me take this over" — that is Trigger 1 (an explicit request), not tone detection. Act on the words, not the mood inferred from them.

**Trap 2: Self-reported confidence**

Models are frequently **overconfident on hard cases** and **underconfident on easy ones**. A model may report high confidence on a subtle judgment that it has gotten wrong, and low confidence on a routine lookup that it has gotten right.

**Why:** A confidence score reflects the model's certainty about its own output, not the objective correctness of that output. Those are different things, and routing on the former does not protect you against errors in the latter.

**If you need confidence-based routing**, calibrate it against observed outcomes: measure actual accuracy at each reported confidence level over a real sample, then set thresholds from that measurement — not from the model's self-assessment.

---

## Part 4: Error Propagation Across Subagents

When work is split across subagents and a coordinator — the pattern behind `/analyze` research fan-out, multi-source verification, or any delegated investigation — how a failing subagent reports its failure determines whether the whole effort can recover.

### Anti-Pattern 1: Silent Suppression

A subagent hits an error and returns empty results marked as success. The coordinator continues as if everything worked. No recovery is possible because nothing signals that anything failed.

```
# SILENT SUPPRESSION -- the worst failure mode
on error:
    return { status: "success", data: [] }   # looks complete; it isn't
```

**Why it is the worst:** the output appears finished. No error is visible. Downstream steps build on the missing data, and the final result is confidently wrong — the hardest kind of error to catch because nothing flags it. This is the same failure that `rules/journal.md` guards against on the knowledge side: a gap that is never recorded as a GAP is a gap nobody can act on.

### Anti-Pattern 2: Whole-Pipeline Termination

A single subagent fails and the entire effort aborts, discarding everything the other subagents accomplished.

```
# WHOLE-PIPELINE TERMINATION -- throws away good work
research -> analysis -> synthesis
on any failure:
    abort everything   # two of three stages may have succeeded
```

### Correct Pattern: Structured Error Context

When a subagent fails, it reports structured context that lets the coordinator make an informed decision instead of guessing:

```
subagent_result:
  status:            partial_failure
  failure_type:      transient        # transient | validation | scope | permission
  what_was_attempted: "Verify finding F-12 against the primary source"
  partial_results:
    sources_checked:   [A, B]
    sources_pending:   [C]            # source C timed out
  missing:           ["source C verification"]
  alternatives:
    - "Retry source C (transient timeout)"
    - "Proceed with A and B verified, annotate C as unverified"
    - "Escalate: source C is required for the finding to stand"
```

The coordinator then chooses: retry, reroute, or proceed with the partial result and annotate the gap. The decision is explicit and recorded, not silently made by omission.

### In Claude Code

This is how Claude Code already handles tool failures. When a command fails, Claude receives the actual error output and decides whether to retry with a change, try a different approach, tell you about the failure, or proceed on partial information — surfacing the gap rather than hiding it. The worst thing it could do is ignore the error and continue as if the step had succeeded; the design deliberately does not do that.

---

## Part 5: Information Provenance

### The Problem

When findings are synthesized from several sources, attribution tends to die at the synthesis step. One source reports a 40% increase; another reports a doubling on a related measure; the synthesis combines them into a clean paragraph — and the trail of which claim came from which source is gone. The result reads authoritatively and cannot be checked.

### Claim-Source Mappings

Every finding carried through a synthesis MUST keep its provenance attached:

```
finding:
  claim:        "Sector capacity grew 40% year over year in 2024"
  source:       "2025 Sector Review"
  source_ref:   <citation or locator>
  excerpt:      "...capacity additions reached a 40% increase..."
  date:         2025-01-15
  surfaced_by:  research subagent A
```

This is the same discipline the journal enforces with its frontmatter: an entry without `author`, `date`, and `source` context is unsearchable noise. Provenance is what lets a later session — or a reviewer at `/vet` — trace a claim back to its origin instead of taking it on faith.

### Conflict Handling with Temporal and Methodological Awareness

When two credible sources report different figures, **do not pick one and move on**. Annotate both, with enough context for a reader to judge:

```
conflict:
  metric: "Sector adoption share"
  source_a: { value: "18%", source: "2024 outlook", date: 2024-04,
              method: "all markets, new entries" }
  source_b: { value: "23%", source: "2025 report",  date: 2025-02,
              method: "top 20 markets, registrations" }
  resolution: "Not contradictory -- different time periods and populations"
```

A 2024 study and a 2025 study reporting different numbers are not contradicting each other; they are measuring different moments. A study of "all markets" and a study of "top 20 markets" are not contradicting each other; they are measuring different populations.

**The principle: annotate rather than arbitrate.** Surface both sources with their dates and methods, and let the downstream reader — or the human at the next gate — evaluate. Silently choosing the "more recent" or "higher" number hides a judgment that the human never got to make. This belongs in the journal as a GAP or CONNECTION entry, not buried in a synthesized paragraph.

---

## Part 6: Context Patterns for Long CO Sessions

### Context Degradation Over Long Sessions

A long session accumulates three kinds of rot:

- **Stale results** — a file or source read early in the session has since changed
- **Conflicting instructions** — early guidance that a later correction has superseded, both still in the window
- **Exploration noise** — failed attempts and ruled-out approaches still occupying context

**Signs of degradation:** Claude gives advice that contradicts what it said earlier in the session, forgets a constraint that was stated up front, or proposes an approach that was already tried and rejected. When you notice these, the context has degraded and needs refreshing.

### Scratchpad and Workspace Files for Persistent Notes

For a complex investigation, write findings to a file so they survive compression. In a CO workspace this is not an ad-hoc trick — it is what the workspace structure is for. The journal holds decisions and discoveries; `status.md` holds rolling state; a phase directory (for example `01-analyze/`) holds the working notes for the current phase. A simple running note keeps the active picture in one durable place:

```markdown
## Investigation Notes

### Confirmed

- Finding F-12 holds: sources A and B both verify the 40% figure
- Approved scope excludes the regulatory annex (recorded 2026-03-03)

### Ruled Out

- Source #9 is inaccessible -- excluded, not counted toward the eight
- The methodology-mismatch concern is resolved: A and B measure different periods

### Next

- Verify F-13 against the primary source
- Draft the convergence summary for /vet
```

Anything that must survive into the next session belongs on disk before the session ends — that is precisely what `/wrapup` captures.

### The /compact Command

Claude Code's `/compact` command compresses the conversation deliberately, on your terms rather than automatically when the window fills. Use it when:

- The window is filling up (Claude mentions it, or responses start to feel degraded)
- A major sub-task is done and its exploration detail is no longer needed
- You are about to switch to a different kind of work in the same session

**Before compacting:** save the findings that matter — run `/wrapup`, write to the journal, or update `status.md`. Compression will strip the detailed intermediate output, so anything not on disk is gone.

### Subagent Delegation for Discovery Isolation

When exploring a large body of material — a codebase, a corpus of sources, a broad research question — delegate the discovery to a subagent that runs in its own context window. The effect:

1. The verbose contents, search results, and dead ends live in the subagent's context, not yours
2. Only the summary returns to your main context
3. Your main context stays clean for the actual decision and drafting work

**When to delegate:** broad exploration, multi-file or multi-source analysis, deep research. Not for a targeted lookup you already know the location of — there, a direct search is faster and adds no noise.

---

## Part 7: Practice Exercises

### Test Your Understanding

1. After the conversation compresses, an agent can no longer recall the approved scope and proceeds as if all nine sources were included. What pattern prevents this?
   - **Answer:** A persistent facts block, restated every turn and excluded from summarization — backed by `status.md` and the journal on disk.

2. A long context window has a critical scope constraint stated at its midpoint. The agent ignores it. Why?
   - **Answer:** The lost-in-the-middle effect. Restate the constraint at the beginning or the end of the relevant turn.

3. The human types "this still isn't right" and the agent immediately hands the task back. Was that correct?
   - **Answer:** No. Tone-based escalation is a trap. The human likely needs a specific fix the task can deliver. Escalate on an explicit request, not inferred mood.

4. A research subagent times out. The synthesis step produces a complete-looking report anyway, with a fabricated figure for the missing section. What went wrong?
   - **Answer:** Silent suppression. The subagent should have returned structured error context, and the coordinator should have annotated the gap — recorded as a GAP entry, not papered over.

5. Two sources report different adoption shares — 18% and 23%. The synthesis picks 23% because it is more recent. Is that correct?
   - **Answer:** No. Annotate both with their dates and methods and let the human evaluate. The difference here is methodological (different market populations), not temporal.

### Build Exercise

1. Design a persistent facts block for a multi-session analysis project, and map each field to where it lives on disk (`status.md`, journal, phase directory).
2. Write a structured error-context report a research subagent would return on a partial failure, and the coordinator's three decision branches.
3. Take three conflicting source figures and write the provenance-annotated conflict block, plus the journal entry that records it.
4. Write a running-notes template for an `/analyze` investigation that survives a `/compact`.

---

## Quick Reference

| Concept                       | Key Principle                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **Progressive summarization** | Precise data gets compressed away. Keep persistent, append-only facts on disk.             |
| **Lost-in-the-middle**        | Place critical info at the beginning and end. Trim verbose results before they accumulate. |
| **Escalation**                | 3 valid: explicit request, authority gap, no progress. 2 traps: tone, self-confidence.     |
| **Error propagation**         | Never suppress silently. Never abort everything. Return structured error context.          |
| **Provenance**                | Every claim keeps its source, citation, excerpt, and date attached through synthesis.      |
| **Conflicts**                 | Annotate both sources — don't arbitrate. Note temporal and methodological differences.     |
| **Long sessions**             | Watch for degradation. Persist to `status.md`, the journal, and `/wrapup`; use `/compact`. |
| **Explore / subagents**       | Isolate discovery noise from the main context window.                                      |

The through-line: the conversation is volatile and the workspace is durable. Every pattern here moves the load-bearing facts out of the volatile window and onto durable storage — which is exactly the role the journal and the workspace model already play in CO. Knowledge compounds across sessions (CO Principle 7) only when the facts that carry it are preserved deliberately rather than left to survive compression by luck.

---

## Navigation

- **Previous**: [12 - Troubleshooting](12-troubleshooting.md)
- **Home**: [README.md](README.md)
