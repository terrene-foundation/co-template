---
paths:
  - "**/*.md"
  - "**/CLAUDE.md"
  - "**/README*"
  - "**/LICENSE*"
---

# Terrene Foundation Naming

Origin: atelier commit 6b1b157 — formalises Foundation naming and license-accuracy requirements across the artifact corpus. Corrected per GH #73 (2026-06-19): removed a never-existent predecessor name and an unowned developer-portal domain; the Foundation is simply Terrene Foundation, with no prior name to transition from.

## Scope

These rules apply to ALL artifacts in this repository — agents, skills, rules, commands, hooks, CLAUDE.md, README.md, workspace outputs, and any markdown content that references the Foundation, CO methodology, the trinity (CARE/EATP/CO), CO domain applications (COC/COR/COE/COG/COL/COComp), or licensing.

## MUST Rules

### 1. Foundation Name

The Foundation is **Terrene Foundation**. There is no predecessor name.

```markdown
# DO:

"Published under CC BY 4.0 by the Terrene Foundation."

# DO NOT:

"Published by the Foundation." (ambiguous — name the Foundation)
"Published by Terrene." (incomplete on first reference)
```

- Domain: `terrene.foundation` (the only Foundation domain)
- GitHub org: `terrene-foundation`
- Always use the full name "Terrene Foundation" on first reference in any artifact

**Why**: These artifacts inherit the canonical methodology reference, so naming MUST be exact. An invented predecessor name or an unowned domain in this rule contaminates every consumer on next sync.

### 2. License Accuracy

```markdown
# DO:

"CO is published under CC BY 4.0 by the Terrene Foundation."
"The CO Toolkit is licensed under Apache 2.0."

# DO NOT:

"CO is licensed under CC-BY-SA."
"The CO Toolkit is open source under MIT."
```

- **Specifications** (CARE, EATP, CO, PACT, CDI): **CC BY 4.0** — NOT CC-BY-SA. ShareAlike would prevent proprietary implementations the Foundation explicitly intends to enable.
- **Open-source code** (Kailash Python, EATP SDK, CO Toolkit): **Apache 2.0** — Foundation-owned
- All open-source IP is **fully and irrevocably transferred** to the Foundation
- BSL 1.1 is **NOT** open source — describe as "source-available" or "open-core"
- Whether a product MAY be **named** in a canonical artifact (the ownership-vs-brand test) is governed by `independence.md` MUST NOT §5 — Foundation-owned products MAY be named; proprietary variants (e.g. Kailash RS) MUST NOT.

**Why**: License confusion creates real legal risk. CC BY 4.0 vs CC-BY-SA is the difference between "anyone can build on this" and "any derivative must also be CC-BY-SA," which would block the Foundation's intended commercial-implementation pathway.

### 3. Canonical Terminology

```markdown
# DO:

"CO (Cognitive Orchestration)"
"COC = Cognitive Orchestration for Codegen"
"CARE Trust Plane and Execution Plane"

# DO NOT:

"COC for Codegen" (the C already means "for Codegen" — redundant)
"CARE operational plane" (wrong term)
"Cognitive Orchestration Code" (wrong expansion)
```

- **CO** = Cognitive Orchestration (domain-agnostic base methodology)
- **COC** = Cognitive Orchestration for Codegen (NOT "COC for Codegen" — the C already means "for Codegen")
- **CARE planes**: **Trust Plane** + **Execution Plane** (NOT operational/governance plane)
- **Constraint dimensions**: Financial, Operational, Temporal, Data Access, Communication
- **The Trinity**: CARE (philosophy) + EATP (protocol) + CO (methodology)
- **PACT**: Principled Architecture for Constrained Trust (a Working Architecture, not yet a Foundation standard)

**Why**: This repository inherits the canonical CO reference; terminology drift propagates to every consumer on next sync. The Foundation's published specs use these exact terms — these artifacts MUST match.

### 4. CO as Methodology, Not Product

The Foundation publishes CO as an open methodology under CC BY 4.0. The Foundation does NOT sell methodology consulting. This repository is an implementation of a Foundation-published methodology, not a Foundation property to be commercialized.

```markdown
# DO:

"This repository implements CO v1.2 — the CO methodology is published by the Terrene Foundation under CC BY 4.0."

# DO NOT:

"Terrene Foundation sells CO methodology consulting."
"This repository is owned by the Terrene Foundation." (wrong relationship)
```

**Why**: Misframing the Foundation as a commercial entity violates its non-profit charter. Misframing an implementation as Foundation-owned implies a structural relationship that does not exist.

## MUST NOT Rules

### 1. No Predecessor-Name or Rebrand Framing

MUST NOT reference a predecessor name, "former" name, "rebrand," or "transition" for the Foundation — there is none. The Foundation is, and always has been in canonical artifacts, **Terrene Foundation**.

```markdown
# DO:

"Terrene Foundation publishes CO under CC BY 4.0."

# DO NOT:

"Terrene Foundation (formerly [Predecessor] Foundation)."
"the [predecessor]→Terrene rebrand / transition / migration"
```

**Why**: Inventing a predecessor name is factually wrong, not merely stale, and the "formerly / rebrand" framing propagates that error to every consumer on next sync (GH #73). A canonical naming rule that is itself the contamination source defeats its own purpose.

### 2. No Inaccurate License References

MUST NOT use any license name not explicitly listed in this rule. If a new license enters the ecosystem, update this rule first, then use it.

**Why**: Drift in license attribution is a legal risk that compounds across every downstream sync.

### 3. No Trademark or Commercial Coupling Language

MUST NOT describe this repository or any CO artifact as having a "relationship," "partnership," or "arrangement" with any commercial entity. See `independence.md` for the full constraint.

**Why**: The methodology's credibility depends on its independence from commercial framing.
