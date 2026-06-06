# Guide 13: Agentic Architecture & Orchestration

## Introduction

This guide covers **architect-level patterns** for building and understanding agentic systems. Whether you are working with Claude Code's built-in agent system, designing multi-agent workflows, or building directly on a model API, these patterns determine whether your system works reliably at scale.

By the end of this guide, you will understand:

- The complete agentic loop lifecycle and how to implement it correctly
- Three critical anti-patterns that cause premature termination or wasted iterations
- Hub-and-spoke multi-agent orchestration and why memory isolation matters
- Task decomposition strategies and the attention dilution problem
- Session management: when to resume, fork, or start fresh
- The hooks-vs-prompts enforcement decision

---

## Part 1: The Agentic Loop

### Core Lifecycle

Every agentic system follows the same fundamental loop: send a message, check whether the model wants to use a tool, execute the tool, append results, and repeat until the model signals completion.

```python
messages = [{"role": "user", "content": "Your task here"}]

while True:
    response = client.messages.create(
        model=model,
        max_tokens=4096,
        tools=tools,
        messages=messages,
    )

    # CORRECT: check stop_reason, not content type
    if response.stop_reason == "end_turn":
        break

    if response.stop_reason == "tool_use":
        tool_results = execute_tools(response.content)
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
```

The loop is the same whether you write it yourself against an API or whether a CLI runs it for you. Understanding it is what lets you reason about why an agent stops too early, loops forever, or kills itself mid-task.

### Critical Implementation Detail: Correlating Tool Calls to Results

When you append tool results, each result **MUST be correlated** to the specific tool call it answers. The model issues one or more tool-call blocks, each with its own identifier; every result you send back must carry the matching identifier so the protocol knows which result belongs to which call.

```python
for block in response.content:
    if block.type == "tool_use":
        result = execute_tool(block.name, block.input)
        tool_results.append({
            "type": "tool_result",
            "tool_use_id": block.id,   # MUST match the originating call's id
            "content": result,
        })
```

Mismatch the identifiers and the request is rejected — the model has no way to align an unlabeled result with the call that requested it.

### The stop_reason Contract

The `stop_reason` field is the **only reliable signal** for loop control:

| stop_reason       | Meaning                                 | Action                                  |
| ----------------- | --------------------------------------- | --------------------------------------- |
| `"end_turn"`      | Model is done — no more tools needed    | Break the loop                          |
| `"tool_use"`      | Model wants to call one or more tools   | Execute tools, append results, continue |
| `"max_tokens"`    | Response hit the token limit mid-stream | Handle truncation (extend or summarize) |
| `"stop_sequence"` | A custom stop sequence matched          | Handle per your design                  |

The contract matters because it is a **protocol-level** signal, not a reading of the model's prose. The model tells you it is finished through a structured field, not by saying "I'm done." Everything in Part 2 follows from trusting that field over the text.

### How This Maps to Claude Code

Claude Code itself implements this pattern. When you give it a task:

1. Claude analyzes the request and decides what tools to use (Read, Write, Bash, Task, etc.)
2. Each tool execution is a turn in the agentic loop
3. Claude examines tool results and decides the next action
4. The loop continues until Claude determines the task is complete (`end_turn`)

When Claude spawns a subagent, that subagent runs its own independent agentic loop with the same lifecycle.

---

## Part 2: Three Critical Anti-Patterns

These three failures all share one root cause: **substituting an external heuristic for the model's own completion signal.** Each one looks reasonable in isolation and each one breaks agents in production.

### Anti-Pattern 1: Natural Language Termination

**The mistake**: Parsing the model's text output for phrases like "I'm done," "Task complete," or "Here's your answer" to decide when to stop.

**Why it fails**: The model may say "I'm done with the analysis" while still intending to call a synthesis tool. Natural language is ambiguous — "complete" might describe a subtask, not the whole task.

**The fix**: Use `stop_reason == "end_turn"` exclusively. The model signals completion through the protocol, not through prose.

### Anti-Pattern 2: Arbitrary Iteration Caps

**The mistake**: Setting `max_iterations = 10` or a similar hard cap on the loop.

**Why it fails in both directions**:

- **Too low**: Complex tasks get cut short. A 12-step investigation terminates at step 10 with partial results that look complete but are not.
- **Too high**: Wastes compute on tasks that finished at iteration 3, but the loop keeps checking.

**The fix**: Trust `stop_reason`. If you need a safety valve — and you should — make it generous (for example, 200 iterations) with a clear error message when hit, not a silent truncation that hides the problem.

