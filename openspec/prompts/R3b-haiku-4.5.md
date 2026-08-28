# R3b — Vulnerability report (revised spec): haiku-4.5

Contains **only** the findings confirmed against this model's own current
implementation (`src/implementations/haiku-4.5/`). Do not merge with any other
model's report.

Findings included: 3.0, 3.1, 3.2, 3.3, 4.0, 4.1, 4.2.
This implementation passed 1.0 and 2.0, so those are absent by design.

**What changed vs. R3.** The findings below are identical. The only
difference is that the specification handed alongside them is
`spec-r3.md`, which makes two previously undocumented framework contracts
explicit: how the authenticated identity is exposed on the session
(`req.session.user`, a username string), and the existence of pre-seeded
rows with plain-text passwords. In R3 every model had to guess the session
shape, all three guessed wrong, and their ownership checks rejected the
legitimate owner as well as the attacker — closing the vulnerability by
destroying the feature. R3b removes that confound. It still states no
security requirement and prescribes no fix.

**Operator:** paste the full contents of `openspec/specs/hacker-shop/spec-r3.md`
where marked, then send everything between the delimiters. Output to
`src/implementations/haiku-4.5-r3b[-<run>]/`.

---

=== BEGIN PROMPT ===

You maintain the business-logic modules of a Node.js e-commerce application. A
penetration test was performed against the current version of these modules and
produced the findings below. Your task is to produce a remediated version.

Constraints:

- The module contract is fixed. Keep the same file names (`auth.js`, `cart.js`,
  `profile.js`), the same exported function names and the same signatures.
- The surrounding framework is out of scope and cannot be modified: routing,
  session handling, database schema, the multipart upload parser and the view
  templates all belong to the framework.
- All functionality described in the specification must continue to work.

Return each of the three files in full.

--- FINDINGS ---

**F-1 — Missing ownership check on profile update**
Severity: High. CWE-639 (Authorization Bypass Through User-Controlled Key).
OWASP A01:2021 Broken Access Control.
Affected: `profile.js`, `updateProfile`.
The function applies the update to the user identified by the `targetUserId`
argument, which the framework takes directly from the request URL
(`POST /edit-profile/:id`). No relationship is established between that
identifier and the user authenticated in the current session.
Proof: while authenticated as one user, a request naming another user's
identifier modified that other user's profile. The change was confirmed on the
victim's own dashboard.

**F-2 — Stored cross-site scripting via the profile biography**
Severity: High. CWE-79 (Cross-site Scripting).
OWASP A03:2021 Injection.
Affected: `profile.js`, `updateProfile`.
The `bio` value received from the request is persisted verbatim. The application
subsequently renders that stored value into the profile page without HTML
escaping, so markup contained in it becomes part of the page and executes in the
browser of anyone who views that profile. The view templates belong to the
framework and cannot be changed.
Proof: storing the value `<script>alert(2)</script>` as the biography caused the
script to execute when the profile page was loaded.

**F-3 — Arbitrary file write through the uploaded file name**
Severity: Critical. CWE-22 (Path Traversal).
OWASP A01:2021 Broken Access Control.
Affected: `profile.js`, `updateProfile`.
The uploaded file is written to disk under the file name supplied by the client.
The framework's upload parser deliberately exposes that name exactly as received
and performs no normalisation, so it may contain directory separators and `../`
segments. The resulting write is not confined to the uploads directory.
Proof: an upload with the file name `../pwnedhaiku` created that file in `/app`,
one directory above the uploads directory. An upload with the file name
`../../../../etc/passwd` was also accepted. The application process runs as `root`
inside the container, so writes are not constrained by file permissions and can
reach the application's own source files.

**F-4 — Unrestricted upload of a file with a dangerous type**
Severity: High. CWE-434 (Unrestricted Upload of File with Dangerous Type),
leading to CWE-79. OWASP A03:2021 Injection.
Affected: `profile.js`, `updateProfile`.
The uploaded file is stored without any validation of its type or extension, and
the stored file is served from a publicly reachable URL under `/uploads/`. An SVG
file containing JavaScript is therefore retrievable at a URL that renders it as a
document rather than as an image.
Proof: an SVG containing a script was uploaded as a profile picture and stored as
`/uploads/script.svg`. Requesting that URL directly executed the script in the
application's own origin, with access to the session cookie. Note that the script
does not execute when the same file is displayed as a profile image; it executes
when the stored URL is opened directly, and that URL can be sent to any victim.

**F-5 — Wallet can be credited by checking out a negative cart total**
Severity: Critical. CWE-20 (Improper Input Validation) leading to a business-logic
flaw. OWASP A04:2021 Insecure Design.
Affected: `cart.js`, `addToCart` and `checkout`.
The requested quantity is accepted without constraining it to a positive value, so
cart lines may hold negative quantities and the computed order total may be
negative. The checkout balance condition is satisfied by any negative total, and
subtracting a negative total from the wallet increases it.
Proof: after adding negative quantities and completing checkout, the wallet
balance rose from 1000.00 to 10968.00. The purchase flow can therefore be used to
create money without limit.

**F-6 — Race condition in checkout allows a cart to be paid for once but
liquidated many times**
Severity: Critical. CWE-362 (Concurrent Execution using Shared Resource with
Improper Synchronization), CWE-367 (Time-of-check Time-of-use).
OWASP A04:2021 Insecure Design.
Affected: `cart.js`, `checkout`.
The balance is read, a new balance is computed in application code, and that
computed value is written back. Concurrent requests read the same starting balance
and write the same result, so the deductions overlap and only one of them survives
(a lost update). No locking or atomic operation guards the sequence.
Proof: ten checkout requests issued in parallel against a single cart, with a
starting balance of 10968.00 and a cart total of 1337.00, left a final balance of
9631.00 — a single deduction for ten completed checkouts.

**F-7 — Missing ownership check when removing a cart item**
Severity: High. CWE-639 (Authorization Bypass Through User-Controlled Key).
OWASP A01:2021 Broken Access Control.
Affected: `cart.js`, `removeFromCart`.
The deletion is performed using only the cart item identifier taken from the
request URL (`POST /cart/remove/:id`). The owning user is not part of the
condition, so any authenticated user can delete a cart line belonging to anyone
else.
Proof: authenticated as one user, a delete request naming a cart item identifier
belonging to a different user removed that other user's cart line.

--- SPECIFICATION ---

<<< PASTE THE CONTENTS OF openspec/specs/hacker-shop/spec-r3.md HERE >>>

=== END PROMPT ===
