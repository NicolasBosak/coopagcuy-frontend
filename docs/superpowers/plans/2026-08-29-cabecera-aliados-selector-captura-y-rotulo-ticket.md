# Cabecera con aliados, selector de captura y rótulo del ticket — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Traducir al español el selector de captura del pago a productora, sumar los logotipos de Ayuda en Acción y la Unión Europea a la cabecera, y corregir el rótulo del ticket de venta local que afirma que la productora ya cobró cuando no lo ha hecho.

**Architecture:** Tres cambios independientes, sin dependencias entre sí, repartidos en dos repositorios. El de la API es una función pura con pruebas unitarias, así que va por TDD estricto. Los dos del frontend son de presentación en un proyecto sin marco de pruebas, así que se verifican por `lint`, `build` y navegador, con procedimiento manual explícito.

**Tech Stack:** React 19 + TypeScript + Tailwind 3 + Vite 8 (frontend, pnpm); .NET con xUnit y Shouldly (API); QuestPDF para el ticket.

**Spec:** `docs/superpowers/specs/2026-08-29-cabecera-aliados-y-selector-captura-design.md`

## Global Constraints

- **Repositorios distintos.** Tareas 1: `C:\Users\nicol\OneDrive\Documents\CoopagcuyApi`. Tareas 2 y 3: `C:\Users\nicol\OneDrive\Documents\CoopagcuyFront\coopagcuy-frontend`. Cada uno tiene su propio git; no hay monorepo.
- **Ramas.** La API está en `main` (limpia): la Tarea 1 abre rama antes de tocar nada. El frontend ya está en `feat/reportes-ganancias`: las Tareas 2 y 3 continúan ahí, sin abrir rama nueva.
- **Idioma.** Todo texto visible, nombre de variable, comentario y mensaje de commit va en español, como el resto de ambos repositorios.
- **Mensajes de commit.** Prefijo `fix:` en minúscula y descripción en español, siguiendo el historial de ambos repos.
- **Raya larga.** Los rótulos del ticket usan `—` (em dash, U+2014), no guion corto. Copiar el carácter tal cual.
- **Literales exactos del ticket:** `"VENDIDO EN LA COMUNIDAD — POR COBRAR"` y `"VENDIDO EN LA COMUNIDAD — A CUOTAS"`.
- **Textos alternativos exactos de los logotipos:** `"Familias Campesinas Liderando"`, `"Ayuda en Acción"`, `"Cofinanciado por la Unión Europea"`.
- **Los logotipos institucionales no se alteran:** ni recoloreados, ni en escala de grises, ni recortados, ni deformados. Solo `object-contain` con altura fija y ancho automático.
- **No tocar:** el rótulo `"— A CUOTAS"`, `TicketPagoService.TextoEstado(EstadoPago)`, `TicketPagoService.LeyendaLegal()`, el reporte de ganancias (`cobradoLocal` / "Cobrado local"), `FormLote.tsx`, `VerificarPago.tsx`, `Login.tsx`, `QRPublico.tsx` ni el pie de `MainLayout.tsx`.

---

## Estructura de archivos

| Repo | Archivo | Responsabilidad | Tarea |
|---|---|---|---|
| API | `Features/Pagos/Services/TextosVentaLocal.cs` | Funciones puras con los textos del ticket de venta local | 1 |
| API | `tests/CoopagcuyApi.Tests/Unitarias/TextosVentaLocalTests.cs` | Pruebas de esas funciones | 1 |
| Front | `src/components/faenamiento/FormPagoProductora.tsx` | Modal de registro de pago a la productora | 2 |
| Front | `src/components/layout/MainLayout.tsx` | Cabecera, navegación y pie de la app autenticada | 3 |

No se crea ningún archivo. Los cuatro ya existen y ninguno crece lo bastante como para justificar partirlo.

---

## Task 1: Rótulo del ticket de venta local (API)

