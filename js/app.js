// Pantalla: muestra los datos de la API y envía las acciones al servidor.
// Las reglas de negocio y los permisos se validan en el backend.
const $ = (id) => document.getElementById(id);
const NOMBRES_ROL = { administrator: "Administrador", teacher: "Docente", student: "Estudiante" };
const estado = {
  config: null, cursos: [], estudiantes: [], matriculas: [], pagos: [], avisos: [], notasFinales: [], usuarios: [],
};
let usuarioActual;
let actividadChart;
const vistaPrevia = new ServicioPagos({}, null); // solo para estimar el valor antes de enviar

window.SIGA = { ConfiguracionAcademica, SIGAApi, estado };

const escapar = (valor) => String(valor ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const puede = (permiso) => tienePermiso(usuarioActual.rol, permiso);
const esRol = (rol) => usuarioActual.rol === rol;

function mostrar(id, texto, ok) {
  $(id).textContent = texto;
  $(id).className = "resultado " + (ok ? "ok" : "error");
}

function textoHorario(curso) {
  return curso.horario.map((f) => f.dia + " " + f.inicio + "-" + f.fin).join(", ");
}

const cursoPorId = (id) => estado.cursos.find((c) => c.id === id) || null;
const usuarioPorId = (id) => estado.estudiantes.find((e) => e.id === id) || null;
const matriculaActiva = (estudianteId) =>
  estado.matriculas.find((m) => m.estudianteId === estudianteId && m.periodo === estado.config.periodo) || null;

// Si la sesión expiró, vuelve al inicio de sesión.
function manejarError(error, idResultado) {
  if (error.estado === 401) {
    window.location.replace("login.html");
    return;
  }
  if (idResultado) mostrar(idResultado, error.message, false);
  else mostrarToast(error.message, false);
}

// ---------- Carga de datos
async function recargarDatos() {
  const pedidos = {
    config: SIGAApi.get("/api/config"),
    cursos: SIGAApi.get("/api/cursos"),
    estudiantes: SIGAApi.get("/api/estudiantes"),
    matriculas: SIGAApi.get("/api/matriculas"),
  };
  if (puede("payments")) pedidos.pagos = SIGAApi.get("/api/pagos");
  if (puede("notifications")) pedidos.avisos = SIGAApi.get("/api/notificaciones");
  if (esRol("administrator") || esRol("student")) pedidos.notasFinales = SIGAApi.get("/api/notas-finales");
  if (puede("users")) pedidos.usuarios = SIGAApi.get("/api/usuarios");
  const claves = Object.keys(pedidos);
  const valores = await Promise.all(Object.values(pedidos));
  claves.forEach((clave, i) => { estado[clave] = valores[i]; });
}

// ---------- Pintar
function llenarEstudiantes(idSelect) {
  const anterior = $(idSelect).value;
  $(idSelect).innerHTML = estado.estudiantes
    .map((e) => `<option value="${escapar(e.id)}">${escapar(e.id)} - ${escapar(e.nombre)}</option>`).join("");
  if (estado.estudiantes.some((e) => e.id === anterior)) $(idSelect).value = anterior;
}

function pintarAvisos() {
  const lista = $("avisos");
  lista.replaceChildren();
  if (estado.avisos.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Aún no hay avisos.";
    lista.appendChild(item);
  }
  estado.avisos.forEach((aviso) => {
    const item = document.createElement("li");
    const encabezado = document.createElement("strong");
    encabezado.textContent = `[${aviso.canal} → ${aviso.destino}] `;
    item.append(encabezado, document.createTextNode(aviso.mensaje));
    lista.appendChild(item);
  });
}

function estudianteDeCalificaciones() {
  return esRol("student") ? usuarioActual.estudianteId : $("cal-estudiante").value;
}

async function pintarNotas() {
  const lista = $("cal-lista");
  const estudianteId = estudianteDeCalificaciones();
  const cursoId = $("cal-curso").value;
  if (!estudianteId || !cursoId) {
    lista.replaceChildren();
    return;
  }
  try {
    const notas = await SIGAApi.get("/api/calificaciones", { estudianteId, cursoId });
    lista.replaceChildren();
    notas.forEach((nota) => {
      const item = document.createElement("li");
      item.textContent = `${nota.componente}: ${formatoNota(nota.valor)} (${nota.porcentaje}%)`;
      lista.appendChild(item);
    });
  } catch (error) {
    manejarError(error, "cal-resultado");
  }
}

function cursosAccesibles() {
  if (esRol("teacher")) return estado.cursos.filter((c) => usuarioActual.cursosAsignados.includes(c.id));
  if (esRol("student")) {
    const matricula = matriculaActiva(usuarioActual.estudianteId);
    return estado.cursos.filter((c) => matricula && matricula.cursos.includes(c.id));
  }
  return estado.cursos;
}

function pintarCursosCalificables() {
  const anterior = $("cal-curso").value;
  $("cal-curso").innerHTML = cursosAccesibles()
    .map((c) => `<option value="${escapar(c.id)}">${escapar(c.id)} - ${escapar(c.nombre)}</option>`).join("");
  if (cursosAccesibles().some((c) => c.id === anterior)) $("cal-curso").value = anterior;
}

function aplicarPerfil() {
  const rolLabel = NOMBRES_ROL[usuarioActual.rol] || "Usuario";
  const primerNombre = usuarioActual.nombre.split(" ")[0];
  $("user-name").textContent = usuarioActual.nombre;
  $("user-role").textContent = rolLabel;
  $("welcome-name").textContent = primerNombre;
  $("user-avatar").textContent = primerNombre.slice(0, 2).toUpperCase();

  document.querySelectorAll("[data-permission]").forEach((item) => { item.hidden = !puede(item.dataset.permission); });
  document.querySelectorAll("[data-permission-section]").forEach((item) => {
    item.hidden = !puede(item.dataset.permissionSection);
  });
  document.querySelectorAll("[data-role]").forEach((item) => { item.hidden = item.dataset.role !== usuarioActual.rol; });
  document.querySelectorAll("[data-nav-courses]").forEach((item) => {
    item.lastChild.textContent = esRol("administrator") ? " Cursos" : " Mis Cursos";
  });
  document.querySelectorAll("[data-nav-reports]").forEach((item) => {
    item.lastChild.textContent = esRol("student") ? " Historial" : " Reportes";
  });
  document.querySelectorAll(".side-nav a[data-permission='grades']").forEach((item) => {
    item.lastChild.textContent = esRol("student") ? " Mis calificaciones" : " Calificaciones";
  });
  document.querySelectorAll("[data-nav-enroll]").forEach((item) => {
    item.lastChild.textContent = esRol("student") ? " Matrícula" : " Matrículas";
  });
  $("profile-name").textContent = usuarioActual.nombre;
  $("profile-email").textContent = `${usuarioActual.correo} · ${rolLabel}`
    + (usuarioActual.estudianteId ? ` · Código ${usuarioActual.estudianteId}` : "");
  $("profile-avatar").textContent = usuarioActual.nombre.slice(0, 2).toUpperCase();

  if (esRol("student")) {
    const estudiante = usuarioPorId(usuarioActual.estudianteId);
    const nombreEstudiante = estudiante ? `${estudiante.id} - ${estudiante.nombre}` : usuarioActual.estudianteId;
    ["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach((id) => {
      $(id).replaceChildren(new Option(nombreEstudiante, usuarioActual.estudianteId));
      $(id).disabled = true;
    });
    $("mat-student-field").hidden = true;
    $("cal-student-field").hidden = true;
    $("cal-student-name").querySelector("strong").textContent = nombreEstudiante;
    $("cal-student-name").hidden = false;
    $("grades-title").textContent = "Mis calificaciones";
    $("grades-description").textContent = "Consulta tus notas personales.";
    $("grades-quick-icon").className = "bi bi-eye";
    $("grades-quick-title").textContent = "Mis calificaciones";
    $("grades-quick-description").textContent = "Consulta tus notas";
    $("rep-student-field").hidden = true;
    $("rep-student-name").querySelector("strong").textContent = nombreEstudiante;
    $("rep-student-name").hidden = false;
    $("reports-description").textContent = "Consulta tu historial académico y tus resultados.";
    $("payments-description").textContent = "Tus pagos de matrícula.";
    document.querySelectorAll("[data-grade-management]").forEach((item) => { item.hidden = true; });
  }
  if (esRol("teacher")) {
    $("course-directory-title").textContent = "Mis cursos asignados";
    $("course-directory-description").textContent = "Consulta tus cursos asignados y sus horarios.";
  }
}

