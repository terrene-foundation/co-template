---
applies_to:
  - "**/whatever"
description: "should also be flagged"
---

# Fixture 02 — Invalid keys in opening frontmatter

This fixture has two invalid top-level frontmatter keys (`applies_to:` and `description:`) and one valid in-body fenced YAML block that mentions `globs:`. The lint MUST flag the two opening keys at lines 2 and 4, and MUST NOT flag the in-body `globs:` example.

Body example (deliberately deeper than the second `---`):

```yaml
globs:
  - "in body, NOT flagged because i>=2 here"
```

## Test

Expected output is exactly two lines, in the order the keys appear in the opening frontmatter.
