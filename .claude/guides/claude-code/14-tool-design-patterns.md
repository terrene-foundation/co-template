# Guide 14: Tool Design & MCP Integration

## Introduction

Tools are how an agent interacts with the world. The quality of your tool design directly determines how reliably the agent selects the right tool, interprets results, and recovers from errors. This guide covers architect-level patterns for tool design, error handling, and MCP (Model Context Protocol — the open standard for connecting an agent to external tools and data sources) server integration.

By the end of this guide, you will understand:

- Why tool descriptions are the primary selection mechanism (not human documentation)
- The empirical 4-5 tool limit per agent and strategies for working within it
- How `tool_choice` modes control agent behavior
- Structured error responses that enable intelligent recovery
- MCP server configuration patterns for teams
- Built-in tool selection strategies for navigating a body of files

---

## Part 1: Tool Descriptions as Selection Mechanism

### The Core Principle

Tool descriptions are **NOT documentation for humans**. They are the **PRIMARY mechanism the model uses to decide which tool to call**. The model reads every tool description on every turn and selects based on semantic matching between the request and the available descriptions.

### The Misrouting Problem

Two tools with similar descriptions cause systematic misrouting. The example below is from a records system, but the failure shape is universal — substitute "regulations," "prior findings," or "data points" for the entities and the trap is identical:

```python
# BAD — nearly identical descriptions cause confusion
tools = [
    {
        "name": "get_participant",
        "description": "Retrieves participant information from the registry"
    },
    {
        "name": "lookup_submission",
        "description": "Retrieves submission information from the registry"
    }
]
# Agent routes "check the status of submission #12345" to get_participant — wrong!
```

**Four attempted fixes** (only one is correct):

| Fix                     | Approach                                  | Why It's Wrong/Right                           |
| ----------------------- | ----------------------------------------- | ---------------------------------------------- |
| Few-shot examples       | Add routing examples to the system prompt | Token overhead, doesn't generalize             |
| Routing classifier      | Pre-classify intent before tool selection | Over-engineered, adds latency                  |
| Tool consolidation      | Merge into one `get_entity` tool          | Wrong problem — tools serve different purposes |
| **Better descriptions** | **Rewrite to differentiate**              | **Correct — 30 minutes vs 3 days**             |

### Good Description Components

A good tool description includes:

1. **What the tool does** (action + data type)
2. **Expected inputs** (with types and constraints)
3. **Example requests it handles** (2-3 representative cases)
4. **Edge cases** (what it returns when data is missing)
5. **Explicit boundaries** (what it does NOT do, especially vs similar tools)

```python
tools = [
    {
        "name": "get_participant",
        "description": (
            "Retrieves a participant's profile including name, affiliation, "
            "contact details, and registration status. Use when the request "
            "asks WHO a participant is, their contact details, or their "
            "registration status. Does NOT return submission history — use "
            "lookup_submission for that. Input: participant_id (string). "
            "Returns null if the participant is not found."
        )
    },
    {
        "name": "lookup_submission",
        "description": (
            "Retrieves submission details including title, contents, review "
            "stage, and decision status. Use when the request asks about a "
            "specific submission, its review stage, decision status, or "
            "revision eligibility. Input: submission_id (string, format: "
            "SUB-XXXXX). Returns null if the submission is not found — "
            "distinct from an access failure."
        )
    }
]
```

### System Prompt Conflicts

If your system prompt says "always use get_participant first" but the tool description says "use for participant profiles only," the model receives contradictory signals. **Tool descriptions win in practice** because they are evaluated at selection time, while system-prompt instructions compete with the full conversation context.

**Rule**: Don't put tool routing logic in the system prompt. Put it in the tool descriptions.

---

## Part 2: The 4-5 Tool Limit

### The Empirical Degradation Curve

| Tool Count | Selection Accuracy | Notes                                                                |
| ---------- | ------------------ | -------------------------------------------------------------------- |
| 1-5        | ~95-99%            | Optimal range. Descriptions can be moderate quality.                 |
| 6-10       | ~90-95%            | Still good. Clear descriptions with disambiguation required.         |
| 11-15      | ~80-90%            | Noticeable degradation. Negative routing becomes essential.          |
| 16-18      | ~70-80%            | Marginal. Some misrouting expected even with excellent descriptions. |
| 19+        | <70%               | Unreliable. The model confuses semantically similar tools regularly. |

The inflection point is around 15-18 tools. Beyond this, even perfect descriptions cannot overcome the combinatorial disambiguation challenge.

### The Optimal Range

**4-5 tools per agent** is the sweet spot. This gives enough capability for specialized work while maintaining high selection accuracy.

### Strategies for Working Within the Limit

**Strategy 1: Scope agents narrowly**

```
# Instead of: one agent with 18 tools
research_agent    → [web_search, read_doc, fetch_url, summarize]       # 4 tools
analysis_agent    → [query_records, run_stats, build_summary, export]  # 4 tools
action_agent      → [notify, create_task, update_record, escalate]     # 4 tools
```