**Files:**
- Modify: `Features/Pagos/Services/TextosVentaLocal.cs:30-45`
- Test: `tests/CoopagcuyApi.Tests/Unitarias/TextosVentaLocalTests.cs:54-60`

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: nada que otras tareas consuman. La firma `public static string TextoEstado(Pago pago)` no cambia; solo cambia el valor que devuelve en una rama.

**Contexto para quien implementa:** en una venta local, quien recibe el dinero del comprador es el centro de acopio (CAT), no la productora. `PagoService.cs:891` lo dice al construir el pago: *"Nace cobrada: el dinero lo recibió la propia CAT y no queda nada que nadie tenga que hacer dentro del sistema."* El `Estado = Recibido` describe que el trámite quedó cerrado en el sistema, no que la productora tenga la plata. El pie del propio ticket ya dice *"Este documento acredita un pago pendiente de la cooperativa"*, así que hoy el papel se contradice a sí mismo. Eso es lo que se corrige.

- [ ] **Step 1: Crear la rama**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyApi && git checkout -b fix/ticket-venta-local-por-cobrar
```

Esperado: `Switched to a new branch 'fix/ticket-venta-local-por-cobrar'`

- [ ] **Step 2: Escribir la prueba que falla**

En `tests/CoopagcuyApi.Tests/Unitarias/TextosVentaLocalTests.cs`, reemplazar el bloque completo de las líneas 54-60:

```csharp
    [Fact]
    public void UnaVentaEnEfectivoDiceQueYaSeCobro()
    {
        TextosVentaLocal.TextoEstado(Local("Efectivo"))
            .ShouldBe("VENDIDO EN LA COMUNIDAD — COBRADO");
    }
```

por este:

```csharp
    [Fact]
    public void UnaVentaEnEfectivoDiceQueLaProductoraAunNoCobro()
    {
        // Quien recibe el dinero del comprador es la CAT, no la productora:
        // ver "Nace cobrada: el dinero lo recibió la propia CAT" en
        // PagoService.RegistrarVentaLocalAsync. El papel que ella se lleva no
        // puede afirmar que ya cobró cuando el pie del mismo ticket dice que
        // acredita "un pago pendiente de la cooperativa".
        TextosVentaLocal.TextoEstado(Local("Efectivo"))
            .ShouldBe("VENDIDO EN LA COMUNIDAD — POR COBRAR");
    }
```

Se cambia también el **nombre** del método, no solo la aserción: `UnaVentaEnEfectivoDiceQueYaSeCobro` describe la conducta contraria a la que queremos, y dejarlo convertiría la prueba en documentación falsa.

- [ ] **Step 3: Correr la prueba y comprobar que falla**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyApi && dotnet test tests/CoopagcuyApi.Tests/CoopagcuyApi.Tests.csproj --filter "FullyQualifiedName~TextosVentaLocalTests"
```

Esperado: FALLA. Shouldly informa que recibió `"VENDIDO EN LA COMUNIDAD — COBRADO"` y esperaba `"VENDIDO EN LA COMUNIDAD — POR COBRAR"`.

Si pasa en este punto, algo está mal: revisar que la raya larga copiada sea `—` (U+2014) y no `-` ni `–`.

- [ ] **Step 4: Cambiar el literal y su comentario de documentación**

En `Features/Pagos/Services/TextosVentaLocal.cs`, reemplazar el bloque completo de las líneas 30-45:

```csharp
    /// <summary>
    /// Rótulo de estado.
    ///
    /// Una venta a cuotas es Recibido por dentro —no queda nada que nadie
    /// tenga que hacer en el sistema— pero el dinero todavía no llegó. El
    /// papel que se lleva la productora no puede decir "cobrado" cuando no lo
    /// está: por eso las cuotas tienen su propio rótulo.
    /// </summary>
    public static string TextoEstado(Pago pago)
    {
        if (!pago.EsVentaLocal) return TicketPagoService.TextoEstado(pago.Estado);

        return pago.EsCuotas()
            ? "VENDIDO EN LA COMUNIDAD — A CUOTAS"
            : "VENDIDO EN LA COMUNIDAD — COBRADO";
    }
```

