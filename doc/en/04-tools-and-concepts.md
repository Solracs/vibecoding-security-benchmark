# 4. Tools and prior concepts

This chapter lists the tools used in each phase, justifies the non-obvious
choices, and defines the attack techniques exercised throughout the work. A
reader familiar with web application security can skip it.

## 4.1 Working environment and tools

The work spans four phases with different instrumental needs: building the
testbed application, obtaining each model's implementation of the business
modules, exploiting those implementations manually, and finally repeating the
whole battery automatically.

| Phase | Tool | Function |
|-------|------|----------|
| Build | Node.js, Express 5 | Runtime and routing of the framework |
| | EJS | Server-side view rendering |
| | SQLite | Persistence of users, products and carts |
| | Docker | Environment isolation and reproducibility |
| Generation | Models' web interfaces | Obtaining the implementations |
| Exploitation | Web browser | Interaction with the application |
| | Burp Suite (Community) | Interception, repeat and parallel send |
| Verification | Purpose-built battery | Repeatable execution of the nine attacks |
| | Git | Traceability between evaluated code and result |

### Building the testbed

**Node.js was chosen for experimental fairness.** The object of measurement is
the code each model produces, so the technology must neither favour nor penalise
any of them. JavaScript on Node.js is by far one of the best-represented
combinations in public code corpora, so no model starts at a disadvantage through
unfamiliarity with the language. A practical reason reinforces it: with the
framework and the swappable modules written in the same language, the boundary
between them is a plain function signature, with no translation layer that could
introduce defects unrelated to the model under evaluation.

One aspect deserves explicit mention because it conditions several attacks:
**multipart request body parsing is done in the framework itself, not in a
third-party library**. The usual libraries normalise the received filename on
their own and discard any path component it contains, which would nullify the
path-traversal attack before the generated code ever intervened. By handing over
the unnormalised name, the decision to sanitise it or not stays where it belongs
for the purposes of this work: in the model's implementation.

### Obtaining the generated code

Implementations were requested through each model's public conversational
interface, handing over the statement (attached as a file in the baseline round,
pasted as text in the later ones) and collecting the answer without any
subsequent intervention. No APIs, no repository-aware agents, no iterative
refinement tools were used.

This is not a technical limitation but part of the experimental design. The
scenario being reproduced is precisely that of the developer who describes a
feature in natural language and drops the answer into their project — the working
pattern that gives the studied phenomenon its name. Any intermediate automatism,
and in particular any tool that would run or review the code before delivering
it, would introduce into the measurement a factor that is not the model.

**Models evaluated:**

| Identifier | Model and version | Notes |
|------------|-------------------|-------|
| `chatgpt-instant` | GPT-5.5 Instant (OpenAI) | ChatGPT web interface |
| `gemini` | Gemini 3.5 Flash Lite (Google) | Gemini web interface |
| `haiku-4.5` | Claude Haiku 4.5 (Anthropic) | Claude web interface |
| `gpt` | GPT-5.3 Instant (OpenAI), probable | Deliberately vulnerable reference, modified on purpose; does not take part in the comparison |

Selection followed three criteria. **Provider diversity:** one model from each of
the three majors, so observed differences are not attributable to a single
training tradition. **Tier:** in all three cases the fast, low-cost variant — the
one that by default serves whoever works in the conversational style this work
reproduces — rather than the extended-reasoning variant. **Accessibility:** all
three reachable from a public, free web interface, a necessary condition for the
evaluated scenario to be that of an ordinary developer. All three score
comparably on the usual functional-correctness benchmarks, which makes this
work's comparison play out on a different axis from the one those benchmarks
measure.

### Manual exploitation

The exploratory phase used a web browser with **Burp Suite** Community edition as
an intercepting proxy between them, for three concrete needs the browser alone
does not cover:

1. **Crafting requests the interface will not build.** Several attacks consist of
   sending a value the application never offers: another user's identifier in the
   profile-update route, or a negative quantity in the cart form. Intercepting
   the legitimate request and altering it before forwarding is the direct route.
2. **Controlled repetition.** Comparing three implementations requires sending
   exactly the same request to each and attributing any observed difference to
   the code and not to the procedure; Burp's repeater guarantees this.
3. **Parallel send.** Specific to the race-condition attack and decisive for its
   result. Reproducing that class of defect requires several requests to reach
   the server within the same time window, unattainable by hand. Burp's
   group-parallel send fires two or more checkouts on the same cart
   simultaneously and shows whether the balance is debited only once.