**Strategy 2: High-frequency simple operations get scoped tools**

If 85% of fact verifications are simple registry lookups, give the synthesis agent a scoped `verify_fact` tool directly — don't route through the coordinator. Reserve the coordinator for the complex 15%.

```
# 85% simple lookups → direct tool on the synthesis agent
synthesis_agent.tools = [synthesize, verify_fact, format_output]

# 15% complex queries → routed through the coordinator to the analysis agent
coordinator routes complex queries to analysis_agent
```

This eliminates 2-3 round trips per task for the common case.

### How This Applies to Claude Code

Claude Code's built-in tools (Read, Write, Edit, Bash, Grep, Glob, Task) are already within the optimal range for general work. When Claude delegates to a subagent, that subagent receives a scoped subset of tools matching its specialization — which is exactly the narrow-scoping strategy applied automatically.

---

## Part 3: tool_choice Modes

### Three Modes

The `tool_choice` parameter controls whether and how the model is required to call a tool on a given turn:

```python
# AUTO (default): the model decides whether to use a tool
response = client.messages.create(
    tool_choice={"type": "auto"},  # May return text OR a tool call
    ...
)

# ANY: force a tool call — the model picks which one
response = client.messages.create(
    tool_choice={"type": "any"},  # MUST call a tool. Guaranteed structured output.
    ...
)

# FORCED: must call this specific tool
response = client.messages.create(
    tool_choice={"type": "tool", "name": "extract_metadata"},
    ...
)
```

### When to Use Each

| Mode              | Use Case                                 | Example                                     |
| ----------------- | ---------------------------------------- | ------------------------------------------- |
| **auto**          | Most agentic work — let the model decide | General assistants, multi-step tasks        |
| **any**           | Need guaranteed structured output        | Data extraction, form filling               |
| **tool (forced)** | Single-purpose extraction step           | "Always extract metadata using this schema" |

### The auto Trap

With `auto`, the model might return text instead of calling a tool. This is usually correct behavior — the model determined it could answer directly. But if you always need structured output, use `any` or `tool` to guarantee it.

---

## Part 4: Structured Error Responses

### Four Error Categories

Not all errors are the same. Each requires a different handling strategy:

| Category       | Example                                  | Retryable? | Agent Action          |
| -------------- | ---------------------------------------- | ---------- | --------------------- |
| **Transient**  | Timeout, service unavailable, rate limit | Yes        | Wait and retry        |
| **Validation** | Bad input format, missing required field | After fix  | Fix input, then retry |
| **Business**   | Request exceeds policy, record locked    | No         | Alternative workflow  |
| **Permission** | Access denied, insufficient role         | No         | Escalate to a human   |

### Access Failure vs Valid Empty Result

**This distinction is critical.** A tool returns an empty array — is that:

- An unreachable registry (transient error)?
- A participant that doesn't exist (valid empty result)?

Treating both identically causes the agent to retry 3 times on a non-existent participant, then escalate to a human for a simple "not found" case.

### Structured Error Metadata

```python
# Good: structured error with metadata
{
    "status": "error",
    "errorCategory": "transient",
    "isRetryable": True,
    "message": "Registry connection timeout after 5s",
    "suggestedAction": "retry_after_delay",
    "retryAfterMs": 2000
}

# Good: valid empty result (NOT an error)
{
    "status": "success",
    "data": [],
    "message": "No matching participants found for query 'jordan.lee@example.org'"
}

# Bad: ambiguous empty result
[]  # Is this an error or a valid empty? The agent can't tell.
```

### Multi-Agent Error Propagation

When a subagent fails, it must report structured context — not just "error":

```python
subagent_error = {
    "status": "partial_failure",
    "failure_type": "transient",
    "what_was_attempted": "Fetch submission details for SUB-8891",
    "partial_results": {"participant_id": "p_8891", "submitted_on": "2025-03-03"},
    "missing_data": ["review_notes", "decision_status"],
    "potential_alternatives": ["Retry after 5s", "Use cached record from 2h ago"]
}
```

The coordinator can then decide: retry, reroute, or proceed with partial results and annotate the gaps. This is the same self-containment principle that governs every context hand-off — the failing subagent's context is not visible to the coordinator, so the failure report itself must carry everything the coordinator needs to act.

---

## Part 5: MCP Configuration

### Two Configuration Levels

MCP servers can be declared at two levels, and the choice determines who gets the tools:

```json
// .mcp.json — Project-level (version-controlled, shared with the team)
{
  "mcpServers": {
    "issue-tracker": {
      "command": "npx",
      "args": ["-y", "@org/mcp-server-issues"],
      "env": {
        "ISSUE_TRACKER_TOKEN": "${ISSUE_TRACKER_TOKEN}"
      }
    }
  }
}
```

