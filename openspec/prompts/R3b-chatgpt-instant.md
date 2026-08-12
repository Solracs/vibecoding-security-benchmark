# R3b — Vulnerability report (revised spec): chatgpt-instant

Contains **only** the findings confirmed against this model's own current
implementation (on-disk directory: `src/implementations/chatgpt-intant/` — note
the pre-existing typo in the folder name). Do not merge with any other model's
report.

Findings included: 3.0, 3.1, 3.2, 3.3.
This implementation passed 1.0, 2.0, 4.0, 4.1 and 4.2, so those are absent by
design — telling it about defects it does not have would contaminate the round.

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
`src/implementations/chatgpt-instant-r3b[-<run>]/`.

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
Proof: while authenticated as user `admin`, a request to `POST /edit-profile/2`
modified the profile of a different user (`guest`, id 2). The change was
confirmed on the victim's own dashboard.

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
Proof: an upload with the file name `../pwnedchatgpt-instant` created that file in
`/app`, one directory above the uploads directory. An upload with the file name
`../../../../etc/passwd` was also accepted. The application process runs as
`root` inside the container, so writes are not constrained by file permissions and
can reach the application's own source files.

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

--- SPECIFICATION ---

<<< PASTE THE CONTENTS OF openspec/specs/hacker-shop/spec-r3.md HERE >>>

=== END PROMPT ===
