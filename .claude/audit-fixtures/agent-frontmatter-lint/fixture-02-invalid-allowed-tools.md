---
name: example-agent-with-bug
description: Example agent using the wrong frontmatter key for tool restriction.
allowed-tools:
  - Read
  - Glob
  - Grep
model: inherit
---

# Example Agent (Buggy)

This fixture exercises the negative case for the agent frontmatter lint:
the opening frontmatter uses `allowed-tools:` instead of `tools:`. CC docs
document `tools:` as the agent restriction key; `allowed-tools:` is the
SKILLS frontmatter key, silently ignored when applied to an agent.

In-the-wild bug class: 1 atelier agent (co-expert.md) and 6 co-research
agents had this bug as of 2026-05-06. The lint MUST flag the
`allowed-tools:` line.
