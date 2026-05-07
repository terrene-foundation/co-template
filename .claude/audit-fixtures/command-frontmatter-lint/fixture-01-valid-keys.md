---
name: example-command
description: Example slash command with valid frontmatter keys.
argument-hint: "[issue-number]"
---

# /example-command

This fixture exercises the positive case for the command frontmatter lint.
Per https://code.claude.com/docs/en/skills §"Custom commands have been
merged into skills", commands and skills share the same frontmatter
allowlist. The lint MUST produce zero output.
