// Lado mayor y calidad elegidos para que una foto de tablet quede en ~100 KB:
// la entrega viaja entera en un solo JSON y puede llevar varias, y la tablet
// la guarda en IndexedDB hasta que haya señal.
const LADO_MAXIMO = 1024;
const CALIDAD = 0.6;

/**
 * Reescala y recomprime una foto a JPEG, devolviendo base64 SIN el prefijo
 * `data:`: el API hace Convert.FromBase64String directamente y el prefijo lo
 * haría fallar.
 */
export function comprimirImagen(archivo: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(archivo);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            const escala = Math.min(1, LADO_MAXIMO / Math.max(img.width, img.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * escala);
            canvas.height = Math.round(img.height * escala);

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                reject(new Error("No se pudo preparar la imagen."));
                return;
            }

            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL("image/jpeg", CALIDAD);
            resolve(dataUrl.slice(dataUrl.indexOf(",") + 1));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("No se pudo leer la foto."));
        };

        img.src = url;
    });
}
