// API de SIGA. Cada ruta revisa en el SERVIDOR quién es el usuario y qué puede hacer;
// lo que oculta la interfaz es solo comodidad visual.
const path = require("node:path");
const express = require("express");
const { ReglaNegocioError, SIGAPermissions, tienePermiso } = require("./dominio");
const { hashPassword, verificarPassword, crearGestorSesiones, crearLimitador } = require("./auth");

const RAIZ = path.join(__dirname, "..");
const ROLES = Object.keys(SIGAPermissions);
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

const texto = (valor) => (typeof valor === "string" ? valor.trim() : "");

function validarPassword(password) {
  if (typeof password !== "string" || password.length < 8 || password.length > 128
    || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ErrorHttp(400, "La contraseña debe tener al menos 8 caracteres, con letras y números");
  }
}

function validarCorreo(correo) {
  if (!CORREO_VALIDO.test(correo) || correo.length > 120) throw new ErrorHttp(400, "Correo no válido");
}

function validarNombre(nombre) {
  if (nombre.length < 3 || nombre.length > 80) throw new ErrorHttp(400, "El nombre debe tener entre 3 y 80 caracteres");
}

// Datos del usuario que sí se pueden mandar al navegador.
function usuarioPublico(usuario) {
  return {
    correo: usuario.correo,
    nombre: usuario.nombre,
    rol: usuario.rol,
    estudianteId: usuario.estudianteId || null,
    cursosAsignados: usuario.cursosAsignados || [],
    activo: usuario.activo !== false,
  };
}

