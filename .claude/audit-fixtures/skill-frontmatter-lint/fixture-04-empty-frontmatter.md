# Example Skill (No Frontmatter)

This fixture exercises empty-frontmatter handling. There is no opening
`---` block. CC infers the skill `name` from the directory and uses the
first paragraph as the `description`. The lint MUST NOT flag — `i` stays
0 and the predicate `i==1` is never true.

This guards against a regression where the lint flags simple skills that
intentionally rely on directory-name + first-paragraph defaults.
