// Servidor para las pruebas de Cypress: siempre en memoria, nunca toca MongoDB.
// Cypress lo arranca solo (ver cypress.config.js) y lo reinicia antes de cada prueba.
const http = require("node:http");
const { crearApp } = require("./app");
const { crearSistema } = require("./sistema");
const { asegurarDatosIniciales } = require("./datos-ejemplo");
const { crearRepositoriosMemoria } = require("./repositorios/memoria");

const SECRETO_PRUEBAS = "secreto-solo-para-pruebas-automaticas-0123456789";

async function iniciarServidorDePruebas(puerto) {
  let contexto;

  async function reiniciar() {
    const repos = crearRepositoriosMemoria();
    await asegurarDatosIniciales(repos);
    const sistema = crearSistema(repos);
    contexto = { repos, sistema, app: crearApp({ repos, sistema, secreto: SECRETO_PRUEBAS, expiraSesion: "1h" }) };
  }

  await reiniciar();
  const servidor = http.createServer((req, res) => contexto.app(req, res));
  await new Promise((resolver, rechazar) => {
    servidor.once("error", rechazar);
    servidor.listen(puerto, resolver);
  });

  return {
    reiniciar,
    get repos() { return contexto.repos; },
    get sistema() { return contexto.sistema; },
    cerrar: () => new Promise((resolver) => servidor.close(resolver)),
  };
}

module.exports = { iniciarServidorDePruebas };
