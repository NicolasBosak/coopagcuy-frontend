# Cabecera con aliados, selector de captura en español y rótulo del ticket de venta local

Fecha: 2026-08-29
Repositorios: `CoopagcuyFront/coopagcuy-frontend` (cambios 1 y 2) y
`CoopagcuyApi` (cambio 3)

## Contexto

Tres correcciones independientes entre sí sobre el sistema de trazabilidad
Cuy Azuayito:

1. La pantalla de registro de pago a la productora muestra el selector de
   archivo nativo del navegador, con su texto en inglés ("Choose File" / "No
   file chosen").
2. La esquina superior izquierda muestra la marca del producto y el logotipo
   de Familias Campesinas Liderando, pero no a Ayuda en Acción ni a la Unión
   Europea, que cofinancian y ejecutan el proyecto.
3. El ticket de venta local dice "VENDIDO EN LA COMUNIDAD — COBRADO", cuando
   la productora que se lleva ese papel todavía no ha cobrado.

Los tres archivos de logotipo ya existen en `public/brand/aliados/`. No hay
que conseguir ni generar imágenes nuevas.

## Alcance

| Repositorio | Archivo | Cambio |
|---|---|---|
| Front | `src/components/faenamiento/FormPagoProductora.tsx` | Selector de captura en español |
| Front | `src/components/layout/MainLayout.tsx` | Ayuda en Acción y Unión Europea en la cabecera |
| API | `Features/Pagos/Services/TextosVentaLocal.cs` | Rótulo "— POR COBRAR" |
| API | `tests/CoopagcuyApi.Tests/Unitarias/TextosVentaLocalTests.cs` | Aserción y nombre de la prueba |

Nada más se modifica. Ver "Fuera de alcance" al final.

---

## Cambio 1 — Selector de la captura de transferencia

### El problema de fondo

El control vive en `FormPagoProductora.tsx:325`:

```tsx
<input
    type="file" accept="image/*" capture="environment"
    onChange={leerComprobante}
    className="w-full text-xs file:min-h-[44px] file:px-3 ..."
/>
```

Tanto el rótulo del botón ("Choose File") como el texto contiguo ("No file
chosen") los dibuja el navegador a partir de su propio idioma. No existe
atributo HTML, propiedad CSS ni pseudo-elemento que los reemplace: el
selector `file:` de Tailwind alcanza el estilo del botón, nunca su texto.

La única solución real es dejar de mostrar el control nativo y disparar un
input oculto desde un `<label>` propio. Ese patrón ya existe en el código, en
`src/components/recepcion/FormLote.tsx:655`.

### Diseño

**Marcado.** El encabezado "CAPTURA DE LA TRANSFERENCIA" deja de ser un
`<label>` — hoy no apunta a ningún control — y pasa a `<span>`. El `<label>`
real es el botón visible, asociado por `htmlFor`:

```tsx
<div>
    <span className="block text-xs font-bold uppercase
        tracking-wide text-gray-500 mb-1">
        Captura de la transferencia
    </span>

    <div className="flex items-center gap-2">
        <input
            id="comprobante"
            type="file" accept="image/*"
            onChange={leerComprobante}
            className="sr-only peer"
        />
        <label
            htmlFor="comprobante"
            className="inline-flex items-center justify-center min-h-[44px]
                px-3 rounded-xl border-2 border-primary-200 bg-primary-50
                text-primary-800 font-bold text-xs cursor-pointer shrink-0
                hover:bg-primary-100 transition-colors duration-150
                peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500
                peer-focus-visible:ring-offset-1"
        >
            📎 Adjuntar captura
        </label>
        <span className="text-xs text-gray-500 truncate">
            {nombreArchivo ?? "Ningún archivo seleccionado"}
        </span>
    </div>

    {comprobante && (
        <p className="mt-1 text-xs text-primary-700 font-semibold">
            ✓ Captura lista para subir
        </p>
    )}
</div>
```

**`sr-only`, no `hidden`.** FormLote oculta su input con `className="hidden"`,
que es `display: none` y saca el control del orden de tabulación: con teclado
no hay forma de llegar al selector. Aquí se usa `sr-only`, que lo mantiene
enfocable, y el anillo `peer-focus-visible` en el `<label>` hace visible ese
foco. Es una mejora deliberada sobre el patrón existente, no una desviación
por descuido.

**El input va antes del label en el DOM.** La variante `peer-*` de Tailwind
solo alcanza hermanos posteriores; invertir el orden deja el anillo de foco
sin efecto.

**Estilos.** El `<label>` hereda las mismas clases que hoy lleva el
pseudo-botón `file:*` (altura táctil de 44 px, `rounded-xl`, borde
`primary-200`, fondo `primary-50`, texto `primary-800` en negrita), de modo
que el aspecto no cambia salvo por el idioma y el `hover`.

### Estado nuevo

`comprobante` guarda solo el base64, así que el nombre del archivo necesita su
propio estado, junto a los demás `useState` del componente:

```tsx
const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
```

**Invariante:** `nombreArchivo` y `comprobante` se asignan siempre juntos,
dentro de `lector.onload`. Ningún camino de error toca a ninguno de los dos.

Esto importa: si la operadora adjunta una captura válida y luego elige por
error un archivo demasiado pesado, la selección anterior se conserva y el
aviso explica que el archivo nuevo fue rechazado. Es el comportamiento que ya
tiene hoy `comprobante`; el nombre visible lo acompaña en vez de contradecirlo.

### Cambios en `leerComprobante`

```tsx
const leerComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];

    // Permite volver a elegir el MISMO archivo: sin esto el input no
    // dispara change la segunda vez. El File ya está capturado arriba,
    // limpiar el value no lo invalida.
    e.target.value = "";

    if (!archivo) return;

    if (archivo.size > MAX_BYTES_COMPROBANTE) { /* sin cambios */ }

    const lector = new FileReader();
    lector.onload = () => {
        const resultado = String(lector.result);
        setComprobante(resultado.slice(resultado.indexOf(",") + 1));
        setNombreArchivo(archivo.name);   // ← línea nueva
        setError(null);
    };
    lector.onerror = () => { /* sin cambios */ };
    lector.readAsDataURL(archivo);
};
```

El tope de peso, el recorte del prefijo `data:` y el manejo de `onerror`
quedan exactamente como están.

### Se elimina `capture="environment"`

El comprobante de una transferencia bancaria es una captura de pantalla que
ya está en la galería del dispositivo, no una fotografía que se toma en el
momento. En Android, `capture` abre la cámara directamente y estorba
justamente el caso normal. Se conserva `accept="image/*"`, que en tablet
sigue ofreciendo la cámara como una opción más dentro del selector.

Este ajuste no aplica a FormLote: allí la foto de la novedad sí se toma en el
momento y `capture` es correcto.

---

## Cambio 2 — Ayuda en Acción y Unión Europea en la cabecera

### Jerarquía existente

El sistema ya tiene tres niveles definidos, visibles en `Login.tsx:231-285` y
en `QRPublico.tsx`:

1. Familias Campesinas Liderando — el proyecto
2. "Con el apoyo de": Ayuda en Acción y la Unión Europea — quien ejecuta y
   quien cofinancia
3. "Aliados locales": Nabón, Santa Isabel, Pucará y la Universidad Católica

La cabecera muestra hoy solo el nivel 1. El cambio incorpora el nivel 2 en el
mismo orden, para que la lectura sea la misma en todo el sistema. El nivel 3
se queda donde está, en el pie.

### Restricción de espacio

La fila superior es fija (`sticky`) y ya está poblada: marca del producto,
filo, Familias Campesinas, indicador de conexión, nombre del usuario y botón
"Salir".

Medidas de los archivos nuevos:

| Logotipo | Píxeles | Proporción | Ancho a `h-7` (28 px) |
|---|---|---|---|
| `ayuda-en-accion.png` | 277 × 73 | 3.79 : 1 | ≈ 106 px |
| `union-europea.png` | 400 × 89 | 4.49 : 1 | ≈ 126 px |

Con los espacios intermedios, la fila necesita unos 256 px adicionales. En
tablet vertical (768 px) no caben sin sacrificar el nombre del usuario o el
subtítulo de la marca.

**Decisión:** los dos logotipos aparecen desde `lg` (1024 px). Por debajo de
ese ancho la cabecera queda idéntica a hoy. La operación en campo se hace en
tablet, y no se degrada para acomodar un elemento de identidad.

### Diseño

Se declara una constante junto a la ya existente `ALIADOS_LOCALES`, siguiendo
la convención del archivo:

```tsx
// Nivel 1 y 2 de la jerarquía institucional: el proyecto y quienes lo
// ejecutan y cofinancian. Mismo orden que en el login y en la página
// pública. Los dos últimos piden ~256 px, así que entran recién en lg:
// por debajo la cabecera es la de siempre y la tablet no se aprieta.
const ALIADOS_CABECERA = [
    {
        src: "/brand/aliados/familias-campesinas.png",
        nombre: "Familias Campesinas Liderando",
        alto: "h-8 sm:h-9",
        visible: "block",
    },
    {
        src: "/brand/aliados/ayuda-en-accion.png",
        nombre: "Ayuda en Acción",
        alto: "h-7",
        visible: "hidden lg:block",
    },
    {
        src: "/brand/aliados/union-europea.png",
        nombre: "Cofinanciado por la Unión Europea",
        alto: "h-7",
        visible: "hidden lg:block",
    },
];
```

El `<img>` suelto de `MainLayout.tsx:88-93` se reemplaza por el recorrido de
esa lista, dentro de un contenedor propio que agrupa los tres:

```tsx
<div className="hidden xs:flex items-center gap-2.5 lg:gap-3.5">
    {ALIADOS_CABECERA.map(({ src, nombre, alto, visible }) => (
        <img key={src} src={src} alt={nombre}
            className={`${visible} ${alto} w-auto object-contain shrink-0`} />
    ))}
</div>
```

**El `hidden xs:flex` va en el contenedor, no en cada imagen.** Hoy la
condición `hidden xs:block` vive en el `<img>` de Familias Campesinas. Si se
dejara ahí, por debajo de `xs` el contenedor seguiría existiendo vacío y el
`gap-2.5` de la fila padre metería 10 px de aire muerto entre el texto de la
marca y la nada. Subiendo la condición al contenedor, por debajo de `xs` la
cabecera queda byte por byte como la de hoy, y el `visible` de Familias
Campesinas se reduce a `block`.

El filo (`MainLayout.tsx:86-87`) se mantiene tal cual, antes del grupo: sigue
separando el producto del proyecto que lo respalda.

### Detalles que no son opcionales

- **Textos alternativos** idénticos a los del Login: `"Ayuda en Acción"` y
  `"Cofinanciado por la Unión Europea"`. El segundo describe el logotipo
  completo, que incluye esa leyenda impresa.
- **Los logotipos no se alteran.** Ni recoloreados, ni en escala de grises, ni
  recortados — la regla ya está escrita en `index.css:105-108`. Vale
  especialmente para el emblema de la Unión Europea, cuyo uso está
  reglamentado.
- **`h-7` es el piso, no una preferencia estética.** El PNG de la Unión
  Europea lleva la leyenda "Cofinanciado por la Unión Europea" impresa; por
  debajo de 28 px de alto deja de leerse y el logotipo incumple su propósito.

### Riesgo conocido y plan de respaldo

Justo en 1024 px, con un nombre de usuario largo, la fila podría apretarse.
Se comprueba en el navegador a 1024 y 1280 px. Si aprieta, los dos logotipos
nuevos pasan de `lg:` a `xl:` (1280 px); es un cambio de dos palabras en la
constante y no altera nada más del diseño.

---

## Cambio 3 — Rótulo del ticket de venta local

Repositorio `CoopagcuyApi`, rama `main` (limpia al momento de escribir esto).

### Dónde está

El ticket no lo arma el frontend: `imprimirTicket.ts` solo descarga el PDF que
produce la API. El literal vive en
`Features/Pagos/Services/TextosVentaLocal.cs:43-44`:

```csharp
return pago.EsCuotas()
    ? "VENDIDO EN LA COMUNIDAD — A CUOTAS"
    : "VENDIDO EN LA COMUNIDAD — COBRADO";
```

### El cambio

La segunda rama pasa a `"VENDIDO EN LA COMUNIDAD — POR COBRAR"`. Se conserva
"LA COMUNIDAD" tal cual —es la redacción correcta— y la raya larga (—, em
dash), igual que en el resto de los rótulos del ticket.

### Por qué el cambio es correcto, y no una regresión

El literal actual parece deliberado: el archivo documenta que las cuotas
tienen rótulo propio porque "el papel que se lleva la productora no puede
decir 'cobrado' cuando no lo está". Conviene dejar por escrito por qué el
mismo argumento aplica también a la venta en efectivo.

Quien recibe el dinero en una venta local es la CAT, no la productora.
`PagoService.cs:891` lo dice al construir el pago: *"Nace cobrada: el dinero
lo recibió la propia CAT y no queda nada que nadie tenga que hacer dentro del
sistema."* El `Estado = Recibido` y el `MontoPagadoUsd = MontoUsd` describen
que el trámite está cerrado en el sistema, no que la productora ya tenga la
plata en la mano.

El pie del propio ticket ya lo dice — `TicketPagoService.cs:51`: *"Este
documento acredita un pago pendiente de la cooperativa."* Con "COBRADO" arriba
y "pago pendiente" abajo, el papel se contradice a sí mismo. "POR COBRAR"
resuelve la contradicción del lado correcto: el de quien se lleva el papel.

### La rama de cuotas no se toca

`"— A CUOTAS"` queda igual. Sigue siendo necesaria: ya no por distinguir
cobrado de no cobrado —ahora ninguna de las dos afirma que se cobró— sino
porque informa el mecanismo, y la línea de método debajo detalla el acuerdo
("A cuotas: 30 días × USD 2,50").

**Consecuencia que hay que registrar:** el comentario de documentación de
`TextoEstado` justifica la rama de cuotas diciendo que el papel "no puede
decir 'cobrado' cuando no lo está". Ese argumento ya no distingue las dos
ramas, porque ninguna lo dice. El comentario se reescribe para explicar la
razón que sí queda en pie: ambas ramas informan que la productora aún no ha
cobrado, y la de cuotas además dice bajo qué acuerdo.

### El reporte de ganancias no cambia

`cobradoLocal` y su rótulo "Cobrado local" en la pantalla de Reportes se
quedan como están. Ahí "cobrado" mira desde la CAT, y su propio comentario lo
declara: *"cobrado es dinero que la CAT ya tiene en la mano"*
(`types/reportes.ts:136`). Los dos usos de la palabra son correctos porque
miran desde puntos distintos; tocar el reporte introduciría el error que el
ticket está corrigiendo, en espejo.

### Pruebas

El proyecto de API sí tiene pruebas, y hay dos que tocan este literal:

1. **`TextosVentaLocalTests.cs:56-60`** — `UnaVentaEnEfectivoDiceQueYaSeCobro`
   afirma `"VENDIDO EN LA COMUNIDAD — COBRADO"`. Cambian la aserción **y el
   nombre**: el nombre actual describe la conducta contraria a la deseada, así
   que dejarlo convertiría la prueba en documentación falsa. Pasa a
   `UnaVentaEnEfectivoDiceQueLaProductoraAunNoCobro`, con un comentario que
   recoja el argumento de arriba (el dinero lo tiene la CAT).

2. **`TextosVentaLocalTests.cs:70`** — la prueba de cuotas afirma
   `texto.ShouldNotContain("COBRADO")`. **Sigue pasando sin tocarla**:
   "POR COBRAR" no contiene la subcadena "COBRADO" (COBRAR ≠ COBRADO), y la
   rama de cuotas ni siquiera cambia. Se deja como está.

`TicketPagoTests.cs:393` menciona `"VENDIDO EN LA COMUNIDAD…"` solo dentro de
un comentario explicativo, con puntos suspensivos y sin afirmar el sufijo: no
requiere cambio.

`TicketPagoService.TextoEstado(EstadoPago)` —el rótulo del ticket de planta,
con "PENDIENTE DE PAGO" / "PAGADO — POR VERIFICAR" / "PAGO VERIFICADO"— es
otra función y no se toca.

---

## Verificación

### Cambio 3 (API)

`dotnet test` sobre `CoopagcuyApi`. La suite de `TextosVentaLocalTests` cubre
el rótulo por unidad, que es precisamente el motivo por el que estos textos
viven fuera del armado del PDF: QuestPDF comprime los flujos de texto del
documento y del binario no se puede afirmar nada.

La prueba renombrada debe **fallar antes** del cambio en `TextosVentaLocal.cs`
y pasar después. Si pasa en ambos casos, no está probando lo que dice probar.

### Cambios 1 y 2 (Front)

1. `pnpm lint`
2. `pnpm build`
3. Navegador contra `pnpm dev` (configuración `coopagcuy-front`, puerto 5173)
   a 768, 1024 y 1280 px de ancho:
   - a 768 px la cabecera es idéntica a la actual;
   - a 1024 y 1280 px se ven los tres logotipos sin desbordar la fila;
   - el modal de pago muestra "📎 Adjuntar captura" y "Ningún archivo
     seleccionado", y al elegir un archivo aparece su nombre junto al aviso
     "✓ Captura lista para subir".

**Limitación declarada.** La cabecera exige sesión iniciada y el modal de pago
exige un ticket en estado PAT, es decir, la API de `https://localhost:7275`
corriendo con datos. Lo que no se pueda alcanzar en el navegador se informará
como no verificado; no se dará por comprobado nada que no se haya visto.

El **frontend** no tiene marco de pruebas instalado (no hay Vitest ni Jest en
`package.json`), así que los cambios 1 y 2 no llevan pruebas automatizadas:
montar esa infraestructura es un trabajo aparte y no lo que se pidió aquí. El
cambio 3, en la API, sí se cubre por unidad porque ahí la suite ya existe.

## Fuera de alcance

- `FormLote.tsx` — su selector ya está en español. Su input oculto con
  `hidden` tiene el problema de teclado descrito arriba, pero corregirlo es un
  trabajo distinto del que se pidió.
- `VerificarPago.tsx` — solo muestra el comprobante, no lo selecciona.
- El pie de página de `MainLayout.tsx`, el `Login.tsx` y el `QRPublico.tsx`:
  ya presentan la jerarquía completa de aliados.
- El rótulo `"— A CUOTAS"` del ticket y la función
  `TicketPagoService.TextoEstado(EstadoPago)` del ticket de planta.
- El reporte de ganancias (`cobradoLocal` / "Cobrado local"): correcto tal
  como está, por la razón explicada en el cambio 3.
- La leyenda legal del pie del ticket (`TicketPagoService.LeyendaLegal()`):
  con "POR COBRAR" arriba deja de contradecirse, así que no hace falta
  tocarla.
