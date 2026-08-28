#!/usr/bin/env python3
"""
Figura 6.1 de la memoria: matriz de resultados de la linea base (ronda R0).

Version en castellano, para el documento oficial. La version en ingles
(findings_chart.py) se conserva como artefacto de la documentacion del proyecto,
que se redacta en ingles.

Mapa de estado (aprobado/vulnerable) sobre una rejilla ataque x implementacion.
Cada celda se colorea segun el resultado; las filas se etiquetan unicamente con
el identificador del ataque, cuya descripcion figura en la tabla que precede a la
figura en el texto.

Salida: doc/latex/img/matriz-resultados-es.pdf (y .png para inspeccion rapida).
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch
from matplotlib.lines import Line2D
import pathlib

# --------------------------------------------------------------------- datos
MODELOS = ["chatgpt-instant", "gemini", "haiku-4.5"]
ATAQUES = ["1.0", "2.0", "3.0", "3.1", "3.2", "3.3", "4.0", "4.1", "4.2"]

S, V = True, False          # S = seguro (defendido), V = vulnerable
DATOS = [
    [S, S, S],   # 1.0  inyeccion SQL - inicio de sesion
    [S, S, S],   # 2.0  inyeccion SQL - registro
    [V, V, V],   # 3.0  IDOR perfil
    [V, V, V],   # 3.1  XSS almacenado
    [V, V, V],   # 3.2  travesia de directorios
    [V, V, V],   # 3.3  carga de SVG
    [S, V, V],   # 4.0  cantidades negativas
    [S, V, V],   # 4.1  condicion de carrera
    [S, S, V],   # 4.2  IDOR carrito
]

# --------------------------------------------------------------------- estilo
SEGURO   = "#0ca30c"        # estado: correcto
VULN     = "#d03b3b"        # estado: critico
FONDO    = "#ffffff"
TINTA    = "#0b0b0b"
TINTA_2  = "#52514e"

plt.rcParams.update({"font.family": "DejaVu Sans", "figure.dpi": 200})

n_f, n_c = len(ATAQUES), len(MODELOS)
HUECO, ANCHO = 0.06, 1.7
cx = lambda c: c * ANCHO + ANCHO / 2

fig, ax = plt.subplots(figsize=(3.0 + n_c * 1.35, 1.9 + n_f * 0.62))
fig.patch.set_facecolor(FONDO)
ax.set_facecolor(FONDO)

for f, _ in enumerate(ATAQUES):
    y = n_f - 1 - f
    for c in range(n_c):
        ax.add_patch(FancyBboxPatch(
            (c * ANCHO + HUECO / 2, y + HUECO / 2), ANCHO - HUECO, 1.0 - HUECO,
            boxstyle="round,pad=0,rounding_size=0.06",
            linewidth=0, facecolor=SEGURO if DATOS[f][c] else VULN,
            mutation_aspect=1 / ANCHO))

for c, m in enumerate(MODELOS):
    ax.text(cx(c), n_f + 0.20, m, ha="center", va="bottom", color=TINTA, fontsize=11)

for f, a in enumerate(ATAQUES):
    ax.text(-0.18, n_f - 1 - f + 0.5, a, ha="right", va="center", color=TINTA, fontsize=10.5)

# recuento de implementaciones vulnerables por ataque
x_v = n_c * ANCHO + 0.25
for f in range(n_f):
    n_v = sum(1 for v in DATOS[f] if not v)
    ax.text(x_v, n_f - 1 - f + 0.5, f"{n_v}/{n_c}", ha="left", va="center",
            color=TINTA_2, fontsize=9)
ax.text(x_v, n_f + 0.20, "vuln.", ha="left", va="bottom", color=TINTA_2, fontsize=9)

leyenda = [
    Line2D([0], [0], marker="s", linestyle="none", markersize=13,
           markerfacecolor=SEGURO, markeredgecolor="none", label="seguro (el ataque fue defendido)"),
    Line2D([0], [0], marker="s", linestyle="none", markersize=13,
           markerfacecolor=VULN, markeredgecolor="none", label="vulnerable (el ataque prosperó)"),
]
leg = ax.legend(handles=leyenda, loc="upper center", bbox_to_anchor=(0.5, -0.015),
                ncol=2, frameon=False, handletextpad=0.6, columnspacing=2.0, fontsize=10)
for t in leg.get_texts():
    t.set_color(TINTA)

fig.suptitle("Resultados de la línea base por ataque e implementación",
             color=TINTA, fontsize=13.5, fontweight="bold", y=0.99)

ax.set_xlim(-0.04, n_c * ANCHO + 1.0)
ax.set_ylim(-0.05, n_f + 0.85)
ax.set_aspect("auto")
ax.axis("off")
fig.tight_layout()

dest = pathlib.Path(__file__).resolve().parent / "latex" / "img"
dest.mkdir(parents=True, exist_ok=True)
for ext in ("pdf", "png"):
    fig.savefig(dest / f"matriz-resultados-es.{ext}", facecolor=FONDO, bbox_inches="tight")
print("escrito:", dest / "matriz-resultados-es.pdf")
