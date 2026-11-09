// Comandos reutilizables para las pruebas.

const CUENTAS = {
  admin: ["admin@siga.edu.co", "Admin123!"],
  docente: ["docente@siga.edu.co", "Docente123!"],
  estudiante: ["estudiante@siga.edu.co", "Estudiante123!"],
};

// Cada prueba empieza con los datos de ejemplo limpios.
beforeEach(() => {
  cy.task("reiniciarDatos");
});

// Inicia sesión directamente contra la API (deja la cookie de sesión lista).
Cypress.Commands.add("iniciarSesion", (perfil) => {
  const [correo, password] = CUENTAS[perfil];
  cy.request("POST", "/api/auth/login", { correo, password });
});

// Matricula a un estudiante desde la pantalla.
Cypress.Commands.add("matricular", (estudiante, cursos, medio, referencia) => {
  cy.get("#mat-estudiante").select(estudiante);
  cursos.forEach((curso) => cy.get(`#mat-cursos input[value="${curso}"]`).check());
  cy.get("#mat-medio").select(medio);
  cy.get("#mat-referencia").clear().type(referencia);
  cy.get("#btn-matricular").click();
  cy.get("#btn-matricular").should("not.be.disabled");
});

// Registra una nota desde la pantalla y espera a que el servidor la guarde.
Cypress.Commands.add("agregarNota", (componente, porcentaje, nota) => {
  cy.get("#cal-componente").type(componente);
  cy.get("#cal-porcentaje").type(String(porcentaje));
  cy.get("#cal-nota").type(String(nota));
  cy.get("#btn-agregar-nota").click();
  cy.get("#cal-lista").should("contain", componente);
  cy.get("#cal-componente").should("have.value", "");
});
