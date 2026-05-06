# Fixture 04 — Empty (no) frontmatter

This fixture has NO opening `---` block at all. It represents global rules like `communication.md`, `git.md`, `independence.md` that intentionally apply universally and rely on the absence of frontmatter to load in every session's baseline.

The lint must produce empty output — `i` never reaches 1, the match predicate never fires.

A body reference to `globs: in prose` should not flag.

```yaml
applies_to:
  - "in body fenced YAML, also not flagged"
```
