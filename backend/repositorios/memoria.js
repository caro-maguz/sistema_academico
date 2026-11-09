// =====================================================================
// PATRÓN REPOSITORY — versión en memoria.
// Misma interfaz que la versión MongoDB; se usa en las pruebas y cuando
// no hay MONGODB_URI configurada. Los datos se pierden al reiniciar.
// =====================================================================
const copiar = (valor) => (valor == null ? null : structuredClone(valor));

class RepositorioMemoria {
  constructor() { this.datos = new Map(); }
  async guardar(objeto) { this.datos.set(objeto.id, copiar(objeto)); return copiar(objeto); }
  async buscarPorId(id) { return copiar(this.datos.get(id)); }
  async listar() { return [...this.datos.values()].map(copiar); }
}

class EstudianteRepositoryMemoria extends RepositorioMemoria {
  async crear(estudiante) {
    if (this.datos.has(estudiante.id)) return false;
    this.datos.set(estudiante.id, copiar(estudiante));
    return true;
  }
}

class CursoRepositoryMemoria extends RepositorioMemoria {
  async apartarCupo(id) {
    const curso = this.datos.get(id);
    if (!curso || curso.inscritos >= curso.cupo) return false;
    curso.inscritos++;
    return true;
  }

  async liberarCupo(id) {
    const curso = this.datos.get(id);
    if (curso && curso.inscritos > 0) curso.inscritos--;
  }
}

class MatriculaRepositoryMemoria extends RepositorioMemoria {
  async buscarActiva(estudianteId, periodo) {
    return copiar([...this.datos.values()].find((m) => m.estudianteId === estudianteId && m.periodo === periodo));
  }

  async listarPorEstudiante(estudianteId) {
    return (await this.listar()).filter((m) => m.estudianteId === estudianteId);
  }
}

class CalificacionRepositoryMemoria {
  constructor() {
    this.notas = [];
    this.definitivas = new Map();
  }

  async agregar(estudianteId, cursoId, calificacion) {
    this.notas.push({ estudianteId, cursoId, ...calificacion });
  }

  async listar(estudianteId, cursoId) {
    return this.notas.filter((n) => n.estudianteId === estudianteId && n.cursoId === cursoId)
      .map(({ componente, porcentaje, valor }) => ({ componente, porcentaje, valor }));
  }

  async guardarNotaFinal(notaFinal) {
    this.definitivas.set(notaFinal.estudianteId + "|" + notaFinal.cursoId, copiar(notaFinal));
  }

  async notasFinalesDe(estudianteId) {
    return [...this.definitivas.values()].filter((n) => n.estudianteId === estudianteId).map(copiar);
  }

  async listarNotasFinales() {
    return [...this.definitivas.values()].map(copiar);
  }
}

// Registros que solo se agregan (avisos y pagos).
class BitacoraMemoria {
  constructor() { this.registros = []; }
  async agregar(registro) { this.registros.push({ ...copiar(registro), fecha: new Date().toISOString() }); }
  async listar(filtro = {}) {
    return this.registros
      .filter((r) => Object.entries(filtro).every(([k, v]) => r[k] === v))
      .map(copiar)
      .reverse();
  }
}

class UsuarioRepositoryMemoria {
  constructor() { this.datos = new Map(); }
  async buscarPorCorreo(correo) { return copiar(this.datos.get(correo)); }
  async crear(usuario) {
    if (this.datos.has(usuario.correo)) return false;
    this.datos.set(usuario.correo, copiar(usuario));
    return true;
  }
  async actualizar(correo, cambios) {
    const usuario = this.datos.get(correo);
    if (!usuario) return null;
    Object.assign(usuario, copiar(cambios));
    return copiar(usuario);
  }
  async listar() { return [...this.datos.values()].map(copiar); }
}

function crearRepositoriosMemoria() {
  return {
    tipo: "memoria",
    estudiantes: new EstudianteRepositoryMemoria(),
    cursos: new CursoRepositoryMemoria(),
    matriculas: new MatriculaRepositoryMemoria(),
    calificaciones: new CalificacionRepositoryMemoria(),
    notificaciones: new BitacoraMemoria(),
    pagos: new BitacoraMemoria(),
    usuarios: new UsuarioRepositoryMemoria(),
    async insertarSiFalta(nombre, documentos) {
      for (const doc of documentos) {
        if (!(await this[nombre].buscarPorId(doc.id))) await this[nombre].guardar(doc);
      }
    },
    async cerrar() {},
  };
}

module.exports = { crearRepositoriosMemoria };
