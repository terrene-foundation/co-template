# Guide 15: Prompt Engineering & Structured Output

## Introduction

Prompt engineering at the architect level is about building **systems** that produce reliable output — not writing clever one-off prompts. This guide covers the patterns that determine whether an AI-assisted workflow produces consistent, trustworthy results or generates plausible-looking output that erodes user trust over time.

These patterns are domain-independent. The same principles govern a research workflow that extracts claims from papers, a governance workflow that pulls obligations from contracts, a finance workflow that reads figures off statements, or an education workflow that grades free-text answers. The examples below use document extraction and finding-classification because those shapes recur across every domain — but read each example as a stand-in for whatever your domain's "extract the structured truth from messy input" task happens to be.

By the end of this guide, you will understand:

- Why explicit criteria outperform vague instructions every time
- Few-shot examples as the most effective consistency technique
- Schema design that prevents fabrication and handles uncertainty
- Validation-retry loops and their effectiveness boundaries
- Batch processing trade-offs (cost savings vs. latency window)
- Why self-review fails and how multi-instance review fixes it

---

## Part 1: Explicit Criteria Over Vague Instructions

### The Problem with "Be Conservative"

Vague instructions like "be conservative," "only report high-confidence findings," or "flag important issues" produce **intermittently correct** results. Sometimes the model flags everything. Sometimes it flags nothing. The behavior varies unpredictably across runs.

**Ineffective**:

```
Review this document. Be conservative. Only flag high-confidence findings.
```

**Effective**:

```
Review this document. Flag a passage ONLY when:
- A stated claim contradicts evidence elsewhere in the same document
- A binding obligation is asserted without a defined party or deadline
- A figure is presented that cannot be reconciled with its cited source

Do NOT flag:
- Stylistic or tone preferences
- Minor wording inconsistencies
- Suggestions for additional detail unless a required field is absent
```

### Converting Vague to Measurable

| Vague Instruction       | Measurable Criteria                                                        |
| ----------------------- | -------------------------------------------------------------------------- |
| "Be conservative"       | "Flag only when a claim contradicts evidence in the same document"         |
| "Important issues only" | "Unsupported obligations and unreconcilable figures. Not style."           |
| "High confidence"       | "Flag only when you can quote the specific passage that proves the issue"  |
| "Be thorough"           | "Check every section for: missing party, missing deadline, missing source" |

### Severity Calibration

Severity levels require **concrete examples**, not prose descriptions. Show what a critical issue looks like versus a minor one:

```
CRITICAL — Unsupported binding claim:
    "The provider guarantees 99.9% uptime."  (No measurement window, no remedy,
    no cross-reference to any defined service schedule — the guarantee is
    unenforceable as written.)

MAJOR — Unreconcilable figure:
    "Total: 12,400"  (The three line items above it sum to 11,900 — the stated
    total cannot be derived from the parts.)

MINOR — Wording inconsistency:
    "the Vendor" / "the Supplier"  (Two terms for the same party; cosmetic,
    not substantive.)
```

### The Trust Erosion Dynamic

High false positive rates destroy adoption faster than missed findings:

1. The reviewer flags 50 issues; 30 are false positives
2. The human reviews the first 10, finds 6 are noise
3. The human stops reading the remaining 40
4. Real issues in positions 11–50 go unaddressed

**Fix**: Temporarily disable the categories with the highest false positive rates. Restore trust first. Improve those specific prompts. Re-enable when the false positive rate drops below 10%.

---

## Part 2: Few-Shot Examples

### The Most Effective Technique

When you need consistent output format or consistent judgment, **few-shot examples outperform additional instructions, confidence thresholds, and rule elaboration**.

Not more words. Not stricter rules. **Examples.**

### How to Construct Effective Examples

Each example should show:

1. The input
2. The correct output
3. **The reasoning** — why this output and not a plausible alternative

