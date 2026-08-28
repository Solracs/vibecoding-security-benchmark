# 2. State of the art

Software development is transitioning towards AI-assisted and AI-automated
workflows, with tools such as GitHub Copilot, ChatGPT, Claude and Gemini actively
participating in the writing of source code. This chapter reviews two axes that
converge in this work — the empirical evidence on the security (and insecurity) of
LLM-generated code, and the landscape of evaluation benchmarks — and then
positions the contribution.

## 2.1 Security of AI-generated code

The seminal work is Pearce et al. (2022), which systematically evaluated GitHub
Copilot contributions across scenarios built around CWE weaknesses. Their
finding — roughly **40 % of generated programs were vulnerable in
security-sensitive contexts** — set a reference point that later work has refined
and confirmed. Fu et al. (2025) carried the analysis from synthetic scenarios to
real GitHub projects, showing the weaknesses are not a laboratory artefact but
persist in effectively published code. Khoury et al. (2023) examined ChatGPT's
output and observed that the model frequently produced insecure code and, while
able to fix it once the flaw was pointed out, did not avoid it proactively.

Human-factor studies add an important and not uncontroversial nuance. Perry et
al. (2023) ran a user study in which AI-assisted participants wrote measurably
less secure code than the control group and, on top of that, expressed greater
confidence in its correctness. In the opposite direction, Sandoval et al. (2023)
measured a considerably weaker effect in a comparable study, without such marked
differences. Far from invalidating the concern, this discrepancy underlines how
sensitive the results are to experimental design — task, language, model,
participant profile — and hence the need for controlled, reproducible evaluation
environments such as the one proposed here.

## 2.2 Evaluation and benchmarking of code-generating models

In parallel, the evaluation of code-generating models has matured around
*functional correctness*. Benchmarks such as HumanEval, MBPP, its revision
EvalPlus and, for more realistic tasks, SWE-bench share a common approach: they
check whether the generated code passes a test battery verifying expected
behaviour. Their usefulness is undeniable, but they share a root limitation for
the purpose of this work: **they measure whether the program does what it should,
not whether it does it securely**. A fragment can pass every functional test and
be simultaneously vulnerable to injection or privilege escalation, because
functional tests do not exercise the attacker: they check what the program does
with the inputs the developer anticipated, not what someone achieves by
deliberately sending the ones they did not. There is no case in the battery
written to break it.

A second family of benchmarks addresses this gap directly. Datasets such as
SecurityEval or LLMSecEval, and evaluation frameworks such as SALLM or
CyberSecEval, propose batteries of prompts and fragments labelled with the
weaknesses one would expect. These resources are valuable, but they operate
mostly at the level of an isolated fragment and rely on static analysis. By their
nature they can hardly capture vulnerabilities that only emerge from the
interaction of components in a *running* application. A race condition only
appears when two requests arrive at once; an authorisation failure only manifests
when a user reaches, from one route, a resource belonging to another. Neither can
be reproduced on a code fragment evaluated in isolation.

A recent and especially relevant exception is **BaxBench** (Vero et al., 2025),
which asks models to generate complete backend applications and runs real
exploits against them, compromising roughly half of the programs that were
functionally correct. BaxBench demonstrates the value of dynamic,
exploitation-oriented evaluation. However, because the whole application is
generated end to end, correctness and security become entangled with the model's
own architectural decisions, which makes it hard to attribute a given
vulnerability to a well-delimited slice of logic and to compare implementations
on a common basis.

It should also be noted that virtually all of these frameworks measure code
*generation* and not *remediation*. The question of what happens when a model is
told about a concrete defect in its own code — and how much detail that telling
requires — remains largely unexplored. That is the second dimension this work
addresses.

## 2.3 Reference taxonomies

To classify vulnerabilities rigorously and comparably, this work relies on two
widely accepted industry taxonomies. The **OWASP Top 10** groups the most
critical web application risks into ten categories; especially relevant here are
A01:2021 (Broken Access Control), A03:2021 (Injection) and A04:2021 (Insecure
Design). The **CWE** catalogue offers a fine-grained enumeration of weakness
types (for example CWE-89 for SQL injection or CWE-22 for path traversal) that
allows precise identification. From it derives the annual **CWE Top 25** ranking,
relevant for weighing the severity of the findings: seven of the nine weaknesses
exercised in this work — notably CWE-79, CWE-89, CWE-22, CWE-362 and CWE-434 —
appear in that ranking, so the attacks used are not laboratory cases but the
categories most frequently exploited in real systems. Complementarily, the OWASP
Top 10 for LLM Applications collects the risks specific to applications *built
on* language models — a distinct but adjacent axis to this work, which is about
the code generated *by* them.

## 2.4 Positioning of this work

This work sits at the intersection of the two lines above. Against functional
correctness benchmarks, it adds a dynamic security evaluation based on real
exploitation. Against static security datasets, it evaluates a complete running
application, capable of exposing inter-component interaction failures. And
against BaxBench, it introduces a key methodological difference: it **fixes the
framework** (routing, sessions, data schema and views) and **swaps only the
business-logic modules** behind a stable contract. Each model's contribution is
thereby isolated and the implementations become directly comparable, taking the
OWASP Top 10 and the CWE catalogue as the taxonomic frame.
