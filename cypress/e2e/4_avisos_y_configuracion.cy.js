// Patrones OBSERVER (avisos automáticos) y SINGLETON (configuración).
describe("Avisos (Observer) y configuración (Singleton)", () => {
  beforeEach(() => {
    cy.visit("index.html");
  });

  it("Observer: al matricular se avisa por correo y SMS", () => {
    cy.matricular("E001", ["BD501"], "PSE", "Bancolombia");
    cy.get("#avisos")
      .should("contain", "EMAIL → laura@uni.edu.co")
      .and("contain", "SMS → 3001234567")
      .and("contain", "Tu matrícula quedó confirmada");
  });

  it("Observer: si un aviso falla, la matrícula se hace igual", () => {
    // Simulamos un suscriptor que falla (por ejemplo, el servidor de correo caído)
    cy.window().then((win) => {
      win.SIGA.sistema.bus.suscribir("MatriculaConfirmada", () => {
        throw new Error("Servidor de correo caído");
      });
    });
    cy.matricular("E001", ["BD501"], "PSE", "Bancolombia");
    cy.get("#mat-resultado").should("contain", "Matrícula confirmada");
    cy.get("#avisos").should("contain", "Tu matrícula quedó confirmada");
  });

  it("Singleton: siempre es la misma configuración", () => {
    cy.window().then((win) => {
      const { ConfiguracionAcademica } = win.SIGA;
      expect(ConfiguracionAcademica.getInstancia()).to.equal(ConfiguracionAcademica.getInstancia());
      expect(ConfiguracionAcademica.getInstancia().maxCreditos).to.equal(20);
    });
    cy.get("#info-periodo").should("contain", "Máximo 20 créditos");
  });
});