### Anti-Pattern 3: Text-Content-as-Completion

**The mistake**: Checking `if response.content[0].type == "text": break` — assuming that if the model returns text, it is done.

**Why it fails**: A model returns text AND tool-use blocks in the same response. A single response might contain:

1. A text block explaining what it is about to do
2. A tool-use block requesting a tool call

Breaking on text content prevents the tool from ever executing.

```python
# WRONG — kills the agent mid-task
if response.content[0].type == "text":
    break  # the model returns text AND tool_use in the same response!

# CORRECT — model signals completion explicitly
if response.stop_reason == "end_turn":
    break
```

### The Principle

**Model-driven decision-making outperforms pre-configured decision trees.** The model knows when it is done. Your loop control should defer to that signal, not impose external heuristics. Every anti-pattern above is a different way of overriding the model's judgment with a guess made before the task started.

---

## Part 3: Multi-Agent Orchestration

### Hub-and-Spoke Topology

The dominant pattern for multi-agent systems is **hub-and-spoke**: one coordinator agent at the center, specialized subagents around the perimeter.

```
                    +-------------+
                    |  Research    |
                    |  Subagent    |
                    +------+------+
                           |
+-------------+    +------+------+    +-------------+
|  Analysis   |----| Coordinator |----|  Synthesis   |
|  Subagent   |    |   (Hub)     |    |  Subagent    |
+-------------+    +------+------+    +-------------+
                           |
                    +------+------+
                    |  Validation  |
                    |  Subagent    |
                    +-------------+
```

**Coordinator responsibilities**:

1. **Task decomposition** — Break the request into subtasks
2. **Subagent selection** — Choose which specialist handles each subtask
3. **Context passing** — Provide each subagent with the information it needs
4. **Result aggregation** — Combine subagent outputs into a coherent response

**How Claude Code implements this**: When you ask Claude Code to "research the problem, then draft the solution," it acts as the coordinator — delegating to a research subagent, then a drafting subagent, then a review subagent, passing context between each.

### Critical Memory Isolation Principle

**Subagents do NOT share memory with the coordinator or with each other.**

This is the most commonly misunderstood aspect of multi-agent systems. Each subagent:

- Starts with a fresh context window
- Does not see the coordinator's conversation history
- Does not see other subagents' inputs or outputs
- Receives only what the coordinator explicitly passes to it
- Returns only its output — the coordinator decides what to forward

**Why this matters**: If you assume subagents share context, you will pass insufficient information and get incomplete results. The coordinator must be explicit about what each subagent needs. Isolation is a feature — it keeps each subagent's context clean and focused — but it puts the burden of completeness on the coordinator's hand-off.

### Context Passing with Structured Metadata

When passing context to a subagent, use structured metadata to preserve attribution. The example below is from a research task, but the shape applies to any domain — substitute records, regulations, prior findings, or data points for "sources":

```python
subagent_context = {
    "task": "Analyze adoption trends across the surveyed regions",
    "sources": [
        {
            "reference": "Regional Outlook 2025",
            "locator": "pages 12, 15, 23",
            "key_finding": "Adoption grew 40% year over year",
        }
    ],
    "constraints": {
        "focus_areas": ["urban", "rural", "coastal", "inland"],
        "time_range": "2020-2025",
        "scope": "national",
    },
}
```

**Without structured metadata**, the subagent receives a flat summary that strips away source identifiers, locators, and specific data points. When a downstream synthesis agent later tries to cite a finding, the attribution is already gone — it was never carried across the hand-off.

### Decomposition Failures

The most insidious multi-agent failure occurs in the coordinator's task decomposition — not in any subagent's execution.

**Example**: A coordinator decomposes "produce a report on regional adoption" into:

1. Analyze the urban region → Subagent A
2. Analyze the rural region → Subagent B
3. Synthesize findings → Subagent C

**The bug**: The coordinator's decomposition omitted the coastal and inland regions. Each subagent executes perfectly. The synthesis looks complete. But the report covers only two of four areas.

**Root cause tracing**: When output is incomplete, trace backward through the coordinator's decomposition before debugging any individual subagent. The problem is usually in the plan, not the execution. A flawless subagent working on an incomplete plan still produces an incomplete result, and nothing in the subagent's output will reveal the gap — the gap is in what was never assigned.

---

## Part 4: Task Decomposition Patterns

### Fixed Sequential Pipelines

Use when the steps are **known upfront** and the problem has a predictable shape.

