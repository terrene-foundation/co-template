---
name: example-skill-with-bug
description: Example skill using the wrong frontmatter key for trigger phrases.
triggers: ['keyword1', 'keyword2', 'keyword3', 'keyword4']
---

# Example Skill (Buggy)

This fixture exercises the negative case for the skill frontmatter lint:
the opening frontmatter uses `triggers:` (undocumented). CC docs document
`when_to_use:` as the trigger-phrase field for skills; `triggers:` is
silently ignored.

In-the-wild bug class: 5 co-education skill files had this bug as of
2026-05-06. The lint MUST flag the `triggers:` line.
