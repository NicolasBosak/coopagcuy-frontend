"""Descarga la malla de elevacion real (SRTM 30 m) de la caja del mapa.

Se guarda en malla.json para no volver a pedirla. La API publica de
OpenTopoData admite 100 puntos por peticion y 1 llamada por segundo.
"""
import json, time, urllib.request, os, sys

# La misma caja que calcula coordenadas.ts (holgura del 8 %)
LAT0, LAT1 = -3.3614063, -3.0630937   # sur, norte
LON0, LON1 = -79.5284453, -79.1808327  # oeste, este

ANCHO, ALTO = 100, 86   # columnas x filas
SALIDA = "malla.json"

if os.path.exists(SALIDA):
    print("malla.json ya existe; no se vuelve a descargar")
    sys.exit(0)

# Fila 0 = norte (LAT1), como se dibuja en pantalla
puntos = []
for f in range(ALTO):
    lat = LAT1 - (LAT1 - LAT0) * f / (ALTO - 1)
    for c in range(ANCHO):
        lon = LON0 + (LON1 - LON0) * c / (ANCHO - 1)
        puntos.append((lat, lon))

print(f"{len(puntos)} puntos, {ANCHO}x{ALTO}")

elevaciones = []
lotes = [puntos[i:i + 100] for i in range(0, len(puntos), 100)]
for i, lote in enumerate(lotes):
    loc = "|".join(f"{a:.6f},{b:.6f}" for a, b in lote)
    url = "https://api.opentopodata.org/v1/srtm30m?locations=" + loc
    for intento in range(4):
        try:
            d = json.load(urllib.request.urlopen(url, timeout=60))
            if d.get("status") != "OK":
                raise RuntimeError(d.get("error", "sin status OK"))
            elevaciones.extend(r["elevation"] for r in d["results"])
            break
        except Exception as e:
            if intento == 3:
                print(f"FALLO en lote {i}: {e}")
                sys.exit(1)
            time.sleep(3 * (intento + 1))
    if (i + 1) % 10 == 0 or i == len(lotes) - 1:
        print(f"  lote {i+1}/{len(lotes)}")
    time.sleep(1.1)   # limite de la API publica

nulos = sum(1 for e in elevaciones if e is None)
validos = [e for e in elevaciones if e is not None]
print(f"listo: {len(elevaciones)} valores, {nulos} nulos, "
      f"min={min(validos):.0f} max={max(validos):.0f}")

json.dump({
    "ancho": ANCHO, "alto": ALTO,
    "lat0": LAT0, "lat1": LAT1, "lon0": LON0, "lon1": LON1,
    "fuente": "SRTM 30 m via OpenTopoData",
    "elevaciones": elevaciones,
}, open(SALIDA, "w"))
print("guardado en", SALIDA)