function pintarIndicadores() {
  const { periodo, maxCreditos, valorCredito } = estado.config;
  const matriculasPeriodo = estado.matriculas.filter((m) => m.periodo === periodo);
  $("info-periodo").textContent = `Periodo ${periodo} · Máximo ${maxCreditos} créditos · Valor del crédito ${formatoPesos(valorCredito)}`;
  $("sidebar-periodo").textContent = `Periodo ${periodo}`;
  $("config-period").textContent = periodo;
  $("config-credits").textContent = maxCreditos;
  $("config-price").textContent = formatoPesos(valorCredito);
  const almacenamiento = estado.config.almacenamiento === "mongodb" ? "MongoDB Atlas" : "Memoria (pruebas)";
  $("config-storage").textContent = almacenamiento;
  $("footer-storage").textContent = "Datos: " + almacenamiento;

  const indicadores = {
    administrator: [
      ["Estudiantes", estado.estudiantes.length, "Registrados"],
      ["Docentes", estado.usuarios.filter((u) => u.rol === "teacher").length, "Con cuenta activa"],
      ["Cursos", estado.cursos.length, "Oferta académica"],
      ["Matrículas", matriculasPeriodo.length, "En este periodo"],
    ],
    teacher: [
      ["Estudiantes inscritos", new Set(matriculasPeriodo.filter((m) => m.cursos.some((c) => usuarioActual.cursosAsignados.includes(c)))
        .map((m) => m.estudianteId)).size, "En tus cursos"],
      ["Cursos asignados", cursosAccesibles().length, "Asignación docente"],
      ["Cursos en el sistema", estado.cursos.length, "Oferta académica"],
      ["Periodo", periodo, "Periodo lectivo"],
    ],
    student: (() => {
      const matricula = matriculaActiva(usuarioActual.estudianteId);
      const promedio = estado.notasFinales.length
        ? formatoNota(estado.notasFinales.reduce((s, n) => s + n.nota, 0) / estado.notasFinales.length) : "—";
      return [
        ["Créditos matriculados", matricula ? matricula.creditos : 0, "En el periodo vigente"],
        ["Promedio acumulado", promedio, "Desempeño general"],
        ["Pagos registrados", estado.pagos.filter((p) => p.estado === "Pagado").length, "Pagos aprobados"],
        ["Cursos disponibles", estado.cursos.length, "Oferta académica"],
      ];
    })(),
  }[usuarioActual.rol];
  ["students", "faculty", "courses", "enroll"].forEach((clave, i) => {
    const [etiqueta, valor, nota] = indicadores[i];
    $(`stat-${clave}-label`).textContent = etiqueta;
    $(`stat-${clave}`).textContent = valor;
    $(`stat-${clave}-note`).textContent = nota;
  });

  if (actividadChart) {
    actividadChart.data.labels = estado.cursos.map((c) => c.id);
    actividadChart.data.datasets[0].data = estado.cursos.map(() => 1);
    actividadChart.data.datasets[1].data = estado.cursos.map((curso) =>
      matriculasPeriodo.filter((m) => m.cursos.includes(curso.id)).length);
    actividadChart.update();
  }
}

