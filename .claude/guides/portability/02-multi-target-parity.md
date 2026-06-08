# Multi-Target Parity for One-Source-Many-Targets Emission

When a single source artifact is emitted to more than one execution target — the same rule, agent, skill, or command rendered for several distinct runtimes that each speak a different delegation dialect — a quiet failure mode opens up: the targets drift. One target ships the rule at full strength; another ships a subtly weaker version because its surface format invited a shortcut during adaptation. This guide names the contract that keeps multi-target emission honest: **the semantic content a consumer depends on MUST be invariant across every target; only surface syntax MAY diverge.** Anything else is a rule that looks shipped everywhere but is only load-bearing in some places.

The danger is that parity violations do not fail at emit time. They fail at _consumer_ time — long after the emission ran clean — when someone tests compliance against the strong target, sees a green check, and then operates under the weak target where the same rule was silently relaxed. The consumer cannot audit across targets; they only ever touch one. So the emitter is the audit, and parity is its contract.

**Origin**: distilled from a cross-target drift audit pattern developed for one-source-many-targets emission. The slot-marker syntax, the emit-time schema, and the token-scrub field shown below are _illustration only_ — concrete machinery that makes the four principles legible, not a prescribed implementation. The principles are runtime-agnostic; the machinery is one way to enforce them. Treat the four invariance principles as the contract and the markup as a sketch of one enforcement shape.

## What "Parity" Means

A multi-target emitter takes one logical artifact and renders it N times, once per target. Two things are true of every such rendering:

- **Some of the artifact is the same everywhere.** The behavior the rule prescribes, the modal strength of its MUSTs, the conditions under which it fires, the priority and scope that decide when it loads — these are the _meaning_ of the artifact. A consumer relies on them identically no matter which target they happen to run.
- **Some of the artifact is necessarily different.** Each target speaks its own delegation dialect. One invokes a specialist with one call shape; another with a different keyword; a third with a different sigil entirely. The illustrative example that demonstrates the rule has to be written in the target's own dialect or it teaches nothing.

Parity is the discipline of keeping the first set byte-stable while letting the second set vary — and, critically, knowing exactly which is which. Drift in the _meaning_ set is a defect that ships a weakened rule. Variation in the _dialect_ set is correct and expected. Conflating the two is how the audit either misses real drift or drowns in false alarms.

## The Four Invariance Principles

### 1. The Semantic Body Is Invariant Across Every Target

The part of the artifact that states what the rule _does_ — the prose body, the prescriptions, the conditions, the modal verbs — MUST be identical (modulo whitespace) on every target the source emits to. If a rule says "every bulk operation MUST log per-row failures," that sentence ships verbatim to all targets. A drift here is the failure mode the whole contract exists to prevent, so it earns the hardest response: a drift in the semantic body BLOCKS the emission.

```text
# DO — semantic body identical; only the illustrative call differs

Body (every target, byte-identical):
  "Every bulk operation MUST log per-row failures at WARN level."

Illustration (per target, dialect-specific):
  target A:  <delegate>(specialist="bulk-handler")
  target B:  <delegate keyword>  bulk-handler
  target C:  @bulk-handler

# DO NOT — a target-specific carve-out smuggled into the semantic body

Body (target B only):
  "Every bulk operation MUST log per-row failures — on target B this
   applies only to mutating operations."
   ^ this clause weakens the rule for one target; it is silent drift
```

The blocked rationalizations are always the same three, and each is a way of agreeing to ship a weaker rule:

- "This target doesn't support that, just weaken the rule there."
- "The body is _close enough_ — a one-word delta is fine."
- "We'll harmonize on the next emission."

**Why this is the hard block**: asymmetric rule strength across targets means a consumer who validates compliance on the strong target sees the check pass, then operates under the weak target where the rule was quietly relaxed — and never knows. Consumers cannot diff the targets against each other; only the emitter sees all N at once. Byte-identity of the semantic body is the only property the emitter can mechanically guarantee, and it is exactly the property that protects the consumer who only ever touches one target.

### 2. Frontmatter Priority and Scope Are Identical Across Every Target

A loading-discipline artifact carries metadata that decides _when it loads_: a priority (how early, how unconditionally) and a scope (always-on baseline, or path-scoped to fire only on matching work). These values MUST match on every target's emission of the same source. A rule cannot be an always-on baseline on one target and a path-scoped conditional on another — that is the same rule present-always in one place and present-sometimes in another.

```text
# DO — one source, one loading discipline, every target

priority: 0
scope:    baseline
# → renders to each target's always-on surface, identically

# DO NOT — scope diverges per target

target A frontmatter:  scope: baseline       # always loaded
target B frontmatter:  scope: path-scoped     # loads only on matching files
# same underlying rule, two different always-on surfaces
```

**Why**: scope and priority are _compositional_ invariants — they determine the artifact's presence in the always-on context, which is the surface the consumer relies on without thinking about it. A rule the consumer trusts to be always present becomes present-sometimes on the target where scope drifted, and the gap is invisible until the rule needed to fire and didn't. Frontmatter divergence is a hard block for the same reason as the semantic body: it changes what the consumer can depend on, silently.

### 3. Illustrative Examples May Diverge — and That Divergence Is Expected

The examples that demonstrate the rule are written in each target's own delegation dialect, because an example in the wrong dialect demonstrates nothing. This is the _one_ place divergence is correct by design. So drift in the example set produces a **soft warning**, not a block — the audit notes it for a human to glance at, but does not stop the emission. The discipline here is the inverse of principles 1 and 2: instead of forbidding divergence, you _declare_ it, so the audit can tell expected divergence from regression.