por este:

```csharp
    /// <summary>
    /// Rótulo de estado.
    ///
    /// Quien recibe el dinero del comprador en una venta local es la CAT, no
    /// la productora. El pago "nace cobrado" para el sistema —Estado Recibido,
    /// nada que nadie tenga que hacer— pero la plata todavía no llegó a manos
    /// de quien se lleva este papel, y el pie del ticket ya lo dice: acredita
    /// "un pago pendiente de la cooperativa". El rótulo no puede afirmar lo
    /// contrario del pie del mismo documento.
    ///
    /// Por eso ninguna de las dos ramas dice que se cobró. La de cuotas sigue
    /// existiendo porque además informa el mecanismo, que la línea de método
    /// detalla justo debajo.
    /// </summary>
    public static string TextoEstado(Pago pago)
    {
        if (!pago.EsVentaLocal) return TicketPagoService.TextoEstado(pago.Estado);

        return pago.EsCuotas()
            ? "VENDIDO EN LA COMUNIDAD — A CUOTAS"
            : "VENDIDO EN LA COMUNIDAD — POR COBRAR";
    }
```

- [ ] **Step 5: Correr la prueba y comprobar que pasa**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyApi && dotnet test tests/CoopagcuyApi.Tests/CoopagcuyApi.Tests.csproj --filter "FullyQualifiedName~TextosVentaLocalTests"
```

Esperado: PASA. Las 6 pruebas de la clase en verde.

Presta atención a `UnaVentaACuotasNoDiceQueYaSeCobro`, que afirma `texto.ShouldNotContain("COBRADO")`: debe seguir pasando sin tocarla, porque la rama de cuotas no cambió y porque "POR COBRAR" no contiene la subcadena "COBRADO" (COBRAR ≠ COBRADO). Si esa prueba falla, cambiaste la rama equivocada.

- [ ] **Step 6: Correr la suite completa**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyApi && dotnet test tests/CoopagcuyApi.Tests/CoopagcuyApi.Tests.csproj
```

Esperado: todo verde. Interesa sobre todo `TicketPagoTests`, que arma el PDF de verdad.

Si alguna prueba de integración falla por falta de base de datos o de Docker en esta máquina —no por el cambio—, anótalo como no verificado en vez de darlo por bueno, y confirma al menos que `TextosVentaLocalTests` y `TicketPagoTests` pasan.

- [ ] **Step 7: Commit**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyApi && git add Features/Pagos/Services/TextosVentaLocal.cs tests/CoopagcuyApi.Tests/Unitarias/TextosVentaLocalTests.cs && git commit -m "fix: el ticket de venta local dice POR COBRAR en vez de COBRADO"
```

---

## Task 2: Selector de la captura de transferencia en español (Front)

**Files:**
- Modify: `src/components/faenamiento/FormPagoProductora.tsx` — tres puntos: el bloque de `useState` (~línea 45), `leerComprobante` (87-112) y el JSX del selector (320-338).

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: nada que otras tareas consuman. Cambio local al componente; ni la API ni otros componentes ven diferencia.

**Contexto para quien implementa:** el texto "Choose File" y "No file chosen" lo dibuja el navegador según su propio idioma. No hay atributo HTML ni CSS que lo cambie — el selector `file:` de Tailwind alcanza el estilo del botón, nunca su texto. La única salida es ocultar el control nativo y dispararlo desde un `<label>` propio.

**Sobre las pruebas:** este proyecto no tiene Vitest ni Jest en `package.json`. No hay ciclo TDD disponible y no se monta la infraestructura aquí: eso es un trabajo aparte. La verificación es el Step 5, con procedimiento manual explícito.

- [ ] **Step 1: Agregar el estado del nombre de archivo**

En `src/components/faenamiento/FormPagoProductora.tsx`, justo después de la línea `const [comprobante, setComprobante] = useState<string | null>(null);`, insertar:

```tsx
    // El nombre visible del archivo elegido. Va aparte porque `comprobante`
    // guarda solo el base64, y el selector propio tiene que mostrar qué se
    // adjuntó: el control nativo que dibujaba ese texto ya no está.
    const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
