# El relieve del mapa de origen

El mapa de la ficha pública (`MapaOrigen.tsx`) dibuja **terreno real**, no una
textura decorativa: sale de una malla de elevación SRTM 30 m de la zona del
piloto, descargada una vez y horneada en dos archivos.

Se hornea a propósito. La alternativa —pedir tiles a un tercero en cada
visita— rompe las tres cosas que hacen que esta pantalla funcione: se escanea
con datos móviles flojos en un puesto de venta, la PWA no puede cachear tiles
ajenos, y la paleta del proveedor se impondría sobre la institucional en la
única pantalla que ve el consumidor final.

## Qué genera

| Archivo | Qué es | Peso |
|---|---|---|
| `public/mapa/relieve-azuay.png` | Tinte hipsométrico + sombreado de relieve, PNG indexado 320×274 | ~45 KB |
| `src/domain/comunidades/relieve.generado.ts` | Curvas de nivel cada 1000 m como rutas SVG | ~12 KB |

Va como archivo suelto y no como `data:` URI dentro del bundle: en base64
pesaría un tercio más, engordaría el JS que bloquea el primer pintado, y el
service worker no podría cachearlo por separado.

## Cuándo hay que volver a generarlo

**Solo si cambia el encuadre del mapa** — es decir, si se toca `HOLGURA` en
`coordenadas.ts` o se añade una comunidad fuera de la caja actual (60 km de
este a oeste por 51 de norte a sur). Las curvas de nivel están en
coordenadas del lienzo de 320×275 que produce `proyectar()` en
`coordenadas.ts`; si se añade una comunidad fuera de la caja actual, o cambia
`HOLGURA`, la caja se mueve y el relieve deja de coincidir con los pines.

Añadir una comunidad **dentro** de la caja actual no obliga a regenerar nada.

## Cómo

Necesita Python 3 y salida a internet. Desde esta carpeta:

```bash
python bajar_malla.py
```

Descarga 21 920 puntos de elevación (220 peticiones, ~7 min por el límite de
una llamada por segundo de la API pública) y los deja en `malla.json`. Si el
archivo ya existe no vuelve a descargar: bórralo para forzarlo.

Si cambió la caja, actualiza `LAT0/LAT1/LON0/LON1` en `bajar_malla.py` para
que coincidan con `RANGO_LAT`/`RANGO_LON` de `coordenadas.ts` antes de correrlo.

Después, los dos generadores:

```bash
python generar_png.py ../../public/mapa/relieve-azuay.png
```

```bash
python generar_curvas.py ../../src/domain/comunidades/relieve.generado.ts
```

`malla.json` no se versiona: pesa más que sus dos productos juntos y se puede
volver a bajar.

## Fuente y atribución

Elevaciones de **SRTM 30 m** (NASA/USGS, dominio público) servidas por
[OpenTopoData](https://www.opentopodata.org/). El dato es de dominio público y
no exige atribución en pantalla, a diferencia de los tiles de OpenStreetMap o
Google. Aun así el mapa rotula "Relieve: SRTM 30 m" porque en una pantalla
cuya única función es ser creíble, decir de dónde sale cada cosa es parte del
producto.

## Decisiones que parecen arbitrarias y no lo son

- **Luz del noroeste a 45°.** Es la convención cartográfica. Con la luz al
  sureste el ojo invierte el relieve y lee las montañas como hoyos.
- **Exageración vertical 2.2.** Sin ella, a 33 km de ancho la pendiente real
  es casi invisible en 320 px.
- **Sombreado dentro de la banda 0.62–1.14.** El terreno es fondo: lo que va
  encima (pines cian, etiquetas casi negras) tiene que seguir leyéndose. Las
  etiquetas llevan además halo blanco, que es lo que permite subir tanto el
  contraste del terreno.
- **Paleta de 12 bandas de altitud × 21 de sombra.** Cuantizar de forma
  estructurada, en vez de con k-means, mantiene el degradado ordenado y evita
  el bandeado en las laderas suaves.
- **Curvas cada 1000 m y no cada 500.** A 500 m el dibujo se emborrona a este
  ancho y el archivo se duplica.
