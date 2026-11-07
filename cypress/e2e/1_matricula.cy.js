// Patrón FACADE: todo el proceso de matrícula con un solo botón.
describe("Matrícula (Facade)", () => {
  beforeEach(() => {
    cy.visit("index.html");
  });

  it("matrícula exitosa con descuento por estrato", () => {
    // Laura es estrato 2: 7 créditos x $350.000 = $2.450.000 - 15 % = $2.082.500
    cy.matricular("E001", ["ARQ701", "BD501"], "PSE", "Bancolombia");
    cy.get("#mat-resultado")
      .should("have.class", "ok")
      .and("contain", "Matrícula confirmada")
      .and("contain", "$2.082.500");
  });

  it("rechaza materias con cruce de horario", () => {
    // ARQ701 (lunes 8-10) y ING301 (lunes 9-11) se cruzan
    cy.matricular("E001", ["ARQ701", "ING301"], "PSE", "Bancolombia");
    cy.get("#mat-resultado").should("have.class", "error").and("contain", "Cruce de horario");
  });

  it("rechaza más de 20 créditos", () => {
    // 18 + 3 = 21 créditos
    cy.matricular("E001", ["PRA901", "BD501"], "PSE", "Bancolombia");
    cy.get("#mat-resultado").should("contain", "máximo de 20 créditos");
  });

  it("si el pago falla, no se gasta el cupo", () => {
    // La electiva tiene 1 solo cupo. Sofía no tiene fondos...
    cy.matricular("E003", ["ELE101"], "TARJETA", "SIN_FONDOS");
    cy.get("#mat-resultado").should("contain", "fondos insuficientes");
    // ...así que el cupo sigue libre y Laura sí lo puede tomar.
    cy.matricular("E001", ["ELE101"], "PSE", "Bancolombia");
    cy.get("#mat-resultado").should("contain", "Matrícula confirmada");
  });
});
