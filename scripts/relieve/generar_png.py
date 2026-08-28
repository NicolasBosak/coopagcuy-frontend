"""Genera el PNG del relieve como archivo indexado (paleta de 8 bits).

Va como archivo suelto en public/ y NO como data URI dentro del bundle:
en base64 pesaria un tercio mas, engordaria el JS que bloquea el primer
pintado, y el service worker no podria cachearlo por separado.
"""
import json, math, zlib, struct, sys

M = json.load(open("malla.json"))
ANCHO, ALTO = M["ancho"], M["alto"]
Z = M["elevaciones"]


def suavizar(datos, w, h, pasos=1):
    d = datos[:]
    for _ in range(pasos):
        n = d[:]
        for f in range(h):
            for c in range(w):
                s, k = 0.0, 0
                for df in (-1, 0, 1):
                    for dc in (-1, 0, 1):
                        ff, cc = f + df, c + dc
                        if 0 <= ff < h and 0 <= cc < w:
                            peso = 4 if (df == 0 and dc == 0) else (2 if df * dc == 0 else 1)
                            s += d[ff * w + cc] * peso
                            k += peso
                n[f * w + c] = s / k
        d = n
    return d


suave = suavizar(Z, ANCHO, ALTO, pasos=1)

ESC = 2
W2, H2 = ANCHO * ESC, ALTO * ESC


def bilineal(datos, w, h, x, y):
    x = max(0, min(w - 1.001, x)); y = max(0, min(h - 1.001, y))
    x0, y0 = int(x), int(y); fx, fy = x - x0, y - y0
    a = datos[y0*w+x0]; b = datos[y0*w+x0+1]
    c = datos[(y0+1)*w+x0]; d = datos[(y0+1)*w+x0+1]
    return (a*(1-fx)*(1-fy) + b*fx*(1-fy) + c*(1-fx)*fy + d*fx*fy)


fino = [bilineal(suave, ANCHO, ALTO, c / ESC, f / ESC)
        for f in range(H2) for c in range(W2)]
ZMIN, ZMAX = min(fino), max(fino)

RAMPA = [
    (700,  (0xE8, 0xD9, 0xB4)),   # valle seco del Jubones
    (1400, (0xDE, 0xDB, 0xA6)),
    (2200, (0xC0, 0xD0, 0x9B)),   # ladera cultivada
    (2800, (0xA2, 0xC2, 0xA6)),
    (3300, (0x86, 0xB4, 0xBE)),   # paramo
    (4100, (0xC4, 0xDC, 0xE4)),   # cumbres
]


def tinte(z):
    if z <= RAMPA[0][0]:
        return RAMPA[0][1]
    for i in range(len(RAMPA) - 1):
        z0, c0 = RAMPA[i]; z1, c1 = RAMPA[i + 1]
        if z <= z1:
            t = (z - z0) / (z1 - z0)
            return tuple(round(c0[k] + (c1[k]-c0[k])*t) for k in range(3))
    return RAMPA[-1][1]


AZ, AL = math.radians(315.0), math.radians(45.0)
KM_LAT, KM_LON = 110.57, 111.32 * math.cos(math.radians(-3.2))
mx = (M["lon1"] - M["lon0"]) / (W2 - 1) * KM_LON * 1000
my = (M["lat1"] - M["lat0"]) / (H2 - 1) * KM_LAT * 1000
EXAG = 2.2


def sombra(c, f):
    def z(cc, ff):
        cc = max(0, min(W2-1, cc)); ff = max(0, min(H2-1, ff))
        return fino[ff*W2+cc]
    dzdx = ((z(c+1,f-1)+2*z(c+1,f)+z(c+1,f+1)) - (z(c-1,f-1)+2*z(c-1,f)+z(c-1,f+1)))/(8*mx)*EXAG
    dzdy = ((z(c-1,f+1)+2*z(c,f+1)+z(c+1,f+1)) - (z(c-1,f-1)+2*z(c,f-1)+z(c+1,f-1)))/(8*my)*EXAG
    p = math.atan(math.hypot(dzdx, dzdy)); a = math.atan2(dzdy, -dzdx)
    return max(0.0, min(1.0, math.sin(AL)*math.cos(p) + math.cos(AL)*math.sin(p)*math.cos(AZ-a)))


# ── Paleta estructurada: 12 bandas de altitud x 21 de sombra ──────────
# Cuantizar asi (y no con k-means) mantiene el degradado ordenado, que es
# lo que evita el bandeado feo en las laderas suaves.
NE, NS = 12, 21
paleta, indice = [], {}
for ie in range(NE):
    z = ZMIN + (ZMAX - ZMIN) * (ie + 0.5) / NE
    r, g, b = tinte(z)
    for isb in range(NS):
        k = 0.62 + 0.52 * (isb / (NS - 1))
        paleta.append((min(255, round(r*k)), min(255, round(g*k)), min(255, round(b*k))))
        indice[(ie, isb)] = len(paleta) - 1

filas = bytearray()
for f in range(H2):
    filas.append(0)
    for c in range(W2):
        z = fino[f*W2+c]
        ie = min(NE-1, int((z - ZMIN) / (ZMAX - ZMIN) * NE))
        isb = min(NS-1, int(sombra(c, f) * NS))
        filas.append(indice[(ie, isb)])


def trozo(tipo, datos):
    x = tipo + datos
    return struct.pack(">I", len(datos)) + x + struct.pack(">I", zlib.crc32(x))


plte = b"".join(bytes(c) for c in paleta)
png = (b"\x89PNG\r\n\x1a\n"
       + trozo(b"IHDR", struct.pack(">IIBBBBB", W2, H2, 8, 3, 0, 0, 0))
       + trozo(b"PLTE", plte)
       + trozo(b"IDAT", zlib.compress(bytes(filas), 9))
       + trozo(b"IEND", b""))

destino = sys.argv[1]
open(destino, "wb").write(png)
print(f"{W2}x{H2} indexado, {len(paleta)} colores -> {len(png)/1024:.1f} KB")
print(f"altitud {ZMIN:.0f}-{ZMAX:.0f} m")
print("escrito en", destino)