function crearApp({ repos, sistema, secreto, expiraSesion, produccion = false }) {
  const app = express();
  const sesiones = crearGestorSesiones({ secreto, expira: expiraSesion, produccion });
  const limitador = crearLimitador();

  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });
  app.use(express.json({ limit: "20kb" }));

  // ---------- Páginas y archivos públicos (solo estos; nunca se sirve .env ni el backend)
  for (const pagina of ["index.html", "login.html", "register.html"]) {
    app.get("/" + pagina, (req, res) => res.sendFile(path.join(RAIZ, pagina)));
  }
  app.get("/", (req, res) => res.sendFile(path.join(RAIZ, "index.html")));
  app.get("/estilos.css", (req, res) => res.sendFile(path.join(RAIZ, "estilos.css")));
  app.use("/js", express.static(path.join(RAIZ, "js"), { dotfiles: "ignore", index: false }));

  // Para el chequeo de salud del despliegue (render.yaml).
  app.get("/api/health", (req, res) => res.json({ status: "ok", almacenamiento: repos.tipo }));

  // ---------- Ayudantes de autorización
  async function usuarioDeLaSesion(req) {
    const correo = sesiones.correoDeLaSesion(req);
    if (!correo) return null;
    const usuario = await repos.usuarios.buscarPorCorreo(correo);
    return usuario && usuario.activo !== false ? usuario : null;
  }

  const autenticado = async (req, res, next) => {
    const usuario = await usuarioDeLaSesion(req);
    if (!usuario) throw new ErrorHttp(401, "Debes iniciar sesión");
    req.usuario = usuario;
    next();
  };

  // Acepta si el rol tiene AL MENOS uno de los permisos indicados.
  const requiere = (...permisos) => [autenticado, (req, res, next) => {
    if (!permisos.some((permiso) => tienePermiso(req.usuario.rol, permiso))) {
      throw new ErrorHttp(403, "Tu perfil no tiene permiso para esta acción");
    }
    next();
  }];

  // Un estudiante solo puede ver o tocar sus propios datos.
  function estudianteAutorizado(req, estudianteId) {
    if (req.usuario.rol === "student") {
      if (!req.usuario.estudianteId) throw new ErrorHttp(403, "Tu cuenta no está vinculada a un estudiante");
      if (estudianteId && estudianteId !== req.usuario.estudianteId) {
        throw new ErrorHttp(403, "Solo puedes consultar tu propia información");
      }
      return req.usuario.estudianteId;
    }
    return estudianteId || null;
  }

  // Un docente solo califica los cursos que tiene asignados.
  function validarCursoDelDocente(req, cursoId) {
    if (req.usuario.rol === "teacher" && !(req.usuario.cursosAsignados || []).includes(cursoId)) {
      throw new ErrorHttp(403, "Solo puedes gestionar notas de tus cursos asignados");
    }
  }

  async function siguienteIdEstudiante() {
    const numeros = (await repos.estudiantes.listar())
      .map((e) => /^E(\d+)$/.exec(e.id))
      .filter(Boolean)
      .map((m) => Number(m[1]));
    return numeros.length ? Math.max(...numeros) + 1 : 1;
  }

  // Crea el registro académico del estudiante con un id libre (E004, E005...).
  async function crearEstudiante({ nombre, email, telefono = "", estrato = 3 }) {
    let numero = await siguienteIdEstudiante();
    for (let intento = 0; intento < 5; intento++, numero++) {
      const estudiante = { id: "E" + String(numero).padStart(3, "0"), nombre, email, telefono, estrato, beca: 0 };
      if (await repos.estudiantes.crear(estudiante)) return estudiante;
    }
    throw new ErrorHttp(503, "No se pudo asignar un código de estudiante, intenta de nuevo");
  }

  function leerDatosEstudiante(body) {
    const telefono = texto(body.telefono);
    if (telefono && !/^[\d\s+()-]{7,20}$/.test(telefono)) throw new ErrorHttp(400, "Teléfono no válido");
    const estrato = Number(body.estrato);
    if (!Number.isInteger(estrato) || estrato < 1 || estrato > 6) throw new ErrorHttp(400, "El estrato debe estar entre 1 y 6");
    return { telefono, estrato };
  }

  // ---------- Autenticación
  app.post("/api/auth/login", async (req, res) => {
    const correo = texto(req.body.correo).toLowerCase();
    const clave = req.ip + "|" + correo;
    if (limitador.bloqueado(clave)) throw new ErrorHttp(429, "Demasiados intentos. Espera unos minutos.");
    const usuario = correo ? await repos.usuarios.buscarPorCorreo(correo) : null;
    const valida = await verificarPassword(req.body.password, usuario && usuario.passwordHash);
    if (!usuario || !valida || usuario.activo === false) {
      limitador.fallo(clave);
      throw new ErrorHttp(401, "Correo o contraseña incorrectos");
    }
    limitador.exito(clave);
    sesiones.iniciar(res, usuario.correo, req.body.recordar === true);
    res.json({ usuario: usuarioPublico(usuario) });
  });

  // Registro público: crea una cuenta de ESTUDIANTE y su registro académico.
  app.post("/api/auth/registro", async (req, res) => {
    const nombre = texto(req.body.nombre);
    const correo = texto(req.body.correo).toLowerCase();
    validarNombre(nombre);
    validarCorreo(correo);
    validarPassword(req.body.password);
    const datos = leerDatosEstudiante(req.body);
    if (await repos.usuarios.buscarPorCorreo(correo)) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo");

    const passwordHash = await hashPassword(req.body.password);
    const estudiante = await crearEstudiante({ nombre, email: correo, ...datos });
    const usuario = {
      correo, nombre, rol: "student", estudianteId: estudiante.id, passwordHash, creadoEn: new Date().toISOString(),
    };
    if (!(await repos.usuarios.crear(usuario))) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo");
    sesiones.iniciar(res, correo, false);
    res.status(201).json({ usuario: usuarioPublico(usuario) });
  });

  app.post("/api/auth/logout", (req, res) => {
    sesiones.cerrar(res);
    res.json({ ok: true });
  });

  app.get("/api/auth/sesion", autenticado, async (req, res) => {
    const estudiante = req.usuario.estudianteId ? await repos.estudiantes.buscarPorId(req.usuario.estudianteId) : null;
    res.json({ usuario: usuarioPublico(req.usuario), permisos: SIGAPermissions[req.usuario.rol] || [], estudiante });
  });

  // ---------- Configuración y catálogos
  app.get("/api/config", autenticado, (req, res) => {
    const { periodo, maxCreditos, valorCredito, notaMinima } = sistema.config;
    res.json({ periodo, maxCreditos, valorCredito, notaMinima, almacenamiento: repos.tipo });
  });

  app.get("/api/cursos", autenticado, async (req, res) => {
    res.json(await repos.cursos.listar());
  });

  app.get("/api/estudiantes", autenticado, async (req, res) => {
    if (req.usuario.rol === "student") {
      const propio = await repos.estudiantes.buscarPorId(estudianteAutorizado(req));
      return res.json(propio ? [propio] : []);
    }
    res.json(await repos.estudiantes.listar());
  });

  // ---------- Matrícula (Facade)
  app.get("/api/matriculas", autenticado, async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    res.json(estudianteId ? await repos.matriculas.listarPorEstudiante(estudianteId) : await repos.matriculas.listar());
  });

  app.post("/api/matriculas", requiere("enroll"), async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.body.estudianteId));
    if (!estudianteId) throw new ErrorHttp(400, "Debes indicar el estudiante");
    const matricula = await sistema.matricula.matricular({
      estudianteId,
      cursos: Array.isArray(req.body.cursos) ? req.body.cursos.map(String) : [],
      medio: texto(req.body.medio),
      referencia: texto(req.body.referencia),
    });
    const horario = await sistema.matricula.consultarHorario(estudianteId);
    res.status(201).json({ matricula, horario });
  });

  app.get("/api/horario", requiere("schedule", "enroll"), async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    if (!estudianteId) throw new ErrorHttp(400, "Debes indicar el estudiante");
    res.json(await sistema.matricula.consultarHorario(estudianteId));
  });

  // ---------- Calificaciones (Strategy)
  app.get("/api/calificaciones", requiere("grades"), async (req, res) => {
    const cursoId = texto(req.query.cursoId);
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    if (!estudianteId || !cursoId) throw new ErrorHttp(400, "Debes indicar estudiante y curso");
    validarCursoDelDocente(req, cursoId);
    res.json(await repos.calificaciones.listar(estudianteId, cursoId));
  });

  const soloGestores = (req, res, next) => {
    if (req.usuario.rol === "student") throw new ErrorHttp(403, "Los estudiantes no pueden registrar notas");
    next();
  };

  app.post("/api/calificaciones", requiere("grades"), soloGestores, async (req, res) => {
    const estudianteId = texto(req.body.estudianteId);
    const cursoId = texto(req.body.cursoId);
    validarCursoDelDocente(req, cursoId);
    const componente = texto(req.body.componente).slice(0, 60) || "Nota";
    await sistema.notas.registrarNota(estudianteId, cursoId, componente, Number(req.body.porcentaje) || 0,
      Number.parseFloat(req.body.valor));
    res.status(201).json(await repos.calificaciones.listar(estudianteId, cursoId));
  });

  app.post("/api/notas-finales", requiere("grades"), soloGestores, async (req, res) => {
    const estudianteId = texto(req.body.estudianteId);
    const cursoId = texto(req.body.cursoId);
    validarCursoDelDocente(req, cursoId);
    res.status(201).json(await sistema.notas.publicarNotaFinal(estudianteId, cursoId));
  });

  app.get("/api/notas-finales", requiere("reports", "grades"), async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    if (estudianteId) return res.json(await repos.calificaciones.notasFinalesDe(estudianteId));
    if (req.usuario.rol !== "administrator") throw new ErrorHttp(400, "Debes indicar el estudiante");
    res.json(await repos.calificaciones.listarNotasFinales());
  });

  // ---------- Pagos y notificaciones
  app.get("/api/pagos", requiere("payments"), async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    res.json(await repos.pagos.listar(estudianteId ? { estudianteId } : {}));
  });

  app.get("/api/notificaciones", requiere("notifications"), async (req, res) => {
    const estudianteId = estudianteAutorizado(req, texto(req.query.estudianteId));
    res.json(await repos.notificaciones.listar(estudianteId ? { estudianteId } : {}));
  });

  // ---------- Administración de usuarios y roles (solo administrador)
  app.get("/api/usuarios", requiere("users"), async (req, res) => {
    res.json((await repos.usuarios.listar()).map(usuarioPublico));
  });

  async function validarCursos(cursosAsignados) {
    if (!Array.isArray(cursosAsignados)) return [];
    const existentes = new Set((await repos.cursos.listar()).map((c) => c.id));
    const cursos = [...new Set(cursosAsignados.map(String))];
    const invalido = cursos.find((c) => !existentes.has(c));
    if (invalido) throw new ErrorHttp(400, "El curso " + invalido + " no existe");
    return cursos;
  }

  function validarRol(rol) {
    if (!ROLES.includes(rol)) throw new ErrorHttp(400, "Rol no válido");
  }

  app.post("/api/usuarios", requiere("users"), async (req, res) => {
    const nombre = texto(req.body.nombre);
    const correo = texto(req.body.correo).toLowerCase();
    const rol = texto(req.body.rol);
    validarNombre(nombre);
    validarCorreo(correo);
    validarPassword(req.body.password);
    validarRol(rol);
    if (await repos.usuarios.buscarPorCorreo(correo)) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo");

    const usuario = { correo, nombre, rol, passwordHash: await hashPassword(req.body.password), creadoEn: new Date().toISOString() };
    if (rol === "teacher") usuario.cursosAsignados = await validarCursos(req.body.cursosAsignados);
    if (rol === "student") {
      usuario.estudianteId = (await crearEstudiante({ nombre, email: correo, ...leerDatosEstudiante(req.body) })).id;
    }
    if (!(await repos.usuarios.crear(usuario))) throw new ErrorHttp(409, "Ya existe una cuenta con ese correo");
    res.status(201).json(usuarioPublico(usuario));
  });

  app.patch("/api/usuarios/:correo", requiere("users"), async (req, res) => {
    const correo = String(req.params.correo).toLowerCase();
    const usuario = await repos.usuarios.buscarPorCorreo(correo);
    if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado");
    const cambios = {};

    if (req.body.rol !== undefined) {
      validarRol(req.body.rol);
      if (correo === req.usuario.correo && req.body.rol !== "administrator") {
        throw new ErrorHttp(400, "No puedes quitarte tu propio rol de administrador");
      }
      cambios.rol = req.body.rol;
      if (req.body.rol === "student" && !usuario.estudianteId) {
        cambios.estudianteId = (await crearEstudiante({ nombre: usuario.nombre, email: correo })).id;
      }
    }
    if (req.body.cursosAsignados !== undefined) cambios.cursosAsignados = await validarCursos(req.body.cursosAsignados);
    if (req.body.activo !== undefined) {
      if (correo === req.usuario.correo && req.body.activo === false) throw new ErrorHttp(400, "No puedes desactivar tu propia cuenta");
      cambios.activo = req.body.activo === true;
    }
    res.json(usuarioPublico(await repos.usuarios.actualizar(correo, cambios)));
  });

  app.use("/api", (req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

  // ---------- Errores
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof ErrorHttp) return res.status(error.estado).json({ error: error.message });
    if (error instanceof ReglaNegocioError) return res.status(400).json({ error: error.message });
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "JSON no válido" });
    console.error(error);
    res.status(500).json({ error: "Error interno del servidor" });
  });

  return app;
}

module.exports = { crearApp };
