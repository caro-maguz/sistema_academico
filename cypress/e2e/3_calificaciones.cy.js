// Patrón STRATEGY: cada curso calcula la nota final a su manera.
describe("Calificaciones (Strategy)", () => {
  beforeEach(() => {
    cy.visit("index.html");
    cy.matricular("E001", ["ARQ701", "CAL601"], "PSE", "Bancolombia");
    cy.get("#cal-estudiante").select("E001");
  });

  it("promedio por porcentajes (Arquitectura)", () => {
    cy.get("#cal-curso").select("ARQ701");
    cy.agregarNota("Parcial 1", 30, 4.0);
    cy.agregarNota("Parcial 2", 30, 3.0);
    cy.agregarNota("Proyecto", 40, 5.0);
    cy.get("#btn-publicar").click();
    // 4,0x30% + 3,0x30% + 5,0x40% = 4,1
    cy.get("#cal-resultado").should("contain", "Nota final: 4,1 - APROBADO");
  });

  it("promedio quitando la peor nota (Calidad)", () => {
    cy.get("#cal-curso").select("CAL601");
    cy.agregarNota("Quiz 1", 0, 2.0);
    cy.agregarNota("Quiz 2", 0, 3.0);
    cy.agregarNota("Quiz 3", 0, 3.5);
    cy.agregarNota("Quiz 4", 0, 4.0);
    cy.get("#btn-publicar").click();
    // Se quita el 2,0: (3,0 + 3,5 + 4,0) / 3 = 3,5
    cy.get("#cal-resultado").should("contain", "Nota final: 3,5 - APROBADO");
  });
});
