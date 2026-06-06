# Guide 01: Artifact Neutrality — Writing for the Reader You Don't Know Yet

## Introduction

A workspace artifact — a plan, a journal entry, a brief, a `/vet` findings report, a todo — is written in one session and read in another. The gap between those two moments is where this guide lives. The session that authored the artifact knew exactly which runtime it was speaking to, which tools were available, and what the slash commands expanded to. The session that reads it later may know none of that. It may be a different model, a different context, or — increasingly — a different execution tool entirely.

When prescriptive prose bakes one runtime's implementation surface into an artifact — its native delegation syntax, its tool nouns, its hook event names, its baseline-file name — the next reader running under a different surface silently misreads the instruction. Not loudly: there is no error, no missing file, no failed parse. The instruction just means something the new reader cannot act on, and the reader either skips it (silent drop) or rewrites it (silent drift). Both are worse than a loud failure, because nobody notices.

Atelier today emits its artifacts to a single execution target. This guide is therefore **forward-looking**: it is the discipline any author should already follow so that the day atelier (or a downstream domain that inherited atelier's patterns) emits to a second target, the existing corpus of workspace artifacts does not have to be rewritten. The cost of writing neutrally is near zero at authoring time. The cost of retrofitting neutrality across a year of accumulated workspaces is not.

By the end of this guide, you will understand:

- Why a workspace artifact is a cross-runtime contract, even when only one runtime exists today
- The single principle underneath all five neutrality rules: **the neutral phrase IS the contract; the runtime-specific surface is one implementation of it**
- The five surfaces where runtime-specific detail leaks into prose — delegation, tool nouns, baseline files, hook events, and runtime mentions
- How to distinguish a **prescriptive** reference (must be neutral) from a **historical** one (may name the runtime, when qualified)
- Where the line sits between an artifact (portable by default) and a runtime's own configuration (legitimately runtime-bound)

---

## Part 1: Why an Artifact Is a Contract

### The Two-Moment Problem

Every prescriptive line in a workspace artifact is a small contract between two moments: the moment it was written and the moment it is read. "Dispatch the reviewer in parallel; both must approve before the work ships" is a contract — it states an acceptance criterion that some future session must satisfy. The contract holds only if the future reader can understand and act on it.

The author writes from inside a runtime. From there, it is natural to write the contract in that runtime's own terms — to name the exact delegation primitive, the exact tool, the exact event. Those terms are precise and immediate, and they feel like the most accurate way to state the requirement. That instinct is the trap. The precision is **local**: it is precise _for this runtime_, and meaningless for any other.

### Why "Only One Runtime Exists" Is Not a Defense

The reflex defense is: "We run on one execution tool. The runtime-specific phrasing is accurate. Why pay the neutrality tax?"

Three reasons, in increasing order of force:

1. **The artifact outlives the assumption.** The "one runtime" fact is true today and is not promised tomorrow. A workspace authored this year is read next year. The neutral phrasing costs nothing now; the retrofit costs a sweep across every accumulated workspace, performed under exactly the time pressure that makes corner-cutting tempting.

2. **A downstream domain may already be multi-target.** Atelier is the methodology source. Its patterns flow to research, governance, education, and codegen domains — and a downstream domain may run its workspaces under more than one tool _now_. A pattern that bakes in single-runtime assumptions ships that assumption to every domain that inherits it. (This is the same coupling-propagates-on-sync concern that `rules/independence.md` raises for commercial framing; here the coupling is to a runtime rather than a vendor.)

3. **Neutrality is a forcing function for clarity.** "Use the Read tool on the spec" names a mechanism. "Read the spec before acting" names an intent. The second is not just more portable — it is clearer, because it says what to accomplish rather than which button to press. Writing the contract instead of the implementation tends to produce a _better_ contract.

### The One Principle

Every rule in this guide is one principle wearing five hats:

> **The neutral phrase is the contract. The runtime-specific surface is one implementation of that contract. Prescriptive prose names the contract; the implementation is the runtime's business, not the artifact's.**

"Delegate to the reviewer" is the contract. How a given runtime _spells_ that delegation — a structured call, an at-mention, an inline prompt injection, a queued task — is the implementation, and it varies. Encode the implementation in the artifact and you have written a contract only one runtime can sign. Encode the contract and every runtime, present and future, can sign it.

---

## Part 2: The Five Surfaces

Runtime-specific detail leaks into prose at five recurring surfaces. Each follows the same shape: a precise-feeling, runtime-local term that reads as English but is actually an API surface name. Below, each surface is given a DO (neutral, the contract) and a DO NOT (runtime-bound, one implementation), plus the failure mode the neutral form avoids.

Throughout, the examples are domain-independent — they use a reviewer, a validator, a spec, a findings report — so the pattern reads the same whether the workspace is a research synthesis, a governance audit, an education module, or a code change.

### Surface 1: Delegation

How an artifact refers to handing work to a specialist.

```markdown
# DO — neutral: names the contract (who does what)

- The reviewer approves the diff before it ships.
- Dispatch reviewer + validator in parallel; both MUST approve before delivery.
- Delegate to the standards validator at the delivery gate.

# DO NOT — runtime-bound: names one runtime's delegation primitive in prose

- The reviewer approves (`<runtime-specific delegation call with arguments>`).
- Run the runtime's native task primitive against the validation set.
```

**The contract** is "the reviewer approves before delivery." **The implementation** is whatever call a given runtime uses to spawn that reviewer — and that call differs across tools: one exposes a structured delegation primitive with typed arguments, another routes the same intent through an inline prompt that names the specialist, a third through an at-mention. A reader on a tool that lacks the named primitive cannot run the line; the acceptance criterion silently fails on that tool. The neutral phrase runs everywhere because it states the outcome, not the mechanism.

> Atelier's own canonical artifacts do use a concrete delegation form in their _educational_ DO/DO NOT examples (the `Agent({subagent_type: ...})` shape appears in several rules). That is deliberate and in-scope: those rules are demonstrating the primitive itself, and atelier's canonical runtime is the subject. The neutrality discipline in this guide governs _workspace_ prose — the plans, journals, and findings that a future reader inherits as acceptance criteria — not the rule examples whose entire job is to show the primitive.

### Surface 2: Tool Nouns

How an artifact refers to file-reading, file-writing, and shell-execution.

```markdown
# DO — neutral verb form (the action, not the API surface)

- Read the spec at `specs/_index.md` before acting.
- Run the validation sweep and capture the failures.
- Edit the file to add the missing clause.

# DO NOT — runtime tool noun used as a prescriptive verb

- Use the Read tool on `specs/_index.md` before acting.
- Invoke the Bash tool to run the sweep.
- The Edit tool MUST be used to fix the clause.
```

A capitalized tool noun — `Read`, `Edit`, `Bash` — is an API surface name, not English. It happens to _look_ like a verb, which is exactly why it slips through: the author reads it as plain prose and the reader on a different tool reads it as an instruction referencing a primitive their tool spells differently (a file-reader, a shell call, an at-mentioned filesystem read). The neutral verb form — "read the spec," "run the sweep," "edit the file" — is the contract, works on every tool without translation, and reads more naturally besides.

### Surface 3: Baseline-File References

How an artifact refers to the always-on rules that govern a session.

```markdown
# DO — conceptual: cite the rule or the concept, not the file that emits it

- Per the project's baseline rules, every delivery MUST pass the gate.
- The always-on rules require standards-validator approval before delivery.
- Per the artifact-flow discipline (`rules/artifact-flow.md`), only the source repo syncs.

# DO NOT — cite a runtime's baseline filename as the authority

- Per CLAUDE.md, every delivery MUST pass the gate.
- CLAUDE.md is the authority; the others are legacy stubs.
- Update the CLAUDE.md binding table.
```

A runtime emits its baseline rules into a runtime-specific file. A multi-target emitter generates a _different_ baseline filename per target from the _same_ neutral rule sources. Citing one of those filenames as "the authority" silently asserts that one target's emission is canonical — which is false even today, and actively wrong the moment a second target exists. The authority is the neutral rule (`rules/<name>.md`), the concept ("the baseline rules"), or the spec section. The emitted baseline file is a per-runtime _rendering_ of that authority, never the authority itself.

This surface is subtle because, in a single-runtime setup, the baseline filename and the authority genuinely coincide — there is only one file, and it does carry the rules. The discipline still holds: cite the _source_ rule, not the _emitted_ file, because the source is what stays true when the emission multiplies.

### Surface 4: Hook Event Names

How an artifact refers to the lifecycle moments where automatic enforcement fires.

```markdown
# DO — neutral lifecycle phrasing (the moment, not the runtime's event id)

- The session-start hook injects the active-workspace banner.
- The pre-tool-use guard blocks edits to the protected posture file.
- A user-prompt-submit injection re-states the active rules each turn.

# DO NOT — a runtime's event identifier as the prescriptive name

- The SessionStart hook injects the banner.
- A PreToolUse guard blocks the write.
- Wire UserPromptSubmit to re-state the rules.
```

A runtime's hook events carry runtime-specific identifiers. Atelier's hook substrate names its scripts by lifecycle moment — `session-start.js`, `pre-compact.js`, `user-prompt-rules-reminder.js`, `detect-violations.js`, `journal-write-guard.js` — and the prose that describes when they fire uses the neutral _moment_ ("the session-start hook," "the pre-compact step," "the per-prompt rules reminder"), not a capitalized event id. The moment is the contract: every runtime with a lifecycle has a session-start moment, a pre-tool-use moment, a context-cleanup moment, however it spells the event internally. Name the moment and the description survives across runtimes; name the event id and it pins the description to one.

> This surface matters for atelier specifically because atelier is _building_ a hook substrate this cycle. The substrate's own design docs and the guide that explains it (`guides/claude-code/07-the-hook-system.md`) legitimately discuss a concrete runtime's event model — that is feature documentation for the runtime atelier runs on. Workspace artifacts that merely _reference_ a hook's behavior as an acceptance criterion ("the session-start hook must surface the banner") use the neutral moment, so the criterion reads correctly to a future reader regardless of how their runtime spells the event.

### Surface 5: Runtime Mentions

How an artifact refers to the execution tool itself.

This surface is governed by a distinction the other four share but state most explicitly here: **historical vs prescriptive**.

- A **historical** mention records what happened: which tool authored an artifact, ran a phase, or made an observation, at a point in the past. Historical mentions are fine — they are provenance — _when qualified_ (dated, attributed, scoped to the past).
- A **prescriptive** mention binds the future: it asserts the artifact must run under a named tool. Prescriptive mentions are blocked, because the artifact is portable by default and a prescriptive binding asserts otherwise without warrant.

```markdown
# DO — historical, qualified (provenance; binds nothing)

- The session that ran the analysis on 2026-06-05 produced this todo.
- This journal entry was authored under a different tool; the verbatim quotes
  below use that tool's at-mention syntax and are reproduced as-is.

# DO — neutral prescriptive (binds the contract, not the tool)

- The session running the review phase MUST file findings here.
- The delivery runtime dispatches the validator before the gate.

# DO NOT — prescriptive runtime binding

- This runtime is the one for this workspace.
- This todo MUST be executed under [a specific named tool].
- The architect agent for this tool owns this review.
```

A prescriptive runtime binding tells the next session — possibly running under a different tool — that the artifact's acceptance criteria assume primitives that may not exist for it. The next session then either ignores the criterion or rewrites it, and the silent drop / silent drift cycle begins. A historical mention preserves provenance ("the tool that wrote this, on this date") without binding the future. When you genuinely need to name the runtime, ask: am I recording the past or directing the future? Past is fine, qualified. Future is the contract, and the contract is neutral.

---

## Part 3: Prescriptive vs Historical — the Load-Bearing Distinction

The five surfaces all reduce to one test, applied per reference:

> **Is this reference directing what a future reader must do (prescriptive), or recording what a past session did (historical)?**

- **Prescriptive** references state acceptance criteria, instructions, or contracts the future reader must satisfy. These MUST be neutral — the contract, not one runtime's implementation of it.
- **Historical** references record provenance — what a past session did, under what tool, when. These MAY name the runtime, the tool, the event, the baseline file, _provided_ they are qualified: dated, attributed, and unambiguously scoped to the past.

The same surface term can be either. "The session under tool X at 2026-06-05 invoked its file-reader against the spec" is historical and fine. "Use tool X's file-reader on the spec" is prescriptive and blocked. The word ("file-reader," a tool name) is identical; the _function_ differs, and the function is what the test reads.

A useful tell: a historical reference can carry a date and an attribution without sounding strange ("the analysis session, 2026-06-05, observed…"). A prescriptive reference cannot — try to date "use the Read tool on the spec" and the date has nowhere to attach, because the instruction is about the future, which has no date yet. If a date fits naturally, you are recording the past; if it does not, you are directing the future, and the future must be neutral.

---

## Part 4: Where Neutrality Stops — Artifacts vs Runtime Configuration

Neutrality is the default for _workspace artifacts_ — the plans, journals, briefs, todos, and findings that a future session inherits. It is **not** a blanket ban on ever naming a runtime. Two categories legitimately name the runtime they target:

1. **A runtime's own configuration and feature documentation.** Atelier's hook scripts, its `settings.json`, the guide that explains its hook system — these describe and configure the runtime atelier actually runs on. They are _supposed_ to be runtime-specific; that is their entire job. A guide titled "The Hook System" documenting a concrete event model is feature documentation, not a portable acceptance criterion.

2. **Canonical educational examples that demonstrate a primitive.** A rule whose DO/DO NOT block shows the exact delegation call is teaching the call. Naming the primitive is the point of the example. (`rules/cc-artifacts.md` and `rules/execution-discipline.md` both do this deliberately.)

The line is **purpose**, not topic:

| Artifact                                                    | Default                | Why                                                                                |
| ----------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| Workspace plan / journal / brief / todo / findings          | **Neutral**            | A future session inherits it as a contract; the future reader's runtime is unknown |
| A runtime's `settings.json` / hook scripts / config         | Runtime-specific       | It configures _that_ runtime; portability is not the goal                          |
| Feature documentation for the runtime atelier runs on       | Runtime-specific       | It documents a real runtime's real surface                                         |
| Canonical rule DO/DO NOT examples demonstrating a primitive | May name the primitive | The example's job is to show the primitive                                         |

The exception is narrow and must be declared, not assumed. If a workspace artifact genuinely IS runtime-bound — because it documents a runtime-specific procedure that has no neutral form — it carries an explicit note saying so. Silent runtime-binding of an artifact that _looks_ portable is the failure mode; an artifact that announces "this procedure is specific to runtime X because Y" is honest and fine. The default is portable; runtime-bound is the labeled exception.

---

## Part 5: Applying This Forward

Atelier emits to one target today, so why carry the discipline now? Because the discipline is free at authoring time and the alternative is a retrofit. Concretely:

- **When you write a plan, journal entry, or findings report**, state acceptance criteria as contracts: "the reviewer approves," "read the spec first," "the session-start hook surfaces the banner." Do not reach for the runtime's delegation call, tool noun, or event id, even though it is accurate today.
- **When you cite the rules that govern the work**, cite the source rule (`rules/<name>.md`) or the concept ("the baseline rules"), never the emitted baseline file.
- **When you record what a past session did**, qualify it — date it, attribute it, scope it to the past — and then naming the tool is fine.
- **When you are writing the runtime's own config or its feature docs**, ignore all of the above: those are supposed to be runtime-specific.

The through-line matches the one underneath the whole CO methodology: **the workspace is durable and the session is volatile.** An artifact that survives into the next session must say what it means to a reader the author never met — including, eventually, a reader on a runtime the author never used. Writing the contract instead of the implementation is how an artifact stays legible across that gap. The neutral phrase is not a stylistic preference; it is the part of the artifact that is still true after the runtime assumption underneath it has changed.

---

## Quick Reference

| Surface              | Neutral (the contract)                                                       | Runtime-bound (one implementation)                                      |
| -------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Delegation**       | "delegate to the reviewer"; "dispatch reviewer + validator in parallel"      | a runtime's native delegation call in prose                             |
| **Tool nouns**       | "read the spec"; "run the sweep"; "edit the file"                            | "use the Read tool"; "invoke the Bash tool"                             |
| **Baseline files**   | "the baseline rules"; cite `rules/<name>.md`                                 | citing a runtime's emitted baseline filename as the authority           |
| **Hook events**      | "the session-start hook"; "the pre-tool-use guard"                           | a runtime's capitalized event identifier (`SessionStart`, `PreToolUse`) |
| **Runtime mentions** | historical + qualified; or neutral prescriptive ("the review-phase session") | prescriptive binding ("MUST run under tool X")                          |

The test under all five: **prescriptive references are neutral (the contract); historical references may name the runtime when qualified (provenance).** If a date attaches naturally, it is history — name the tool. If a date has nowhere to go, it is a future instruction — write the contract.

Scope reminder: this discipline governs _workspace artifacts_ a future session inherits. A runtime's own configuration, its feature documentation, and canonical rule examples that demonstrate a primitive are legitimately runtime-specific — the line is the artifact's purpose, not its topic.

---

## Navigation

- **Home**: [README.md](../README.md)