function pintarCursosMatricula() {
  const marcados = new Set([...document.querySelectorAll("#mat-cursos input:checked")].map((i) => i.value));
  $("mat-cursos").innerHTML = estado.cursos.map((curso) =>
    `<label data-course-label="${escapar(curso.id)}"><input type="checkbox" value="${escapar(curso.id)}"${marcados.has(curso.id) ? " checked" : ""}>`
    + `<span><strong>${escapar(curso.id)} — ${escapar(curso.nombre)}</strong><br>${curso.creditos} créditos · ${escapar(textoHorario(curso))}`
    + ` · ${curso.cupo - (curso.inscritos || 0)} cupos</span></label>`).join("");
}

function actualizarHorario() {
  const estudianteId = usuarioActual.estudianteId || $("mat-estudiante").value;
  const matricula = matriculaActiva(estudianteId);
  const horario = matricula
    ? matricula.cursos.flatMap((codigo) => {
      const curso = cursoPorId(codigo);
      return curso ? curso.horario.map((f) => ({ ...f, curso: curso.nombre })) : [];
    })
    : [];
  const lista = $("my-schedule");
  lista.replaceChildren();
  if (horario.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Aún no tienes cursos matriculados en este periodo.";
    lista.appendChild(item);
    return;
  }
  horario.forEach((franja) => {
    const item = document.createElement("li");
    const curso = document.createElement("strong");
    curso.textContent = franja.curso;
    item.append(curso, document.createTextNode(` · ${franja.dia} ${franja.inicio}:00–${franja.fin}:00`));
    lista.appendChild(item);
  });
}

