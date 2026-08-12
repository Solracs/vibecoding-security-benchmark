# Audit harness

`audit.js` runs the nine-attack battery (1.0 – 4.2) plus a functional regression
suite against every model implementation, driving a real HTTP server exactly as a
proxy such as Burp Suite would.

It is the instrument behind the results in `doc/audit-R1.md` and
`doc/audit-R3.md`.

## Usage

```bash
node tools/audit.js                                  # every discovered model
node tools/audit.js --models gpt,gemini,haiku-4.5    # a subset
node tools/audit.js --out doc/audit-R4               # write JSON + log
```

| Option | Meaning |
|---|---|
| `--models a,b,c` | Models to test. Default: every directory under `src/implementations/`, with `gpt` forced first. |
| `--port N` | Port for the isolated instance (default 3199). |
| `--out PREFIX` | Write `PREFIX-results.json` and `PREFIX-log.txt`. |
| `--keep` | Keep the temporary DB/uploads directory for inspection. |
| `--no-validate` | Skip the `gpt` validation gate. Not recommended. |

Exit code is `1` if the validation gate fails and `2` if pre-flight fails, so the
run can be wired into CI.

## What it does per model

1. Switch the active model, then **re-read it from the UI** to confirm the switch
   took effect (`setModel()` ignores unknown names silently).
2. Reset the database to a fixed baseline so every model is measured identically.
3. Establish attacker and victim sessions, falling back to registering fresh
   users when the seeded accounts cannot authenticate.
4. Run the nine attacks, recording an evidence string for each verdict.
5. Run the functional suite.
6. Reset again.

## Three design decisions that must not be undone

**It starts its own isolated server.** Port 3000 is normally the `vibecoding-app`
container, which has no volume mounts: a frozen copy of the code with its own
internal database. An early version of this harness addressed it by accident —
model switches silently no-op'd and the harness read a different database from
the one the app wrote. Every model returned an identical, plausible-looking row.
The script now launches its own instance via `PORT` / `DB_PATH` / `UPLOADS_DIR`
and talks only to that port.

**It validates itself against `gpt`.** `gpt` is the deliberately-vulnerable
reference; if it does not come back vulnerable to 1.0, 3.0 and 4.2, the run is
untrustworthy and exits non-zero. This is what caught the failure above — the
giveaway was `gpt` appearing clean, which is impossible.

**It runs the functional suite alongside the attacks.** A vulnerability can
always be "fixed" by disabling the feature it lives in. In round R3a all three
models closed the profile IDOR by rejecting *every* profile update, including the
legitimate owner's; counting vulnerabilities alone scored that as a flawless
remediation. Attack 3.0 and the functional `updateOwnBio` check are two halves of
one property — **never report the attack matrix without the functional column.**

## Reading the results

- `S` = safe (defended), `V` = vulnerable, `?` = the check could not run.
- Every verdict carries an evidence string (the request, the status code and the
  resulting database or filesystem state) so a reader can audit it.
- **`gpt` scoring safe on 3.2/3.3 is not a defence.** Its `profile.js` reads a
  non-existent `req.file.filename`, so it writes no file at all — a functional
  defect presenting as a security pass.
- **Attack 4.1's criterion**: N concurrent checkouts must produce N charges
  (N defaults to 2, overridable with `RACE_N`). Fewer charges means a lost update.
  Read it together with the update pattern in `cart.js`: a single charge can also
  come from correct serialisation where the second request found an empty cart.
  A non-atomic read-modify-write can lose an update; an atomic decrement or a
  transaction-guarded update cannot.
- **Attack 3.1 detects reflection, not execution.** It asserts the payload is
  stored unneutralised and emitted verbatim into an executing HTML context with
  no CSP. Execution itself was confirmed manually in a browser. Note it asserts
  on `/dashboard`, where the bio lands in `<p>` content; on `/edit-profile` the
  same value sits inside `<textarea>` (RCDATA), which does **not** execute.

## Pre-flight

Before scoring, the harness refuses to run if any model directory has a missing
or empty module, or two modules that are byte-identical (a paste error). Both
occurred during round R3 and would otherwise have produced plausible but
meaningless results.

## Requirements

Node.js and the project's `sqlite3` dependency (`npm install`). No network
access; nothing is written inside the repository — the working database and
uploads directory live in a temporary directory that is removed afterwards
(`--keep` to retain it).
