// Cliente de la API de SIGA. La sesión vive en una cookie httpOnly que pone el servidor;
// el navegador nunca guarda contraseñas ni tokens.
const SIGAApi = (() => {
  async function pedir(metodo, ruta, cuerpo) {
    const respuesta = await fetch(ruta, {
      method: metodo,
      credentials: "same-origin",
      headers: cuerpo ? { "Content-Type": "application/json" } : {},
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      const error = new Error(datos.error || "No se pudo completar la solicitud");
      error.estado = respuesta.status;
      throw error;
    }
    return datos;
  }

  const consulta = (parametros) => {
    const limpios = Object.entries(parametros || {}).filter(([, valor]) => valor);
    return limpios.length ? "?" + new URLSearchParams(limpios).toString() : "";
  };

  return Object.freeze({
    get: (ruta, parametros) => pedir("GET", ruta + consulta(parametros)),
    post: (ruta, cuerpo) => pedir("POST", ruta, cuerpo || {}),
    patch: (ruta, cuerpo) => pedir("PATCH", ruta, cuerpo || {}),
  });
})();

const SIGAAuth = (() => {
  const login = (correo, password, recordar) =>
    SIGAApi.post("/api/auth/login", { correo, password, recordar: Boolean(recordar) }).then((r) => r.usuario);

  const registrar = (datos) => SIGAApi.post("/api/auth/registro", datos).then((r) => r.usuario);

  // Devuelve { usuario, permisos, estudiante } o null si no hay sesión.
  async function sesionActual() {
    try {
      return await SIGAApi.get("/api/auth/sesion");
    } catch (error) {
      if (error.estado === 401) return null;
      throw error;
    }
  }

  const logout = () => SIGAApi.post("/api/auth/logout").catch(() => null);

  return Object.freeze({ login, registrar, sesionActual, logout });
})();
