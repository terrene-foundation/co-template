# CO Setup Architecture

## The Five Component Types

Every CO setup consists of five component types. Each maps to a specific CO layer.

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR NATURAL LANGUAGE                     │
│              "Build X" / "Analyze Y" / "Draft Z"            │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  COMMANDS (.claude/commands/)                    [CO L4]     │
│  Structured workflows with approval gates                   │
│  /analyze → /plan → /execute → /vet → /codify → /deliver    │
│  Plus: /ws, /wrapup                                         │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  SKILLS (.claude/skills/)                        [CO L2]     │
│  Distilled domain knowledge — the institutional handbook    │
│  Progressive disclosure: index → quick-ref → deep reference │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  AGENTS (.claude/agents/)                        [CO L1]     │
│  Specialized sub-processes with domain expertise            │
│  Deep knowledge + procedural directives                     │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  HOOKS (.claude/hooks/ + .claude/settings.json)  [CO L3]     │
│  Deterministic enforcement outside the AI's context         │
│  Anti-amnesia, validation, session lifecycle                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  RULES (.claude/rules/)                          [CO L3]     │
│  Soft enforcement — constraints the AI reads and follows    │
│  Agents, security, git, no-stubs                            │
└─────────────────────────────────────────────────────────────┘
```

**Layer 5 (Learning)** spans all components — the `/codify` command captures patterns, the learning system logs observations, and the digest builder aggregates them for codification.

## Shared vs Project-Specific

### Always Shared (identical across all repos)

| Component | Files                                | Purpose                                                            |
| --------- | ------------------------------------ | ------------------------------------------------------------------ |
| Commands  | `ws.md`, `wrapup.md`                 | Utility — workspace status, session notes                          |
| Commands  | `plan.md`, `execute.md`, `codify.md` | Core workflow — shared structure with project-specific agent teams |
| Rules     | `git.md`                             | Git workflow conventions                                           |
| Guides    | `claude-code/`                       | How Claude Code works                                              |
| Guides    | `co-setup/`                          | This guide                                                         |

The three always-shared core-workflow files use the **canonical CO** command names (`plan.md`, `execute.md`, `codify.md`). The COC coding archetype renames the two middle-phase files to its operational flavors (`todos.md`, `implement.md`) and keeps `codify.md` — same shared structure, archetype-specific filename. The other canonical phases — `/analyze`, `/vet`, `/deliver` — are project-specific (see the **Always Project-Specific** and **Archetype-Specific** tables), so their files are not part of this always-shared set. See `rules/domain-independence.md` § 3 (Six-Phase Naming).

### Always Project-Specific

| Component                              | Why                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------- |
| Commands: `start.md`                   | Different orientation (product vs governance vs research)                   |
| Commands: `analyze.md`                 | Different research frameworks (product-market fit vs governance precedents) |
| Commands: `vet.md` (COC: `redteam.md`) | Different testing (user flows vs adversarial governance vs security audit)  |
| Skills: `project/`                     | Domain knowledge specific to the codebase/project                           |
| Agents: `project/`                     | Specialists for the specific codebase/project                               |
| Hooks: `session-start.js`              | Project type detection and context loading                                  |
| Hooks: `session-end.js`                | Project-specific metrics and state persistence                              |
| Rules: `security.md`                   | Different security concerns (code vs documents)                             |

### Archetype-Specific

| Component | Coding Repos                                                                                                                       | Governance/Non-Coding                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Commands  | `deploy.md`, `test.md`, `api.md`, `db.md`, `sdk.md`, `ai.md`, `design.md`                                                          | `arxiv.md`, `publish.md`, `governance-layer.md`, `co-domain.md`                                                                 |
| Agents    | `tdd-implementer`, `testing-specialist`, `value-auditor`, `build-fix`                                                              | `constitution-expert`, `governance-layer-expert`, `publication-expert`, `care-platform-architect`                               |
| Agents    | `[framework]-specialist`, `[runtime]-specialist`, `[tooling]-specialist` (e.g. in a codegen project, one per framework/SDK in use) | `care-implementation-expert`, `co-domain-expert`                                                                                |
| Agents    | `[frontend-framework]-specialist`, `[design]-specialist` (e.g. in a UI project)                                                    | —                                                                                                                               |
| Skills    | SDK-specific (01-25)                                                                                                               | Standards reference (26-34)                                                                                                     |
| Rules     | `no-stubs.md` (strict MUST), `agents.md` (MANDATORY), `testing.md`, `patterns.md`, `e2e-god-mode.md`                               | `no-stubs.md` (soft RECOMMENDED), `agents.md` (RECOMMENDED), `constitution.md`, `publication-quality.md`, `arxiv-submission.md` |
| Hooks     | `validate-workflow.js`, `validate-deployment.js`                                                                                   | `validate-arxiv-content.js`, `validate-publication-content.js`                                                                  |

### Shared Across Both Archetypes

| Component | Files                                                                                                |
| --------- | ---------------------------------------------------------------------------------------------------- |
| Agents    | `co-expert`, `claude-code-architect`, `gold-standards-validator`, `analyst`, `intermediate-reviewer` |
| Agents    | `todo-manager`, `gh-manager` (under `agents/management/`)                        |
| Skills    | `co-reference`, `cc-artifact-patterns`, `atelier-broker-model`                                       |
| Hooks     | `validate-bash-command.js`, `user-prompt-rules-reminder.js`, `pre-compact.js`                        |
| Rules     | `git.md`                                                                                             |

## Component Interaction Model

The flow below is a **COC coding-archetype example** — it uses the COC command flavors (`/implement`) and code-specific hooks/rules (`validate-workflow.js`, `no-stubs.md`) to make the interaction concrete. The same six-phase structure applies in any archetype; only the component names change (see `02-project-types.md` for the per-archetype substitutions).

```
Request (e.g. in a codegen project): "Create a user registration API"

1. COMMAND PHASE
   └── User runs /implement (or just asks)
   └── Command loads workspace context and picks next todo

2. SKILL PHASE
   └── Agent reads relevant skills (the domain's distilled handbooks)
   └── Gets: patterns, gotchas, canonical approaches

3. AGENT PHASE
   └── Claude delegates to specialists
   └── Gets: deep expertise, validated patterns

4. WRITING PHASE
   └── Claude writes code/docs
   └── HOOK FIRES: validate-workflow.js checks output
   └── RULE APPLIED: no-stubs.md prevents placeholders

5. REVIEW PHASE
   └── Claude delegates to reviewer
   └── RULE APPLIED: agents.md requires code review

6. COMMIT PHASE
   └── Claude delegates to security-reviewer
   └── Only after passing: offers to commit
```

## The Information Hierarchy

```
         ┌─────────────┐
         │  Commands   │  ← Quick access, workflow structure (10-50 lines)
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │   Skills    │  ← Distilled knowledge, patterns (50-250 lines)
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │   Agents    │  ← Deep expertise, procedural (100-300 lines)
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │ Full Docs   │  ← Complete reference (unlimited)
         └─────────────┘
```

Each level loads only what's needed. For simple tasks, skills are enough. For complex tasks, agents are consulted. Full documentation is referenced only when necessary.
