# Recommendation Quality Rules — No Suggestion Without a Recommendation

<!-- Deliberately NO paths: frontmatter — this is an always-on universal rule.
     rule-authoring.md MUST §5 requires paths: scoping EXCEPT for rules that
     "apply universally"; its example allowlist (communication, git,
     independence) is illustrative, not exhaustive. recommendation-quality
     qualifies under that same operative criterion: it governs ALL agent output
     that asks for user direction — any phase, any domain, including pure-
     deliberation sessions that touch NO files. Path-scoping would fail to load
     it in exactly those file-less sessions where surfaced choices most need a
     recommendation. So it follows the communication.md convention: no frontmatter
     block, load always. This comment documents the omission as deliberate so a
     frontmatter-presence sweep does not flag it as a missing-paths defect. -->

Origin: inbound sync from loom 2026-06-05 — lifts the no-menu-without-a-pick pattern from loom rules/recommendation-quality.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2). Structurally codifies the standing "always recommend with principles" practice: every open decision point is paired with one specific recommendation, principle-based justification, a default, and the trade-off. This rule EXTENDS `rules/communication.md` § "Frame Decisions as Impact" — communication.md says present the impact of each option; this rule says ALSO commit to one pick.

## Scope

These rules apply to ALL agent output that asks for user direction: design choices, methodology trade-offs, "should we X or Y?" framings, "options A/B/C" lists, scope decisions, sequencing decisions, follow-up dispositions. The user opened the conversation to be **advised**, not to arbitrate an unannotated list.

Does NOT apply to: factual answers ("what version is the spec?"), confirmation gates ("destructive op — proceed?"), or a menu the user explicitly requested ("just give me the three options").

## MUST Rules

### 1. Every Surfaced Choice MUST Carry a Recommendation

When the agent surfaces ≥2 options for the user to choose between, the response MUST include either (a) one explicit recommendation with rationale, OR (b) acknowledgement that the user asked for a bare menu. A bare option list with no pick is BLOCKED.

```markdown
# DO — recommendation with rationale

I recommend Option B: restructure the findings by stakeholder group,
not chronology. Why: the brief's success criterion is "the board can
act on this in one read," and grouping by stakeholder maps each
section to a decision a board member owns. Option A (chronological)
is faithful to how the work happened but forces the reader to re-sort
it. Trade-off: ~half a session of re-work now; the readability gain
is permanent.

# DO NOT — bare option menu, no pick

Two paths:

- Option A: order findings chronologically (less re-work)
- Option B: regroup by stakeholder (more re-work)
  Which would you like?
```

**BLOCKED responses:**

- "The user knows their domain better, they should pick"
- "Recommending feels presumptuous for a major decision"
- "Pros and cons are enough, the user can synthesize"
- "I'm avoiding bias by staying neutral"
- "Listing the options IS the recommendation"

**Why:** A neutral menu transfers the synthesis cost from the agent (high-context, fast) to the user (lower-context, slow); users who wanted a menu would have asked, and "avoiding bias" by staying neutral is itself a bias toward inaction. If context is genuinely missing, the agent MUST name which context would change the pick, not punt.

### 2. Recommendations MUST Spell Out Implications

The recommendation MUST state its **implications**: what changes for the user, what ongoing burden it creates, what its blast radius is, and how reversible it is. Implications are what make the recommendation actionable beyond the immediate yes/no.

```markdown
# DO — implications spelled out

Recommend: discard the draft and re-run /analyze on the full brief.
Implications: one-time cost of ~one session of re-work; recovers an
analysis covering all five requirements, not the three the first pass
caught; every later phase then builds on a complete foundation
instead of inheriting the gap; reversible — the draft isn't lost, its
findings become inputs to the re-run.

# DO NOT — recommendation without implications

Recommend: discard the draft and re-run /analyze.
```

**BLOCKED responses:**

- "The implications are obvious from context"
- "Listing implications is verbose"
- "The user can ask if they want detail"

**Why:** Implications are the difference between a recommendation the user can act on and one they have to interrogate. The agent already holds the load-bearing context; surfacing it costs one paragraph, where forcing the user to re-derive it costs a round-trip.

### 3. Pros and Cons MUST Be Symmetric and Honest

When the agent presents trade-offs, the **cons of the recommended option MUST be stated** alongside the pros. One-sided recommendations are BLOCKED.

