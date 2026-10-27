// =====================================================================
// PATRÓN SINGLETON (creacional)
// Una sola configuración del periodo para todo el sistema.
// Ref: https://refactoring.guru/es/design-patterns/singleton
// =====================================================================
class ConfiguracionAcademica {
  static #instancia = null;

  constructor() {
    if (ConfiguracionAcademica.#instancia) {
      throw new Error("Use ConfiguracionAcademica.getInstancia()");
    }
    this.periodo = "2026-2";
    this.maxCreditos = 20;
    this.valorCredito = 350000;
    this.notaMinima = 3.0;
  }

  // Devuelve siempre el mismo objeto; lo crea la primera vez que se pide.
  static getInstancia() {
    if (!ConfiguracionAcademica.#instancia) {
      ConfiguracionAcademica.#instancia = new ConfiguracionAcademica();
    }
    return ConfiguracionAcademica.#instancia;
  }
}

// Error para las reglas del negocio (cupos, cruces, créditos...).
class ReglaNegocioError extends Error {}

// Formatos para mostrar en pantalla: $2.082.500 y notas como 4,1
function formatoPesos(valor) {
  return "$" + String(Math.round(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatoNota(nota) {
  return nota.toFixed(1).replace(".", ",");
}
