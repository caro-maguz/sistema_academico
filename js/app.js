// Pantalla: conecta la interfaz con los servicios sin cambiar las reglas de negocio.
const sistema = crearSistema();
window.SIGA = { sistema, ConfiguracionAcademica, SIGAAuth, SIGAPermissions, tienePermiso };

const $ = (id) => document.getElementById(id);
let actividadChart;
let usuarioActual = SIGAAuth.getCurrentUser();
const historialPagos = [];

function mostrar(id, texto, ok) {
  $(id).textContent = texto;
  $(id).className = "resultado " + (ok ? "ok" : "error");
}

function textoHorario(curso) {
  return curso.horario.map((f) => f.dia + " " + f.inicio + "-" + f.fin).join(", ");
}

function llenarEstudiantes(idSelect) {
  $(idSelect).innerHTML = sistema.estudiantes.listar()
    .map((e) => `<option value="${e.id}">${e.id} - ${e.nombre}</option>`).join("");
}

function pintarAvisos() {
  const lista = $("avisos");
  lista.replaceChildren();
  sistema.bandeja.slice().reverse().forEach((aviso) => {
    const item = document.createElement("li");
    const encabezado = document.createElement("strong");
    encabezado.textContent = `[${aviso.canal} → ${aviso.destino}] `;
    item.append(encabezado, document.createTextNode(aviso.mensaje));
    lista.appendChild(item);
  });
}

function pintarNotas() {
  const notas = sistema.calificaciones.listar($("cal-estudiante").value, $("cal-curso").value);
  const lista = $("cal-lista");
  lista.replaceChildren();
  notas.forEach((nota) => {
    const item = document.createElement("li");
    item.textContent = `${nota.componente}: ${formatoNota(nota.valor)} (${nota.porcentaje}%)`;
    lista.appendChild(item);
  });
}

function usuarioPorId(id) {
  return sistema.estudiantes.buscarPorId(id);
}

function cursosAccesibles() {
  const asignados = usuarioActual.rol === "teacher" ? usuarioActual.cursosAsignados : null;
  const matricula = usuarioActual.rol === "student" && usuarioActual.estudianteId
    ? sistema.matriculas.buscarActiva(usuarioActual.estudianteId, sistema.config.periodo)
    : null;
  const matriculados = usuarioActual.rol === "student" ? (matricula ? matricula.cursos : []) : null;
  return sistema.cursos.listar().filter((curso) =>
    (!asignados || asignados.includes(curso.id)) && (!matriculados || matriculados.includes(curso.id)));
}

function actualizarCursosCalificables() {
  if (usuarioActual.rol === "administrator") return;
  const cursoAnterior = $("cal-curso").value;
  $("cal-curso").innerHTML = cursosAccesibles().map((curso) =>
    `<option value="${curso.id}">${curso.id} - ${curso.nombre}</option>`).join("");
  if (cursosAccesibles().some((curso) => curso.id === cursoAnterior)) $("cal-curso").value = cursoAnterior;
  pintarNotas();
}

