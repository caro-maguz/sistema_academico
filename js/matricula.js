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

<<<<<<< HEAD
  matricular({ estudianteId, cursos: codigos, medio, referencia }) {
    // 1. Validaciones
    const estudiante = this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ReglaNegocioError("El estudiante no existe");
    if (this.matriculas.buscarActiva(estudianteId, this.config.periodo)) {
=======
  async matricular({ estudianteId, cursos: codigos, medio, referencia }) {
    // 1. Validaciones
    const estudiante = await this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ReglaNegocioError("El estudiante no existe");
    if (await this.matriculas.buscarActiva(estudianteId, this.config.periodo)) {
>>>>>>> origin/feature/mongodb-atlas
      throw new ReglaNegocioError("El estudiante ya tiene matrícula en el periodo " + this.config.periodo);
    }
    if (!codigos || codigos.length === 0) throw new ReglaNegocioError("Debe seleccionar al menos un curso");

<<<<<<< HEAD
    const seleccion = codigos.map((c) => this.cursos.buscarPorId(c));
=======
    const seleccion = await Promise.all(codigos.map((c) => this.cursos.buscarPorId(c)));
    seleccion.forEach((curso, i) => {
      if (!curso) throw new ReglaNegocioError("El curso " + codigos[i] + " no existe");
    });
>>>>>>> origin/feature/mongodb-atlas
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
<<<<<<< HEAD
    seleccion.forEach((c) => c.inscritos++);

    // 3. Cobrar; si el pago falla se devuelven los cupos
    const pago = this.servicioPagos.pagar(estudiante, medio, referencia, valor);
    if (!pago.aprobado) {
      seleccion.forEach((c) => c.inscritos--);
=======
    const apartados = [];
    try {
      for (const curso of seleccion) {
        await this.cursos.apartarCupo(curso.id);
        apartados.push(curso);
      }
    } catch (e) {
      await this.#devolverCupos(apartados);
      throw e;
    }

    // 3. Cobrar; si el pago falla se devuelven los cupos
    let pago;
    try {
      pago = await this.servicioPagos.pagar(estudiante, medio, referencia, valor);
    } catch (e) {
      await this.#devolverCupos(apartados);
      throw e;
    }
    if (!pago.aprobado) {
      await this.#devolverCupos(apartados);
>>>>>>> origin/feature/mongodb-atlas
      throw new ReglaNegocioError("Pago rechazado: " + pago.mensaje);
    }

    // 4. Guardar y avisar
    const matricula = {
<<<<<<< HEAD
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
=======
      id: "MAT-" + ((await this.matriculas.listar()).length + 1),
      estudianteId, periodo: this.config.periodo, cursos: codigos, creditos, valor, referenciaPago: pago.referencia,
    };
    await this.matriculas.guardar(matricula);
    await this.bus.publicar("MatriculaConfirmada", { estudianteId, cursos: codigos });
    return matricula;
  }

  async #devolverCupos(cursos) {
    for (const curso of cursos) await this.cursos.liberarCupo(curso.id);
  }

  async consultarHorario(estudianteId) {
    const matricula = await this.matriculas.buscarActiva(estudianteId, this.config.periodo);
    if (!matricula) return [];
    const filas = [];
    for (const codigo of matricula.cursos) {
      const curso = await this.cursos.buscarPorId(codigo);
      curso.horario.forEach((f) => filas.push({ ...f, curso: curso.nombre }));
    }
    return filas;
>>>>>>> origin/feature/mongodb-atlas
  }
}

function seCruzan(cursoA, cursoB) {
  return cursoA.horario.some((a) =>
    cursoB.horario.some((b) => a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin));
}
