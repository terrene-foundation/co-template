# Example Agent (No Frontmatter)

This fixture exercises empty-frontmatter handling. There is no opening
`---` block at all. CC treats this agent as using the default frontmatter
(name from filename, description from first paragraph, all tools inherited).
The lint MUST NOT flag — `i` stays 0 and the predicate `i==1` is never true.

This test guards against a regression where the lint flags global rules
or simple agents that intentionally use frontmatter defaults.
