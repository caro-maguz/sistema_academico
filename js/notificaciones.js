// =====================================================================
// Notificaciones: canales de envío y el suscriptor (OBSERVER).
// Los envíos son simulados: se guardan en la "bandeja" (un repositorio
// de avisos) que se ve en pantalla.
// =====================================================================
class NotificadorEmail {
  constructor(bandeja) { this.bandeja = bandeja; }

  async enviar(estudiante, mensaje) {
    if (!estudiante.email) return false;
    await this.bandeja.agregar({ canal: "EMAIL", destino: estudiante.email, estudianteId: estudiante.id, mensaje });
    return true;
  }
}

class NotificadorSms {
  constructor(bandeja) { this.bandeja = bandeja; }

  async enviar(estudiante, mensaje) {
    if (!estudiante.telefono) return false;
    await this.bandeja.agregar({
      canal: "SMS", destino: estudiante.telefono, estudianteId: estudiante.id, mensaje: mensaje.slice(0, 160),
    });
    return true;
  }
}

// Suscriptor del bus de eventos: convierte cada evento en un aviso al estudiante.
class SuscriptorNotificaciones {
  constructor(estudiantes, canales) {
    this.estudiantes = estudiantes;
    this.canales = canales;
  }

  registrarseEn(bus) {
    bus.suscribir("PagoAprobado", (e) =>
      this.#avisar(e.estudianteId, "Recibimos tu pago por " + formatoPesos(e.monto) + " (ref. " + e.referencia + ")"));
    bus.suscribir("PagoRechazado", (e) =>
      this.#avisar(e.estudianteId, "Tu pago fue rechazado: " + e.mensaje));
    bus.suscribir("MatriculaConfirmada", (e) =>
      this.#avisar(e.estudianteId, "Tu matrícula quedó confirmada. Cursos: " + e.cursos.join(", ")));
    bus.suscribir("NotaPublicada", (e) =>
      this.#avisar(e.estudianteId, "Nota definitiva de " + e.nombreCurso + ": " + formatoNota(e.nota)
        + (e.aprobado ? " (APROBADO)" : " (REPROBADO)")));
    bus.suscribir("PeriodoIniciado", async (e) => {
      for (const estudiante of await this.estudiantes.listar()) {
        await this.#enviarATodos(estudiante, "Inició el periodo académico " + e.periodo);
      }
    });
  }

  async #avisar(estudianteId, mensaje) {
    const estudiante = await this.estudiantes.buscarPorId(estudianteId);
    if (estudiante) await this.#enviarATodos(estudiante, mensaje);
  }

  async #enviarATodos(estudiante, mensaje) {
    for (const canal of this.canales) await canal.enviar(estudiante, mensaje);
  }
}