```
Example 1:
Input: "Payment is due within 30 days of invoice receipt."
Analysis: Extractable obligation. It has a defined trigger (invoice receipt),
         a defined party (the payer, implied by context), and a measurable
         deadline (30 days). All three elements are present.
Severity: None — clean obligation, extract it.

Example 2:
Input: "Payment terms shall be as set forth in Schedule C."
Analysis: NOT a self-contained obligation. The actual terms live in
         Schedule C, which is not provided. Extracting a deadline here would
         fabricate a number that does not appear in the text.
Severity: CRITICAL — pointer to absent content; do not invent the target.

Example 3:
Input: "Payment is due promptly.  // term still under negotiation"
Analysis: Obligation with an undefined deadline. "Promptly" is not measurable,
         and the note signals the term is intentionally provisional. Flag for
         tracking, not as a hard finding.
Severity: MINOR — provisional term, surface for follow-up.
```

**Why reasoning matters**: The model learns to generalize from the reasoning, not just pattern-match the output. Example 1 and Example 3 both describe payment obligations, but the reasoning explains why one is clean and the other needs flagging.

### When to Deploy Few-Shot

| Situation                            | Few-Shot Needed?        |
| ------------------------------------ | ----------------------- |
| Output format is ambiguous           | Yes — show exact format |
| Judgment calls between similar cases | Yes — show reasoning    |
| Simple factual extraction            | Usually not needed      |
| Classification with clear boundaries | 2 examples per boundary |

### The "Resist Extraction" Example

The most valuable few-shot example is one that shows when **NOT** to extract. Most architects include only positive examples (here is something to extract). Including a negative example — where the text looks extractable but shouldn't be — prevents false positives more effectively than any other technique.

```
Example: Text that looks like a binding commitment but isn't one:
Input: "Vendor acknowledges receipt of the Service Level Requirements
        and will endeavor to meet the specified uptime targets."
Analysis: NOT extractable. "Acknowledges receipt" is not an obligation.
          "Will endeavor" is aspirational, not binding. The actual targets
          are in an exhibit that is not provided. Extracting this would
          fabricate specifics that do not exist.
Output: { "obligations": [] }  // Nothing to extract
```

The same negative-example discipline applies in any domain: a research-claim extractor needs an example of a sentence that _sounds_ like a finding but is actually a hypothesis ("we expected to observe…"); a grading workflow needs an example of an answer that _looks_ on-topic but never addresses the question.

### The 2–4 Sweet Spot

Use **2–4 targeted examples** for ambiguous scenarios. More than 4 adds token overhead without proportional improvement. Choose examples that cover the decision boundaries — the cases where reasonable people would disagree.

---

## Part 3: Structured Output via Tool Definitions

When a workflow needs machine-parseable output, the reliable mechanism is a **tool definition with a typed input schema** — the model fills in a structured object rather than emitting free text you then have to parse. Claude exposes this through tool use; the principles below apply to any structured-output mechanism.

### What Schemas Prevent (and Don't)

A schema guarantees **syntactic correctness**: valid structure, correct types, required fields present. That's all.

Schemas do **NOT** prevent:

- **Semantic errors**: Line items that don't sum to the stated total
- **Field placement**: Putting the party name in the address field
- **Fabrication**: The model invents values for required fields when the source lacks the information

### Schema Design Principles

```
extract_document_record
  input schema (object):
    party_name      string   — Primary party named in the document header
    total_amount    number   — Final total, including any adjustments
    currency        string   — ISO 4217 currency code (e.g., USD, EUR)
    effective_date  string | null   — Source may not state this
    confidence      enum: high | medium | low | unclear
    category:
      primary       enum: services | goods | subscription | other
      detail        string   — Free text, used when primary is "other"

  required: party_name, total_amount, currency, confidence
```

### Key Design Decisions

| Decision             | Pattern                         | Why                                                                          |
| -------------------- | ------------------------------- | ---------------------------------------------------------------------------- |
| **Nullable fields**  | Allow `string` _or_ `null`      | Source may not contain the data. Without this, the model fabricates a value. |
| **"unclear" enum**   | Add `unclear` to the value list | Gives the model an honest escape hatch for ambiguous cases                   |
| **"other" + detail** | Primary enum + free-text detail | Extensible categorization without an explosive enum list                     |
| **Confidence field** | Per-extraction confidence       | Enables downstream filtering and routing                                     |

