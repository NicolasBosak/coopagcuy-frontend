"""Extrae las curvas de nivel de malla.json como rutas SVG (marching squares).

A 1000 m de intervalo salen tres o cuatro curvas: las justas para que el
mapa se lea como carta topografica sin convertir 320 px de ancho en una
maraña. A 500 m el dibujo se emborrona y el archivo se duplica.
"""
import json, math, sys

sys.setrecursionlimit(30000)

M = json.load(open("malla.json"))
ANCHO, ALTO = M["ancho"], M["alto"]
Z = M["elevaciones"]
INTERVALO = 1000
LX, LY = 320.0, 275.0


def suavizar(d, w, h, pasos=2):
    for _ in range(pasos):
        n = d[:]
        for f in range(h):
            for c in range(w):
                s, k = 0.0, 0
                for df in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        ff, cc = f+df, c+dc
                        if 0 <= ff < h and 0 <= cc < w:
                            p = 4 if (df == 0 and dc == 0) else (2 if df*dc == 0 else 1)
                            s += d[ff*w+cc]*p; k += p
                n[f*w+c] = s/k
        d = n
    return d


suave = suavizar(Z[:], ANCHO, ALTO, pasos=2)
ZMIN, ZMAX = min(suave), max(suave)


def segmentos(nivel):
    out = []
    for f in range(ALTO-1):
        for c in range(ANCHO-1):
            v = [suave[f*ANCHO+c], suave[f*ANCHO+c+1],
                 suave[(f+1)*ANCHO+c+1], suave[(f+1)*ANCHO+c]]
            idx = sum((1 << i) for i in range(4) if v[i] > nivel)
            if idx in (0, 15):
                continue
            px = [(c, f), (c+1, f), (c+1, f+1), (c, f+1)]

            def ip(i, j):
                a, b = v[i], v[j]
                t = 0.5 if a == b else max(0.0, min(1.0, (nivel-a)/(b-a)))
                return (px[i][0]+(px[j][0]-px[i][0])*t,
                        px[i][1]+(px[j][1]-px[i][1])*t)

            ar, de, ab, iz = ip(0, 1), ip(1, 2), ip(3, 2), ip(0, 3)
            tabla = {1: [(iz, ar)], 2: [(ar, de)], 3: [(iz, de)], 4: [(de, ab)],
                     5: [(iz, ar), (de, ab)], 6: [(ar, ab)], 7: [(iz, ab)],
                     8: [(iz, ab)], 9: [(ar, ab)], 10: [(iz, ab), (ar, de)],
                     11: [(ar, de)], 12: [(iz, de)], 13: [(de, ab)], 14: [(iz, ar)]}
            out.extend(tabla.get(idx, []))
    return out


def k(p):
    return (round(p[0], 4), round(p[1], 4))


def encadenar(segs):
    """Une los segmentos sueltos en polilineas usando un indice por extremo.

    Sin el indice esto era O(n^2) sobre miles de segmentos y tardaba
    minutos; con el, es lineal.
    """
    porA = {}
    for i, (a, b) in enumerate(segs):
        porA.setdefault(k(a), []).append(i)
    usado = [False]*len(segs)
    lineas = []
    for i, (a, b) in enumerate(segs):
        if usado[i]:
            continue
        usado[i] = True
        linea = [a, b]
        while True:
            sig = None
            for j in porA.get(k(linea[-1]), []):
                if not usado[j]:
                    sig = j; break
            if sig is None:
                break
            usado[sig] = True
            linea.append(segs[sig][1])
            if len(linea) > 6000:
                break
        if len(linea) >= 3:
            lineas.append(linea)
    return lineas


def simplificar(pts, eps):
    if len(pts) < 3:
        return pts
    pila = [(0, len(pts)-1)]
    guardar = [False]*len(pts)
    guardar[0] = guardar[-1] = True
    while pila:
        i0, i1 = pila.pop()
        a, b = pts[i0], pts[i1]
        dmax, idx = 0.0, -1
        for i in range(i0+1, i1):
            p = pts[i]
            if a == b:
                d = math.hypot(p[0]-a[0], p[1]-a[1])
            else:
                t = ((p[0]-a[0])*(b[0]-a[0]) + (p[1]-a[1])*(b[1]-a[1])) / \
                    ((b[0]-a[0])**2 + (b[1]-a[1])**2)
                t = max(0.0, min(1.0, t))
                d = math.hypot(p[0]-(a[0]+t*(b[0]-a[0])), p[1]-(a[1]+t*(b[1]-a[1])))
            if d > dmax:
                dmax, idx = d, i
        if idx > 0 and dmax > eps:
            guardar[idx] = True
            pila.append((i0, idx)); pila.append((idx, i1))
    return [p for i, p in enumerate(pts) if guardar[i]]


rutas = []
nivel = math.ceil(ZMIN/INTERVALO)*INTERVALO
while nivel < ZMAX:
    segs = segmentos(nivel)
    if segs:
        d = []
        for linea in encadenar(segs):
            s = simplificar(linea, 0.45)
            if len(s) < 2:
                continue
            pts = [(p[0]/(ANCHO-1)*LX, p[1]/(ALTO-1)*LY) for p in s]
            d.append("M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts))
        if d:
            rutas.append({"nivel": nivel, "d": "".join(d)})
    nivel += INTERVALO

total = sum(len(r["d"]) for r in rutas)
print(f"{len(rutas)} curvas, {total/1024:.1f} KB")
for r in rutas:
    print(f"   {r['nivel']:>5} m  {len(r['d'])/1024:.1f} KB")

ts = f'''// ARCHIVO GENERADO — no editar a mano. Lo produce
// scripts/relieve/generar_curvas.py desde una malla de elevacion SRTM 30 m.

/** Altitud minima y maxima del terreno dibujado, en metros. */
export const RELIEVE_RANGO = {{ min: {round(ZMIN)}, max: {round(ZMAX)} }};

/** Separacion entre curvas de nivel, en metros. */
export const CURVAS_INTERVALO = {INTERVALO};

/**
 * Curvas de nivel REALES, en coordenadas del lienzo de {int(LX)}x{int(LY)}
 * que usa `proyectar` en coordenadas.ts. Si cambia el encuadre del mapa hay
 * que volver a generarlas: estas rutas estan atadas a esa caja.
 */
export const CURVAS: {{ nivel: number; d: string }}[] = [
{chr(10).join(f'    {{ nivel: {r["nivel"]}, d: "{r["d"]}" }},' for r in rutas)}
];
'''
destino = sys.argv[1]
open(destino, "w", encoding="utf-8").write(ts)
print("escrito en", destino)
