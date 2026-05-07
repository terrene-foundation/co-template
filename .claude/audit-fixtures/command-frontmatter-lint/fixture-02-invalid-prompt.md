---
name: example-command-with-bug
description: Example command using the wrong frontmatter key.
prompt: "You are a senior code reviewer."
---

# /example-command (Buggy)

This fixture exercises the negative case for the command frontmatter lint.
The opening frontmatter uses `prompt:`, which is the field name for the
subagent CLI flag (`claude --agents '{"name": {..., "prompt": "..."}}'`)
but is NOT a valid key for command file frontmatter. The body becomes the
prompt for command files; `prompt:` in opening frontmatter is silently
ignored.

Plausible-typo case (no in-the-wild example yet — added defensively to
catch the class of "subagent CLI key applied to command file"). The lint
MUST flag the `prompt:` line.
