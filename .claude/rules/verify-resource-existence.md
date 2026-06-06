---
paths:
  - "workspaces/**"
  - "**/04-vet/**"
  - "**/06-deliver/**"
  - "journal/**"
  - "**/journal/**"
  - ".claude/commands/**"
---

# Verify Resource Existence Rules

Origin: inbound sync from loom 2026-06-05 — lifts the existence-before-access diagnostic discipline from loom rules/verify-resource-existence.md, adapted for atelier (vendor/codegen specifics stripped, phase names remapped to CO v1.2).

## Scope

These rules apply to ALL interactions that touch a named external resource — any thing reached through an external-resource API (an issue tracker, a database, a content store, a deployment endpoint, a permissions system). They also apply to ANY claim that a multi-round process reached convergence. The core insight is domain-neutral: a permission error tells you that you cannot access a thing, not that the thing exists.

## MUST Rules

### 1. Existence Check Precedes Permission Debugging

When an operation fails with a permission error against a named external resource — "access denied", "forbidden", "insufficient scope", a 401/403-class response — the FIRST diagnostic action MUST be an existence check (a single read query asking "does this thing exist?") against the same resource. Recommending credential rotation, scope expansion, or access provisioning BEFORE the existence check is BLOCKED.

```markdown
# DO:

A report-generation step fails with "access denied" on source #7.
First action: query the source API — does record #7 exist at all?
(It was renamed last week. The 403 was the API's way of hiding it.)

# DO NOT:

A report-generation step fails with "access denied" on source #7.
First action: request broader credentials and retry. (Burns operator
time on a credential that unlocks nothing — the record is gone.)
```

**Why:** A permission error says "you cannot access this thing" — it does NOT say the thing exists. Many APIs return the same access-denied message for both "you lack permission to read it" and "you lack permission to even discover it exists" — identical message, opposite root cause. The existence check (one read query) resolves the recursion before it starts.

### 2. The Existence Check Cites the Live Resource, Not the Documentation

The verification query MUST be a live read against the same external surface the failing operation targeted — NOT a search of documentation, source comments, a spec file, or the operator's own memory. Trusting any description of the resource as a proxy for its current runtime state is BLOCKED.

```markdown
# DO:

Query the resource API directly: "list the records matching this name."
Empty result = it does not exist now, regardless of what the docs say.

# DO NOT:

"The onboarding guide lists this resource, so it must exist." (The guide
describes intent at authoring time, not the resource's state right now.)
```

**Why:** Documentation, source comments, and operator memory all describe INTENT — none is evidence of CURRENT state. The live query is the only evidence; everything else is hearsay (a guide that lists a resource never provisioned, a spec naming a table never created, a reference to a credential since rotated out).

### 3. Absent Resources Default to Delete-Or-Stub, Not Provision

If the existence check returns empty AND there is no active user request to create the resource, the default disposition MUST be to remove the dependent work OR convert it to a documented no-op with a removal path. Recommending provisioning ("create the missing resource") is BLOCKED unless the user explicitly asked for that capability.

```markdown
# DO:

The data feed the analysis depends on does not exist. Remove the
dependent section and flag the gap, OR stub it with a noted removal path.

# DO NOT:

The data feed does not exist. Stand up a new feed, wire monitoring, and
schedule refreshes. (Expensive and durable — and nobody asked for it.)
```

**Why:** Work targeting a non-existent resource cannot ever have functioned — it is dead by definition. Removal is cheap and reversible; provisioning is expensive and durable (standing infrastructure, ongoing upkeep, new surface to secure). Until the user asks for the capability, dead work stays dead.

### 4. Convergence Claims Cite a Durable External Receipt

Any claim that a multi-round process — `/vet`, polish, sweep — reached convergence ("round N met target", "rounds 5+6 clean", "cross-agent agreement reached") MUST cite a durable external receipt: a journal entry recording the verdict and the agent task it came from, or a commit SHA referencing the review transcript. Self-attestation in the disposition document that makes the claim is BLOCKED.

```markdown
# DO — receipt cited:

Receipts: journal/0014-DISCOVERY § round-history table (round 5 + 6 verdicts).

# DO NOT — self-attest:

Rounds 5 and 6 met the convergence target. (The claim cannot be verified
by inspecting the document that makes it.)
```

**Why:** A self-attested convergence verdict has the same structural defect as a 403 against a non-existent resource — the claim cannot be verified by inspecting itself. The external receipt is to a convergence claim what the live query is to an existence claim: the only evidence that is not hearsay.

## MUST NOT Rules

### 1. No Credential Recommendation Before the Existence Check

MUST NOT recommend creating or obtaining a credential (an access token, a service account, a key) before the existence check has run.

**Why:** Obtaining a credential is operator-time-expensive and error-prone. Spending that time on a non-existent target is the worst-case waste — the operator does real work to obtain access that unlocks nothing.

### 2. No Second Loop on the Permission Axis Without Re-Verifying Existence

MUST NOT loop more than once on scope or permission variations against the same permission error without re-running the existence check.

```markdown
# DO:

First access-denied → existence check. (Resolve the axis immediately.)

# DO NOT:

Access-denied → try broader scope → access-denied → try another scope →
access-denied → ... (Two failed scope attempts in a row is the loud
signal that permission is the wrong axis. Check existence.)
```

**Why:** Two consecutive failed scope attempts against the same error is the loud signal that the permission axis is the wrong axis. The existence check MUST fire at the second failure if it did not at the first.

### 3. No Same-Document Self-Attestation of a Convergence Verdict

MUST NOT assert a convergence verdict in the very document that makes the convergence claim. The receipt MUST be external — a journal entry or a commit SHA — per MUST Rule 4.

**Why:** Same-document self-attestation is structurally identical to "the documentation says this resource exists" — neither can be verified by inspecting itself. Convergence is a `/vet` outcome; its evidence lives in the journal, not in the disposition prose.

## The Three-Layer Shape

Both halves of this rule share one shape — evidence first, claim second, absence-disposition third:

1. **Existence axis** — existence check FIRST (a live read against the resource API); if it exists, proceed to permission debugging; if absent, default to removal, provisioning ONLY on explicit user request.
2. **Convergence axis** — receipt FIRST (an external journal entry or commit SHA); the claim is grounded in the receipt SECOND; if no receipt exists, surface the gap rather than self-attest.

The two axes are the same discipline applied to two kinds of claim: "this resource is accessible" and "this process converged." In both, the claim that inspects only itself is no evidence at all.
