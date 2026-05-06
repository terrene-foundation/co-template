---
globs:
  - "**/foo"
---

# Fixture 03 — Historical regression catch (the original bug)

This fixture reproduces the 2026-04-07 bug shape: a rule with `globs:` in opening frontmatter (silently treated as no-frontmatter, loading the rule globally). The generalized lint MUST catch this — it must not regress against the original bug class.

## Test

Expected output: one line, the `globs:` key at line 2.
