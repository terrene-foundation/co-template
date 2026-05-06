---
paths:
  - "**/foo"
  - "**/bar"
---

# Fixture 01 — Valid paths-only frontmatter

This fixture has well-formed opening frontmatter using the only allowlisted top-level key (`paths:`). The body contains in-line references to `description:` and `globs:` as text but no fenced YAML — these should NOT be flagged because they are not at column 1 of opening frontmatter.

A reference to `description: in body prose like this` should not flag.

## Test

The lint must produce empty output on this fixture.
