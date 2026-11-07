// =====================================================================
// Pantalla: conecta los botones de la página con el sistema.
// Como los datos vienen del servidor, las operaciones son asíncronas.
// =====================================================================
const sistema = crearSistema();
window.SIGA = { sistema, ConfiguracionAcademica }; // para las pruebas de Cypress

const $ = (id) => document.getElementById(id);

// Cola: las acciones se ejecutan una detrás de otra, en el orden en que se hicieron clic.
// (Así "agregar nota" siempre termina antes de "publicar nota final".)
let cola = Promise.resolve();
function encolar(tarea) {
  cola = cola.then(tarea).catch((e) => console.error(e));
  return cola;
}

function mostrar(id, texto, ok) {
  $(id).textContent = texto;
  $(id).className = "resultado " + (ok ? "ok" : "error");
}

function textoHorario(curso) {
  return curso.horario.map((f) => f.dia + " " + f.inicio + "-" + f.fin).join(", ");
}

function llenarEstudiantes(idSelect, lista) {
  $(idSelect).innerHTML = lista
    .map((e) => `<option value="${e.id}">${e.id} - ${e.nombre}</option>`).join("");
}

function pintarAvisos() {
  $("avisos").innerHTML = sistema.bandeja
    .map((a) => `<li><strong>[${a.canal} → ${a.destino}]</strong> ${a.mensaje}</li>`).join("");
}

async function pintarNotas() {
  const estudianteId = $("cal-estudiante").value;
  const cursoId = $("cal-curso").value;
  const notas = await sistema.calificaciones.listar(estudianteId, cursoId);
  if (estudianteId !== $("cal-estudiante").value || cursoId !== $("cal-curso").value) return; // cambió la selección
  $("cal-lista").innerHTML = notas
    .map((n) => `<li>${n.componente}: ${formatoNota(n.valor)} (${n.porcentaje}%)</li>`).join("");
}

// ---------- Datos iniciales en pantalla
const config = ConfiguracionAcademica.getInstancia();
$("info-periodo").textContent = "Periodo " + config.periodo + " · Máximo " + config.maxCreditos
  + " créditos · Valor del crédito " + formatoPesos(config.valorCredito);

async function iniciar() {
  const [estudiantes, cursos] = await Promise.all([sistema.estudiantes.listar(), sistema.cursos.listar()]);

  ["mat-estudiante", "cal-estudiante", "rep-estudiante"].forEach((id) => llenarEstudiantes(id, estudiantes));

  $("mat-cursos").innerHTML = cursos.map((c) =>
    `<label><input type="checkbox" value="${c.id}">${c.id} - ${c.nombre} (${c.creditos} cr) · ${textoHorario(c)}</label>`).join("");

  $("cal-curso").innerHTML = cursos
    .map((c) => `<option value="${c.id}">${c.id} - ${c.nombre}</option>`).join("");
}

iniciar().catch((e) => {
  $("info-periodo").insertAdjacentHTML("afterend",
    `<p class="resultado error">No se pudo cargar la base de datos: ${e.message}</p>`);
});

// ---------- 1. Matrícula
$("btn-matricular").addEventListener("click", () => {
  // Se leen los datos de la pantalla en el momento del clic...
  const datos = {
    estudianteId: $("mat-estudiante").value,
    cursos: [...document.querySelectorAll("#mat-cursos input:checked")].map((c) => c.value),
    medio: $("mat-medio").value,
    referencia: $("mat-referencia").value.trim(),
  };
  // ...y el trabajo se hace en la cola.
  encolar(async () => {
    try {
      const m = await sistema.matricula.matricular(datos);
      const horario = (await sistema.matricula.consultarHorario(m.estudianteId))
        .map((f) => f.dia + " " + f.inicio + "-" + f.fin + " " + f.curso).join(" | ");
      mostrar("mat-resultado", "Matrícula confirmada: " + m.creditos + " créditos. Valor pagado: "
        + formatoPesos(m.valor) + " (ref. " + m.referenciaPago + "). Horario: " + horario, true);
    } catch (e) {
      mostrar("mat-resultado", e.message, false);
    }
    pintarAvisos();
  });
});

// ---------- 2. Calificaciones
$("cal-estudiante").addEventListener("change", pintarNotas);
$("cal-curso").addEventListener("change", pintarNotas);

$("btn-agregar-nota").addEventListener("click", () => {
  const estudianteId = $("cal-estudiante").value;
  const cursoId = $("cal-curso").value;
  const componente = $("cal-componente").value || "Nota";
  const porcentaje = Number($("cal-porcentaje").value) || 0;
  const valor = parseFloat($("cal-nota").value);
  ["cal-componente", "cal-porcentaje", "cal-nota"].forEach((id) => { $(id).value = ""; });

  encolar(async () => {
    try {
      await sistema.notas.registrarNota(estudianteId, cursoId, componente, porcentaje, valor);
      $("cal-resultado").textContent = "";
    } catch (e) {
      mostrar("cal-resultado", e.message, false);
    }
    await pintarNotas();
  });
});

$("btn-publicar").addEventListener("click", () => {
  const estudianteId = $("cal-estudiante").value;
  const cursoId = $("cal-curso").value;

  encolar(async () => {
    try {
      const n = await sistema.notas.publicarNotaFinal(estudianteId, cursoId);
      mostrar("cal-resultado", "Nota final: " + formatoNota(n.nota) + (n.aprobado ? " - APROBADO" : " - REPROBADO"), n.aprobado);
    } catch (e) {
      mostrar("cal-resultado", e.message, false);
    }
    pintarAvisos();
  });
});

// ---------- 4. Reporte
$("btn-reporte").addEventListener("click", () => {
  const estudianteId = $("rep-estudiante").value;

  encolar(async () => {
    const notas = await sistema.calificaciones.notasFinalesDe(estudianteId);
    if (notas.length === 0) {
      $("rep-resultado").textContent = "El estudiante aún no tiene notas finales.";
      return;
    }
    let sumaPonderada = 0, sumaCreditos = 0;
    const filas = [];
    for (const n of notas) {
      const curso = await sistema.cursos.buscarPorId(n.cursoId);
      sumaPonderada += n.nota * curso.creditos;
      sumaCreditos += curso.creditos;
      filas.push(`<tr><td>${curso.nombre}</td><td>${curso.creditos}</td><td>${formatoNota(n.nota)}</td>`
        + `<td>${n.aprobado ? "Aprobado" : "Reprobado"}</td></tr>`);
    }
    $("rep-resultado").innerHTML = `<table><tr><th>Curso</th><th>Créditos</th><th>Nota</th><th>Estado</th></tr>${filas.join("")}</table>`
      + `<p id="rep-promedio"><strong>Promedio: ${(sumaPonderada / sumaCreditos).toFixed(2).replace(".", ",")}</strong></p>`;
  });
});