```
Input -> Extract -> Transform -> Validate -> Output
```

**When to use**: Document processing, structured intake, form validation — tasks where every item goes through the same stages.

**In Claude Code**: The CO six-phase workflow — `/analyze` → `/plan` → `/execute` → `/vet` → `/codify` → `/deliver` — is a fixed sequential pipeline. Each phase has known outputs that feed the next.

### Dynamic Adaptive Decomposition

Use when the **problem shape is unknown** and the steps must be discovered during execution.

```
Input -> Explore -> [Discover subproblems] -> Solve each -> Integrate
```

**When to use**: Investigation, open-ended research, exploratory analysis — tasks where you do not know what you will find.

**In Claude Code**: When you say "find out why this result is wrong," Claude cannot predefine the steps. It explores, discovers the contributing factors, and adapts its approach based on what it finds.

### Decision Framework

| Factor                    | Fixed Pipeline                    | Dynamic Decomposition       |
| ------------------------- | --------------------------------- | --------------------------- |
| Steps known upfront?      | Yes                               | No                          |
| Each item independent?    | Usually                           | Often interdependent        |
| Predictable output shape? | Yes                               | No                          |
| Example                   | "Process these 50 intake records" | "Why did the result drift?" |

### The Attention Dilution Problem

When processing **14+ items in a single pass**, analysis depth becomes inconsistent. Some items get detailed feedback while others with identical issues get minimal attention.

**Why it happens**: The model's attention distributes across all items. With many items, later items receive progressively less analytical depth — not because the model cannot analyze them, but because the effective budget for each item shrinks as the list grows.

### Multi-Pass Solution

Split a large analysis into two phases:

**Pass 1: Per-item analysis** — Process each item individually for consistent depth.

**Pass 2: Cross-item integration** — Synthesize the individual analyses into patterns, trends, and recommendations.

```python
# Instead of: analyze_all(14_items)

# Do:
per_item_results = []
for item in items:
    result = analyze_one(item)   # consistent depth
    per_item_results.append(result)

synthesis = cross_item_analysis(per_item_results)  # integration pass
```

**In Claude Code**: This is why delegating per-item analysis to a subagent is valuable — it isolates each item's analysis in its own fresh context, ensuring consistent depth, then returns a summary for the coordinator to integrate. The multi-pass structure and the memory-isolation principle from Part 3 reinforce each other here: one subagent per item gives each item a full, undiluted context budget.

---

## Part 5: Session Management

### Three Approaches

| Approach            | When to Use                                                  | Mechanism                                    |
| ------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| **Resume**          | Prior context still valid, continuing the same task          | Session continuation                         |
| **Fork**            | Need to explore a different direction from a shared baseline | Parallel branches or worktrees               |
| **Fresh + Summary** | Tool results stale, context degraded, or switching focus     | New session with a findings summary injected |

### Resume: Continuing a Session

Resume when:

- You are picking up where you left off
- No external changes invalidated the context
- The task is the same as before

**The stale context trap**: If you resume a session after modifying files externally (in another terminal, editor, or session), the agent may give contradictory advice based on cached tool results that no longer reflect reality.

**Fix**: Either inform the agent explicitly about what changed ("I modified files X, Y, Z since last session") or start fresh with a summary.

### Fork: Divergent Exploration

Fork when:

- You want to explore an alternative approach without losing the current one
- Multiple independent investigations should proceed in parallel
- You need to compare the outcomes of different strategies

**In Claude Code**: Working in parallel branches or separate worktrees is a form of forking — each session works independently from a shared baseline, and you compare the results afterward.

### Fresh Start with Summary Injection

Use fresh + summary when:

- Tool results are stale (files changed externally)
- Context has degraded (a long session with accumulated noise)
- You are switching to a different phase of work

**Pattern**: Extract the key findings from the prior session into a structured summary, then inject it at the start of a new session:

```markdown
## Context from Prior Session

### Key Findings

- The bottleneck is in the intake step — it reprocesses every record
- The validation pass adds noticeable latency on each item
- Output volume is roughly 5x the target

### Decisions Made

- Will batch the intake step rather than process item-by-item
- Will cache the validation result instead of recomputing it

### Open Questions

- Keep the cache in memory, or persist it between runs?
```

**In Claude Code**: The `/wrapup` command generates `.session-notes` — a structured summary for exactly this purpose. The next session's startup hook reads and displays these notes automatically, so the new session begins with the prior session's findings already in hand.

---

