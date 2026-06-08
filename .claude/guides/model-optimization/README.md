# Model Optimization — Spending Capability Where It Earns Its Premium

A tiered model family is not interchangeable: a stronger tier costs more and waits longer, a faster tier is cheap and direct, and the gap between them is real money and real latency. This guide collects the heuristics for matching a task to the tier whose strengths the task actually exercises — paying the premium where failures are expensive and depth is required, and keeping the fast tier where failures are cheap and directness wins.

## Guide Index

| File                                                           | What it covers                                                                                                                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [01-model-selection-by-task.md](01-model-selection-by-task.md) | Task-category heuristics for choosing a model tier — which categories warrant the stronger tier (deep reasoning, adversarial review, high-stakes generation) and which are well served by the faster one. |
