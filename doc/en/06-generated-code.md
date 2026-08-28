# 6. AI-generated code

This chapter documents what each model produced. Three AI-generated
implementations are compared — `chatgpt-instant`, `gemini` and `haiku-4.5` —
alongside a reference implementation, `gpt`, which is not an experimental subject
but a control instrument.

## 6.1 Generation methodology

Every model was handed the same functional specification (the module contract of
[chapter 5](05-solution-design.md)), attached as a file and accompanied by a
single line of text: ***implement these functions***. No indication about
security was added, in either direction, and the models were never told their
output would be audited or compared. That deliberate absence of guidance is what
makes R0 a valid baseline: the comparison is only meaningful if each
implementation reflects the model's genuine, undirected behaviour — the one it
exhibits when nothing steers it beyond the functional requirement.

The full statement, in its literal wording and in the language it was delivered
in, is reproduced in [appendix A](A-specification-and-prompts.md) and kept in the
repository at `openspec/specs/hacker-shop/spec.md`. The thirty implementations
analysed here — ten sets of three modules — are published in full in that same
repository ([appendix C](C-repository-and-source.md)).

On top of that baseline, three additional rounds of increasing guidance were
generated (R1, R3a and R3b), whose design is detailed in
[chapter 8](08-guidelines-and-improvement.md). All of them respected the same
conditions: a fresh conversation with no history, no manual editing of the
output, and a single statement file per generation.

## 6.2 The `gpt` reference implementation

`gpt` appears constantly in the result tables, and it is worth being precise
about what it is before reading them.

**What it is.** An implementation of the same module contract, obtained in April
2026 during the construction of the testbed and prior to systematic version
recording, most probably with GPT-5.3 Instant, *whose output was afterwards
deliberately modified*. It is the only hand-touched material in the project. The
intervention has a precise goal: to guarantee that each of the nine attacks has,
in the testbed, at least one target that does not defend it. Hence its three
characteristic traits — authentication queries built by string concatenation,
cart and profile mutations executed without an ownership check, and checkout
reading the balance and rewriting it in two separate steps.

**What it is for.** It is the **positive control** of the measuring instrument.
An attack battery that for any reason fails to reach the application returns
"secure" in every cell, a result indistinguishable from perfect success. Keeping
in the testbed an implementation known in advance to be vulnerable, and requiring
the battery to detect it as such, is the cheapest way to rule out that class of
error. In this work it prevented an entirely invalid run from being accepted as
good. See guideline **D7**.

**What it is not.** It is not an evaluated model. It takes part in no
model-to-model comparison, the remediation rounds are not applied to it, and its
results are not averaged with the others. Nor should its "secure" verdicts be
read as defences: `gpt` passes the file-upload attacks because it never writes
any file at all — a functional defect, not a protection. The result tables
include it purely as a contrast column.

## 6.3 Authentication (`auth.js`)

A decisive difference of style. The reference implementation builds the login
query by directly concatenating the user's input strings, a pattern that opens
the door to SQL injection:

```js
// Reference implementation (gpt): direct concatenation
const query = `SELECT * FROM users
               WHERE username='${username}' AND password='${password}'`;
```

By contrast, all three evaluated implementations use parameterised queries,
delegating the separation of code and data to the engine:

```js
// Evaluated implementations: parameterised query
db.get("SELECT * FROM users WHERE username = ? AND password = ?",
       [username, password], (err, row) => { /* ... */ });
```

The three resolve the asynchronous nature of the SQLite interface differently:
`chatgpt-instant` defines generic helpers (`dbGet`, `dbRun`) wrapping each
primitive in a promise; `haiku-4.5` wraps each operation directly in a `Promise`
and documents every function with JSDoc comments; `gemini` adopts an intermediate
solution. All three correctly assign the default values on registration, though
`haiku-4.5` is the only one that explicitly sets the initial wallet balance in the
insert statement instead of relying on the column default.

## 6.4 Cart (`cart.js`)

The cart module concentrates the most divergent design decisions, and they turn
out to be decisive in the security analysis. Three stand out:

**Ownership resolution on deletion.** `gemini` and `chatgpt-instant` bound the
delete by identifier *and* user; `haiku-4.5` bounds it by identifier only:

```sql
-- gemini / chatgpt-instant: scoped by owner
DELETE FROM cart_items WHERE id = ? AND user_id = ?

-- haiku-4.5: scoped by identifier only
DELETE FROM cart_items WHERE id = ?
```

**Quantity validation.** `gemini` explicitly converts the quantity to an integer
before operating on it; the others propagate it unnormalised, which opens the
door to negative values.

**Checkout update style.** `chatgpt-instant` uses an atomic decrement and guards
the operation with a `total > 0` check; `gemini` and `haiku-4.5` read the balance
and then write a computed absolute value, admitting the payment whenever the
balance is greater than or equal to the total:

```js
// chatgpt-instant: atomic decrement, guarded by total > 0
if (total > 0 && wallet_balance >= total) {
    UPDATE users SET wallet_balance = wallet_balance - ? WHERE id = ?
}

// gemini / haiku-4.5: read + write of an absolute value
if (balance >= total) {
    const newBalance = balance - total;
    UPDATE users SET wallet_balance = ? WHERE id = ?   // absolute value
}
```

These seemingly minor differences are what separate "secure" from "vulnerable" in
the business-logic (4.0) and concurrency (4.1) attacks.

## 6.5 Profile (`profile.js`)

The baseline implementations persist the uploaded file by writing its contents to
the uploads directory under the client-supplied name, and store that name as the
profile picture:

```js
const filename = req.file.originalname;               // unsanitised
const filePath = path.join(req.app.locals.uploadsDir, filename);
fs.writeFile(filePath, req.file.buffer, ...);         // write to disk
// without checking the profile owner:
UPDATE users SET bio = ?, profile_picture = ? WHERE id = ?
```

None of them sanitises that name, validates the file's content type, or checks
that the target user identifier corresponds to the session-authenticated user.
The bio update is done through parameterised queries, so this module — safe
against SQL injection — is exposed to broken access control, path traversal and
dangerous file upload.

## 6.6 Evolution across the rounds

The successive rounds introduced verifiable changes in the code:

- **R1.** All three implementations added filename sanitising by extracting the
  base component. Two of them additionally added password hashing with `bcrypt`,
  which the specification did not request, forcing that dependency into the
  project. **None added file-type validation.**
- **R3.** Dedicated security helper functions appear for the first time, with
  explicit names (`sanitizeFilename`, `escapeHtml`, `isValidImageType`) and
  comments citing the identifier of the report finding that motivates them. It is
  the only round in which validation of the uploaded file type appears.
