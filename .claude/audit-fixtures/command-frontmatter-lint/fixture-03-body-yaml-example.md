---
name: example-command-with-body-block
description: Valid command whose body contains a fenced YAML example with the wrong key.
---

# /example-command (Block-Scoping Test)

This fixture exercises the block-scoping invariant. The opening frontmatter
uses only valid keys. The body below contains a fenced YAML block showing
the wrong-key bug as a teaching example — that block has `i>=2` and the
lint MUST NOT flag it.

```yaml
# DO NOT — wrong key for command (subagent CLI flag, not file frontmatter)
---
name: bad-command
prompt: "this belongs in the body, not in opening frontmatter"
---
```

The body example uses `prompt:`, but the lint's `i==1` predicate restricts
matching to the opening frontmatter block only.