```markdown
# DO — symmetric pros and cons

Recommend: hold the artifact at /vet for a second adversarial round
rather than promoting now.
Pros: catches the cross-reference gap the first round flagged but did
not resolve; promotes only on genuine convergence, per the phase contract.
Cons (real, not glossed): adds a round, so the work the user is waiting
on slips a session; the first round may have already covered the gap,
so the second could be confirm-only and feel redundant; if the gap is
cosmetic, the user pays a real delay for a small fix. The cons are why
I'd cap it at one more round, not open-ended re-vetting.

# DO NOT — pros only, cons elided

Recommend: hold at /vet for a second round. Pros: catches the gap,
promotes only on convergence, follows the phase contract.
```

**BLOCKED responses:**

- "The cons are minor"
- "Listing the cons might dissuade the user from the right choice"
- "The recommendation IS the answer; cons are footnotes"

**Why:** Hiding cons makes a two-way decision look one-way. A user who discovers them after committing loses trust in every future recommendation. If the cons outweigh the pros, the recommendation should change — surfacing them is the check that catches that.

### 4. Plain-Language Exposition — Translate Every Technical Term

The recommendation, its implications, and its pros/cons MUST use language a non-technical user can act on. Any technical term appearing for the first time MUST be translated inline. This rule is the structural enforcement of `rules/communication.md` MUST NOT §2 ("Never Use Unexplained Jargon") at recommendation time.

```markdown
# DO — every term translated as it appears

Recommend: path-scope the new rule (attach a `paths:` line — a filter
that tells the system "only load this rule when the user touches a
matching file"). What that means for you: today the rule loads into
every session, even ones that never touch the files it governs,
quietly consuming budget for no benefit. Scoping it makes it load
only when relevant.

# DO NOT — jargon-heavy, untranslated

Recommend: add paths: frontmatter so the rule lazy-loads on first
matching file read instead of sitting in the session baseline.
```

**BLOCKED responses:**

- "The user is technical, jargon is fine"
- "Translation makes responses too long"
- "A glossary at the end of the response is enough"

**Why:** Many CO users are non-technical, and even technical users context-switch across domains. Untranslated jargon compounds: every undefined term raises the cognitive cost of the next decision. Per `rules/communication.md`, match the user's level if they speak technically — but default to plain language first; the user opts up to jargon by using it themselves.

### 5. A Recommendation That Ends in a Question MUST Resolve to a Yes/No

If the recommendation ends with a question, that question MUST be a yes/no confirmation OR a single decision point — never a re-presentation of the original menu. Re-asking the user to choose among the same options the agent just declined to recommend on is BLOCKED.

```markdown
# DO — recommendation, then yes/no confirmation

Recommend: discard the draft and re-run /analyze on the full brief.

Want me to re-run /analyze now? (yes/no)

# DO NOT — recommendation, then re-ask the menu

Recommend: discard and re-run /analyze.
Or, alternatively: (a) keep the draft and patch the gap, (b) discard
and re-run, (c) some hybrid. Which way?
```

**BLOCKED responses:**

- "The user might disagree, so surfacing alternatives is courteous"
- "Re-asking ensures consensus"
- "Yes/no is too binary for a complex decision"

**Why:** A recommendation that ends in "or, alternatively, the menu I just declined to recommend on" cancels itself out. Either the agent has a recommendation (commit; confirm with yes/no, or ask the one clarifying question that would change it) or it does not — and then it MUST say so explicitly: "I don't have enough context to recommend; I need to know X first."

## MUST NOT Rules

### 1. No "It Depends" as a Substitute for a Recommendation

MUST NOT replace a recommendation with "it depends" plus a list of dependencies. (The agent also MUST NOT surface ≥2 options without a pick, state only the pros, or use an untranslated term — those are the four MUST rules above, restated as the failure boundary.)

```markdown
# DO — "it depends" resolved into a branched recommendation

It depends on whether the deadline is firm. If firm, I recommend
shipping the eight verified sources now. If flexible, I recommend the
extra day to verify the remaining four. Default, absent word from
you: ship the eight — partial-but-verified beats complete-but-unchecked.

# DO NOT — "it depends" left as a punt

It depends on the deadline, the quality bar, and your time. Let me know.
```

**Why:** "It depends" without a pick is a punt — the agent holds the context the user lacks. If it is genuinely the honest answer, the agent MUST name which context resolves the dependency and recommend the path under each branch.

**Enforcement** is review-layer: gate-level reviewers (atelier roster: `intermediate-reviewer` + `claude-code-architect`; a downstream repo that loads this synced rule substitutes its own quality + CC reviewers) check at `/vet` and `/codify` whether each surfaced choice carried a recommendation with implications, symmetric pros/cons, and plain-language framing. Final disposition is human.
