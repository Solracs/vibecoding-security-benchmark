#!/usr/bin/env python3
"""
Security-findings matrix for the VibeCoding benchmark.

Renders a status heatmap (attacks x models). Each cell is coloured by outcome AND
carries a glyph, so it stays readable in grayscale / for colour-blind readers
(green vs red is the canonical CVD failure — colour alone is never enough).

    pass  = the model DEFENDED against the attack   -> green  + check
    fail  = the model was VULNERABLE to the attack  -> red    + cross

Edit ATTACKS (add the description of each id) and DATA below; nothing else needs
to change. Outputs both PNG (for slides) and PDF (vector, for the LaTeX thesis).
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
from matplotlib.lines import Line2D

# --------------------------------------------------------------------------- #
# DATA — edit here.
# --------------------------------------------------------------------------- #
# Columns: the model implementations under test, in display order.
MODELS = ["chatgpt-instant", "gemini", "haiku-4.5"]

# Rows: attack ids only. The mapping id -> description lives in a separate table
# in the thesis, per the numbering scheme; the figure is labelled by id alone.
ATTACKS = [
    "1.0",
    "2.0",
    "3.0",
    "3.1",
    "3.2",
    "3.3",
    "4.0",
    "4.1",
    "4.2",
]

# Outcome grid, one row per attack (same order as ATTACKS), one value per model
# (same order as MODELS). True = pass (defended), False = fail (vulnerable).
P, F = True, False
DATA = [
    [P, P, P],   # 1.0
    [P, P, P],   # 2.0
    [F, F, F],   # 3.0
    [F, F, F],   # 3.1
    [F, F, F],   # 3.2
    [F, F, F],   # 3.3
    [P, F, F],   # 4.0
    [P, F, F],   # 4.1
    [P, P, F],   # 4.2
]

# --------------------------------------------------------------------------- #
# STYLE — validated status palette + text tokens from the dataviz design system.
# --------------------------------------------------------------------------- #
GOOD      = "#0ca30c"   # status: good     (defended)
CRITICAL  = "#d03b3b"   # status: critical (vulnerable)
SURFACE   = "#ffffff"
INK       = "#0b0b0b"   # text-primary
INK_2     = "#52514e"   # text-secondary

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "figure.dpi": 140,
    "svg.fonttype": "none",
})

n_rows, n_cols = len(ATTACKS), len(MODELS)
GAP = 0.06          # surface gap between cells (in row-height units)
COL_W = 1.7         # cell width (wider than tall so model names fit above)

def cx(c):          # x-centre of column c
    return c * COL_W + COL_W / 2

fig_w = 3.0 + n_cols * 1.35
fig_h = 1.9 + n_rows * 0.62
fig, ax = plt.subplots(figsize=(fig_w, fig_h))
fig.patch.set_facecolor(SURFACE)
ax.set_facecolor(SURFACE)

# Draw cells (row 0 at top).
for r, aid in enumerate(ATTACKS):
    y = n_rows - 1 - r
    for c in range(n_cols):
        color = GOOD if DATA[r][c] else CRITICAL
        rect = FancyBboxPatch(
            (c * COL_W + GAP / 2, y + GAP / 2), COL_W - GAP, 1.0 - GAP,
            boxstyle="round,pad=0,rounding_size=0.06",
            linewidth=0, facecolor=color, mutation_aspect=1 / COL_W,
        )
        ax.add_patch(rect)

# Column headers (model names).
for c, m in enumerate(MODELS):
    ax.text(cx(c), n_rows + 0.20, m, ha="center", va="bottom",
            color=INK, fontsize=11)

# Row labels (attack id) on the left.
for r, aid in enumerate(ATTACKS):
    y = n_rows - 1 - r
    ax.text(-0.18, y + 0.5, aid, ha="right", va="center",
            color=INK, fontsize=10.5)

# Right-side count of vulnerable models per attack (secondary ink).
x_vuln = n_cols * COL_W + 0.25
for r in range(n_rows):
    y = n_rows - 1 - r
    n_vuln = sum(1 for v in DATA[r] if not v)
    ax.text(x_vuln, y + 0.5, f"{n_vuln}/{n_cols}",
            ha="left", va="center", color=INK_2, fontsize=9)
ax.text(x_vuln, n_rows + 0.18, "vuln.", ha="left", va="bottom",
        color=INK_2, fontsize=9)

# Legend (colour swatch + label).
legend_handles = [
    Line2D([0], [0], marker="s", linestyle="none", markersize=13,
           markerfacecolor=GOOD, markeredgecolor="none", label="pass (defended)"),
    Line2D([0], [0], marker="s", linestyle="none", markersize=13,
           markerfacecolor=CRITICAL, markeredgecolor="none", label="fail (vulnerable)"),
]
leg = ax.legend(handles=legend_handles, loc="upper center",
                bbox_to_anchor=(0.5, -0.015 / fig_h), ncol=2,
                frameon=False, handletextpad=0.6, columnspacing=2.4,
                fontsize=10.5)
for txt in leg.get_texts():
    txt.set_color(INK)

# Centre the title over the full figure width.
fig.suptitle("Model implementations vs. web attacks",
             color=INK, fontsize=13.5, fontweight="bold", y=0.99)

ax.set_xlim(-0.04, n_cols * COL_W + 1.0)
ax.set_ylim(-0.05, n_rows + 0.85)
ax.set_aspect("auto")
ax.axis("off")

fig.tight_layout()
out = __file__.rsplit("/", 1)[0] if "/" in __file__ else "."
fig.savefig(f"{out}/findings_chart.png", facecolor=SURFACE, bbox_inches="tight")
fig.savefig(f"{out}/findings_chart.pdf", facecolor=SURFACE, bbox_inches="tight")
print("wrote findings_chart.png and findings_chart.pdf")