### The Required Field Trap

**Making every field required forces fabrication.** If the source document doesn't state an effective date and you make `effective_date` required, the model will invent a plausible-looking date to satisfy the schema. The output looks complete but contains hallucinated data.

**Fix**: Only require fields that are always present in the source. Make optional fields nullable and omit them from the required list. Add an "unclear" option for ambiguous cases. The schema's job is to make honesty _expressible_, not to force completeness.

---

## Part 4: Validation-Retry Loops

### The Pattern

When extraction fails validation, send back the original document, the failed extraction, and the specific validation error. The model self-corrects:

```
for each attempt, up to max_retries:
    result = extract(document)
    errors = validate(result)

    if no errors:
        return result

    # Retry with error context appended to the conversation:
    "Your extraction had these errors:
       {formatted errors}

     Original document:
       {document}

     Previous extraction:
       {result}

     Please re-extract, fixing the identified errors."
```

### Effectiveness Boundary

Validation-retry works for:

- **Format mismatches**: Wrong date format, missing currency symbol
- **Structural errors**: Fields in the wrong positions
- **Misplaced values**: Party name in the address field
- **Arithmetic**: Line items not summing to the stated total

Validation-retry does **NOT** work for:

- **Information not in the source**: If the document doesn't state an effective date, no amount of retrying will produce a correct one
- **Fabrication**: The model confidently repeats the same fabricated value

**Rule**: Don't burn retry cycles on missing data. If the first attempt produced `null` or "unclear" for a field, and the source genuinely lacks that information, accept the null. Retrying a missing fact only pressures the model toward inventing one.

---

## Part 5: Batch Processing

### The Trade-Off

For large-scale, latency-tolerant work, a batch processing mode trades immediacy for cost. Claude offers an asynchronous batch path with these characteristics (confirm current specifics against the platform documentation, since pricing and limits change):

| Feature               | Detail                                           |
| --------------------- | ------------------------------------------------ |
| **Cost savings**      | Substantial per-request discount vs. synchronous |
| **Processing window** | Results returned within an extended window       |
| **Latency guarantee** | None — results arrive when ready                 |
| **Multi-turn**        | Not supported within a single batch request      |

### The Decision Rule

| Workflow Type               | Mode            | Reasoning                            |
| --------------------------- | --------------- | ------------------------------------ |
| Interactive review session  | **Synchronous** | A human is waiting on the result     |
| Live assistant exchange     | **Synchronous** | User expects a real-time response    |
| Overnight corpus extraction | **Batch**       | Run overnight, review in the morning |
| Periodic audit reports      | **Batch**       | No one is waiting                    |
| Large document queue        | **Batch**       | Latency-tolerant by design           |

### The Multi-Turn Constraint

Batch requests do not support multi-turn tool calling within a single request. This means agentic loops (send → tool → respond → tool → …) cannot run in batch mode. Each batch item is a single request-response.

**Implication**: Design batch items as self-contained extraction or analysis tasks, not multi-step investigations. If an item genuinely needs back-and-forth, route it to the synchronous path.

### The Hybrid Pattern: Batch + Sync Retry

For large-scale extraction, combine batch and synchronous for optimal cost:

```
1. BATCH:    First extraction pass on all documents (discounted rate)
2. VALIDATE: Run local validation on all results (free)
3. SYNC:     Retry only the failed extractions (full rate)
4. STORE:    Final results
```

If most documents extract correctly on the first batch pass, you pay the discounted rate for the majority and the full rate only for the minority that needed a retry. The blended cost sits well below fully synchronous processing — the exact figure depends on your first-pass success rate.

---

## Part 6: Multi-Instance Review

### The Self-Review Limitation

The same session that produced an artifact is **less effective at reviewing its own work**. The model retains its reasoning context from production — the same assumptions, the same mental model — making it less likely to question its own decisions.

