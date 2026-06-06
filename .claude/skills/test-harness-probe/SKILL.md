---
name: test-harness-probe
description: Probe-driven verification of a batch of semantic claims. Use to score needs-probe rows in a results file via parallel verifiers, validate the structured answer, write a companion record.
allowed-tools:
  - Read
  - Glob
  - Grep
---

# test-harness-probe

The protocol for scoring a batch of **semantic claims** that a mechanical pass deliberately left unscored. A semantic claim is a property about meaning or behavior — "the deliverable recommended exactly one option," "the response refused and cited a rule," "the analysis covered all three required points." Use it when verifying any batch of such claims: a `/vet` convergence check across drafted artifacts, a `/cc-audit` effectiveness probe over a rule corpus, or any results file where some rows carry a `needs_probe` marker.

Per `rules/probe-driven-verification.md` MUST §1, regex-on-semantic is BLOCKED — the mechanical layer that produced the results file deliberately does NOT score the semantic rows. Those rows are emitted with a `needs_probe` marker so this protocol can reach them via verifier dispatch. Per MUST §2, schema-validation failure IS the verdict; silent retry is BLOCKED.

## When To Use

- A results file (JSONL or equivalent) has rows the mechanical pass marked `needs_probe` because the property is semantic, not structural.
- A `/vet` convergence check must score whether each drafted artifact actually performed a required behavior, not merely contains a keyword.
- A `/cc-audit` effectiveness probe must verify that a rule, agent, or hook does what it claims — across many artifacts in one batch.

If the property is structural (a file exists, a count matches, a schema validates), it is NOT a probe target — the mechanical layer already scored it. Leave those rows untouched.

## Why The Verifier Runs Inside The Session

A mechanical results-producer (a script, a lint, a deterministic check) cannot dispatch verifier subagents — it runs as a child process with no access to the orchestrating session. The orchestrator runs inside the session and can. Splitting the two layers keeps the mechanical pass free of any model dependency at production time: the mechanical layer scores structure and emits `needs_probe`; this protocol scores meaning afterward. That boundary is the same one `rules/probe-driven-verification.md` MUST §3 enforces — a deterministic-only environment marks the semantic rows SKIP, never runs a regex and reports green.

## Protocol

### 1. Resolve the target results file

If an argument is supplied: an absolute path is used as-is after confirming it exists; a bare name resolves under the active workspace's verification-output directory (for a CO workflow, `04-vet/` or the `/cc-audit` output directory).

If no argument is supplied, select the most recent results file that carries `needs_probe` rows and does NOT already have a companion record (skip files ending `.probes.jsonl`). If none matches, halt and report "no probe-bearing results to score — run the mechanical pass first."

### 2. Extract the `needs_probe` rows

Read the resolved file. For each line: parse it; skip header rows; skip rows whose state is not `needs_probe`. For each matching row, extract:

- the row's identity fields (suite/check name, subject identifier, any version marker)
- the **candidate text** — the artifact-under-test's output, the field(s) the claim is about, joined into one string
- the probe specs on the row — each names an **expected-answer schema** and a human-readable **label** for the property being scored

If zero rows match, halt and report "no needs_probe rows in `<file>`."

### 3. Resolve schema rubrics

For each unique schema named by the rows, locate its definition and capture three fields:

- **rubric** — the prompt the verifier receives (the question, framed for a judge)
- **required** — the list of fields the answer MUST contain
- **shape** — the expected type of each required field

If a row names a schema that has no definition, that row's verdict is automatically `{ valid: false, pass: false, reason: "unknown schema: <name>" }` — do NOT dispatch a verifier for it.

### 4. Dispatch verifiers in parallel

For each (row × probe-criterion) pair, dispatch ONE verifier subagent. ALL dispatches MUST go in a SINGLE message — sequential dispatch when parallel is possible wastes the multiplier and is BLOCKED per the governed-throughput model.

Each verifier scores exactly one candidate against one rubric and returns one structured answer. The verifier prompt carries the schema name, the rubric text, and the candidate text, and instructs the verifier to reply with EXACTLY one JSON object matching the rubric's schema — JSON only, no prose, no fences, no preamble.

