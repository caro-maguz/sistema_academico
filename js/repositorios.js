// =====================================================================
// PATRÓN REPOSITORY (acceso a datos)
// El resto del sistema solo usa guardar / buscar / listar. Antes los datos
// estaban en memoria; ahora estas clases le piden los datos al servidor
// (server/server.js), y el servidor los guarda en MongoDB Atlas.
// Ref: https://martinfowler.com/eaaCatalog/repository.html
// =====================================================================

// Función única para hablar con el servidor.
async function api(ruta, { method = "GET", body } = {}) {
  const respuesta = await fetch("/api" + ruta, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (respuesta.status === 404) return null;
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    const mensaje = error.error || "Error del servidor (" + respuesta.status + ")";
    throw respuesta.status === 409 ? new ReglaNegocioError(mensaje) : new Error(mensaje);
  }
  return respuesta.json();
}

function consulta(parametros) {
  return "?" + new URLSearchParams(parametros).toString();
}

class RepositorioApi {
  constructor(recurso) {
    this.recurso = recurso;
  }

  guardar(objeto) {
    return api("/" + this.recurso + "/" + encodeURIComponent(objeto.id), { method: "PUT", body: objeto });
  }

  buscarPorId(id) {
    return api("/" + this.recurso + "/" + encodeURIComponent(id));
  }

  listar() {
    return api("/" + this.recurso);
  }
}

class EstudianteRepository extends RepositorioApi {
  constructor() { super("estudiantes"); }
}

class CursoRepository extends RepositorioApi {
  constructor() { super("cursos"); }

  // El servidor lo hace de forma atómica: si ya no hay cupo, responde 409.
  apartarCupo(id) {
    return api("/cursos/" + encodeURIComponent(id) + "/apartar-cupo", { method: "POST" });
  }

  liberarCupo(id) {
    return api("/cursos/" + encodeURIComponent(id) + "/liberar-cupo", { method: "POST" });
  }
}

class MatriculaRepository extends RepositorioApi {
  constructor() { super("matriculas"); }

  async buscarActiva(estudianteId, periodo) {
    const lista = await api("/matriculas" + consulta({ estudianteId, periodo }));
    return lista[0] || null;
  }
}

class CalificacionRepository {
  agregar(estudianteId, cursoId, calificacion) {
    return api("/calificaciones", { method: "POST", body: { estudianteId, cursoId, ...calificacion } });
  }

  listar(estudianteId, cursoId) {
    return api("/calificaciones" + consulta({ estudianteId, cursoId }));
  }

  guardarNotaFinal(notaFinal) {
    return api("/notasFinales", { method: "PUT", body: notaFinal });
  }

  notasFinalesDe(estudianteId) {
    return api("/notasFinales" + consulta({ estudianteId }));
  }
}