```

- [ ] **Step 2: Ajustar `leerComprobante`**

> **Los números de línea de aquí en adelante son los del archivo ORIGINAL.**
> El Step 1 ya insertó 4 líneas, así que todo lo de abajo está corrido. Ubica
> los bloques por su contenido —que va copiado íntegro— y no por el número.

Reemplazar estas tres líneas, al inicio de `leerComprobante` (original 87-89):

```tsx
    const leerComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];
        if (!archivo) return;
```

por este:

```tsx
    const leerComprobante = (e: React.ChangeEvent<HTMLInputElement>) => {
        const archivo = e.target.files?.[0];

        // Permite volver a elegir el MISMO archivo: sin esto el input no
        // dispara change la segunda vez. El File ya quedó capturado arriba,
        // así que limpiar el value no lo invalida.
        e.target.value = "";

        if (!archivo) return;
```

Y dentro de `lector.onload`, después de la línea `setComprobante(resultado.slice(resultado.indexOf(",") + 1));`, insertar:

```tsx
            setNombreArchivo(archivo.name);
```

**Ningún camino de error toca `nombreArchivo`.** Ni el del tope de peso ni `lector.onerror`. Es deliberado: `nombreArchivo` y `comprobante` se asignan siempre juntos dentro de `onload`, así que si la operadora adjunta una captura válida y luego elige por error un archivo demasiado pesado, la selección anterior sobrevive y el aviso explica que el archivo nuevo fue rechazado. Es el comportamiento que `comprobante` ya tiene hoy. No agregues `setNombreArchivo(null)` en los caminos de error: rompería esa invariante.

- [ ] **Step 3: Reemplazar el selector nativo**

Reemplazar el bloque completo del selector (original 320-338, corrido unas 11
líneas por los pasos anteriores — ubícalo por su contenido):

```tsx
                <div>
                    <label className="block text-xs font-bold uppercase
                        tracking-wide text-gray-500 mb-1">
                        Captura de la transferencia
                    </label>
                    <input
                        type="file" accept="image/*" capture="environment"
                        onChange={leerComprobante}
                        className="w-full text-xs file:min-h-[44px] file:px-3
                            file:rounded-xl file:border-2 file:border-primary-200
                            file:bg-primary-50 file:text-primary-800
                            file:font-bold file:text-xs"
                    />
                    {comprobante && (
                        <p className="mt-1 text-xs text-primary-700 font-semibold">
                            ✓ Captura lista para subir
                        </p>
                    )}
                </div>
```

por este:

```tsx
                <div>
                    {/* Deja de ser <label>: no apuntaba a ningún control, y
                        el label de verdad es ahora el botón de abajo. Dos
                        <label> anidados serían marcado inválido. */}
                    <span className="block text-xs font-bold uppercase
                        tracking-wide text-gray-500 mb-1">
                        Captura de la transferencia
                    </span>

                    <div className="flex items-center gap-2">
                        {/* sr-only y no hidden: display:none saca el control
                            del orden de tabulación y deja el selector
                            inalcanzable con teclado. Va ANTES del label
                            porque peer-* solo alcanza hermanos posteriores.

                            Sin capture: el comprobante de una transferencia
                            es una captura de pantalla que ya está en la
                            galería, y capture abre la cámara directo en
                            Android. accept="image/*" igual ofrece la cámara
                            dentro del selector. */}
                        <input
                            id="comprobante"
                            type="file" accept="image/*"
                            onChange={leerComprobante}
                            className="sr-only peer"
                        />
                        <label
                            htmlFor="comprobante"
                            className="inline-flex items-center justify-center
                                min-h-[44px] px-3 rounded-xl border-2
                                border-primary-200 bg-primary-50 text-primary-800
                                font-bold text-xs cursor-pointer shrink-0
                                hover:bg-primary-100 transition-colors duration-150
                                peer-focus-visible:ring-2
                                peer-focus-visible:ring-primary-500
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

- [ ] **Step 4: Lint y build**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyFront/coopagcuy-frontend && pnpm lint && pnpm build
```

Esperado: ambos sin errores. `tsc -b` tiene que compilar limpio; si se queja de `nombreArchivo`, revisa que el `useState` del Step 1 quedó dentro del componente.

- [ ] **Step 5: Verificar en el navegador**

Arranca el servidor con la herramienta de preview usando la configuración `coopagcuy-front` de `.claude/launch.json` (puerto 5173). **No lo arranques con Bash.**

Ir a **Faenamiento** e iniciar el registro de un pago a una productora, para abrir el modal "Pagar a …". Comprobar:

1. Bajo "CAPTURA DE LA TRANSFERENCIA" se lee **"📎 Adjuntar captura"** y, a su derecha, **"Ningún archivo seleccionado"**. No aparece "Choose File" ni "No file chosen" por ninguna parte.
2. Al elegir una imagen, el texto gris pasa a ser el nombre del archivo y debajo aparece "✓ Captura lista para subir".
3. Con el teclado: al llegar tabulando al selector, el botón muestra un anillo de foco visible; con Enter o Espacio se abre el diálogo de archivos.

**Límite conocido:** llegar a este modal exige sesión iniciada y un ticket en estado PAT, es decir la API de `https://localhost:7275` corriendo con datos. Si no se puede llegar, dilo como no verificado — no lo des por bueno. `pnpm build` y `pnpm lint` sí son exigibles siempre.

- [ ] **Step 6: Commit**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyFront/coopagcuy-frontend && git add src/components/faenamiento/FormPagoProductora.tsx && git commit -m "fix: el selector de la captura de transferencia esta en espanol y acepta la galeria"
```

---

## Task 3: Ayuda en Acción y Unión Europea en la cabecera (Front)

**Files:**
- Modify: `src/components/layout/MainLayout.tsx` — dos puntos: la zona de constantes (después de `ALIADOS_LOCALES`, que termina en la línea 34) y el `<img>` de la cabecera (88-93).

**Interfaces:**
- Consumes: nada de otras tareas.
- Produces: nada que otras tareas consuman.

**Contexto para quien implementa:** el sistema ya tiene una jerarquía de tres niveles, visible en `Login.tsx:231-285` y en `QRPublico.tsx`: (1) Familias Campesinas Liderando, el proyecto; (2) Ayuda en Acción y la Unión Europea, quien ejecuta y quien cofinancia; (3) los aliados locales. La cabecera muestra hoy solo el nivel 1. Esta tarea le suma el nivel 2, en el mismo orden. El nivel 3 se queda en el pie, donde ya está.

Los tres PNG ya existen en `public/brand/aliados/`. No hay que generar ni descargar imágenes.

- [ ] **Step 1: Declarar la lista de logotipos de la cabecera**

En `src/components/layout/MainLayout.tsx`, justo después del `];` que cierra `ALIADOS_LOCALES` (línea 34), insertar:

```tsx

