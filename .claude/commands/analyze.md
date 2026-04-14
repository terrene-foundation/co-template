---
name: analyze
description: Research and understand the problem space. Gather information, identify constraints, map the landscape.
argument-hint: "[topic or question]"
---

# /analyze $ARGUMENTS

Research and analyze **$ARGUMENTS** thoroughly.

## Protocol

1. **Find the active workspace** by checking `workspaces/` for the most recently modified project
2. **Read the project brief** if one exists in the workspace
3. **Research the topic**: gather relevant information, identify key sources, map competing approaches
4. **Identify constraints**: what limits apply? What standards must be met?
5. **Document findings** in `01-research/`

## Output

Save a structured analysis to `01-research/analysis-[topic-slug].md`:

```markdown
# Analysis: $ARGUMENTS

Date: [today]

## Key Findings

[What you discovered]

## Sources and References

[Where the information comes from]

## Constraints and Considerations

[What limits or standards apply]

## Recommendations

[What the human should consider for the next phase]
```

### 6. Create specs/ (MUST — before vet)

Create `specs/` at the project root with detailed domain specification files organized by domain ontology (components, modules, features, user needs — NOT by process stages). See `rules/specs-authority.md`.

1. **Create `specs/_index.md`** — manifest listing every spec file with domain and one-line description
2. **Create domain spec files** — one per major domain area. Each must be detailed enough to be the authority on its topic.
3. **Brief traceability** — for each requirement in the brief, confirm a corresponding spec section exists. Missing mappings are BLOCKING.

## Journal Entry

Record key findings, discoveries, or constraints in `journal/`. Type: DISCOVERY or GAP.

## Next Step

After analysis, recommend `/plan` to create a structured plan based on findings.
