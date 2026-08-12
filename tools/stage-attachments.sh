#!/usr/bin/env bash
# Stage the model implementations as uniquely-named copies for PDF embedding.
#
# All implementations use the same three filenames (auth.js, cart.js,
# profile.js), which would collide inside the PDF's embedded-file table. This
# script flattens them to <model>-<module>.js under doc/latex/adjuntos/, which is
# what Appendix C attaches.
#
# Re-run after regenerating any implementation:
#     bash tools/stage-attachments.sh
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO/src/implementations"
DEST="$REPO/doc/latex/adjuntos"

rm -rf "$DEST"; mkdir -p "$DEST"
n=0
for dir in "$SRC"/*/; do
  model="$(basename "$dir")"
  for mod in auth cart profile; do
    [ -f "$dir/$mod.js" ] || continue
    cp "$dir/$mod.js" "$DEST/${model}-${mod}.js"
    n=$((n+1))
  done
done
printf '%s ficheros preparados en %s\n' "$n" "${DEST#$REPO/}"
