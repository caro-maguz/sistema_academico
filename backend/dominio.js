// Carga en Node las mismas clases del dominio que usa el navegador (carpeta js/),
// para que las reglas de negocio y los permisos existan en un solo lugar.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ARCHIVOS = [
  "config.js",
  "permissions.js",
  "eventos.js",
  "pagos.js",
  "calificaciones.js",
  "notificaciones.js",
  "matricula.js",
];

const EXPORTADOS = [
  "ConfiguracionAcademica", "ReglaNegocioError", "formatoPesos", "formatoNota",
  "SIGAPermissions", "tienePermiso",
  "BusEventos",
  "ServicioPagos", "PasarelaPseAdapter", "PasarelaTarjetaAdapter", "ClientePseExterno", "ProcesadorTarjetasLegacy",
  "ServicioCalificaciones",
  "NotificadorEmail", "NotificadorSms", "SuscriptorNotificaciones",
  "MatriculaFacade", "seCruzan",
];

const carpeta = path.join(__dirname, "..", "js");
const codigo = ARCHIVOS.map((archivo) => fs.readFileSync(path.join(carpeta, archivo), "utf8")).join("\n;\n");
const envoltura = `(function () {\n${codigo}\n;return { ${EXPORTADOS.join(", ")} };\n})()`;

module.exports = vm.runInThisContext(envoltura, { filename: "dominio-siga.js" });