### Automation and version control

The automated battery was developed specifically for this work as a Node.js
program independent of the application under evaluation; its design, safeguards
and validation procedure are described in [chapter 5](05-solution-design.md) and
its usage in [appendix B](B-testbed-manual.md). The project history, including
every round's implementations, is managed with Git, which allows recovering the
exact testbed state corresponding to each measurement.

## 4.2 Attack techniques evaluated

The battery consists of nine attacks, identified throughout by number alone. The
`1.x` and `2.x` series target authentication, `3.x` the profile module and `4.x`
the cart and checkout.

**SQL injection (attacks 1.0 and 2.0).** Introducing into an input field
characters the database engine interprets not as data but as syntax — the
metacharacters: the single quote, which closes a string early; the double dash,
which starts a comment and voids the rest of the statement; the semicolon, which
separates statements. If the query is built by concatenating strings, those
characters change its structure and allow, for example, the password check to be
suppressed. The defence is parameterised queries, in which the input travels
separately from the statement and can never alter it. *CWE-89; OWASP A03:2021
(Injection).*

**Insecure direct object reference, IDOR (attacks 3.0 and 4.2).** The defect
appears when an operation identifies the resource it acts on through a value the
client itself supplies — typically a numeric identifier in the path or the form —
and does not check that the resource belongs to whoever issues the request.
Substituting one's own identifier for another user's is then enough to operate on
someone else's data. The defence is to derive the requester's identity from the
server-side session, never from the request, and to condition the operation on
resource ownership. *CWE-639; OWASP A01:2021 (Broken Access Control).*

**Stored cross-site scripting, XSS (attack 3.1).** Storing in the application
content that includes browser-executable code, so it later runs in the session of
anyone who views that content. The stored variant — the one evaluated here — is
the most serious, because the code persists in the database and reaches every
visitor and not only whoever introduced it. The defence is output escaping:
converting characters with meaning in HTML to their harmless representation
before inserting them into the page. *CWE-79; OWASP A03:2021.*

**Path traversal (attack 3.2).** Including directory-ascent sequences, `../`, in
an attacker-controlled filename so the write lands outside the intended
directory. Its severity depends on the reachable destination: writing into the
application's own tree allows dropping or replacing code files. The defence is to
discard any path component of the received name and to build the final
destination from a fixed base directory. *CWE-22; OWASP A01:2021.*

**Unrestricted upload of file with dangerous type (attack 3.3).** Uploading a
file whose type allows code execution when it is served back. The case evaluated
is an SVG vector image — a format the browser treats as a document rather than an
image when requested directly, and which admits executable code inside; hence
this attack chains with the previous XSS. The defence is to validate the file
type against an allow-list, not a deny-list. *CWE-434.*

**Business-logic flaws (attack 4.0).** Unlike the previous ones, this does not
exploit a syntactic defect but an unwritten rule: the application accepts a
technically valid but commercially absurd value, such as a negative quantity of
units, and propagates it through to the amount calculation, so checkout
*increases* the balance instead of reducing it. There is no sanitising function
to apply here; the defence is explicit domain validation of each value. *CWE-20;
OWASP A04:2021 (Insecure Design).*

**Race condition (attack 4.1).** Appears when an operation reads a state and acts
on it in two separate steps, without guaranteeing that nothing modifies it in
between. If two checkout requests are processed simultaneously, both can verify
sufficient balance before either has debited it, and the charge ends up applied
only once. This pattern is known as Time-of-Check to Time-of-Use (TOCTOU). The
defence is to fuse check and update into a single atomic database operation.
*CWE-362 and CWE-367; OWASP A04:2021.*

These seven techniques are not laboratory cases: most of the weaknesses exercised
appear in the CWE Top 25, i.e. among those most frequently exploited in real
systems.

### Defensive terminology

- **Parameterised query** — one in which input values are transmitted to the
  database engine separately from the statement text, so they cannot alter its
  structure.
- **Output escaping** — converting characters with special meaning in the target
  format, typically HTML, to a harmless literal representation.
- **Allow-list validation** — accepting only the values enumerated as valid, as
  opposed to a deny-list, which tries to enumerate what must be rejected and is
  systematically incomplete.
- **Atomic operation** — one the database manager executes without possible
  interference from another concurrent operation.
- **Password hashing** — replacing cleartext storage with a derived, irreversible
  value; in this project provided by the `bcrypt` library.