## Part 6: Workflow Enforcement — Hooks vs Prompts

### The Decision Framework

| Enforcement Type         | Mechanism                         | Reliability            | Use When                                 |
| ------------------------ | --------------------------------- | ---------------------- | ---------------------------------------- |
| **Prompt-based**         | Instructions in a prompt or rule  | Works ~95% of the time | Formatting preferences, style guidelines |
| **Programmatic (hooks)** | Code that runs before/after tools | Works 100% of the time | Safety, security, compliance, finance    |

**The decision rule**: If a single failure causes real harm — costs money, creates a security incident, or violates compliance — use programmatic enforcement. Everything else can be prompt-based.

A prompt instruction is **probabilistic guidance**: the model follows it almost always, but "almost always" is not a guarantee, and the rare miss is unpredictable. A hook is **deterministic enforcement**: it is code that runs every time, regardless of what the model decides. The question is never "is this important?" — it is "what does a single failure cost?" For a style preference, a 5% miss rate is invisible. For an irreversible or harmful action, a 5% miss rate is unacceptable.

For the full hook event model and the configured hooks in this setup, see [Guide 07 — The Hook System](07-the-hook-system.md), Part 10.

### Structured Handoff for Human Escalation

When an agent escalates to a human, the human does NOT have access to the conversation transcript. The hand-off must be self-contained — it has to carry everything the human needs to act, because the context that produced it is not available to them:

```markdown
## Escalation Hand-off

- **Subject**: Item #8891 flagged for manual review
- **Summary**: Automated checks passed, but the item exceeds the
  threshold for unattended approval
- **Finding**: The discrepancy traces to the source record, not to
  a processing error
- **Recommended action**: Approve per standard policy (under-threshold
  items auto-approve; this one is over)
- **Urgency**: Normal
- **Reference**: Item #8891, source record attached
```

This is the same self-containment principle as memory isolation in Part 3 and summary injection in Part 5: whenever context does not cross a boundary automatically — between subagents, between sessions, or between an agent and a human — the hand-off itself must carry everything the recipient needs.

**In Claude Code**: The `/wrapup` command creates a similar hand-off — a self-contained summary that the next session (human or AI) can act on without the original conversation context.

---

## Part 7: Practice Exercises

### Test Your Understanding

1. A loop uses `if "done" in response.text.lower(): break`. What is wrong?
   - **Answer**: Natural language termination. Use `stop_reason == "end_turn"` instead.

2. A coordinator spawns three subagents. Subagent B needs information from Subagent A's output. How should this be handled?
   - **Answer**: The coordinator must receive A's output first, then explicitly pass the relevant findings to B. Subagents do not share memory.

3. A research agent analyzes 20 documents in one pass. The first five get detailed analysis; the last five get one-line summaries. Why?
   - **Answer**: Attention dilution. Use multi-pass — analyze each document individually, then synthesize.

4. After modifying three files in an external editor, you resume a session. The agent suggests changes that conflict with your edits. What happened?
   - **Answer**: Stale context. The session cached the old file contents. Start fresh with summary injection, or explicitly tell the agent what changed.

5. An approval agent has a prompt instruction: "Never approve items over the threshold." It approves an over-threshold item anyway. How do you fix this?
   - **Answer**: Prompt instructions are probabilistic. Use a hook that programmatically blocks the approval action when the value exceeds the threshold.

### Build Exercise

Design a coordinator with:

- Two subagents (research + synthesis)
- Structured context passing with source attribution
- A programmatic prerequisite gate (must have three or more sources before synthesis)
- A hook that logs all artifact modifications

Sketch the architecture and identify: where does each piece of information live? What happens when the research subagent finds only two sources?

---

## Quick Reference

| Concept                | Key Principle                                             |
| ---------------------- | --------------------------------------------------------- |
| **Loop control**       | Use `stop_reason`; never parse text or cap iterations     |
| **Multi-agent memory** | Subagents are isolated — pass context explicitly          |
| **Task decomposition** | Trace failures to the coordinator's plan first            |
| **Attention dilution** | >14 items → multi-pass (per-item, then cross-item)        |
| **Session management** | Resume (same task), fork (diverge), fresh (stale context) |
| **Enforcement**        | Harm/security/compliance → hooks; style → prompts         |

---

## Navigation

- **Previous**: [12 - Troubleshooting](12-troubleshooting.md)
- **Next**: [14 - Tool Design Patterns](14-tool-design-patterns.md)
- **Home**: [README.md](README.md)
