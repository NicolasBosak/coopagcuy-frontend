import type { EntregaOffline } from "../types/recepcion";

const DB_NAME = "coopagcuy_offline";
const DB_VERSION = 1;
const STORE = "lotes_pendientes";

function abrirDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "_id" });
                store.createIndex("_estado", "_estado", { unique: false });
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
    return new Promise(async (resolve, reject) => {
        const db = await abrirDB();
        const tx = db.transaction(STORE, modo);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.oncomplete = () => db.close();
    });
}

// El almacén puede contener registros del formato antiguo (lotes por
// productora, previos al sistema de entregas): se filtran para que no
// rompan el render ni se intenten sincronizar.
const soloEntregas = (registros: unknown[]): EntregaOffline[] =>
    registros.filter((r): r is EntregaOffline =>
        !!r && typeof r === "object" &&
        (r as EntregaOffline)._tipo === "entrega" &&
        Array.isArray((r as EntregaOffline).cuyes));

export const offlineDB = {
    guardar: (entrega: EntregaOffline) =>
        transaccion("readwrite", (s) => s.put(entrega)),

    obtenerPendientes: (): Promise<EntregaOffline[]> =>
        new Promise(async (resolve, reject) => {
            const db = await abrirDB();
            const tx = db.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const idx = store.index("_estado");
            const req = idx.getAll("pendiente");
            req.onsuccess = () => resolve(soloEntregas(req.result));
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        }),

    obtenerTodos: (): Promise<EntregaOffline[]> =>
        new Promise(async (resolve, reject) => {
            const db = await abrirDB();
            const tx = db.transaction(STORE, "readonly");
            const store = tx.objectStore(STORE);
            const req = store.getAll();
            req.onsuccess = () => resolve(soloEntregas(req.result));
            req.onerror = () => reject(req.error);
            tx.oncomplete = () => db.close();
        }),

    marcarSincronizado: (id: string) =>
        new Promise<void>(async (resolve, reject) => {
            const db = await abrirDB();
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const get = store.get(id);
            get.onsuccess = () => {
                const registro = get.result as EntregaOffline;
                if (registro) {
                    registro._estado = "sincronizado";
                    store.put(registro);
                }
            };
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        }),

    marcarError: (id: string, error: string) =>
        new Promise<void>(async (resolve, reject) => {
            const db = await abrirDB();
            const tx = db.transaction(STORE, "readwrite");
            const store = tx.objectStore(STORE);
            const get = store.get(id);
            get.onsuccess = () => {
                const registro = get.result as EntregaOffline;
                if (registro) {
                    registro._estado = "error";
                    registro._error = error;
                    registro._intentos = (registro._intentos ?? 0) + 1;
                    store.put(registro);
                }
            };
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
        }),

    limpiarSincronizados: () =>
        new Promise<void>(async (resolve, reject) => {
            const db = await abrirDB();
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
        }),
};