// Niveles 1 y 2 de la jerarquía institucional: el proyecto, y quienes lo
// ejecutan y cofinancian. Mismo orden que en el login y en la página pública.
// Los dos últimos son logotipos muy anchos (3.79:1 y 4.49:1) y a h-7 piden
// unos 256 px: entran recién en lg para no apretar la cabecera en la tablet,
// que es donde se opera en campo.
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

`h-7` (28 px) es el piso, no una preferencia estética: el PNG de la Unión Europea lleva impresa la leyenda "Cofinanciado por la Unión Europea", y por debajo de esa altura deja de leerse. No lo bajes.

- [ ] **Step 2: Reemplazar la imagen suelta por el recorrido de la lista**

Reemplazar el `<img>` de la cabecera (original 88-93, corrido unas 26 líneas
por el Step 1 — ubícalo por su contenido, no por el número):

```tsx
                        <img
                            src="/brand/aliados/familias-campesinas.png"
                            alt="Familias Campesinas Liderando"
                            className="hidden xs:block h-8 sm:h-9 w-auto object-contain
                                 shrink-0"
                        />
```

por este:

```tsx
                        {/* El hidden xs:flex va aquí y no en cada imagen: si
                            la condición se quedara en el <img>, por debajo de
                            xs este contenedor seguiría existiendo vacío y el
                            gap-2.5 de la fila padre metería 10 px de aire
                            muerto donde hoy no hay nada. */}
                        <div className="hidden xs:flex items-center gap-2.5
                                  lg:gap-3.5">
                            {ALIADOS_CABECERA.map(({ src, nombre, alto, visible }) => (
                                <img key={src} src={src} alt={nombre}
                                    className={`${visible} ${alto} w-auto
                                        object-contain shrink-0`} />
                            ))}
                        </div>
```

