# Claude Code Guides — Architect-Level Patterns

Framework-neutral Claude Code patterns distilled for atelier (the CO + CC methodology
authority). These guides describe agentic patterns that hold for ANY domain — research,
finance, education, governance, codegen — consistent with atelier's domain-independence
mandate (`rules/domain-independence.md`).

> History: a 13-part framework-specific SDK onboarding manual previously lived here. It was removed in
> the 1.5.0 red-team pass because framework-specific onboarding contradicts atelier's
> agnostic-authority identity (`rules/independence.md`, `rules/domain-independence.md`); that
> audience is served by loom and its USE templates. The four pattern guides below are
> framework-neutral and stay. The removed files remain recoverable from git history.

## Guide Index

| Guide                                                                       | Description                                                                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **[13 - Agentic Architecture](13-agentic-architecture.md)**                 | Agentic loops, multi-agent orchestration, memory isolation, task decomposition, session management. The foundational architect pattern. |
| **[14 - Tool Design Patterns](14-tool-design-patterns.md)**                 | Tool descriptions as selection mechanism, the 4-5 tool limit, tool_choice modes, structured errors, MCP configuration.                  |
| **[15 - Prompt Engineering & Structured Output](15-prompt-engineering.md)** | Explicit criteria, few-shot examples, JSON schema design, validation-retry loops, batch processing, multi-instance review.              |
| **[16 - Context Management & Reliability](16-context-reliability.md)**      | Progressive summarization trap, lost-in-the-middle effect, escalation triggers, error propagation, information provenance.              |

## Related

- `skills/cc-artifact-patterns/` — CC artifact quality (agents, skills, rules, commands, hooks)
- `skills/cc-orchestration-patterns/` — multi-agent orchestration across CO phases
- `skills/command-authoring/`, `skills/skill-authoring/` — authoring discipline
- `rules/cc-artifacts.md` — CC artifact hard limits