```text
# DO — declare which parts may diverge, so the audit distinguishes
#       expected variation from real drift

invariant (block on drift):   semantic-body, frontmatter.priority, frontmatter.scope
may-diverge (warn on drift):  examples

# DO NOT — leave a divergent region undeclared

# (examples diverge across targets but nothing says they're allowed to,
#  so every emission flags them as drift — and the noise trains the
#  operator to ignore the audit, hiding the real drift in the false alarms)
```

**Why**: examples diverge by design, so the audit MUST be told that, or it cannot separate the divergence-that-is-correct from the divergence-that-is-a-defect. Without an explicit allowlist of the regions permitted to vary, every emission floods the operator with warnings about expected differences. Operators learn to ignore a noisy audit — and the real drift, the one in the semantic body, hides inside the noise of the alarms nobody reads anymore. The allowlist is what keeps the signal loud.

### 4. Scrub Syntax, Never Semantics

To compare two targets' emissions for drift, the audit first _scrubs_ the known-divergent dialect tokens — the per-target call shapes — so they don't register as differences. This scrub list is the mechanism that lets principle 3 work: it tells the comparison "these specific tokens are dialect, ignore them." The discipline is a sharp boundary: the scrub list MUST contain only _syntactic_ tokens (the delegation call shapes), and MUST NEVER be extended to _semantic_ phrases (the modal verbs, the conditions, the prescriptions).

```text
# DO — scrub the dialect tokens only

scrub:  <the per-target delegation call shapes>
        # e.g. the three call sigils from principle 1's illustration

# DO NOT — scrub semantic content to silence a real drift finding

scrub:  MUST, never, always, WARN
        # now the audit can no longer SEE a strength difference between
        # targets — the finding it exists to produce has been deleted
```

The blocked rationalizations mirror the body-drift ones, one layer deeper:

- "Adding the modal verb to the scrub list silences the noisy finding."
- "The semantic difference is intentional, so scrubbing it is the clean fix."
- "We can tune the scrub list later."

**Why**: scrubbing a semantic token turns the drift audit into a null check. The finding it deletes is _exactly_ the finding the audit exists to produce — a strength difference between targets. The correct move when a whole region is expected to diverge is to widen the _may-diverge allowlist_ (principle 3), declaring the region as intentionally variable. Widening the _scrub list_ instead does something different and dangerous: it blinds the comparison to a class of difference everywhere, including the places where that difference is a real defect.

## The Two Categories, Side by Side

The whole contract reduces to one question asked of every region of the artifact: **is this region meaning, or is it dialect?**

| Region                         | Category | On drift | Why it lands there                                                       |
| ------------------------------ | -------- | -------- | ------------------------------------------------------------------------ |
| Semantic body (prose, MUSTs)   | Meaning  | BLOCK    | A weaker rule on one target is invisible to the single-target consumer   |
| Frontmatter priority / scope   | Meaning  | BLOCK    | Changes the always-on surface the consumer depends on, silently          |
| Illustrative examples          | Dialect  | WARN     | Must be in each target's own call shape; divergence is correct by design |
| Delegation call tokens (scrub) | Dialect  | n/a      | Scrubbed before comparison so dialect doesn't register as drift          |

Meaning regions block on drift; dialect regions are declared divergent and either warn or are scrubbed. The single recurring mistake — in both directions — is putting a region in the wrong category. A meaning region treated as dialect ships a weakened rule. A dialect region treated as meaning floods the audit until the operator stops reading it. The contract is just the discipline of categorizing every region correctly and then enforcing the category.

## Why the Emitter Has to Be the Audit

Every principle here traces back to one structural fact: **the consumer only ever touches one target.** They cannot hold two emissions side by side and diff them. They validate against the target in front of them, get a green check, and reasonably conclude the rule holds — for them, on their target, it does. The drift lives in a _different_ target they will never compare against.

This is why parity cannot be a consumer-side responsibility and cannot be a post-hoc review. Only the emitter sees all N renderings at the moment they are produced. Only the emitter can guarantee byte-identity of the meaning regions and declare the dialect regions divergent. If the emitter ships drift, the drift is unrecoverable the moment a downstream consumer pulls it — there is no later checkpoint where someone is positioned to catch it.

Two corollaries follow, and both are absolute:

- **Never ship a target-specific weakening of a rule under the label "equivalent."** "Equivalent" is the word that turns parity into drift. The contract treats byte-identity-plus-scrub as the definition of equivalent; a human judgment that two differently-worded rules are "close enough" is exactly the judgment the contract exists to remove.
- **Never disable the drift audit to unblock an emission.** A disabled audit produces no findings, so the drift ships in silence and becomes unrecoverable downstream. An audit that blocks an emission is doing its job; the response is to fix the drift, not to remove the thing that found it.

## Cross-References

- `rules/cc-enforcement.md` — deterministic enforcement (a hook that blocks at a gate) versus probabilistic guidance (a rule a model reads); the drift audit illustrated here is the deterministic-enforcement shape applied to emission rather than to tool use.
- `rules/cc-artifacts.md` MUST §7 + `rules/rule-authoring.md` — what frontmatter scope (`paths:`) means for when a rule loads, which is the invariant principle 2 protects across targets.
- `rules/no-stubs.md` — dangling cross-references and placeholder content are a within-target analogue of cross-target drift: an artifact that looks complete but is silently broken for the consumer who relies on it.
