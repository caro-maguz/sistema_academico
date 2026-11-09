const { defineConfig } = require("cypress");
const { iniciarServidorDePruebas } = require("./backend/servidor-pruebas");

const PUERTO_PRUEBAS = Number(process.env.SIGA_PUERTO_PRUEBAS) || 4321;

module.exports = defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PUERTO_PRUEBAS}`,
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
    // Arranca la API en memoria (nunca usa MongoDB) y expone tareas para preparar datos.
    async setupNodeEvents(on, config) {
      const servidor = await iniciarServidorDePruebas(PUERTO_PRUEBAS);
      on("task", {
        async reiniciarDatos() {
          await servidor.reiniciar();
          return null;
        },
        // Simula un suscriptor que falla (por ejemplo, el servidor de correo caído).
        suscriptorQueFalla(tipo) {
          servidor.sistema.bus.suscribir(tipo, () => { throw new Error("Servidor de correo caído"); });
          return null;
        },
        async agregarCalificacion({ estudianteId, cursoId, ...nota }) {
          await servidor.repos.calificaciones.agregar(estudianteId, cursoId, nota);
          return null;
        },
        async guardarNotaFinal(notaFinal) {
          await servidor.repos.calificaciones.guardarNotaFinal(notaFinal);
          return null;
        },
      });
      return config;
    },
  },
});
