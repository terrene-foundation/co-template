# Atelier Independence Rules

Origin: atelier commit 6b1b157 — formalises atelier's separation from commercial entities to protect the Foundation's CC BY 4.0 publication promise.

## Scope

These rules apply to ALL artifacts in atelier — every agent, skill, rule, command, hook, workspace output, README, and CLAUDE.md.

Atelier is the implementation of CO (Cognitive Orchestration) — a Foundation-published methodology under CC BY 4.0. Atelier has NO structural relationship with any commercial entity. Its canonical role as the methodology source for all downstream domains depends on remaining unbiased toward any specific product, vendor, or company.

## MUST NOT Rules

### 1. No Commercial Product References

MUST NOT reference, compare with, or design against any commercial or proprietary product:

```markdown
# DO:

"Atelier publishes CO methodology patterns that any AI execution tool can implement."
"The 6-phase workflow applies to research, finance, education, governance, and codegen."

# DO NOT:

"Atelier is the open-source version of [vendor product]."
"CO is similar to [proprietary methodology] but better."
"COC integrates with [commercial framework]."
```

- No proprietary product names, SDKs, runtimes, or frameworks
- No commercial entities, partnerships, or market positioning
- No "unlike X", "open-source version of Y", or "differentiates from Z"
- No "Python port of", "community edition of", or derivative language

**Why**: Commercial references position atelier as derivative, undermining its independent identity and creating implicit coupling that constrains future methodology decisions. The CO methodology's value comes from being canonically cross-domain — naming a specific vendor in any artifact biases every downstream domain that inherits it.

### 2. No Proprietary Awareness in Methodology Artifacts

```markdown
# DO:

"Phase 03 (Execute) carries out planned work under guardrails."

# DO NOT:

"Phase 03 (Execute) writes [vendor SDK] code following [vendor framework] patterns."
"Compatible with [vendor product]'s workflow engine."
```

- No proprietary file paths, module names, or architecture references in atelier methodology artifacts
- No "compatibility" or "interop" claims with proprietary systems
- No APIs or interfaces designed for a specific proprietary product
- No revenue models, pricing tiers, or enterprise-vs-community splits

**Why**: Proprietary awareness in canonical methodology artifacts creates implicit coupling that propagates to every downstream domain on next sync. CO is supposed to work for any domain with any execution tool — embedding vendor specifics breaks that promise.

### 3. No Commercial Relationship Language

MUST NOT describe atelier, the Foundation, CO, or any contributor as having a "relationship," "partnership," "arrangement," or "alignment" with any commercial entity:

```markdown
# DO:

"Contributors to atelier act as individuals under the Foundation constitution."
"Third parties MAY build commercial products on CO methodology."

# DO NOT:

"Atelier is developed in partnership with [company]."
"[Company] contributes Kailash Python under [arrangement]."
"The Foundation has a relationship with [vendor]."
```

- Contributors (including the Founder) contribute as **individuals**, governed by the Foundation constitution
- Open-source IP is **Foundation-owned**, fully transferred, irrevocable — never "donated by" or "licensed from" any company
- Third parties MAY build commercial products on CO methodology — that is the intended model, but the relationship is downstream, not structural

**Why**: Implying structural commercial coupling violates the Foundation's non-profit charter and exposes atelier to perceived bias. The constitution explicitly prevents open-washing and self-interest by ANY party.

### 4. No Foundation-Owned Framing for Atelier

Atelier IMPLEMENTS Foundation-published methodology. Atelier is NOT a Foundation property.

```markdown
# DO:

"Atelier implements CO v1.2 — the CO methodology is published by the Terrene Foundation under CC BY 4.0."

# DO NOT:

"Atelier is owned by the Terrene Foundation."
"Atelier is the Foundation's implementation toolkit." (wrong direction)
```

**Why**: Misframing atelier as Foundation-owned implies a structural relationship that does not exist. Atelier is one possible implementation of a published open methodology — there could be others.

### 5. Foundation-Owned Products MAY Be Named; Proprietary Variants MUST NOT

A product that shares a brand with a Foundation-owned one is NOT automatically nameable — classify by OWNERSHIP, not brand. Per `terrene-naming.md` § License Accuracy: **Foundation-owned open-source** products (Kailash Python, EATP SDK, CO Toolkit — Apache 2.0) MAY be named in canonical artifacts; **proprietary third-party** products (e.g. Kailash RS — classified Proprietary at `agents/gold-standards-validator.md`; and any proprietary "Kailash SDK" variant) MUST NOT appear in canonical methodology artifacts. **Carve-out:** the naming-authority artifacts — `terrene-naming.md`, this rule's own DO-NOT examples, and the `gold-standards-validator` checklist — MAY name a proprietary product solely to CLASSIFY it; naming-to-classify is not naming-to-couple.

```markdown
# DO — name the Foundation product; describe a proprietary variant by role, not brand

"Kailash Python (Foundation, Apache 2.0) is an OSI-licensed dependency."
"A downstream consumer adapts the methodology for its own proprietary variant." (role, not brand)

# DO NOT — name a proprietary third-party variant in a methodology artifact

"Stack-pinned to the Kailash SDK." / naming a proprietary third-party module (e.g. `kailash-rs`).
```

**BLOCKED responses:**

- "It shares the Kailash brand, so if Kailash Python is nameable this variant is too"
- "Naming the variant just documents the sync topology, it isn't coupling"
- "The classifier names it, so any artifact may"

**Why**: Without a written ownership test, "may I name this product here?" is a per-artifact judgment call — two reviewers split on exactly this — the proprietary-name use that USED to appear in `artifact-flow.md` (since de-vendored) passed one reviewer and failed another. Pinning the test to Foundation-ownership-vs-proprietary makes the boundary mechanically checkable and stops a proprietary variant riding a Foundation brand into every downstream domain on next sync.

Origin: workspace `atelier-1.5.1-redteam` journal/0002 (the A2-001-confirmed / A2-002-refuted verifier split on naming "Kailash") + journal/0003 (codify gate A2-003).

## SHOULD Rules

### 1. Describe Atelier on Its Own Terms

Always describe atelier and its artifacts independently. The existence of any other product is irrelevant to atelier's purpose.

**Why**: Atelier's role as the methodology source requires self-contained descriptions that work for any audience without prior knowledge of the broader ecosystem.

### 2. Foundation-Only Dependencies in Methodology

Methodology artifacts SHOULD reference only:

- The Foundation trinity (CARE / EATP / CO) under CC BY 4.0
- Other Foundation-published specs (PACT)
- Standard CO domain applications (COC, COR, COE, COG, COL, COComp)
- Open-source tools available under OSI-approved licenses

MUST NOT reference proprietary SDKs, vendor-specific frameworks, or commercial AI services in canonical methodology artifacts.

**Why**: A proprietary dependency in a canonical methodology artifact makes every downstream domain transitively dependent on that vendor's licensing, pricing, and availability. The Foundation's CC BY 4.0 publication promise breaks the moment a canonical artifact embeds a proprietary requirement.
