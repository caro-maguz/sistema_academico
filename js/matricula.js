// =====================================================================
// PATRÓN FACADE (estructural)
// Una sola llamada, matricular(), hace todos los pasos en orden:
// validar -> calcular valor -> apartar cupos -> cobrar -> guardar -> avisar.
// Ref: https://refactoring.guru/es/design-patterns/facade
// =====================================================================
class MatriculaFacade {
  constructor(estudiantes, cursos, matriculas, servicioPagos, bus) {
    this.estudiantes = estudiantes;
    this.cursos = cursos;
    this.matriculas = matriculas;
    this.servicioPagos = servicioPagos;
    this.bus = bus;
    this.config = ConfiguracionAcademica.getInstancia();
  }

  matricular({ estudianteId, cursos: codigos, medio, referencia }) {
    // 1. Validaciones
    const estudiante = this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ReglaNegocioError("El estudiante no existe");
    if (this.matriculas.buscarActiva(estudianteId, this.config.periodo)) {
      throw new ReglaNegocioError("El estudiante ya tiene matrícula en el periodo " + this.config.periodo);
    }
    if (!codigos || codigos.length === 0) throw new ReglaNegocioError("Debe seleccionar al menos un curso");

    const seleccion = codigos.map((c) => this.cursos.buscarPorId(c));
    for (const curso of seleccion) {
      if (curso.inscritos >= curso.cupo) throw new ReglaNegocioError("El curso " + curso.id + " no tiene cupos disponibles");
    }
    for (let i = 0; i < seleccion.length; i++) {
      for (let j = i + 1; j < seleccion.length; j++) {
        if (seCruzan(seleccion[i], seleccion[j])) {
          throw new ReglaNegocioError("Cruce de horario entre " + seleccion[i].id + " y " + seleccion[j].id);
        }
      }
    }
    const creditos = seleccion.reduce((t, c) => t + c.creditos, 0);
    if (creditos > this.config.maxCreditos) {
      throw new ReglaNegocioError("Se excede el máximo de " + this.config.maxCreditos + " créditos (seleccionó " + creditos + ")");
    }

    // 2. Calcular valor y apartar cupos ANTES de cobrar
    const valor = this.servicioPagos.calcularValor(estudiante, creditos, this.config.valorCredito);
    seleccion.forEach((c) => c.inscritos++);

    // 3. Cobrar; si el pago falla se devuelven los cupos
    const pago = this.servicioPagos.pagar(estudiante, medio, referencia, valor);
    if (!pago.aprobado) {
      seleccion.forEach((c) => c.inscritos--);
      throw new ReglaNegocioError("Pago rechazado: " + pago.mensaje);
    }

    // 4. Guardar y avisar
    const matricula = {
      id: "MAT-" + (this.matriculas.listar().length + 1),
      estudianteId, periodo: this.config.periodo, cursos: codigos, creditos, valor, referenciaPago: pago.referencia,
    };
    this.matriculas.guardar(matricula);
    this.bus.publicar("MatriculaConfirmada", { estudianteId, cursos: codigos });
    return matricula;
  }

  consultarHorario(estudianteId) {
    const matricula = this.matriculas.buscarActiva(estudianteId, this.config.periodo);
    if (!matricula) return [];
    return matricula.cursos.flatMap((codigo) => {
      const curso = this.cursos.buscarPorId(codigo);
      return curso.horario.map((f) => ({ ...f, curso: curso.nombre }));
    });
  }
}

function seCruzan(cursoA, cursoB) {
  return cursoA.horario.some((a) =>
    cursoB.horario.some((b) => a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin));
}
