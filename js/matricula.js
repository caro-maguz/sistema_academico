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

  async matricular({ estudianteId, cursos: codigos, medio, referencia }) {
    // 1. Validaciones
    const estudiante = await this.estudiantes.buscarPorId(estudianteId);
    if (!estudiante) throw new ReglaNegocioError("El estudiante no existe");
    if (await this.matriculas.buscarActiva(estudianteId, this.config.periodo)) {
      throw new ReglaNegocioError("El estudiante ya tiene matrícula en el periodo " + this.config.periodo);
    }
    if (!Array.isArray(codigos) || codigos.length === 0) throw new ReglaNegocioError("Debe seleccionar al menos un curso");
    if (new Set(codigos).size !== codigos.length) throw new ReglaNegocioError("Hay cursos repetidos en la selección");

    const seleccion = [];
    for (const codigo of codigos) {
      const curso = await this.cursos.buscarPorId(codigo);
      if (!curso) throw new ReglaNegocioError("El curso " + codigo + " no existe");
      seleccion.push(curso);
    }
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

    // 2. Calcular valor y apartar cupos ANTES de cobrar.
    //    apartarCupo es atómico: si dos personas piden el último cupo, solo una lo obtiene.
    const valor = this.servicioPagos.calcularValor(estudiante, creditos, this.config.valorCredito);
    const apartados = [];
    const liberar = async () => { for (const id of apartados) await this.cursos.liberarCupo(id); };
    for (const curso of seleccion) {
      if (!(await this.cursos.apartarCupo(curso.id))) {
        await liberar();
        throw new ReglaNegocioError("El curso " + curso.id + " no tiene cupos disponibles");
      }
      apartados.push(curso.id);
    }

    // 3. Cobrar; si el pago falla se devuelven los cupos
    let pago;
    try {
      pago = await this.servicioPagos.pagar(estudiante, medio, referencia, valor);
    } catch (error) {
      await liberar();
      throw error;
    }
    if (!pago.aprobado) {
      await liberar();
      throw new ReglaNegocioError("Pago rechazado: " + pago.mensaje);
    }

    // 4. Guardar y avisar
    const matricula = {
      id: "MAT-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      estudianteId, periodo: this.config.periodo, cursos: codigos, creditos, valor,
      referenciaPago: pago.referencia, fecha: new Date().toISOString(),
    };
    await this.matriculas.guardar(matricula);
    await this.bus.publicar("MatriculaConfirmada", { estudianteId, cursos: codigos });
    return matricula;
  }

  async consultarHorario(estudianteId) {
    const matricula = await this.matriculas.buscarActiva(estudianteId, this.config.periodo);
    if (!matricula) return [];
    const horario = [];
    for (const codigo of matricula.cursos) {
      const curso = await this.cursos.buscarPorId(codigo);
      if (curso) curso.horario.forEach((f) => horario.push({ ...f, curso: curso.nombre }));
    }
    return horario;
  }
}

function seCruzan(cursoA, cursoB) {
  return cursoA.horario.some((a) =>
    cursoB.horario.some((b) => a.dia === b.dia && a.inicio < b.fin && b.inicio < a.fin));
}