function actualizarResumenMatricula() {
  const cursos = [...document.querySelectorAll("#mat-cursos input:checked")].map((i) => cursoPorId(i.value)).filter(Boolean);
  const creditos = cursos.reduce((total, curso) => total + curso.creditos, 0);
  const estudiante = usuarioPorId($("mat-estudiante").value);
  const monto = estudiante ? vistaPrevia.calcularValor(estudiante, creditos, estado.config.valorCredito) : 0;
  $("selected-credits").textContent = `${creditos} / ${estado.config.maxCreditos}`;
  $("selected-cost").textContent = formatoPesos(monto);
  const conflictos = [];
  for (let i = 0; i < cursos.length; i++) {
    for (let j = i + 1; j < cursos.length; j++) {
      if (seCruzan(cursos[i], cursos[j])) conflictos.push(`${cursos[i].id} y ${cursos[j].id}`);
    }
  }
  $("course-conflicts").hidden = conflictos.length === 0;
  $("course-conflicts").textContent = conflictos.length ? `Conflicto de horario: ${conflictos.join("; ")}` : "";
}

function actualizarDirectorios() {
  $("student-directory").innerHTML = estado.estudiantes.map((e) =>
    `<div class="directory-item"><span class="avatar">${escapar(e.nombre.slice(0, 1))}</span>`
    + `<span><strong>${escapar(e.nombre)}</strong><small>${escapar(e.id)} · ${escapar(e.email)}</small></span></div>`).join("");
  $("course-directory").innerHTML = cursosAccesibles().map((c) =>
    `<tr><td><strong>${escapar(c.id)}</strong><br>${escapar(c.nombre)}</td><td>${c.creditos}</td>`
    + `<td>${c.inscritos || 0} / ${c.cupo}</td><td>${escapar(textoHorario(c))}</td></tr>`).join("");
}