```text
You are scoring one response against a probe rubric. Read the RUBRIC,
read the CANDIDATE TEXT, and reply with EXACTLY one JSON object
matching the schema the rubric declares. Output ONLY the JSON — no
prose, no markdown fences, no preamble, no trailing explanation.

PROBE SCHEMA: <schema name>

RUBRIC:
<rubric text>

CANDIDATE TEXT (<row identity>):
---
<candidate text>
---

Respond with the JSON object now.
```

### 5. Validate each answer — schema failure IS the verdict

For each verifier result, in order:

1. Extract the first balanced `{ ... }` JSON object from the response. None found → `{ valid: false, pass: false, reason: "no JSON in answer" }`.
2. Parse it. Parse error → `{ valid: false, pass: false, reason: "JSON parse error: <message>" }`.
3. Walk the schema's `required` list. For each field, check it exists AND its type matches `shape[field]`. Any mismatch → `{ valid: false, pass: false, reason: "<field>: expected <T>, got <U>" }`.
4. All checks pass → `valid: true`. Apply the schema's scoring rule to compute `pass`.

DO NOT retry on a validation failure. Per `rules/probe-driven-verification.md` MUST §2, a schema violation IS the probe's verdict — silent retry hides the failure mode and lets a malformed answer masquerade as a transient glitch.

### 6. Write the companion record

Write `<input-basename>.probes.jsonl` to the same directory as the input file. One row per (row × probe-criterion) pair:

```json
{
  "check": "<suite or check name>",
  "subject": "<artifact / row identifier>",
  "schema": "<schema name>",
  "label": "<criterion label>",
  "answer": { "...": "..." },
  "valid": true,
  "pass": true,
  "evidence_quote": "<from answer.evidence_quote if present>",
  "reason": null,
  "judged_at": "<ISO-8601 timestamp>"
}
```

The companion record is the audit trail. Do NOT modify the input results file — it stays immutable so the mechanical verdict and the semantic verdict remain separately attributable.

### 7. Print the summary

Emit a markdown table grouped by check × subject, plus a failure callout for every FAIL that names the rubric field that flipped false (e.g., `citation: false`).

```text
## recommend-exactly-one-option
| Subject     | Verdict | Failed fields |
| ----------- | ------- | ------------- |
| artifact-A  | PASS    | —             |
| artifact-B  | FAIL    | tradeoff      |
| artifact-C  | PASS    | —             |
```

## Rules

- DO NOT fall back to regex-scoring the candidate text if verifier dispatch fails. Escaping regex is the entire point of a `needs_probe` row. Per `rules/probe-driven-verification.md` MUST §3, when the probe is unavailable the row's verdict is "SKIP: probe-unavailable" with a reason — NOT a regex proxy reported green.
- DO NOT retry silently on schema validation failure. The failure IS the verdict (MUST §2).
- DO NOT modify the input results file. The `.probes.jsonl` companion is the record; the original stays immutable.
- DO dispatch all verifiers in parallel in a SINGLE message. Sequential dispatch wastes the multiplier.
- DO NOT widen scope beyond the probed rows. Rows the mechanical pass already scored `pass` or `fail` are final for this run — leave them untouched; re-judging a mechanically-settled row is scope creep.
- DO NOT author or relax a schema after seeing the candidate so the output happens to pass. The schema is fixed from the requirement before scoring, per `rules/probe-driven-verification.md` MUST NOT §3.

## Related

- `rules/probe-driven-verification.md` — the enforced rules behind this protocol: MUST §1 (probe not regex), MUST §2 (expected-answer schema; schema failure IS the verdict), MUST §3 (offline = structural or honest SKIP, never a lexical fallback), MUST §4 (lexical hook detectors are advisory and need a probe counterpart).
- `skills/cc-artifact-patterns/` — the four quality dimensions a `/cc-audit` effectiveness probe scores against (Effectiveness = behavior reliably reproducible, the property most often probed).
- `rules/governed-throughput.md` — the parallel-dispatch and full-context-merge model the verifier fan-out follows.
