import type { EntregaOffline } from "../types/recepcion";
import type { Productora } from "../types/productora";

const DB_NAME = "coopagcuy_offline";
// v2: se añade el almacén de productoras cacheadas para el registro offline
const DB_VERSION = 2;
const STORE = "lotes_pendientes";
const STORE_PRODUCTORAS = "productoras_cache";

function abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "_id" });
                store.createIndex("_estado", "_estado", { unique: false });
            }
            // Catálogo de productoras para cuando no hay señal: se refresca
            // en cada carga con conexión y sobrevive al cierre de la app
            if (!db.objectStoreNames.contains(STORE_PRODUCTORAS)) {
                db.createObjectStore(STORE_PRODUCTORAS, { keyPath: "id" });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

function transaccion<T>(
    modo: IDBTransactionMode,
    fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
    // El executor no es async: si abrirDB() rechaza, un executor async no
    // propagaría el error a este Promise (quedaría como rechazo no
    // manejado) y la llamada se quedaría colgada en vez de fallar.
    return abrirDB().then((db) => new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, modo);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    }));
}

// El almacén puede contener registros del formato antiguo (lotes por
// productora, previos al sistema de entregas): se filtran para que no
// rompan el render ni se intenten sincronizar.
const soloEntregas = (registros: unknown[]): EntregaOffline[] =>
    registros.filter((r): r is EntregaOffline =>
        !!r && typeof r === "object" &&
        (r as EntregaOffline)._tipo === "entrega" &&
        Array.isArray((r as EntregaOffline).cuyes));

// Cambia el estado de un registro por su id, aplicando una mutación
function actualizarEstado(
    id: string, mutar: (registro: EntregaOffline) => void
): Promise<void> {
    return abrirDB().then((db) => new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        const store = tx.objectStore(STORE);
        const get = store.get(id);
        get.onsuccess = () => {
            const registro = get.result as EntregaOffline;
            if (registro) { mutar(registro); store.put(registro); }
        };
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
    }));
}

export const offlineDB = {
    guardar: (entrega: EntregaOffline) =>
        transaccion("readwrite", (s) => s.put(entrega)),

    obtenerPendientes: (): Promise<EntregaOffline[]> =>
        abrirDB().then((db) => new Promise<EntregaOffline[]>((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const idx = store.index("_estado");
            const req = idx.getAll("pendiente");
            req.onsuccess = () => resolve(soloEntregas(req.result));
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        })),

    obtenerTodos: (): Promise<EntregaOffline[]> =>
        abrirDB().then((db) => new Promise<EntregaOffline[]>((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(soloEntregas(req.result));
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        })),

    marcarSincronizado: (id: string) =>
        actualizarEstado(id, (r) => { r._estado = "sincronizado"; }),

    // Entrega con cédula sin productora: quedó en la bandeja de vinculación.
    // Se marca "en revisión" para que deje de reenviarse y el operador la vea.
    marcarEnRevision: (id: string, motivo?: string) =>
        actualizarEstado(id, (r) => {
            r._estado = "en_revision";
            if (motivo) r._error = motivo;
        }),

    marcarError: (id: string, error: string) =>
        actualizarEstado(id, (r) => {
            r._estado = "error";
            r._error = error;
            r._intentos = (r._intentos ?? 0) + 1;
        }),

    limpiarSincronizados: () =>
        abrirDB().then((db) => new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const idx = store.index("_estado");
            const req = idx.openCursor(IDBKeyRange.only("sincronizado"));
            req.onsuccess = (e) => {
                const cursor = (e.target as IDBRequest).result;
                if (cursor) { cursor.delete(); cursor.continue(); }
            };
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        })),

    // ── Caché de productoras para el registro offline ─────────────────

    // Reemplaza el catálogo cacheado con el más reciente (traído con señal)
    guardarProductoras: (productoras: Productora[]) =>
        abrirDB().then((db) => new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_PRODUCTORAS, "readwrite");
            const store = tx.objectStore(STORE_PRODUCTORAS);
            store.clear();
            for (const p of productoras) store.put(p);
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        })),

    obtenerProductorasCache: (): Promise<Productora[]> =>
        abrirDB().then((db) => new Promise<Productora[]>((resolve, reject) => {
            const tx = db.transaction(STORE_PRODUCTORAS, "readonly");
            const store = tx.objectStore(STORE_PRODUCTORAS);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result as Productora[]);
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        })),
};
