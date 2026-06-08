# Portability — Writing Artifacts That Survive a Change of Runtime

A workspace artifact is authored in one session and read in another — possibly by a different model, a different context, or a different execution tool entirely. This guide collects the disciplines that keep an artifact actionable across that gap: write the neutral contract, not one runtime's implementation surface, so the corpus does not have to be rewritten the day a second target appears.

## Guide Index

| File                                                   | What it covers                                                                                                                                                                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [01-artifact-neutrality.md](01-artifact-neutrality.md) | Writing artifacts neutrally — the five surfaces where runtime-specific detail leaks into prose (delegation, tool nouns, baseline files, hook events, runtime mentions) and how to state the contract instead of the mechanism. |
| [02-multi-target-parity.md](02-multi-target-parity.md) | Keeping one source honest when it emits to several targets — the four invariance principles that hold the semantic body byte-stable while only surface dialect varies.                                                         |