function actualizarPagos() {
  const tbody = $("payment-history");
  tbody.replaceChildren();
  if (estado.pagos.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = "Aún no hay pagos registrados.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }
  estado.pagos.forEach((pago) => {
    const row = document.createElement("tr");
    const estudiante = usuarioPorId(pago.estudianteId);
    [pago.referencia, estudiante ? estudiante.nombre : pago.estudianteId, formatoPesos(pago.monto || 0)].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    const stateCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `payment-status ${pago.estado === "Rechazado" ? "rejected" : ""}`;
    badge.textContent = pago.estado;
    if (pago.mensaje) badge.title = pago.mensaje;
    stateCell.appendChild(badge);
    row.appendChild(stateCell);
    tbody.appendChild(row);
  });
}

// ---------- Usuarios y roles (administrador)
function pintarUsuarios() {
  if (!puede("users")) return;
  $("usr-cursos").innerHTML = estado.cursos.map((c) =>
    `<label><input type="checkbox" value="${escapar(c.id)}"> ${escapar(c.id)}</label>`).join("");
  $("user-directory").innerHTML = estado.usuarios.map((u) => {
    const propio = u.correo === usuarioActual.correo;
    const opciones = Object.entries(NOMBRES_ROL).map(([valor, nombre]) =>
      `<option value="${valor}"${u.rol === valor ? " selected" : ""}>${nombre}</option>`).join("");
    const detalle = u.rol === "teacher"
      ? estado.cursos.map((c) => `<label class="me-2"><input type="checkbox" data-user-course="${escapar(u.correo)}" value="${escapar(c.id)}"`
        + `${u.cursosAsignados.includes(c.id) ? " checked" : ""}> ${escapar(c.id)}</label>`).join("")
      : escapar(u.estudianteId || "—");
    return `<tr><td><strong>${escapar(u.nombre)}</strong><br><small>${escapar(u.correo)}</small></td>`
      + `<td><select class="form-select form-select-sm" data-user-role="${escapar(u.correo)}"${propio ? " disabled" : ""}>${opciones}</select></td>`
      + `<td><span class="course-checks">${detalle}</span></td>`
      + `<td>${propio ? '<span class="role-chip">Tu cuenta</span>'
        : `<button class="btn btn-sm ${u.activo ? "btn-outline-danger" : "btn-outline-success"}" data-user-active="${escapar(u.correo)}" data-value="${!u.activo}">`
        + `${u.activo ? "Desactivar" : "Activar"}</button>`}</td></tr>`;
  }).join("");
}

async function cambiarUsuario(correo, cambios) {
  try {
    await SIGAApi.patch("/api/usuarios/" + encodeURIComponent(correo), cambios);
    mostrar("usr-resultado", "Usuario actualizado.", true);
  } catch (error) {
    manejarError(error, "usr-resultado");
  }
  await refrescar();
}

// ---------- Utilidades de pantalla
function mostrarToast(mensaje, ok) {
  if (typeof bootstrap === "undefined") return;
  const toast = document.createElement("div");
  toast.className = `toast align-items-center border-0 ${ok ? "text-bg-success" : "text-bg-danger"}`;
  toast.setAttribute("role", "status");
  toast.innerHTML = '<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>';
  toast.querySelector(".toast-body").textContent = mensaje;
  $("toast-container").appendChild(toast);
  toast.addEventListener("hidden.bs.toast", () => toast.remove());
  new bootstrap.Toast(toast, { delay: 4000 }).show();
}

function iniciarGrafico() {
  if (typeof Chart === "undefined") return;
  actividadChart = new Chart($("activity-chart"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        { label: "Cursos", data: [], backgroundColor: "#4a73d1", borderRadius: 4, maxBarThickness: 23 },
        { label: "Matrículas", data: [], backgroundColor: "#53c5a0", borderRadius: 4, maxBarThickness: 23 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#8793a4", font: { size: 9 } } },
        y: { beginAtZero: true, grid: { color: "#eff2f6" }, ticks: { precision: 0, color: "#a1aab7", font: { size: 9 } } },
      },
    },
  });
}

