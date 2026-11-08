<<<<<<< HEAD
const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
=======
require("dotenv").config();
const { defineConfig } = require("cypress");
const { MongoClient } = require("mongodb");
const { reiniciar } = require("./server/datos-ejemplo");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000", // el servidor (npm start) debe estar corriendo
    supportFile: "cypress/support/e2e.js",
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
    setupNodeEvents(on) {
      on("task", {
        // Deja la base de datos como al inicio (se llama antes de cada prueba)
        async reiniciarBD() {
          const client = new MongoClient(process.env.MONGODB_URI);
          try {
            await client.connect();
            await reiniciar(client.db(process.env.DB_NAME));
          } finally {
            await client.close();
          }
          return null;
        },
      });
    },
>>>>>>> origin/feature/mongodb-atlas
  },
});
