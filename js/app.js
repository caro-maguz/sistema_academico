// =====================================================================
// Pantalla: conecta los botones de la página con el sistema.
// =====================================================================
const sistema = crearSistema();
window.SIGA = { sistema, ConfiguracionAcademica }; // para las pruebas de Cypress

const $ = (id) => document.getElementById(id);

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
  $("avisos").innerHTML = sistema.bandeja
    .map((a) => `<li><strong>[${a.canal} → ${a.destino}]</strong> ${a.mensaje}</li>`).join("");
}

function pintarNotas() {
  const notas = sistema.calificaciones.listar($("cal-estudiante").value, $("cal-curso").value);
  $("cal-lista").innerHTML = notas
    .map((n) => `<li>${n.componente}: ${formatoNota(n.valor)} (${n.porcentaje}%)</li>`).join("");
}

// ---------- Datos iniciales en pantalla
const config = ConfiguracionAcademica.getInstancia();
$("info-periodo").textContent = "Periodo " + config.periodo + " · Máximo " + config.maxCreditos
  + " créditos · Valor del crédito " + formatoPesos(config.valorCredito);

["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach(llenarEstudiantes);

$("mat-cursos").innerHTML = sistema.cursos.listar().map((c) =>
  `<label><input type="checkbox" value="${c.id}">${c.id} - ${c.nombre} (${c.creditos} cr) · ${textoHorario(c)}</label>`).join("");

$("cal-curso").innerHTML = sistema.cursos.listar()
  .map((c) => `<option value="${c.id}">${c.id} - ${c.nombre}</option>`).join("");

// ---------- 1. Matrícula
$("btn-matricular").addEventListener("click", () => {
  const cursos = [...document.querySelectorAll("#mat-cursos input:checked")].map((c) => c.value);
  try {
    const m = sistema.matricula.matricular({
      estudianteId: $("mat-estudiante").value,
      cursos,
      medio: $("mat-medio").value,
      referencia: $("mat-referencia").value.trim(),
    });
    const horario = sistema.matricula.consultarHorario(m.estudianteId)
      .map((f) => f.dia + " " + f.inicio + "-" + f.fin + " " + f.curso).join(" | ");
    mostrar("mat-resultado", "Matrícula confirmada: " + m.creditos + " créditos. Valor pagado: "
      + formatoPesos(m.valor) + " (ref. " + m.referenciaPago + "). Horario: " + horario, true);
  } catch (e) {
    mostrar("mat-resultado", e.message, false);
  }
  pintarAvisos();
});

// ---------- 2. Calificaciones
$("cal-estudiante").addEventListener("change", pintarNotas);
$("cal-curso").addEventListener("change", pintarNotas);

$("btn-agregar-nota").addEventListener("click", () => {
  try {
    sistema.notas.registrarNota($("cal-estudiante").value, $("cal-curso").value,
      $("cal-componente").value || "Nota", Number($("cal-porcentaje").value) || 0, parseFloat($("cal-nota").value));
    $("cal-resultado").textContent = "";
    ["cal-componente", "cal-porcentaje", "cal-nota"].forEach((id) => { $(id).value = ""; });
  } catch (e) {
    mostrar("cal-resultado", e.message, false);
  }
  pintarNotas();
});

$("btn-publicar").addEventListener("click", () => {
  try {
    const n = sistema.notas.publicarNotaFinal($("cal-estudiante").value, $("cal-curso").value);
    mostrar("cal-resultado", "Nota final: " + formatoNota(n.nota) + (n.aprobado ? " - APROBADO" : " - REPROBADO"), n.aprobado);
  } catch (e) {
    mostrar("cal-resultado", e.message, false);
  }
  pintarAvisos();
});

// ---------- 4. Reporte
$("btn-reporte").addEventListener("click", () => {
  const notas = sistema.calificaciones.notasFinalesDe($("rep-estudiante").value);
  if (notas.length === 0) {
    $("rep-resultado").textContent = "El estudiante aún no tiene notas finales.";
    return;
  }
  let sumaPonderada = 0, sumaCreditos = 0;
  const filas = notas.map((n) => {
    const curso = sistema.cursos.buscarPorId(n.cursoId);
    sumaPonderada += n.nota * curso.creditos;
    sumaCreditos += curso.creditos;
    return `<tr><td>${curso.nombre}</td><td>${curso.creditos}</td><td>${formatoNota(n.nota)}</td>`
      + `<td>${n.aprobado ? "Aprobado" : "Reprobado"}</td></tr>`;
  }).join("");
  $("rep-resultado").innerHTML = `<table><tr><th>Curso</th><th>Créditos</th><th>Nota</th><th>Estado</th></tr>${filas}</table>`
    + `<p id="rep-promedio"><strong>Promedio: ${(sumaPonderada / sumaCreditos).toFixed(2).replace(".", ",")}</strong></p>`;
});
