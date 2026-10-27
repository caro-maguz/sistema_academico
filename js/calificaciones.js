// =====================================================================
// PATRÓN STRATEGY (comportamiento) — cálculo de la nota final
// Cada curso dice cómo evalúa y el sistema usa la estrategia que toca.
// Ref: https://refactoring.guru/es/design-patterns/strategy
// =====================================================================
class PromedioPonderado {
  calcular(notas) {
    const suma = notas.reduce((t, n) => t + n.porcentaje, 0);
    if (suma !== 100) throw new ReglaNegocioError("Los porcentajes deben sumar 100 (suman " + suma + ")");
    return notas.reduce((t, n) => t + (n.valor * n.porcentaje) / 100, 0);
  }
}

class PromedioSimple {
  calcular(notas) {
    if (notas.length === 0) throw new ReglaNegocioError("No hay notas registradas");
    return notas.reduce((t, n) => t + n.valor, 0) / notas.length;
  }
}

class DescartaPeorNota {
  calcular(notas) {
    if (notas.length < 2) throw new ReglaNegocioError("Se necesitan al menos 2 notas");
    const ordenadas = [...notas].sort((a, b) => a.valor - b.valor).slice(1); // quita la más baja
    return ordenadas.reduce((t, n) => t + n.valor, 0) / ordenadas.length;
  }
}

class ServicioCalificaciones {
  constructor(cursos, matriculas, calificaciones, bus) {
    this.cursos = cursos;
    this.matriculas = matriculas;
    this.calificaciones = calificaciones;
    this.bus = bus;
    this.config = ConfiguracionAcademica.getInstancia();
    this.estrategias = {
      PONDERADO: new PromedioPonderado(),
      PROMEDIO_SIMPLE: new PromedioSimple(),
      DESCARTA_PEOR_NOTA: new DescartaPeorNota(),
    };
  }

  registrarNota(estudianteId, cursoId, componente, porcentaje, valor) {
    this.#validarMatriculado(estudianteId, cursoId);
    if (isNaN(valor) || valor < 0 || valor > 5) throw new ReglaNegocioError("La nota debe estar entre 0 y 5");
    this.calificaciones.agregar(estudianteId, cursoId, { componente, porcentaje, valor });
  }

  publicarNotaFinal(estudianteId, cursoId) {
    this.#validarMatriculado(estudianteId, cursoId);
    const curso = this.cursos.buscarPorId(cursoId);
    const estrategia = this.estrategias[curso.esquema];
    const nota = Math.round(estrategia.calcular(this.calificaciones.listar(estudianteId, cursoId)) * 10) / 10;
    const notaFinal = { estudianteId, cursoId, nota, aprobado: nota >= this.config.notaMinima };

    this.calificaciones.guardarNotaFinal(notaFinal);
    this.bus.publicar("NotaPublicada", { ...notaFinal, nombreCurso: curso.nombre });
    return notaFinal;
  }

  #validarMatriculado(estudianteId, cursoId) {
    const matricula = this.matriculas.buscarActiva(estudianteId, this.config.periodo);
    if (!matricula || !matricula.cursos.includes(cursoId)) {
      throw new ReglaNegocioError("El estudiante no está matriculado en " + cursoId);
    }
  }
}
