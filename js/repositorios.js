// =====================================================================
// PATRÓN REPOSITORY (acceso a datos)
// El resto del sistema solo usa guardar / buscar / listar. Hoy los datos
// están en memoria; mañana se podrían guardar en una base de datos real
// cambiando solo estas clases.
// Ref: https://martinfowler.com/eaaCatalog/repository.html
// =====================================================================
class RepositorioEnMemoria {
  constructor() {
    this.datos = new Map();
  }

  guardar(objeto) {
    this.datos.set(objeto.id, objeto);
  }

  buscarPorId(id) {
    return this.datos.get(id) || null;
  }

  listar() {
    return [...this.datos.values()];
  }
}

class EstudianteRepository extends RepositorioEnMemoria {}

class CursoRepository extends RepositorioEnMemoria {}

class MatriculaRepository extends RepositorioEnMemoria {
  buscarActiva(estudianteId, periodo) {
    return this.listar().find((m) => m.estudianteId === estudianteId && m.periodo === periodo) || null;
  }
}

class CalificacionRepository {
  constructor() {
    this.notas = new Map();      // "estudiante|curso" -> lista de notas
    this.definitivas = new Map(); // "estudiante|curso" -> nota final
  }

  agregar(estudianteId, cursoId, calificacion) {
    const clave = estudianteId + "|" + cursoId;
    if (!this.notas.has(clave)) {
      this.notas.set(clave, []);
    }
    this.notas.get(clave).push(calificacion);
  }

  listar(estudianteId, cursoId) {
    return this.notas.get(estudianteId + "|" + cursoId) || [];
  }

  guardarNotaFinal(notaFinal) {
    this.definitivas.set(notaFinal.estudianteId + "|" + notaFinal.cursoId, notaFinal);
  }

  notasFinalesDe(estudianteId) {
    return [...this.definitivas.values()].filter((n) => n.estudianteId === estudianteId);
  }
}
