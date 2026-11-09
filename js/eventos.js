// =====================================================================
// PATRÓN OBSERVER (comportamiento)
// Los módulos publican eventos ("PagoAprobado", "MatriculaConfirmada",
// "NotaPublicada") y los suscriptores reaccionan sin que el publicador
// sepa quiénes son.
// Ref: https://refactoring.guru/es/design-patterns/observer
// =====================================================================
class BusEventos {
  constructor() {
    this.suscriptores = {}; // tipo de evento -> lista de funciones
    this.errores = [];
  }

  suscribir(tipo, funcion) {
    if (!this.suscriptores[tipo]) {
      this.suscriptores[tipo] = [];
    }
    this.suscriptores[tipo].push(funcion);
  }

  // Espera a cada suscriptor (pueden guardar en la base de datos).
  async publicar(tipo, datos) {
    for (const funcion of this.suscriptores[tipo] || []) {
      try {
        await funcion(datos);
      } catch (e) {
        // Si un suscriptor falla, los demás igual reciben el evento.
        this.errores.push(tipo + ": " + e.message);
      }
    }
  }
}