function aplicarPerfil() {
  const nombres = { administrator: "Administrador", teacher: "Docente", student: "Estudiante" };
  const nombre = usuarioActual.legacy ? "Administrador" : usuarioActual.nombre.split(" ")[0];
  const rolLabel = nombres[usuarioActual.rol] || "Usuario";
  $("user-name").textContent = usuarioActual.legacy ? rolLabel : usuarioActual.nombre;
  $("user-role").textContent = rolLabel;
  $("welcome-name").textContent = nombre;
  $("user-avatar").textContent = nombre.slice(0, 2).toUpperCase();

  document.querySelectorAll("[data-permission]").forEach((item) => {
    item.hidden = !tienePermiso(usuarioActual.rol, item.dataset.permission);
  });
  document.querySelectorAll("[data-permission-section]").forEach((item) => {
    item.hidden = !tienePermiso(usuarioActual.rol, item.dataset.permissionSection);
  });
  document.querySelectorAll("[data-role]").forEach((item) => {
    item.hidden = item.dataset.role !== usuarioActual.rol;
  });
  document.querySelectorAll("[data-nav-courses]").forEach((item) => {
    item.lastChild.textContent = usuarioActual.rol === "administrator" ? " Cursos" : " Mis Cursos";
  });
  document.querySelectorAll("[data-nav-reports]").forEach((item) => {
    item.lastChild.textContent = usuarioActual.rol === "student" ? " Historial" : " Reportes";
  });
  document.querySelectorAll("[data-nav-enroll]").forEach((item) => {
    item.lastChild.textContent = usuarioActual.rol === "student" ? " Matrícula" : " Matrículas";
  });
  $("profile-name").textContent = usuarioActual.nombre;
  $("profile-email").textContent = usuarioActual.correo || "Acceso directo de demostración";
  $("profile-avatar").textContent = usuarioActual.nombre.slice(0, 2).toUpperCase();
  $("config-period").textContent = sistema.config.periodo;
  $("config-credits").textContent = sistema.config.maxCreditos;
  $("config-price").textContent = formatoPesos(sistema.config.valorCredito);

  if (usuarioActual.rol === "student" && usuarioActual.estudianteId) {
    ["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach((id) => {
      const selector = $(id);
      [...selector.options].forEach((option) => { option.hidden = option.value !== usuarioActual.estudianteId; });
      selector.value = usuarioActual.estudianteId;
      selector.disabled = true;
    });
  }
  if (usuarioActual.rol !== "administrator") actualizarCursosCalificables();
  if (usuarioActual.rol === "student") {
    document.querySelectorAll("#calificaciones .grade-entry, #calificaciones .button-row").forEach((item) => { item.hidden = true; });
  }

  if (usuarioActual.rol === "teacher") {
    $("stat-students-label").textContent = "Estudiantes inscritos";
    $("stat-students").textContent = sistema.estudiantes.listar().length;
    $("stat-students-note").textContent = "En el periodo";
    $("stat-faculty-label").textContent = "Cursos asignados";
    $("stat-faculty").textContent = cursosAccesibles().length;
    $("stat-faculty-note").textContent = "Asignación docente";
    $("stat-courses-label").textContent = "Notas pendientes";
    $("stat-courses").textContent = "0";
    $("stat-courses-note").textContent = "Por publicar";
    $("stat-enroll-label").textContent = "Periodo";
    $("stat-enroll").textContent = sistema.config.periodo;
    $("stat-enroll-note").textContent = "Periodo lectivo";
  } else if (usuarioActual.rol === "student") {
    const estudiante = sistema.estudiantes.listar()[0];
    const matricula = estudiante && sistema.matriculas.buscarActiva(estudiante.id, sistema.config.periodo);
    const notasFinales = estudiante ? sistema.calificaciones.notasFinalesDe(estudiante.id) : [];
    const promedio = notasFinales.length
      ? (notasFinales.reduce((suma, nota) => suma + nota.nota, 0) / notasFinales.length).toFixed(1).replace(".", ",")
      : "—";
    $("stat-students-label").textContent = "Créditos matriculados";
    $("stat-students").textContent = matricula ? matricula.creditos : "0";
    $("stat-students-note").textContent = "En el periodo vigente";
    $("stat-faculty-label").textContent = "Promedio acumulado";
    $("stat-faculty").textContent = promedio;
    $("stat-faculty-note").textContent = "Desempeño general";
    $("stat-courses-label").textContent = "Pagos pendientes";
    $("stat-courses").textContent = "0";
    $("stat-courses-note").textContent = "Sin saldos pendientes";
    $("stat-enroll-label").textContent = "Cursos disponibles";
    $("stat-enroll").textContent = sistema.cursos.listar().length;
    $("stat-enroll-note").textContent = "Oferta académica";
  }
}

function actualizarHorario() {
  const estudianteId = usuarioActual.estudianteId || $("mat-estudiante").value;
  const horario = sistema.matricula.consultarHorario(estudianteId);
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
  const codigos = [...document.querySelectorAll("#mat-cursos input:checked")].map((input) => input.value);
  const creditos = codigos.reduce((total, codigo) => {
    const curso = sistema.cursos.buscarPorId(codigo);
    return total + (curso ? curso.creditos : 0);
  }, 0);
  const estudiante = usuarioPorId($("mat-estudiante").value);
  const monto = estudiante ? sistema.pagos.calcularValor(estudiante, creditos, sistema.config.valorCredito) : 0;
  $("selected-credits").textContent = `${creditos} / ${sistema.config.maxCreditos}`;
  $("selected-cost").textContent = formatoPesos(monto);
  const cursos = codigos.map((codigo) => sistema.cursos.buscarPorId(codigo));
  const conflictos = [];
  for (let i = 0; i < cursos.length; i++) {
    for (let j = i + 1; j < cursos.length; j++) {
      if (seCruzan(cursos[i], cursos[j])) conflictos.push(`${cursos[i].id} y ${cursos[j].id}`);
    }
  }
  const alerta = $("course-conflicts");
  alerta.hidden = conflictos.length === 0;
  alerta.textContent = conflictos.length ? `Conflicto de horario: ${conflictos.join("; ")}` : "";
}

