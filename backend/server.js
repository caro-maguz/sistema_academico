// Punto de entrada: lee .env, conecta la base de datos y arranca la API.
// Sin MONGODB_URI (o con --memoria) usa repositorios en memoria.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const archivoEnv = path.join(__dirname, "..", ".env");
if (fs.existsSync(archivoEnv)) process.loadEnvFile(archivoEnv);

const { crearApp } = require("./app");
const { crearSistema } = require("./sistema");
const { asegurarDatosIniciales } = require("./datos-ejemplo");
const { crearRepositoriosMemoria } = require("./repositorios/memoria");
const { crearRepositoriosMongo } = require("./repositorios/mongo");

async function iniciar() {
  const usarMemoria = process.argv.includes("--memoria") || !process.env.MONGODB_URI;
  const repos = usarMemoria
    ? crearRepositoriosMemoria()
    : await crearRepositoriosMongo(process.env.MONGODB_URI, process.env.DB_NAME || "siga");
  await asegurarDatosIniciales(repos);

  let secreto = process.env.JWT_SECRET;
  if (!secreto || secreto.length < 32) {
    secreto = crypto.randomBytes(48).toString("hex");
    console.warn("Aviso: JWT_SECRET no está en .env; las sesiones se cerrarán al reiniciar el servidor.");
  }

  const app = crearApp({
    repos,
    sistema: crearSistema(repos),
    secreto,
    expiraSesion: process.env.JWT_EXPIRES_IN || "8h",
    produccion: process.env.NODE_ENV === "production",
  });

  const puerto = Number(process.env.PORT) || 3000;
  const servidor = app.listen(puerto, () => {
    const origen = repos.tipo === "mongodb" ? `MongoDB (${process.env.DB_NAME || "siga"})` : "memoria (los datos se pierden al reiniciar)";
    console.log(`SIGA corriendo en http://localhost:${puerto} · datos en ${origen}`);
  });

  const apagar = async () => {
    servidor.close();
    await repos.cerrar();
    process.exit(0);
  };
  process.on("SIGINT", apagar);
  process.on("SIGTERM", apagar);
}

iniciar().catch((error) => {
  console.error("No se pudo iniciar SIGA:", error.message);
  process.exit(1);
});
