# English transcript of the thesis

This folder is an English summary of the Master's thesis *"VibeCoding Security
Benchmark"* (Carlos Salas Eiroa, supervised by Sergio Ruíz Villafranca). The
authoritative document is the Spanish LaTeX memoir kept outside the repository in
`doc/latex/`; everything here is a condensed translation of it, written so the
project can be read and reproduced without Spanish.

Where the Spanish original reproduces full prompts, code listings or screenshots,
this transcript points at the artefact in the repository instead of copying it.

## Contents

| # | Document | What it covers |
|---|----------|----------------|
| — | [Abstract](00-abstract.md) | Abstract and keywords |
| 1 | [Introduction and motivation](01-introduction.md) | Vibe coding, the security gap, the contribution |
| 2 | [State of the art](02-state-of-the-art.md) | Prior work on AI code security and on benchmarking |
| 3 | [Objectives and limitations](03-objectives-and-limitations.md) | O1–O8 and the declared scope |
| 4 | [Tools and prior concepts](04-tools-and-concepts.md) | Toolchain per phase, and the nine attack techniques |
| 5 | [Solution design](05-solution-design.md) | Modular architecture, template, container, audit harness |
| 6 | [AI-generated code](06-generated-code.md) | What each model produced, round by round |
| 7 | [Vulnerability analysis](07-vulnerability-analysis.md) | The nine attacks, attack by attack, with evidence |
| 8 | [Security guidance and improvement analysis](08-guidelines-and-improvement.md) | The remediation rounds and guidelines D1–D7 |
| 9 | [Conclusions and future work](09-conclusions.md) | Findings, contributions, open lines |
| A | [Specification and prompts](A-specification-and-prompts.md) | What was handed to the models, and the generation protocol |
| B | [Testbed manual](B-testbed-manual.md) | Install, add an implementation, run the audit |
| C | [Repository and source code](C-repository-and-source.md) | Where the thirty implementations live |
| — | [Results](results.md) | All result matrices in one place |

## Conventions

- **"Secure"** means the implementation defended the attack; **"vulnerable"**
  means the attack succeeded.
- Attacks are identified by number only: the `1.x` and `2.x` series target
  authentication, `3.x` the profile module, `4.x` the cart and checkout.
- Rounds are **R0** (baseline), **R1** (generic directive), **R3a** (own
  vulnerability report) and **R3b** (report plus documented environment
  contract).
- `gpt` is a deliberately vulnerable reference implementation used as the
  positive control of the measuring instrument. It is **not** an evaluated model
  and never enters a model-to-model comparison.
