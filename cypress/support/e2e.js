// Comandos reutilizables para las pruebas.

// Matricula a un estudiante desde la pantalla.
Cypress.Commands.add("matricular", (estudiante, cursos, medio, referencia) => {
  cy.get("#mat-estudiante").select(estudiante);
  cursos.forEach((curso) => cy.get(`#mat-cursos input[value="${curso}"]`).check());
  cy.get("#mat-medio").select(medio);
  cy.get("#mat-referencia").clear().type(referencia);
  cy.get("#btn-matricular").click();
});

// Registra una nota desde la pantalla.
Cypress.Commands.add("agregarNota", (componente, porcentaje, nota) => {
  cy.get("#cal-componente").type(componente);
  cy.get("#cal-porcentaje").type(String(porcentaje));
  cy.get("#cal-nota").type(String(nota));
  cy.get("#btn-agregar-nota").click();
});
