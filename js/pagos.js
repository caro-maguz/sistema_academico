// =====================================================================
// PATRÓN STRATEGY (comportamiento) — descuentos de la matrícula
// Cada descuento es una clase con el mismo método aplicar(valor).
// Ref: https://refactoring.guru/es/design-patterns/strategy
// =====================================================================
class SinDescuento {
  aplicar(valor) { return valor; }
}

class DescuentoBeca {
  constructor(porcentaje) { this.porcentaje = porcentaje; }
  aplicar(valor) { return valor - (valor * this.porcentaje) / 100; }
}

class DescuentoPorEstrato {
  constructor(estrato) { this.estrato = estrato; }
  aplicar(valor) {
    const porcentaje = this.estrato <= 2 ? 15 : this.estrato === 3 ? 5 : 0;
    return valor - (valor * porcentaje) / 100;
  }
}

// =====================================================================
// Servicios externos SIMULADOS (no los podemos cambiar).
// Cada uno trabaja distinto: PSE usa miles de pesos y textos,
// la librería de tarjetas usa centavos y números.
// =====================================================================
class ClientePseExterno {
  iniciarTransaccion(documento, valorEnMiles, banco) {
    if (!banco) return { codigoEstado: "FAILED_BANK" };
    if (valorEnMiles > 50000) return { codigoEstado: "REJECTED" };
    return { codigoEstado: "APPROVED", cus: "CUS-" + Math.floor(Math.random() * 1e8) };
  }
}

class ProcesadorTarjetasLegacy {
  charge(numeroTarjeta, centavos) {
    if (!numeroTarjeta || numeroTarjeta.startsWith("SIN_FONDOS")) {
      this.ultimoCodigo = null;
      return 51; // 51 = fondos insuficientes
    }
    this.ultimoCodigo = "AUT-" + Math.floor(Math.random() * 1e6);
    return 0; // 0 = aprobado
  }

  lastAuthCode() { return this.ultimoCodigo; }
}

// =====================================================================
// PATRÓN ADAPTER (estructural)
// Todas las pasarelas se usan igual: cobrar(solicitud) -> { aprobado, referencia, mensaje }.
// Cada adaptador traduce a la forma de trabajar de su proveedor.
// Ref: https://refactoring.guru/es/design-patterns/adapter
// =====================================================================
class PasarelaPseAdapter {
  constructor(clientePse) { this.clientePse = clientePse; }

  cobrar(solicitud) {
    const respuesta = this.clientePse.iniciarTransaccion(
      solicitud.documento, solicitud.monto / 1000, solicitud.referencia); // pesos -> miles
    if (respuesta.codigoEstado === "APPROVED") {
      return { aprobado: true, referencia: respuesta.cus, mensaje: "Pago aprobado" };
    }
    if (respuesta.codigoEstado === "FAILED_BANK") {
      return { aprobado: false, mensaje: "PSE: banco no válido" };
    }
    return { aprobado: false, mensaje: "PSE: transacción rechazada" };
  }
}

class PasarelaTarjetaAdapter {
  constructor(procesador) { this.procesador = procesador; }

  cobrar(solicitud) {
    const codigo = this.procesador.charge(solicitud.referencia, solicitud.monto * 100); // pesos -> centavos
    if (codigo === 0) {
      return { aprobado: true, referencia: this.procesador.lastAuthCode(), mensaje: "Pago aprobado" };
    }
    return { aprobado: false, mensaje: codigo === 51 ? "Tarjeta: fondos insuficientes" : "Tarjeta: error " + codigo };
  }
}

// =====================================================================
// Servicio de pagos: escoge la estrategia de descuento y la pasarela.
// =====================================================================
class ServicioPagos {
  constructor(pasarelas, bus) {
    this.pasarelas = pasarelas; // { PSE: adapter, TARJETA: adapter }
    this.bus = bus;
  }

  // La beca tiene prioridad sobre el estrato.
  seleccionarDescuento(estudiante) {
    if (estudiante.beca > 0) return new DescuentoBeca(estudiante.beca);
    if (estudiante.estrato <= 3) return new DescuentoPorEstrato(estudiante.estrato);
    return new SinDescuento();
  }

  calcularValor(estudiante, creditos, valorCredito) {
    return this.seleccionarDescuento(estudiante).aplicar(creditos * valorCredito);
  }

  pagar(estudiante, medio, referencia, monto) {
    const pasarela = this.pasarelas[medio];
    if (!pasarela) throw new ReglaNegocioError("Medio de pago no soportado: " + medio);

    const resultado = monto === 0
      ? { aprobado: true, referencia: "EXENTO", mensaje: "Beca completa" }
      : pasarela.cobrar({ documento: estudiante.id, referencia, monto });

    if (resultado.aprobado) {
      this.bus.publicar("PagoAprobado", { estudianteId: estudiante.id, monto, referencia: resultado.referencia });
    }
    return resultado;
  }
}
