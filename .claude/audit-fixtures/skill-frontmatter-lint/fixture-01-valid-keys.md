---
name: example-skill
description: Example skill with valid frontmatter keys.
allowed-tools:
  - Read
  - Glob
---

# Example Skill

This fixture exercises the positive case for the skill frontmatter lint:
`name`, `description`, `allowed-tools` are all in the documented allowlist
per https://code.claude.com/docs/en/skills §"Frontmatter reference". The
lint MUST produce zero output.
