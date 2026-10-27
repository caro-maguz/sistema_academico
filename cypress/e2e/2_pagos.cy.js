// Patrones STRATEGY (descuentos) y ADAPTER (pasarelas de pago).
describe("Pagos (Strategy y Adapter)", () => {
  beforeEach(() => {
    cy.visit("index.html");
  });

  it("Strategy: un estudiante con beca del 50 % paga la mitad", () => {
    // Andrés tiene beca del 50 %: 3 créditos x $350.000 = $1.050.000 / 2 = $525.000
    cy.matricular("E002", ["BD501"], "TARJETA", "4111 1111");
    cy.get("#mat-resultado").should("contain", "$525.000");
  });

  it("Adapter: PSE aprueba con banco y rechaza sin banco", () => {
    // Sin banco, el adaptador traduce la respuesta de PSE a un mensaje claro
    cy.get("#mat-estudiante").select("E001");
    cy.get('#mat-cursos input[value="BD501"]').check();
    cy.get("#mat-medio").select("PSE");
    cy.get("#btn-matricular").click();
    cy.get("#mat-resultado").should("contain", "PSE: banco no válido");

    // Con banco, el pago se aprueba y trae la referencia CUS de PSE
    cy.get("#mat-referencia").type("Davivienda");
    cy.get("#btn-matricular").click();
    cy.get("#mat-resultado").should("contain", "Matrícula confirmada").and("contain", "CUS-");
  });
});
