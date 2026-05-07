# /example-command (No Frontmatter)

This fixture exercises empty-frontmatter handling. There is no opening
`---` block. The command works with defaults (name from filename,
description from first paragraph). The lint MUST NOT flag — `i` stays
0 and the predicate `i==1` is never true.
