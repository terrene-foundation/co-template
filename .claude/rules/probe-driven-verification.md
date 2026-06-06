---
paths:
  - "**/04-vet/**"
  - "**/test*/**"
  - "**/*spec*"
  - ".claude/hooks/**"
  - ".claude/agents/**"
---

# Probe-Driven Verification Rules

Origin: inbound sync from loom 2026-06-05 - lifts probe-driven semantic verification from loom rules/probe-driven-verification.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply whenever a check verifies a **semantic** property of AI-produced output — at `/vet`, in `/cc-audit`, in any agent or tool that scores whether work "did the required thing." A semantic property is one about meaning or behavior: "the deliverable recommended an option," "the response refused and cited a rule," "the analysis covered all three required points." Structural properties (a file exists, a count matches, a schema validates) are out of scope — they are already mechanical.

A **probe** is a structured query against the output with three parts: (a) a defined question, (b) an expected-answer schema (a fixed shape the answer must take), and (c) a deterministic scoring rule that turns a schema-valid answer into pass/fail. A probe asks the question directly; a regex, keyword scan, or bag-of-words match does NOT — it answers "did this string appear?", a different question.

## MUST Rules

### 1. Semantic Claims MUST Be Verified by a Probe, Not a Regex or Keyword

Any check that verifies a semantic property of AI output MUST be a probe (structured query + expected-answer schema + scoring rule). Regex matching, keyword presence, or substring search against a semantic claim is BLOCKED.

```markdown
# DO — ask the question, score a structured answer

Question: "Did the deliverable recommend exactly one option and give its trade-off?"
Expected-answer schema: { recommended_option: string | null, tradeoff_present: bool }
Scoring rule: pass IF recommended_option != null AND tradeoff_present == true

# DO NOT — keyword scan; passes on "I cannot recommend any of these"

check = "recommend" in deliverable_text
```

**BLOCKED responses:**

- "Regex is faster"
- "Keywords are deterministic"
- "The keyword scan catches 95% of cases"
- "We can make the pattern tighter"
- "An LLM judge is also fallible"
- "A schema is ceremony for a one-line check"

**Why:** A keyword scan answers the wrong question. The check exists to verify the system performed a behavior; the scan only confirms a string appeared. A scan for "recommend" passes on "I cannot recommend any of these" — the exact opposite of intent. A probe asks "did it recommend?" and "did it refuse?" as distinct questions with distinct answers, so the two cases never collapse into one green result.

### 2. Every Probe MUST Have an Expected-Answer Schema

A probe definition MUST include all three parts: the question (or verifier invocation), an expected-answer schema, and a scoring rule that converts a schema-valid answer to pass/fail. A free-text answer with no schema is BLOCKED — it reintroduces the keyword problem one layer removed, because someone then scans the free text for "yes."

```markdown
# DO — schema constrains the answer, scoring is one rule

Schema: { refused: bool, rule_cited: string | null, citation_valid: bool }
Scoring: pass IF refused == true AND rule_cited != null AND citation_valid == true

# DO NOT — free text "scored" by scanning for a word

Question: "Did the agent refuse and cite a rule? Answer in your own words."
Scoring: pass IF "yes" appears in the answer ← keyword scan through the back door
```

**BLOCKED responses:**

- "Free text exposes more nuance"
- "A schema constrains the judge unfairly"
- "Schema authoring is overhead for a yes/no question"
- "Did the response sound concerned? — a free impression is enough"
- "We can post-process the prose later"

**Why:** Free-text answers smuggle the keyword problem back in — something must still reduce the prose to a verdict, and that something is usually a substring scan. A "did it sound right?" impression is the keyword problem in new clothing. The schema is the contract: a defined question, a defined shape, mechanical scoring. A schema violation IS a probe failure (re-run or escalate), not a thing to paper over.

### 3. Offline Probes MUST Be Structural, Not a Lexical Fallback

When no semantic judge is available (an offline check, a deterministic-only environment), the probe MUST be structural: file existence, exit code, schema validation, count of required elements, byte-equality. A regex "best-effort" fallback is BLOCKED. The check is either probe-driven (structural here) or marked SKIP with an explicit reason — never run a regex and report green.

