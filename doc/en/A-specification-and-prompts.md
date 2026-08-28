# Appendix A — Specification and prompts handed to the models

This appendix summarises the artefact that constitutes the experiment's input:
the statement handed identically to every model. The material was delivered in
**English**, so the repository files are already the authoritative version — they
are not reproduced here in full, only pointed at.

| Artefact | Location in the repository |
|----------|----------------------------|
| Functional specification (all rounds) | `openspec/specs/hacker-shop/spec.md` |
| Revised specification used in R3b | `openspec/specs/hacker-shop/spec-r3.md` |
| Per-round statements | `openspec/prompts/` |

## A.1 R0 statement (baseline)

R0 delivered the functional specification as an **attached file**, accompanied by
a single line of text in the conversation box:

```
implement these functions
```

There was no other indication. In particular, the code was not asked to be
secure, nor was the opposite suggested, and it was never mentioned that the
output would be audited or compared with other models'. That absence is precisely
what makes R0 a baseline: what each model produces when nothing steers it beyond
the functional requirement.

## A.2 Functional specification

The module contract, common to all rounds:

- **`auth.js`** — `login(username, password, db)` → `{ success }`;
  `register({username, password}, db)` → `{ success, message? }`. Registration
  takes only username and password. New users get the standard default profile
  picture and a default bio of `"BIO"`.
- **`cart.js`** — `addToCart(req, res, db, username, productId, quantity)`,
  `removeFromCart(req, res, db, username, cartItemId)`,
  `checkout(req, res, db, username)`; these write the response directly.
- **`profile.js`** — `updateProfile(req, res, db, targetUserId)`; reads and writes
  the response directly, redirecting on success.

Later rounds pasted the specification text into the conversation box alongside
their security guidance instead of attaching it; apart from that delivery detail,
the content of the specification is identical in every round.

## A.3 R1 statement (generic directive)

R1 adds a single security sentence with no specific content, and alters nothing
else:

```
Implement the specification below.

Implement it securely, following current web application security best practices.

Return each of the three modules (`auth.js`, `cart.js`, `profile.js`) in full.

--- SPECIFICATION ---

<<< PASTE THE CONTENTS OF openspec/specs/hacker-shop/spec.md HERE >>>
```

## A.4 R3a and R3b statements (vulnerability report)

R3a and R3b deliver the specification accompanied by **the model's own audit
report**. Each model receives only its own findings, described by their effect
and their CWE/OWASP classification, and never the way to fix them. The seven
statements of these rounds are distributed in `openspec/prompts/`.

## A.5 The revision used in R3b

The revised specification adds **two environment facts** the original version did
not document, without modifying any functional requirement or introducing any
security requirement:

- **Authenticated identity.** The framework records the identity in
  `req.session.user`, which contains the username as a **string**. There is no
  `req.session.userId`, no `req.session.username` and no `req.session.user.id`.
  To obtain the numeric identifier the `users` table must be queried.
- **Pre-existing data.** The database is created and seeded before any
  implementation runs, and contains accounts whose passwords are stored in
  cleartext.

The absence of the first of these two facts from the original specification is
the direct cause of the work's main finding (see
[chapter 8](08-guidelines-and-improvement.md)).

## A.6 Generation protocol

Every generation followed the same protocol, which is part of the reproducible
artefact:

- **One generation, one conversation.** No conversation received two rounds or
  two repetitions. Chaining them would measure the accumulated conversation and
  not the level of guidance delivered.
- **Cross-conversation memory disabled.** Opening a new conversation is not
  enough: each product's memory and personalisation features leak context between
  conversations and were expressly disabled before generating. No custom
  instruction and no project rules file were used either. The only file attached
  in the whole series was the specification itself, in round R0.
- **Conversational interface, no agents.** The statement was delivered in each
  model's public web interface and the answer collected without subsequent
  intervention. No APIs, no repository-aware development agents, no iterative
  refinement tools.
- **No manual editing of the output.** Not even to fix a syntax error. An
  unusable answer is recorded as a failed generation and repeated.
- **Uniform policy on model questions.** When a model answers with a question
  instead of code, the same policy is always applied and recorded; a varying
  policy would introduce an uncontrolled variable.
- **Output location.** Each generation is deposited in
  `src/implementations/<model>-r<N>/`, where the framework discovers it with no
  code change.
