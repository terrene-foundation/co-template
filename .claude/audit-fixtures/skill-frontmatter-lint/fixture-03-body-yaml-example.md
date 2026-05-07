---
name: example-skill-with-body-block
description: Valid skill whose body contains a fenced YAML example with the wrong key.
allowed-tools:
  - Read
---

# Example Skill (Block-Scoping Test)

This fixture exercises the block-scoping invariant. The opening frontmatter
uses only valid keys. The body below contains a fenced YAML block showing
the wrong-key bug as a teaching example — that block has `i>=2` and the
lint MUST NOT flag it.

```yaml
# DO NOT — wrong key for skill (undocumented)
---
name: bad-skill
triggers: ['foo', 'bar', 'baz', 'qux']
---
```

The body example uses `triggers:`, but the lint's `i==1` predicate
restricts matching to the opening frontmatter block only.