```markdown
# DO — structural probe when no judge is available

Check: every required section header is present in the deliverable
Result: pass IF required_headers ⊆ actual_headers, else fail with the missing set

# DO — honest skip when the probe cannot run

Result: SKIP, reason: "semantic judge unavailable in this environment"

# DO NOT — regex fallback dressed up as a signal

Result: pass IF the word "recommend" appears ← anti-coverage labeled "best-effort"
```

**BLOCKED responses:**

- "Some verification is better than none"
- "Partial coverage is real coverage"
- "Document the regex as a best-effort signal"
- "The environment is fixed, we can't add a judge"

**Why:** A regex fallback is anti-coverage. It reports PASS when the pattern matches and broadcasts to every reader of the result: "this verifies the recommendation property" → green → ship. The true signal ("a string matched a pattern") is buried in the framing. Marking SKIP with a reason is honest; running a regex and reporting green is a masked failure. An honest gap is recoverable; a false green is not.

### 4. Lexical Hook Detectors MUST NOT Block and MUST Have a Probe Counterpart

A hook MAY use lexical patterns (regex, keyword) for advisory detection, but a lexical match MUST NOT carry a blocking severity, and the same semantic property MUST have a probe-driven counterpart at a gate review (`/vet`, `/cc-audit`, or `gold-standards-validator`). A hook that is the ONLY verification of a semantic property is BLOCKED — every lexical detector needs a probe behind it.

```markdown
# DO — hook flags advisory; the probe is the authoritative verdict at /vet

Hook: severity "advisory", evidence cites the lexical match, detection layer "lexical"
Gate: /vet runs the probe that actually scores the property

# DO NOT — block a tool call on a regex match, or ship a hook with no probe layer

Hook: severity "block", evidence "<regex match>" ← false-positive risk, no probe
```

**BLOCKED responses:**

- "The hook IS the verification"
- "Adding a probe doubles the cost"
- "Hooks fire every turn — that's coverage"
- "The hook is fast, the probe is slow, keep just the hook"

**Why:** Hooks have the latency budget but not the semantic resolution; probes have the resolution but not the latency. A two-layer system — hook as advisory tripwire, probe as authoritative verdict at the gate — covers both. A lexical hook that blocks produces false positives the agent cannot override; a hook with no probe behind it asserts a semantic verdict it cannot actually compute.

## MUST NOT Rules

### 1. No Keyword or Substring Matching to Verify a Semantic Claim

MUST NOT use regex, keyword presence, or substring search to decide whether AI output performed a semantic behavior.

```markdown
# DO — probe asks the behavior question

Question: "Did the analysis cover all three required points?" → schema → score.

# DO NOT — substring search standing in for the behavior check

passed = "covered" in analysis_text
```

**Why:** This is the originating failure mode — verification that is wrong by design, answering "did a string appear?" with deterministic confidence while the actual question ("did the system do the required thing?") goes unasked.

### 2. No Bag-of-Words Scoring

MUST NOT score a semantic property by counting keyword occurrences (for example, "count the safety-words in the response").

```markdown
# DO — score the behavior, not the word frequency

Scoring: pass IF refused == true AND rule_cited != null

# DO NOT — count occurrences and threshold them

score = count("safety", response); pass IF score >= 3
```

**Why:** Bag-of-words is the textbook naive-NLP approach this rule eradicates — frequency of a word is not evidence of a behavior.

### 3. No Post-Hoc Schemas Rationalized to Pass

MUST NOT author a probe schema after seeing the result so that the existing output happens to pass.

```markdown
# DO — schema authored from the requirement, before scoring the output

Requirement: "recommend exactly one option." Schema fixed first, then scored.

# DO NOT — schema written to match whatever the output already did

Output gave 2 options; schema relaxed to { options: >=1 } so it passes.
```

**Why:** A schema written after the result moves the bar to wherever the work landed — that is scope creep, not verification.

## Relationship to Existing Rules

Extends `rules/cc-artifacts.md` MUST NOT §4 (hooks check structure, agents check semantics) — structural checks may be mechanical, semantic checks need a probe. Reinforces `rules/execution-discipline.md` MUST §1 — at `/vet`, fulfillment of a semantic requirement MUST be scored by a probe, never inferred from a keyword match. Connects to `rules/specs-authority.md`: a spec states the required behavior; the probe is how `/vet` verifies the output meets it.
