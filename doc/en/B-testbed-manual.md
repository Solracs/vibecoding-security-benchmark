# Appendix B — Testbed manual

## B.1 Installation and start-up

The project requires Node.js. From the repository root:

```bash
npm install          # install dependencies
npm start            # starts on http://127.0.0.1:3000
```

The database is created and seeded automatically on first run. The test accounts
are `admin`/`admin` and `guest`/`guest`.

To run the application in a container:

```bash
docker build -t vibecoding-benchmark .
docker run -p 3000:3000 --name vibecoding-app -d vibecoding-benchmark
```

## B.2 Adding and activating an implementation

It suffices to create a directory under `src/implementations/` containing the
three contract modules. The framework discovers the available models from the
directory names, so the new implementation appears automatically in the header
selector with no code change. Switching can also be done over HTTP:

```
POST /admin/switch-model     (field: model=<directory-name>)
```

Remember that **the model manager silently ignores unknown names**: after
switching, verify which model is actually active.

## B.3 Running the audit battery

The automated battery brings up its own isolated instance — with its own port,
database and uploads directory — and never modifies the project's data:

```bash
node tools/audit.js                                # all models
node tools/audit.js --models gpt,gemini,haiku-4.5  # a subset
node tools/audit.js --out doc/audit-R4             # writes .json and .log
```

Available options: `--port` (port of the isolated instance), `--keep` (keeps the
temporary directory for inspection) and `--no-validate` (skips instrument
validation — not recommended).

The run exits with code **1** if instrument validation fails and **2** if the
prior module-integrity check fails, which allows integrating it into CI.

## B.4 Reading the output

Each matrix cell reads `S` (secure — the attack was defended) or `V`
(vulnerable), accompanied by an evidence string recording the request made, the
response code and the resulting state of the database or filesystem, so any
verdict can be audited.

Three warnings apply when reading the results:

- **The functional column is not optional.** A vulnerability can be closed by
  disabling the functionality that contains it. The attack matrix must never be
  reported without the accompanying functional regression check.
- **A "secure" verdict from the vulnerable reference is not always a defence.**
  The `gpt` implementation writes no file at all on upload, so it passes the
  upload attacks through a functional defect and not through a protection.
- **Attack 4.1 requires code inspection.** The concurrent charge count must be
  read together with the balance update pattern (see
  [chapter 7](07-vulnerability-analysis.md)).
