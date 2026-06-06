---
paths:
  - "**/.claude/rules/*.md"
  - "**/rules/*.md"
---

# Rule Authoring Meta-Rule

Rules are the agent's linguistic tripwires. This meta-rule defines how all other rules MUST be authored so that each new rule compounds the effect of the existing ones instead of diluting it.

Origin: loom journal/0052-DISCOVERY-session-productivity-patterns.md §6. Validated by subprocess A/B test: rule quality improved from 2/6 to 6/6 when this meta-rule was loaded.

See `guides/deterministic-quality/01-rule-authoring-principles.md` for full evidence, anti-patterns, and reproduction protocol.

## MUST Rules

### 1. Phrased As Prohibitions, Not Encouragements

Every rule's load-bearing clauses MUST use `MUST` or `MUST NOT`. The words "should," "try to," "prefer," and "consider" are BLOCKED as the primary modal of a rule clause.

```markdown
# DO

### 1. Bulk Ops MUST Log Partial Failures at WARN

# DO NOT

### 1. Bulk Ops Should Log Partial Failures
```

**Why:** "Should" tells the agent it is permitted to skip. Under time pressure, everything permitted to be skipped is skipped. Evidence: gate reviews phrased as "recommended" were skipped 6/6 times in 0052.

### 2. Linguistic Tripwires Enumerate BLOCKED Phrases Verbatim

When a rule targets a behavior the agent is prone to rationalize, it MUST include the exact excuse phrases marked BLOCKED.

```markdown
# DO

**BLOCKED responses:**

- "Pre-existing issue, not introduced in this session"
- "Outside the scope of this change"
- ANY acknowledgement without an actual fix

# DO NOT

Do not defer work. Address issues as you find them.
```

**Why:** Abstract "do not defer" is trivially rationalized. Verbatim blocked phrases block the rationalization at the linguistic level. Subprocess test confirmed: without BLOCKED phrases, agent said "scope creep, leave it alone."

### 3. Every MUST Clause Has DO / DO NOT Examples

Every `MUST` or `MUST NOT` clause MUST include a concrete example showing both the correct and blocked pattern.

**Why:** Without examples, the agent reconstructs meaning from context and gets it wrong at edges. The example is the unambiguous anchor.

### 4. Every MUST Clause Has A `**Why:**` Line

Every `MUST` and `MUST NOT` clause MUST be followed by a `**Why:**` line (2 sentences max) explaining the failure mode the rule prevents.

**Why:** The `Why:` line converts a rote rule into a principle the agent can apply to situations the rule-author never imagined. It also serves as institutional memory when the rule becomes a backstop for a code primitive.

### 5. Rules Are Path-Scoped Unless Truly Universal

Every rule MUST include `paths:` YAML frontmatter scoping it to the file patterns where it applies. Only rules that apply universally (`communication`, `git`, `security`, `independence`) may omit `paths:`.

**Why:** Rules without `paths:` pay full token cost in every session's baseline. Rules with `paths:` load once per session on first matching file read. Wide patterns (`**/*.py`) are fine.

### 6. Rule Credits the Originating Journal Entry

Every new rule MUST include a one-line `Origin:` reference pointing to the journal entry or discovery that motivated it.

**Why:** A rule is a frozen response to a past failure. Without provenance, future agents cannot judge whether the rule still applies after the underlying failure mode has been fixed.

### 7. Empirical-Validation Fixtures Reproduce The Originating Incident's Conditions

When a rule's `Origin:` (Rule 6) names a specific incident AND the rule ships empirical-validation fixtures (subprocess A/B test, ablation, probe), each fixture MUST reproduce the incident's conditions — NOT an idealized version where the agent has already been told what to look for. Authors MUST enumerate the incident conditions before designing scenarios, and MUST reject any fixture that silently drops one.

```markdown
# DO

Fixture conditions match the incident: the tempting wrong action is in
scope, the disqualifying signal is NOT pre-announced, and the agent
must derive the correct call from the same context the incident gave it.

# DO NOT

Fixture inlines "(this option is disqualified)" into the prompt, or
materializes a brief that pre-resolves the ambiguity the rule defends
against. The agent passes because the test removed the hard part.
```

**BLOCKED rationalizations:**

- "Close enough to the incident"
- "Idealizing makes the test cleaner"
- "We'll write the harder fixture later"
- "The current pass/fail differential is the signal"
- "The incident was an edge case anyway"

**Why:** A rule's empirical claim is a research artifact distinct from its enforcement clauses — it asserts "this rule changes agent behavior under these conditions." When the fixture does not reproduce the originating conditions, the claim measures something the incident never involved, and every revalidation cycle drifts further from what the rule actually defends against. Idealized fixtures pass for the wrong reason and license a rule that may not survive contact with the next real occurrence.

## MUST NOT

- Rationale paragraphs longer than 2 sentences per `Why:` line

**Why:** Long rationale crowds the rule's load-bearing clauses out of working memory.

- Hedging phrases ("in most cases," "generally speaking") in a MUST clause

**Why:** Hedging converts a MUST into a should and reintroduces permission-to-skip.

- Rules longer than 200 lines

**Why:** Rules longer than 200 lines are skimmed AND over-density measurably degrades the OUTPUT QUALITY of the agent that loads them — not just its token budget. Evidence (directional): a dense rule-slice dropped a consuming agent's plan score from 93 to 82, and a curated-minimal rule beat the verbose version by a wider margin as the model weakened. Curation — keep the load-bearing clauses, extract depth into a guide or skill — is therefore an output-quality requirement, not only budget hygiene.

## The "Loud, Linguistic, Layered" Test

Before committing any new rule, verify:

1. **Loud** — can the rule be ignored by quoting a standard excuse phrase? If yes, add that phrase to the BLOCKED list.
2. **Linguistic** — does the rule target wording the agent might use, not just behavior? If no, rewrite.
3. **Layered** — at which load layer does the rule fire? If session-start for a non-universal rule, add `paths:`.

Rules that fail any check MUST be revised before merging.
