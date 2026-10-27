// =====================================================================
// Arma el sistema: conecta repositorios, pasarelas, servicios y suscriptores,
// y carga datos de ejemplo. Es el único lugar que conoce todas las piezas.
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

  // ---------- Datos de ejemplo
  [
    { id: "E001", nombre: "Laura Gómez", email: "laura@uni.edu.co", telefono: "3001234567", estrato: 2, beca: 0 },
    { id: "E002", nombre: "Andrés Ruiz", email: "andres@uni.edu.co", telefono: "", estrato: 5, beca: 50 },
    { id: "E003", nombre: "Sofía Díaz", email: "sofia@uni.edu.co", telefono: "3109876543", estrato: 6, beca: 0 },
  ].forEach((e) => estudiantes.guardar(e));

  [
    { id: "ARQ701", nombre: "Arquitectura de Software", creditos: 4, cupo: 30, esquema: "PONDERADO",
      horario: [{ dia: "Lunes", inicio: 8, fin: 10 }, { dia: "Miércoles", inicio: 8, fin: 10 }] },
    { id: "BD501", nombre: "Bases de Datos", creditos: 3, cupo: 30, esquema: "PONDERADO",
      horario: [{ dia: "Martes", inicio: 10, fin: 12 }] },
    { id: "CAL601", nombre: "Calidad de Software", creditos: 3, cupo: 30, esquema: "DESCARTA_PEOR_NOTA",
      horario: [{ dia: "Jueves", inicio: 14, fin: 16 }] },
    { id: "ING301", nombre: "Inglés III", creditos: 2, cupo: 30, esquema: "PROMEDIO_SIMPLE",
      horario: [{ dia: "Lunes", inicio: 9, fin: 11 }] },
    { id: "ELE101", nombre: "Electiva (1 cupo)", creditos: 2, cupo: 1, esquema: "PROMEDIO_SIMPLE",
      horario: [{ dia: "Viernes", inicio: 7, fin: 9 }] },
    { id: "PRA901", nombre: "Práctica profesional", creditos: 18, cupo: 30, esquema: "PROMEDIO_SIMPLE",
      horario: [{ dia: "Sábado", inicio: 7, fin: 12 }] },
  ].forEach((c) => cursos.guardar({ ...c, inscritos: 0 }));

  return sistema;
}
