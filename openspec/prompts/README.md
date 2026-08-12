# Remediation-round prompts

Prompt artefacts for the remediation experiment (chapter 7 of the thesis:
*Directrices de seguridad a la IA y análisis de mejora*).

Every round hands a model the **same functional specification**
(`openspec/specs/hacker-shop/spec.md`) and varies **only** the security guidance
that accompanies it. Comparing rounds measures how much guidance specificity is
needed before a model actually removes a vulnerability class.

| Round | What is sent | Measures |
|-------|--------------|----------|
| R0 | the specification alone — already done, no prompt file | baseline |
| R1 | `R1.md` — specification + one generic security sentence | does a costless nudge work? |
| R3 | `R3-<model>.md` — specification + that model's own vulnerability report | remediation ceiling |

R0 is the round already generated from the plain specification; it has no prompt
file because there was no guidance to record. Each file below is self-contained
and does not depend on any other.

## Operating protocol

1. **Fresh session per generation — one generation, one conversation.** Never send
   two rounds to the same chat, and never do two repetitions in the same chat.
   Rounds are independent measurements against the same baseline; chaining them
   means R3 would be handed a report describing code that is no longer in context,
   and a model primed by R1's instruction stays primed. Repetitions in one chat are
   not independent samples either.
   Total conversations = models × rounds × runs (3 × 2 × 3 = 18 for R1 + R3).

   A new chat is **not sufficient by itself** — cross-chat memory features leak
   between conversations and must be disabled first: ChatGPT Memory
   (Settings → Personalization), Claude Projects (shared context and files),
   Gemini personalization / activity-based context. Also: no custom instructions,
   no system prompt, no uploaded files, no rules file in scope.

   If a model replies with a clarifying question instead of code, apply the same
   policy every time (either answer "follow the specification" or discard and
   regenerate) and record which — an inconsistent policy is an uncontrolled
   variable.
2. **Paste the specification where marked.** The canonical spec is
   `openspec/specs/hacker-shop/spec.md`, frozen at SHA-256 `bdbcf623a3ff63f2…`
   (227 lines). If that hash changes, every round must be regenerated or the
   comparison is invalid.
3. **Do not edit the model's output by hand.** Not even to fix a syntax error.
   Hand-editing destroys the thing being measured. If output is unusable, record
   it as a failed generation and regenerate.
4. **n ≥ 3 generations per (model × round).** These systems are stochastic; a
   single run cannot distinguish "the model fixed it" from "that run happened to
   fix it".
5. **Output location:** `src/implementations/<model>-r<N>[-<run>]/`. The framework
   discovers models from directory names, so new folders appear in the switcher
   with no code changes.
6. **Record for each generation:** model name and version string, date, round,
   run number, and the full raw response.
7. **Re-test identically.** Same nine attacks, same Burp procedure. For the race
   condition, the same parallel-send configuration and request count — a fix that
   only holds under a slower run is not a fix.
8. **Score three outcomes, not one:** *remediated* (vulnerable at baseline → safe),
   *persisted*, and *introduced* (safe at baseline → vulnerable). Also re-run the
   specification's functional scenarios: a vulnerability closed by breaking the
   feature is not a fix.

## Two things kept out of the prompts

- **No model is told it is being benchmarked or compared.** Knowing it is under
  evaluation can change its behaviour, and the result would no longer describe how
  these models write code in normal use. R3 is framed as an ordinary remediation
  task, which is also what a real team would do.
- **No model is given another model's findings.** R3 is split per model on
  purpose. A shared report would leak results across subjects and turn the round
  into "fix this list" rather than "fix your own defects". Each report also omits
  the attacks that model passed, so it is never told about defects it does not
  have.

## Do not prescribe fixes

R3 reports *what* is wrong, *where*, and *how it was proven* — never *how to fix
it*. If the prompt contains the remediation, the experiment measures the quality
of the advice rather than the capability of the model.
