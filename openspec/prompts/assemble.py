#!/usr/bin/env python3
"""
Assemble a ready-to-send prompt from a round file + the canonical specification.

Takes everything between the === BEGIN PROMPT === / === END PROMPT === markers,
substitutes the specification placeholder with the real spec, and writes a single
file that is pasted verbatim into a fresh model session.

Usage:
    python3 assemble.py            # assemble every round file found
    python3 assemble.py R1.md      # assemble one
"""
import hashlib
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
SPECS_DIR = HERE.parent / "specs" / "hacker-shop"
SPEC = SPECS_DIR / "spec.md"
OUT = HERE / "ready"

BEGIN = "=== BEGIN PROMPT ==="
END = "=== END PROMPT ==="

# A round file declares which specification it wants by its placeholder, so
# rounds can share the machinery while handing out different spec revisions.
PLACEHOLDERS = {
    "<<< PASTE THE CONTENTS OF openspec/specs/hacker-shop/spec.md HERE >>>": "spec.md",
    "<<< PASTE THE CONTENTS OF openspec/specs/hacker-shop/spec-r3.md HERE >>>": "spec-r3.md",
}
PLACEHOLDER = next(iter(PLACEHOLDERS))  # default, for messages


def assemble(path: pathlib.Path) -> tuple[pathlib.Path, str]:
    text = path.read_text(encoding="utf-8")
    if BEGIN not in text or END not in text:
        raise SystemExit(f"{path.name}: missing prompt delimiters")
    body = text.split(BEGIN, 1)[1].split(END, 1)[0].strip("\n")

    found = [(ph, name) for ph, name in PLACEHOLDERS.items() if ph in body]
    if len(found) != 1:
        raise SystemExit(f"{path.name}: expected exactly one spec placeholder, found {len(found)}")
    placeholder, spec_name = found[0]

    spec_path = SPECS_DIR / spec_name
    if not spec_path.exists():
        raise SystemExit(f"{path.name}: specification not found: {spec_path}")
    body = body.replace(placeholder, spec_path.read_text(encoding="utf-8").strip("\n"))

    OUT.mkdir(exist_ok=True)
    dest = OUT / (path.stem + "-ready.txt")
    dest.write_text(body + "\n", encoding="utf-8")
    return dest, spec_name


def main() -> None:
    names = sys.argv[1:] or sorted(
        p.name for p in HERE.glob("R*.md") if p.name != "README.md"
    )
    used = set()
    for name in names:
        dest, spec_name = assemble(HERE / name)
        used.add(spec_name)
        print(f"{dest.relative_to(HERE.parent.parent)}  ({len(dest.read_text()):,} chars)  [{spec_name}]")

    print()
    for spec_name in sorted(used):
        p = SPECS_DIR / spec_name
        digest = hashlib.sha256(p.read_bytes()).hexdigest()
        print(f"{spec_name}: sha256 {digest[:16]}...  ({len(p.read_text(encoding='utf-8').splitlines())} lines)")
    print("Paste one ready file verbatim into a FRESH session. Send nothing else.")


if __name__ == "__main__":
    main()
