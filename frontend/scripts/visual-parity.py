#!/usr/bin/env python3
"""
Paridad visual — comprueba que un refactor de estilos NO cambió el render.

Para qué sirve
--------------
La migración a design tokens del PR #86 rompió la interfaz sin que nada se
enterara: `vite build` compilaba y los tests pasaban, porque un `var()` sin
resolver no es un error de sintaxis. Este arnés cierra ese hueco por el otro
lado: captura las pantallas antes de tocar nada, y después compara píxel a
píxel.

Uso
---
    npm run dev -- --port 5199            # en otra terminal
    python3 scripts/visual-parity.py capture antes
    ...aplicar los cambios...
    python3 scripts/visual-parity.py capture despues
    python3 scripts/visual-parity.py compare antes despues

Un refactor que solo sustituye literales por tokens de igual valor debe dar
0 px de diferencia. Cualquier cifra distinta de cero es un cambio real que hay
que justificar o revertir.

Requisitos: `pip install playwright pillow && python3 -m playwright install
chromium`. No forma parte del pipeline de CI — es una herramienta de apoyo, y
sus dependencias no están declaradas en package.json a propósito.

Determinismo
------------
Sin acotar, dos capturas idénticas divergían hasta un 12.9 %: la landing anima
con GSAP y scroll, y login y registro llevan un logo en Three.js sobre canvas
de partículas. Por eso:

  - de la landing se compara solo la navbar, que es lo que toca `navbar.css`;
  - los canvas y el logo 3D se enmascaran;
  - se emula `prefers-reduced-motion: reduce`.

Con esas tres medidas, dos pasadas seguidas dan 0 px.

Limitación conocida: `AppNavbar` no aparece aquí porque vive en rutas que
exigen sesión. Para ese componente se verifica la equivalencia de forma
estática, comprobando que cada token sustituido vale lo mismo que el literal
que reemplazó.
"""
import sys, pathlib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

S = pathlib.Path(__file__).resolve().parent.parent / ".visual-parity"
VIEWPORTS = {"desktop": (1440, 900), "mobile": (430, 932)}
TARGETS = {                                  # ruta, selector a capturar
    "landing":  ("/",         ".nav-container"),
    "login":    ("/login",    ".login-page"),
    "register": ("/register", ".register-page"),
}

# Se OCULTAN, no se enmascaran: `mask=` pinta el rectángulo del elemento, y el
# canvas de partículas ocupa la página entera, así que enmascararlo devolvía una
# imagen de un solo color. `visibility: hidden` conserva el layout y deja ver
# todo lo demás.
CALLAR_ANIMACION = """
  canvas,
  .login-logo-panel, .register-logo-panel { visibility: hidden !important; }
"""

def capture(tag):
    S.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for vp, (w, h) in VIEWPORTS.items():
            pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=1,
                            reduced_motion="reduce")
            for name, (route, sel) in TARGETS.items():
                pg.goto(f"http://localhost:5199{route}", wait_until="networkidle")
                pg.wait_for_selector(sel, timeout=15000)
                pg.add_style_tag(content=CALLAR_ANIMACION)
                pg.wait_for_timeout(2500)
                out = S / f"{tag}_{name}_{vp}.png"
                pg.locator(sel).first.screenshot(path=str(out))
                # Salvaguarda: una captura de un solo color no compara nada y
                # haría que cualquier diff diera 0. Es como este arnés estuvo
                # roto: enmascaraba el canvas de página completa y guardaba
                # rectángulos lisos que siempre coincidían.
                colores = len(set(Image.open(out).convert("RGB").getdata()))
                if colores < 50:
                    raise SystemExit(
                        f"captura degenerada: {out.name} tiene {colores} colores. "
                        "No se compara nada — revisa el selector o lo que se oculta.")
            pg.close()
        b.close()
    print(f"capturado: {tag}")

def compare(a, b):
    worst = 0
    missing = 0
    for name in TARGETS:
        for vp in VIEWPORTS:
            pa, pb = S / f"{a}_{name}_{vp}.png", S / f"{b}_{name}_{vp}.png"
            if not (pa.exists() and pb.exists()):
                # Sin esto, una tanda incompleta reportaba 0 % y daba por buena
                # una comparación que nunca ocurrió.
                print(f"  ?   {name}/{vp}: FALTA CAPTURA"); missing += 1; continue
            ia, ib = Image.open(pa).convert("RGB"), Image.open(pb).convert("RGB")
            if ia.size != ib.size:
                print(f"  DIF {name}/{vp}: TAMAÑO {ia.size} -> {ib.size}"); worst = 999; continue
            diff = ImageChops.difference(ia, ib)
            px = sum(1 for q in diff.getdata() if q != (0, 0, 0))
            pct = 100 * px / (ia.size[0] * ia.size[1])
            worst = max(worst, pct)
            mark = "OK " if px == 0 else ("~  " if pct < 0.05 else "DIF")
            print(f"  {mark} {name}/{vp}: {px} px ({pct:.4f} %)" + (f" bbox={diff.getbbox()}" if px else ""))
    if missing:
        print(f"\nINCOMPLETO: faltan {missing} capturas — la comparación no es concluyente")
        return 999
    print(f"\nmáxima divergencia: {worst:.4f} %")
    return worst

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(2)
    if sys.argv[1] == "capture": capture(sys.argv[2])
    else: sys.exit(0 if compare(sys.argv[2], sys.argv[3]) == 0 else 1)