```json
// ~/.claude.json — User-level (personal, not shared)
{
  "mcpServers": {
    "personal-notes": {
      "command": "node",
      "args": ["/home/me/mcp-notes/server.js"]
    }
  }
}
```

Note the `${ISSUE_TRACKER_TOKEN}` syntax: the project file references an environment variable rather than hardcoding the secret, so the shared config stays version-control-safe while each person supplies their own credential.

### The New-Team-Member Trap

Contributor A has perfect tool access (configured in `~/.claude.json`). Contributor B joins, clones the repo, and gets no MCP tools. Same repo, same code — different experience.

**Root cause**: The config lives on A's machine only.
**Fix**: Move it to `.mcp.json` (project-level, version-controlled). Takes 30 seconds. Finding the root cause takes much longer.

### Build vs Use Decision

| Situation                                  | Decision                                        |
| ------------------------------------------ | ----------------------------------------------- |
| Standard integration (issue tracker, docs) | Use a community-maintained MCP server           |
| Custom internal data source                | Build a custom MCP server                       |
| Standard integration + custom workflow     | Start with a community server, extend if needed |

**Rule of thumb**: Don't build what the community already maintains.

---

## Part 6: Built-in Tool Patterns

### Grep vs Glob

Claude Code ships two search tools that answer different questions — one searches inside files, the other searches over file names:

| Tool     | Searches          | Use For                                                     |
| -------- | ----------------- | ----------------------------------------------------------- |
| **Grep** | File **contents** | Finding where a term is referenced, a phrase, a citation    |
| **Glob** | File **paths**    | Finding `**/*.spec.md`, all journal entries, specific types |

```
# Find every place a rule is referenced
Grep: pattern="specs-authority" → shows files and lines

# Find all spec files
Glob: pattern="specs/**/*.md" → shows file paths
```

### File-Exploration Strategy

**Wrong**: Read every file upfront. This kills the context budget before the actual work begins.

**Right**: Progressive narrowing.

```
1. Grep for entry-point keywords → find the relevant files
2. Read the most relevant file → understand the structure
3. Grep for references/dependencies → trace the connections
4. Read only the connected files → build targeted understanding
```

**The Explore subagent**: For broad exploration across a large body of files, use the Explore agent type. It isolates verbose discovery output from your main conversation context, preventing discovery noise from consuming the token budget needed for the actual work. This is the memory-isolation benefit applied to search: the coordinator gets a clean summary, not the full transcript of the hunt.

---

## Part 7: Practice Exercises

### Test Your Understanding

1. Two tools both have the description "Retrieves entity information." The agent misroutes 40% of calls. What's the fix?
   - **Answer**: Rewrite the descriptions with explicit differentiation — what each handles, and the boundary against the other.

2. An agent has 18 tools and selection accuracy dropped to 70%. How do you fix this?
   - **Answer**: Split it into 3-4 specialized subagents with 4-5 tools each.

3. A tool returns `[]`. The agent retries 3 times, then escalates. The participant simply doesn't exist. What went wrong?
   - **Answer**: No distinction between an access failure and a valid empty result. Add structured error metadata with an `errorCategory`.

4. Contributor B has no MCP tools despite cloning the repo. Contributor A's setup works fine. Root cause?
   - **Answer**: The MCP config is in A's `~/.claude.json` (user-level) instead of `.mcp.json` (project-level).

5. You need the model to always return structured output. Which `tool_choice` mode?
   - **Answer**: `{"type": "any"}` forces a tool call. Or `{"type": "tool", "name": "extract"}` for a specific schema.

### Build Exercise

Design 3 MCP tools where two have ambiguous overlap:

1. Write the initial (bad) descriptions that cause misrouting.
2. Rewrite them with proper differentiation.
3. Write structured error responses for all four categories (transient, validation, business, permission).
4. Create a `.mcp.json` configuration with environment-variable expansion for the credential.

---

## Quick Reference

| Concept               | Key Principle                                                                 |
| --------------------- | ----------------------------------------------------------------------------- |
| **Tool descriptions** | Written for the model, not humans. Include what, inputs, examples, boundaries |
| **Tool limit**        | 4-5 per agent. Split larger sets into specialized subagents                   |
| **tool_choice**       | auto (default), any (force a tool call), tool (force a specific tool)         |
| **Error categories**  | Transient, validation, business, permission — each needs different handling   |
| **Empty results**     | Distinguish an access failure from a valid empty — use structured metadata    |
| **MCP config**        | Project-level (.mcp.json) for the team, user-level (~/.claude.json) personal  |
| **Grep vs Glob**      | Grep = contents, Glob = paths                                                 |
| **Exploration**       | Progressive narrowing, not read-everything-first                              |

---

## Navigation

- **Previous**: [13 - Agentic Architecture](13-agentic-architecture.md)
- **Next**: [15 - Prompt Engineering](15-prompt-engineering.md)
- **Home**: [README.md](README.md)
