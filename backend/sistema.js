// =====================================================================
// Arma el sistema: conecta repositorios, pasarelas, servicios y suscriptores.
// Es el único lugar que conoce todas las piezas.
// =====================================================================
const {
  BusEventos, ConfiguracionAcademica, ServicioPagos, PasarelaPseAdapter, PasarelaTarjetaAdapter,
  ClientePseExterno, ProcesadorTarjetasLegacy, MatriculaFacade, ServicioCalificaciones,
  SuscriptorNotificaciones, NotificadorEmail, NotificadorSms,
} = require("./dominio");

function crearSistema(repos) {
  const bus = new BusEventos();
  const pagos = new ServicioPagos({
    PSE: new PasarelaPseAdapter(new ClientePseExterno()),
    TARJETA: new PasarelaTarjetaAdapter(new ProcesadorTarjetasLegacy()),
  }, bus);

  // OBSERVER: avisos al estudiante por correo y SMS (simulados, se guardan en "notificaciones").
  new SuscriptorNotificaciones(repos.estudiantes, [
    new NotificadorEmail(repos.notificaciones),
    new NotificadorSms(repos.notificaciones),
  ]).registrarseEn(bus);

  // OBSERVER: historial de pagos. No guardamos números de tarjeta ni datos del banco.
  bus.suscribir("PagoAprobado", (e) => repos.pagos.agregar({
    estudianteId: e.estudianteId, monto: e.monto, referencia: e.referencia, estado: "Pagado",
  }));
  bus.suscribir("PagoRechazado", (e) => repos.pagos.agregar({
    estudianteId: e.estudianteId, monto: e.monto, referencia: "—", medio: e.medio, estado: "Rechazado", mensaje: e.mensaje,
  }));

  return {
    bus,
    pagos,
    config: ConfiguracionAcademica.getInstancia(),
    matricula: new MatriculaFacade(repos.estudiantes, repos.cursos, repos.matriculas, pagos, bus),
    notas: new ServicioCalificaciones(repos.cursos, repos.matriculas, repos.calificaciones, bus),
  };
}

module.exports = { crearSistema };
