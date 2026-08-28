# 5. Solution design

The solution is organised in four layers: the logic and schema that articulate
the modular architecture, the template that constitutes the shared framework, the
container that guarantees reproducibility, and the audit instrument that measures
the results.

## 5.1 Logic and schema

The solution revolves around one structuring design principle: **security is
delegated to the concrete implementation of each feature**. The framework, common
to every run, handles the cross-cutting responsibilities — routing, session
management, database creation and seeding, view rendering — while the business
logic, whose security is to be audited, lives in swappable modules, one set per
evaluated model.

### Data model

Persistence rests on a SQLite database with three tables capturing the minimal
e-commerce domain:

- `users` — autoincrement id, unique username, password, bio, profile picture
  (stored as a filename) and wallet balance (`wallet_balance`, default 1000.00).
- `products` — id, unique name, description, price and image.
- `cart_items` — id, `user_id`, `product_id` and quantity.

The wallet and its initial balance are a deliberate design element: they give the
application a resource with value — money — whose integrity can be attacked,
which enables the study of business-logic and concurrency vulnerabilities on the
payment flow.

### Module contract

Every model must implement three modules with identical signatures, so the
framework can invoke them interchangeably:

- **`auth.js`** — `login(username, password, db)`, returning an object with a
  boolean success field, and `register({username, password}, db)`, which creates
  the user with default bio and picture values.
- **`cart.js`** — `addToCart`, `removeFromCart` and `checkout`, which receive the
  Express request/response pair, the database object and the necessary
  identifiers, and write the response directly (usually a redirect).
- **`profile.js`** — `updateProfile`, which updates the bio and, where
  applicable, persists the uploaded profile picture.

The full specification handed to the models is reproduced in
[appendix A](A-specification-and-prompts.md).

One environment aspect conditions the shape of these implementations: **the
SQLite interface used is asynchronous and callback-based, not promise-based**.
Consequently, functions that must return a value or sequence several queries need
to wrap those calls in promises. How each model resolves this detail is itself a
distinctive trait of its style.

### Swap mechanism

Swapping implementations rests on three framework pieces:

1. A **model manager** keeps the name of the active model and dynamically
   discovers the available models from the directory names under
   `src/implementations/`; adding a new implementation therefore reduces to
   adding a folder, with no other code change.
2. A **loader** resolves, on each invocation, the path of the requested module
   for the active model and imports it bypassing the `require` cache, so a model
   switch takes effect immediately:

   ```js
   function loadModule(moduleName) {
       const model = getModel();
       const modulePath = path.join(
           __dirname, "..", "implementations", model, `${moduleName}.js`);
       delete require.cache[require.resolve(modulePath)];  // no cache
       return require(modulePath);
   }
   ```

3. The **Express routes** delegate to these modules instead of implementing the
   logic directly. That indirection is precisely what turns the application into
   a testbed: the same HTTP request executes, depending on the active model, one
   or another implementation of the same feature.

One detail with experimental consequences: the model manager silently ignores
unknown names. A switch that does not take effect is therefore invisible, which
makes it necessary to verify the active model explicitly after every change.

## 5.2 Template implementation

The template — the framework — is built on Node.js and Express 5, with EJS views
and sessions managed by `express-session`.

### Entry-point responsibilities

The application entry point concentrates the cross-cutting responsibilities. It
configures the user session; statically serves the uploads directory under
`/uploads`; creates the database schema and seeds it with initial data (the
`admin` and `guest` test accounts and a product catalogue); and exposes to every
view both the active model and the list of discovered models. The latter feeds
the selector in the interface header, which allows switching the active
implementation at runtime without restarting the server.

**The authenticated identity is stored in the session as a plain string holding
the username.** This apparently minor detail turns out to be decisive in
[chapter 8](08-guidelines-and-improvement.md): since it was not documented in the
original specification, it forced the models to guess the shape of the session
object.

### File-upload handling

A particularly relevant aspect of the template, given its status as a study
surface. The usual multipart middleware libraries sanitise the received filename,
reducing it to its base component and stripping any path segment or `../`
sequence. That sanitising, desirable as it is from a security standpoint, would
hide one of the decisions to be observed in each model. The template therefore
parses the multipart body with its own parser that exposes the client-supplied
filename literally, as the corresponding variable would preserve it in, say, a
PHP environment.

The consequence is clear: **the template introduces no protection of its own
against path traversal**. The responsibility for sanitising that name before
writing the file to disk, or for validating its content type, falls entirely on
each model's implementation, and constitutes the surface of attacks 3.2 and 3.3.

### Rendering of user-controlled fields

Analogously, the template renders certain user-controlled fields — name, bio and
profile picture — without applying entity escaping in the views. This
framework-level decision turns the storage of those fields into a possible stored
XSS sink. Whether the attack succeeds depends on how each implementation
processes and persists the input, so here too the ultimate responsibility moves
to the business logic under study. Note that, being unable to modify the views,
**an implementation's only lever is neutralisation at write time**, with the
architectural implications discussed in
[chapter 8](08-guidelines-and-improvement.md).

## 5.3 Container

The entire testbed runs inside a Docker container — a decision belonging to the
architecture of the solution and not merely to the toolchain. The container
serves two purposes: it guarantees the attack battery always runs against the
same initial state, and it confines the effects of attacks that write to the
filesystem, which would otherwise reach the host machine. The image installs the
project dependencies, copies the code including every implementation present, and
exposes the service on port 3000. Thanks to the dynamic model discovery described
above, the build automatically incorporates any implementation added to the
project, with no additional container configuration.

One runtime characteristic has direct consequences for the severity of some
findings: **the application process runs inside the container as `root`, with
working directory `/app`**. As detailed in
[chapter 7](07-vulnerability-analysis.md), this amplifies the impact of arbitrary
file-write vulnerabilities, since the write is not confined by an unprivileged
user's permissions and can reach, in the worst case, the application's own code
or sensitive system files.

## 5.4 Automated audit instrument

Manual evaluation with an intercepting proxy is irreplaceable for discovering and
documenting a vulnerability, but it does not scale to ten implementations times
nine attacks. An automated battery was therefore developed that reproduces the
same HTTP request sequence and verifies the observable effect on the database and
the filesystem.

The instrument incorporates three safeguards that form part of the work's
methodological contribution:

- **Isolation.** The battery brings up its own application instance, with its own
  port, database and uploads directory. Without this isolation, a run can
  inadvertently target a running container that executes a frozen copy of the
  code and keeps its own database, so model switches take no effect and the
  checks read a state different from the one the application writes.
- **Instrument validation.** The deliberately vulnerable reference implementation
  acts as a **positive control**: a run is only considered reliable if that
  implementation comes out vulnerable to the attacks it is known not to defend. A
  battery that fails to reach the application returns "secure" everywhere — a
  result indistinguishable from success; this control is the cheapest way to rule
  it out.
- **Functional regression test.** Alongside the attacks, the battery executes the
  operations the specification requires and verifies their effect. The
  justification for this safeguard, and the evidence that without it the study
  would have concluded the opposite of what it concludes, is developed in
  [chapter 8](08-guidelines-and-improvement.md).