function actualizarDirectorios() {
  $("student-directory").innerHTML = sistema.estudiantes.listar().map((estudiante) =>
    `<div class="directory-item"><span class="avatar">${estudiante.nombre.slice(0, 1)}</span><span><strong>${estudiante.nombre}</strong><small>${estudiante.id} · ${estudiante.email}</small></span></div>`
  ).join("");
  $("course-directory").innerHTML = cursosAccesibles().map((curso) =>
    `<tr><td><strong>${curso.id}</strong><br>${curso.nombre}</td><td>${curso.creditos}</td><td>${curso.inscritos} / ${curso.cupo}</td><td>${textoHorario(curso)}</td></tr>`
  ).join("");
}

function actualizarPagos() {
  const tbody = $("payment-history");
  tbody.replaceChildren();
  if (historialPagos.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 4;
    cell.className = "empty-state";
    cell.textContent = "Aún no hay pagos registrados.";
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    historialPagos.slice().reverse().forEach((pago) => {
      const row = document.createElement("tr");
      [pago.referencia, pago.estudiante, formatoPesos(pago.valor)].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      const stateCell = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = `payment-status ${pago.estado === "Rechazado" ? "rejected" : ""}`;
      badge.textContent = pago.estado;
      stateCell.appendChild(badge);
      row.appendChild(stateCell);
      tbody.appendChild(row);
    });
  }
  if (usuarioActual.rol === "administrator") {
    $("stat-enroll").textContent = sistema.matriculas.listar().length;
  } else if (usuarioActual.rol === "student" && usuarioActual.estudianteId) {
    const matricula = sistema.matriculas.buscarActiva(usuarioActual.estudianteId, sistema.config.periodo);
    $("stat-students").textContent = matricula ? matricula.creditos : "0";
  }
  if (actividadChart) {
    actividadChart.data.datasets[1].data = sistema.cursos.listar().map((curso) =>
      sistema.matriculas.listar().filter((matricula) => matricula.cursos.includes(curso.id)).length
    );
    actividadChart.update();
  }
}

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
      labels: sistema.cursos.listar().map((curso) => curso.id),
      datasets: [
        { label: "Cursos", data: sistema.cursos.listar().map(() => 1), backgroundColor: "#4a73d1", borderRadius: 4, maxBarThickness: 23 },
        { label: "Matrículas", data: sistema.cursos.listar().map(() => 0), backgroundColor: "#53c5a0", borderRadius: 4, maxBarThickness: 23 },
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

// ---------- Inicialización de pantalla
const config = ConfiguracionAcademica.getInstancia();
$("info-periodo").textContent = `Periodo ${config.periodo} · Máximo ${config.maxCreditos} créditos · Valor del crédito ${formatoPesos(config.valorCredito)}`;
$("sidebar-periodo").textContent = `Periodo ${config.periodo}`;
["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach(llenarEstudiantes);

$("mat-cursos").innerHTML = sistema.cursos.listar().map((curso) =>
  `<label data-course-label="${curso.id}"><input type="checkbox" value="${curso.id}"><span><strong>${curso.id} — ${curso.nombre}</strong><br>${curso.creditos} créditos · ${textoHorario(curso)}</span></label>`
).join("");

$("cal-curso").innerHTML = sistema.cursos.listar()
  .map((curso) => `<option value="${curso.id}">${curso.id} - ${curso.nombre}</option>`).join("");

aplicarPerfil();
actualizarDirectorios();
actualizarHorario();
actualizarResumenMatricula();
iniciarGrafico();
actualizarPagos();
pintarAvisos();

const roleEvents = [
  ["MatriculaConfirmada", (evento) => {
    mostrarToast("Matrícula confirmada correctamente.", true);
    actualizarPagos();
    actualizarDirectorios();
    actualizarCursosCalificables();
    actualizarHorario();
  }],
  ["PagoAprobado", () => mostrarToast("Pago aprobado.", true)],
  ["PagoRechazado", (evento) => {
    mostrarToast(evento.mensaje, false);
    historialPagos.push({
      referencia: evento.referencia || "—",
      estudiante: (usuarioPorId(evento.estudianteId) || {}).nombre || evento.estudianteId,
      valor: evento.monto || 0,
      estado: "Rechazado",
    });
    actualizarPagos();
  }],
  ["NotaPublicada", () => mostrarToast("Nota final publicada.", true)],
  ["PeriodoIniciado", (evento) => mostrarToast(`Inició el periodo ${evento.periodo}.`, true)],
];
roleEvents.forEach(([tipo, listener]) => sistema.bus.suscribir(tipo, listener));
sistema.bus.suscribir("MatriculaConfirmada", pintarAvisos);
sistema.bus.suscribir("NotaPublicada", pintarAvisos);
sistema.bus.suscribir("PagoAprobado", pintarAvisos);
sistema.bus.suscribir("PagoRechazado", pintarAvisos);
sistema.bus.publicar("PeriodoIniciado", { periodo: config.periodo });
pintarAvisos();

// ---------- Navegación adaptable
$("sidebar-toggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".side-nav a").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".side-nav a").forEach((item) => item.classList.remove("active"));
  link.classList.add("active");
  $("page-title").textContent = link.textContent.trim();
  $("sidebar").classList.remove("open");
}));

