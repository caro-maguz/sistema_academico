// Flujo completo: matricular -> poner notas -> ver avisos -> ver reporte (usa el Repository).
describe("Flujo completo", () => {
  it("matricular, calificar y ver el historial con el promedio", () => {
    cy.visit("index.html");
    cy.matricular("E001", ["ARQ701", "BD501"], "PSE", "Bancolombia");

    cy.get("#cal-estudiante").select("E001");
    cy.get("#cal-curso").select("ARQ701");
    cy.agregarNota("Parcial", 40, 4.0);
    cy.agregarNota("Proyecto", 60, 5.0);
    cy.get("#btn-publicar").click();

    cy.get("#cal-curso").select("BD501");
    cy.agregarNota("Examen", 100, 3.0);
    cy.get("#btn-publicar").click();

    cy.get("#avisos").should("contain", "Nota definitiva de Bases de Datos: 3,0 (APROBADO)");

    cy.get("#rep-estudiante").select("E001");
    cy.get("#btn-reporte").click();
    // (4,6 x 4 + 3,0 x 3) / 7 = 3,91
    cy.get("#rep-resultado").should("contain", "Arquitectura de Software").and("contain", "Bases de Datos");
    cy.get("#rep-promedio").should("contain", "Promedio: 3,91");
  });
});
