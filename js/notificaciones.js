// =====================================================================
// Notificaciones: canales de envío y el suscriptor (OBSERVER).
// Los envíos son simulados: se guardan en la "bandeja" que se ve en pantalla.
// =====================================================================
class NotificadorEmail {
  constructor(bandeja) { this.bandeja = bandeja; }

  enviar(estudiante, mensaje) {
    if (!estudiante.email) return false;
    this.bandeja.push({ canal: "EMAIL", destino: estudiante.email, mensaje });
    return true;
  }
}

class NotificadorSms {
  constructor(bandeja) { this.bandeja = bandeja; }

  enviar(estudiante, mensaje) {
    if (!estudiante.telefono) return false;
    this.bandeja.push({ canal: "SMS", destino: estudiante.telefono, mensaje: mensaje.slice(0, 160) });
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
    bus.suscribir("MatriculaConfirmada", (e) =>
      this.#avisar(e.estudianteId, "Tu matrícula quedó confirmada. Cursos: " + e.cursos.join(", ")));
    bus.suscribir("NotaPublicada", (e) =>
      this.#avisar(e.estudianteId, "Nota definitiva de " + e.nombreCurso + ": " + formatoNota(e.nota)
        + (e.aprobado ? " (APROBADO)" : " (REPROBADO)")));
  }

  #avisar(estudianteId, mensaje) {
    const estudiante = this.estudiantes.buscarPorId(estudianteId);
    if (estudiante) {
      this.canales.forEach((canal) => canal.enviar(estudiante, mensaje));
    }
  }
}
