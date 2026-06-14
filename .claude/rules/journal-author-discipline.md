---
paths:
  - "**/journal/**"
---

# Journal Author Discipline Rules

Origin: inbound sync from loom 2026-06-05 — lifts the verifiable-author-claim principle from loom rules/journal-author-discipline.md, adapted for atelier (loom's per-session provenance ledger machinery dropped entirely — atelier has no such substrate; phase names remapped to CO v1.2). Enforcement is review-layer here, not ledger-backed.

## Scope

These rules apply to EVERY journal entry written under any `journal/` directory, in every phase of any CO workflow. The `author:` frontmatter field (`human` | `agent` | `co-authored`) is in scope the moment an entry is drafted. The author decision tree lives in `rules/journal.md` MUST §3 — this rule governs the integrity of the choice that tree produces.

## MUST Rules

### 1. The Author Field Is A Verifiable Claim, Not Self-Justifying

A journal entry's `author:` field is a CLAIM about who originated the insight, not a fact that the entry's own frontmatter proves. The claim MUST be defensible against the actual conversation that produced the entry — would the insight exist without the AI (`human`), did the AI surface it unprompted (`agent`), or did it evolve through exchange (`co-authored`)? Writing `author:` from convenience, habit, or to flatter the human's contribution is BLOCKED.

```markdown
# DO:

User asked "what risks am I missing?"; the AI named the data-staleness risk
the user had not considered. → author: agent (the AI surfaced it unprompted).

# DO NOT:

The AI surfaced the risk, but the entry records author: human because the
user is "the one running the project." (the field flatters; the claim is false)
```

**BLOCKED responses:**

- "The user is driving the project, so it's human-authored"
- "Crediting the human is the polite default"
- "Author is just a formality, nobody audits it"

**Why:** The author field is the only signal of who actually drove each decision; if it records aspiration rather than what happened, it stops being evidence and becomes noise. A field that always says `human` carries no information at all.

### 2. AI-Surfaced Insights MUST NOT Be Attributed To The Human

An insight the AI surfaced unprompted MUST be recorded `author: agent` (or `co-authored` if the human materially shaped it), NEVER `author: human`. Mis-attributing an AI-originated insight to the human contaminates CO Principle 7 (knowledge compounds): the corpus is later mined to learn what the human reliably reasons well about, and every false `human` claim poisons that pattern analysis.

```markdown
# DO:

author: agent # the AI proposed the event-driven design; the user # had not raised it before the AI said it

# DO NOT:

author: human # same entry — recorded human because it ended up # in the final plan the user approved
```

**Why:** Approving an AI-surfaced insight is not authoring it. If approval counts as authorship, every agent-originated decision the human signs off on reads as human-reasoned, and the pattern analysis that CO Principle 7 depends on learns a profile of the human that is really a profile of the AI.

### 3. When Uncertain, Prefer `co-authored` Over `human`

When the origin of an insight is genuinely ambiguous — neither party clearly reached it alone — the entry MUST record `author: co-authored`, never `author: human`. This matches the decision tree in `rules/journal.md` MUST §3. Resolving uncertainty toward `human` is BLOCKED.

```markdown
# DO:

author: co-authored # the idea sharpened across three exchanges; neither # the user's framing nor the AI's elaboration alone # would have produced it

# DO NOT:

author: human # "the user was involved, so call it human" — uncertainty # resolved upward into an unearned human claim
```

**Why:** `human` is the strongest provenance claim and the one most damaging when wrong (MUST §2). Defaulting ambiguity to `co-authored` keeps the corpus honest: it records shared origination as shared, rather than inflating the human's apparent contribution and skewing the same pattern analysis MUST §2 protects.

## MUST NOT Rules

### 1. No Invented Ledger — Enforcement Is Review-Layer

This rule MUST NOT be described, cited, or enforced as if this repo verified the author claim against a provenance ledger or capture stream. This repo has no such substrate. (Separately: WHERE a `journal-write-guard` hook is present — it ships with the trust-posture hook substrate, not with this rule — that hook enforces journal IMMUTABILITY, i.e. no overwrite of an existing entry; it does NOT enforce authorship, and this rule does not depend on it.) Author-claim plausibility is sanity-checked at the review layer only: `/vet` and `/codify` read new journal entries and flag any `author:` value that contradicts the conversation that produced them.

```markdown
# DO:

"/vet sampled the new entries; entry 0007's author: human looks implausible
(the AI surfaced that connection) — flagging for re-attribution to co-authored."

# DO NOT:

"The author-backing check read the session provenance ledger and confirmed
the human claim." (this repo has no ledger; this enforcement does not exist)
```

**Why:** Claiming a ledger-backed verification this repo does not have manufactures false assurance — a reader trusts an author field believing it was machine-verified when nothing checked it. Naming the real enforcement (review-layer plausibility at `/vet` and `/codify`) keeps the rule honest about its own teeth.

## Cross-References

- `rules/journal.md` MUST §3 — the `human` | `agent` | `co-authored` author decision tree this rule protects, and the immutability rule (MUST NOT §1) that a `journal-write-guard` hook enforces where the trust-posture substrate is present.
- `rules/execution-discipline.md` — the `/vet` gate-review where author-claim plausibility is sanity-checked.