El `<span>` del filo, en las líneas 86-87, se queda tal cual y por delante de este bloque: sigue separando el producto del proyecto que lo respalda.

- [ ] **Step 3: Lint y build**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyFront/coopagcuy-frontend && pnpm lint && pnpm build
```

Esperado: ambos sin errores.

- [ ] **Step 4: Verificar en el navegador a tres anchos**

Con el servidor `coopagcuy-front` levantado desde la herramienta de preview, iniciar sesión y comprobar la cabecera redimensionando la ventana:

1. **768 px (tablet vertical):** la cabecera es idéntica a la de antes del cambio — marca, filo y Familias Campesinas, nada más. Si aparecen Ayuda en Acción o la Unión Europea aquí, el `lg:` está mal puesto.
2. **1024 px:** se ven los tres logotipos en fila tras el filo, en el orden Familias Campesinas → Ayuda en Acción → Unión Europea. La fila **no** desborda ni empuja fuera de vista el botón "Salir".
3. **1280 px:** igual que a 1024, con más aire.
4. En 2 y 3, la leyenda "Cofinanciado por la Unión Europea" dentro del PNG se lee sin esfuerzo, y ningún logotipo aparece deformado ni recortado.

**Si a 1024 px la fila aprieta** —caso previsto en el spec, sobre todo con un nombre de usuario largo—: cambiar `hidden lg:block` por `hidden xl:block` en los dos objetos nuevos de `ALIADOS_CABECERA`, y `lg:gap-3.5` por `xl:gap-3.5` en el contenedor. Nada más del diseño cambia. Repetir esta verificación.

Tomar una captura de pantalla a 1280 px y otra a 768 px como evidencia.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/nicol/OneDrive/Documents/CoopagcuyFront/coopagcuy-frontend && git add src/components/layout/MainLayout.tsx && git commit -m "fix: la cabecera suma los logos de Ayuda en Accion y la Union Europea"
```

---

## Cierre

Al terminar las tres tareas:

- El repositorio de la API queda en `fix/ticket-venta-local-por-cobrar`, con un commit.
- El del frontend queda en `feat/reportes-ganancias`, con dos commits nuevos.
- Ninguno se ha empujado ni fusionado: eso lo decide el usuario.

Reportar explícitamente qué se verificó en el navegador y qué no se pudo alcanzar por falta de API o de datos. No declarar verificado nada que no se haya visto correr.
