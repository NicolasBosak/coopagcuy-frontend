/**
 * Fecha en formato AAAA-MM-DD según el calendario LOCAL del equipo.
 *
 * No sirve `toISOString().slice(0, 10)`, que era lo que se usaba: convierte a
 * UTC primero, así que en Ecuador (UTC-5) a partir de las 19:00 devuelve ya el
 * día siguiente. Con eso, "hasta hoy" en un filtro de reportes significaba
 * mañana durante las últimas cinco horas de cada jornada, y el rango bailaba
 * según la hora a la que se abriera la pantalla.
 *
 * El servidor interpreta estas fechas como días locales del piloto, así que el
 * front tiene que enviarlas como tales.
 */
export function fechaLocal(d: Date = new Date()): string {
    const mes = `${d.getMonth() + 1}`.padStart(2, "0");
    const dia = `${d.getDate()}`.padStart(2, "0");
    return `${d.getFullYear()}-${mes}-${dia}`;
}