function pintarTodo() {
  if (!esRol("student")) ["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach(llenarEstudiantes);
  pintarCursosMatricula();
  pintarCursosCalificables();
  pintarIndicadores();
  actualizarDirectorios();
  actualizarHorario();
  actualizarResumenMatricula();
  actualizarPagos();
  pintarAvisos();
  pintarUsuarios();
}

async function refrescar() {
  try {
    await recargarDatos();
    pintarTodo();
    await pintarNotas();
  } catch (error) {
    manejarError(error);
  }
}

// ---------- Eventos de la interfaz
function conectarEventos() {
  $("sidebar-toggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
  document.querySelectorAll(".side-nav a").forEach((link) => link.addEventListener("click", () => {
    document.querySelectorAll(".side-nav a").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    $("page-title").textContent = link.textContent.trim();
    $("sidebar").classList.remove("open");
  }));

  // Matrícula: el servidor ejecuta la fachada (validar, apartar cupos, cobrar, guardar, avisar).
  $("mat-estudiante").addEventListener("change", () => { actualizarResumenMatricula(); actualizarHorario(); });
  $("mat-cursos").addEventListener("change", actualizarResumenMatricula);
  $("course-search").addEventListener("input", (event) => {
    const busqueda = event.target.value.trim().toLocaleLowerCase("es");
    document.querySelectorAll("#mat-cursos label").forEach((label) => {
      label.hidden = !label.textContent.toLocaleLowerCase("es").includes(busqueda);
    });
  });

  $("btn-matricular").addEventListener("click", async () => {
    const boton = $("btn-matricular");
    boton.disabled = true;
    try {
      const { matricula, horario } = await SIGAApi.post("/api/matriculas", {
        estudianteId: $("mat-estudiante").value,
        cursos: [...document.querySelectorAll("#mat-cursos input:checked")].map((input) => input.value),
        medio: $("mat-medio").value,
        referencia: $("mat-referencia").value.trim(),
      });
      const textoFranjas = horario.map((f) => `${f.dia} ${f.inicio}-${f.fin} ${f.curso}`).join(" | ");
      mostrar("mat-resultado", `Matrícula confirmada: ${matricula.creditos} créditos. Valor pagado: ${formatoPesos(matricula.valor)} `
        + `(ref. ${matricula.referenciaPago}). Horario: ${textoFranjas}`, true);
      mostrarToast("Matrícula confirmada correctamente.", true);
      document.querySelectorAll("#mat-cursos input:checked").forEach((input) => { input.checked = false; });
    } catch (error) {
      manejarError(error, "mat-resultado");
      if (error.estado !== 401) mostrarToast(error.message, false);
    } finally {
      boton.disabled = false;
    }
    await refrescar();
  });

  // Calificaciones: el servidor aplica la estrategia de cálculo del curso.
  $("cal-estudiante").addEventListener("change", pintarNotas);
  $("cal-curso").addEventListener("change", pintarNotas);
  $("btn-agregar-nota").addEventListener("click", async () => {
    try {
      await SIGAApi.post("/api/calificaciones", {
        estudianteId: $("cal-estudiante").value,
        cursoId: $("cal-curso").value,
        componente: $("cal-componente").value || "Nota",
        porcentaje: Number($("cal-porcentaje").value) || 0,
        valor: parseFloat($("cal-nota").value),
      });
      $("cal-resultado").textContent = "";
      $("cal-resultado").className = "resultado";
      ["cal-componente", "cal-porcentaje", "cal-nota"].forEach((id) => { $(id).value = ""; });
    } catch (error) {
      manejarError(error, "cal-resultado");
    }
    await pintarNotas();
  });

  $("btn-publicar").addEventListener("click", async () => {
    try {
      const nota = await SIGAApi.post("/api/notas-finales", { estudianteId: $("cal-estudiante").value, cursoId: $("cal-curso").value });
      mostrar("cal-resultado", `Nota final: ${formatoNota(nota.nota)}${nota.aprobado ? " - APROBADO" : " - REPROBADO"}`, nota.aprobado);
      mostrarToast("Nota final publicada.", true);
    } catch (error) {
      manejarError(error, "cal-resultado");
    }
    await refrescar();
  });

  // Reporte
  $("btn-reporte").addEventListener("click", async () => {
    const estudianteId = esRol("student") ? usuarioActual.estudianteId : $("rep-estudiante").value;
    let notas;
    try {
      notas = await SIGAApi.get("/api/notas-finales", { estudianteId });
    } catch (error) {
      manejarError(error);
      $("rep-resultado").textContent = error.message;
      return;
    }
    if (notas.length === 0) {
      $("rep-resultado").textContent = esRol("student")
        ? "El estudiante aún no tiene notas finales."
        : "No hay notas finales para el estudiante consultado.";
      return;
    }
    let sumaPonderada = 0;
    let sumaCreditos = 0;
    const filas = notas.map((nota) => {
      const curso = cursoPorId(nota.cursoId) || { nombre: nota.cursoId, creditos: 0 };
      sumaPonderada += nota.nota * curso.creditos;
      sumaCreditos += curso.creditos;
      return `<tr><td>${escapar(curso.nombre)}</td><td>${curso.creditos}</td><td>${formatoNota(nota.nota)}</td>`
        + `<td>${nota.aprobado ? "Aprobado" : "Reprobado"} <div class="progress mt-1" role="progressbar" aria-valuenow="${nota.nota * 20}" `
        + `aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${nota.nota * 20}%"></div></div></td></tr>`;
    }).join("");
    const promedio = sumaCreditos ? (sumaPonderada / sumaCreditos).toFixed(2).replace(".", ",") : "—";
    $("rep-resultado").innerHTML = `<table><thead><tr><th>Curso</th><th>Créditos</th><th>Nota</th><th>Estado / avance</th></tr></thead>`
      + `<tbody>${filas}</tbody></table><p id="rep-promedio" class="mt-3"><strong>Promedio: ${promedio}</strong></p>`;
  });

  // Usuarios y roles
  $("usr-rol").addEventListener("change", () => { $("usr-cursos-field").hidden = $("usr-rol").value !== "teacher"; });
  $("user-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const usuario = await SIGAApi.post("/api/usuarios", {
        nombre: $("usr-nombre").value,
        correo: $("usr-correo").value,
        password: $("usr-password").value,
        rol: $("usr-rol").value,
        estrato: 3,
        cursosAsignados: [...document.querySelectorAll("#usr-cursos input:checked")].map((i) => i.value),
      });
      mostrar("usr-resultado", `Usuario ${usuario.correo} creado como ${NOMBRES_ROL[usuario.rol]}.`, true);
      $("user-form").reset();
      $("usr-cursos-field").hidden = true;
    } catch (error) {
      manejarError(error, "usr-resultado");
    }
    await refrescar();
  });
  $("user-directory").addEventListener("change", (event) => {
    const objetivo = event.target;
    if (objetivo.dataset.userRole) cambiarUsuario(objetivo.dataset.userRole, { rol: objetivo.value });
    if (objetivo.dataset.userCourse) {
      const correo = objetivo.dataset.userCourse;
      const cursos = [...document.querySelectorAll("input[data-user-course]:checked")]
        .filter((input) => input.dataset.userCourse === correo).map((input) => input.value);
      cambiarUsuario(correo, { cursosAsignados: cursos });
    }
  });
  $("user-directory").addEventListener("click", (event) => {
    const boton = event.target.closest("[data-user-active]");
    if (boton) cambiarUsuario(boton.dataset.userActive, { activo: boton.dataset.value === "true" });
  });
}

// ---------- Inicio
(async () => {
  const sesion = await SIGAAuth.sesionActual().catch(() => null);
  if (!sesion) {
    window.location.replace("login.html");
    return;
  }
  usuarioActual = sesion.usuario;
  try {
    await recargarDatos();
  } catch (error) {
    manejarError(error);
    return;
  }
  aplicarPerfil();
  iniciarGrafico();
  pintarTodo();
  conectarEventos();
  document.body.classList.remove("cargando");
  await pintarNotas();
})();
