// =====================================================================
// Arma el sistema: conecta repositorios, pasarelas, servicios y suscriptores.
// Los datos viven en MongoDB Atlas (se cargan con server/seed.js).
// Es el único lugar que conoce todas las piezas.
// =====================================================================
function crearSistema() {
  const bus = new BusEventos();
  const estudiantes = new EstudianteRepository();
  const cursos = new CursoRepository();
  const matriculas = new MatriculaRepository();
  const calificaciones = new CalificacionRepository();
  const bandeja = [];

  const pagos = new ServicioPagos({
    PSE: new PasarelaPseAdapter(new ClientePseExterno()),
    TARJETA: new PasarelaTarjetaAdapter(new ProcesadorTarjetasLegacy()),
  }, bus);

  const sistema = {
    bus, estudiantes, cursos, matriculas, calificaciones, bandeja, pagos,
    config: ConfiguracionAcademica.getInstancia(),
    matricula: new MatriculaFacade(estudiantes, cursos, matriculas, pagos, bus),
    notas: new ServicioCalificaciones(cursos, matriculas, calificaciones, bus),
  };

  new SuscriptorNotificaciones(estudiantes, [new NotificadorEmail(bandeja), new NotificadorSms(bandeja)])
    .registrarseEn(bus);

  return sistema;
}