// ---------- Matrícula (la fachada conserva las reglas y el orden del proceso)
$("mat-estudiante").addEventListener("change", actualizarResumenMatricula);
$("mat-cursos").addEventListener("change", actualizarResumenMatricula);
$("course-search").addEventListener("input", (event) => {
  const busqueda = event.target.value.trim().toLocaleLowerCase("es");
  document.querySelectorAll("#mat-cursos label").forEach((label) => {
    label.hidden = !label.textContent.toLocaleLowerCase("es").includes(busqueda);
  });
});

$("btn-matricular").addEventListener("click", () => {
  const cursos = [...document.querySelectorAll("#mat-cursos input:checked")].map((input) => input.value);
  const estudiante = usuarioPorId($("mat-estudiante").value);
  try {
    const matricula = sistema.matricula.matricular({
      estudianteId: $("mat-estudiante").value,
      cursos,
      medio: $("mat-medio").value,
      referencia: $("mat-referencia").value.trim(),
    });
    const horario = sistema.matricula.consultarHorario(matricula.estudianteId)
      .map((franja) => `${franja.dia} ${franja.inicio}-${franja.fin} ${franja.curso}`).join(" | ");
    mostrar("mat-resultado", `Matrícula confirmada: ${matricula.creditos} créditos. Valor pagado: ${formatoPesos(matricula.valor)} (ref. ${matricula.referenciaPago}). Horario: ${horario}`, true);
    historialPagos.push({ referencia: matricula.referenciaPago, estudiante: estudiante.nombre, valor: matricula.valor, estado: "Pagado" });
    actualizarPagos();
    actualizarResumenMatricula();
  } catch (error) {
    mostrar("mat-resultado", error.message, false);
  }
  pintarAvisos();
});

// ---------- Calificaciones (el servicio conserva la estrategia de cálculo)
$("cal-estudiante").addEventListener("change", pintarNotas);
$("cal-curso").addEventListener("change", pintarNotas);
$("btn-agregar-nota").addEventListener("click", () => {
  try {
    sistema.notas.registrarNota($("cal-estudiante").value, $("cal-curso").value,
      $("cal-componente").value || "Nota", Number($("cal-porcentaje").value) || 0, parseFloat($("cal-nota").value));
    $("cal-resultado").textContent = "";
    ["cal-componente", "cal-porcentaje", "cal-nota"].forEach((id) => { $(id).value = ""; });
  } catch (error) {
    mostrar("cal-resultado", error.message, false);
  }
  pintarNotas();
});

$("btn-publicar").addEventListener("click", () => {
  try {
    const nota = sistema.notas.publicarNotaFinal($("cal-estudiante").value, $("cal-curso").value);
    mostrar("cal-resultado", `Nota final: ${formatoNota(nota.nota)}${nota.aprobado ? " - APROBADO" : " - REPROBADO"}`, nota.aprobado);
  } catch (error) {
    mostrar("cal-resultado", error.message, false);
  }
  pintarAvisos();
});

// ---------- Reporte
$("btn-reporte").addEventListener("click", () => {
  const notas = sistema.calificaciones.notasFinalesDe($("rep-estudiante").value);
  if (notas.length === 0) {
    $("rep-resultado").textContent = "El estudiante aún no tiene notas finales.";
    return;
  }
  let sumaPonderada = 0, sumaCreditos = 0;
  const filas = notas.map((nota) => {
    const curso = sistema.cursos.buscarPorId(nota.cursoId);
    sumaPonderada += nota.nota * curso.creditos;
    sumaCreditos += curso.creditos;
    return `<tr><td>${curso.nombre}</td><td>${curso.creditos}</td><td>${formatoNota(nota.nota)}</td>`
      + `<td>${nota.aprobado ? "Aprobado" : "Reprobado"} <div class="progress mt-1" role="progressbar" aria-valuenow="${nota.nota * 20}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${nota.nota * 20}%"></div></div></td></tr>`;
  }).join("");
  $("rep-resultado").innerHTML = `<table><thead><tr><th>Curso</th><th>Créditos</th><th>Nota</th><th>Estado / avance</th></tr></thead><tbody>${filas}</tbody></table>`
    + `<p id="rep-promedio" class="mt-3"><strong>Promedio: ${(sumaPonderada / sumaCreditos).toFixed(2).replace(".", ",")}</strong></p>`;
});