This is not a bug. It's a fundamental property: the model can't easily forget _why_ it made a choice and then evaluate that choice objectively.

### Independent Review Instances

Use a **separate session** for review:

```
Session 1 (Produce):
    "Draft the obligations summary for this contract."
    → Produces the summary

Session 2 (Review):
    "Review this obligations summary for unsupported claims and missing parties."
    → No access to Session 1's reasoning
    → Evaluates the summary on its own merits
```

The separation is what creates the objectivity. The reviewing instance has to reconstruct the judgment from the artifact alone — exactly the position a human reviewer would be in.

### Pipeline Application

In an automated pipeline, the produce and review stages are **separate invocations**, each with its own fresh context:

```
steps:
  - name: Produce
    run: <produce stage> --output-format json

  - name: Review
    run: <review stage> --output-format json --json-schema review_schema.json
```

**Key invocation flags** (Claude Code, non-interactive use):

- `-p` / non-interactive mode: essential in automation — without it, the job hangs waiting for input
- `--output-format json`: machine-parseable output the next stage can consume
- `--json-schema`: enforce a specific output structure on the review result

### Confidence-Based Routing

For staged review, route based on the extraction's own confidence field:

```
High confidence   → Automated acceptance
Medium confidence → Quick human spot-check
Low confidence    → Full human review
```

This is the structured-output confidence field from Part 3 doing real work: it turns an honest "unclear" into a routing decision instead of a silent guess.

---

## Part 7: Practice Exercises

### Test Your Understanding

1. A review prompt says "be thorough and flag important issues." It produces 50 findings; 30 are false positives. What's the root cause?
   - **Answer**: Vague criteria. Replace with explicit categories: "Flag only contradicted claims, unsupported obligations, and unreconcilable figures. Skip style and wording."

2. An extraction schema makes every field required. The source document is missing 3 of them. What happens?
   - **Answer**: The model fabricates plausible values. Make optional fields nullable and drop them from the required list.

3. Validation-retry runs 3 times on a field that came back null. The source genuinely doesn't contain that data. What should happen?
   - **Answer**: Accept the null. Don't retry on missing data — it won't appear no matter how many times you ask.

4. A batch job processes 1,000 documents at a discounted rate. Some items need multi-turn tool calls. What's the constraint?
   - **Answer**: Batch mode doesn't support multi-turn. Redesign those items as self-contained tasks, or route them to the synchronous path.

5. A pipeline has the model produce a summary and then review it in the same session. Reviews always pass. Why?
   - **Answer**: Self-review limitation. The same session retains its production reasoning. Use an independent review instance.

### Build Exercise

1. Define an extraction tool whose schema includes: 3 required fields, 2 nullable fields, 1 confidence enum, and 1 "other" + detail category.
2. Write a validation-retry loop that distinguishes retryable errors from missing data.
3. Add 3 few-shot examples that cover the decision boundary between "extract" and "resist extraction," including one negative example.
4. Design a two-stage pipeline with separate produce and review invocations.

---

## Quick Reference

| Concept               | Key Principle                                                              |
| --------------------- | -------------------------------------------------------------------------- |
| **Explicit criteria** | Measurable thresholds, not vague adjectives                                |
| **Few-shot examples** | 2–4 examples _with reasoning_. The most effective consistency technique.   |
| **Schema design**     | Nullable fields, "unclear" enum, "other" + detail                          |
| **Required fields**   | Only require what's always in the source. Required = fabrication pressure. |
| **Validation-retry**  | Works for format/structure. Fails on missing data.                         |
| **Batch processing**  | Cost savings, extended window, no multi-turn, no latency guarantee         |
| **Self-review**       | The same session can't objectively review its own work                     |
| **Multi-instance**    | Separate the producing instance from the reviewing instance                |

---

## Navigation

- **Previous**: [14 - Tool Design Patterns](14-tool-design-patterns.md)
- **Next**: [16 - Context & Reliability](16-context-reliability.md)
- **Home**: [README.md](README.md)
