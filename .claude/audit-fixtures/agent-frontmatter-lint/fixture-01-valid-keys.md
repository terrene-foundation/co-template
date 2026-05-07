---
name: example-agent
description: Example agent with valid frontmatter keys only.
tools:
  - Read
  - Glob
  - Grep
model: inherit
---

# Example Agent

This fixture exercises the positive case for the agent frontmatter lint:
the opening frontmatter contains only documented keys (`name`, `description`,
`tools`, `model`) per https://code.claude.com/docs/en/sub-agents. The lint
MUST produce zero output.
