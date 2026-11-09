// Registro de estudiantes y control de acceso en el servidor.
describe("Registro y control de roles", () => {
  it("sin sesión, el panel redirige al inicio de sesión y la API responde 401", () => {
    cy.visit("index.html");
    cy.url().should("include", "login.html");
    cy.request({ url: "/api/cursos", failOnStatusCode: false }).its("status").should("eq", 401);
  });

  it("un estudiante nuevo se registra, entra y se matricula", () => {
    cy.visit("register.html");
    cy.get("#reg-nombre").type("Ana Prueba");
    cy.get("#reg-correo").type("ana@prueba.co");
    cy.get("#reg-telefono").type("3001112233");
    cy.get("#reg-estrato").select("2");
    cy.get("#reg-password").type("clave1234");
    cy.get("#reg-confirmar").type("clave1234");
    cy.get("#register-form").submit();

    cy.url().should("include", "index.html");
    cy.get("#user-role").should("have.text", "Estudiante");
    cy.get("#profile-email").should("contain", "Código E004");
    cy.get("#mat-student-field").should("not.be.visible");
    cy.get('#mat-cursos input[value="BD501"]').check();
    cy.get("#mat-referencia").type("Bancolombia");
    cy.get("#btn-matricular").click();
    // Estrato 2: 3 créditos x $350.000 = $1.050.000 - 15 % = $892.500
    cy.get("#mat-resultado").should("contain", "Matrícula confirmada").and("contain", "$892.500");
  });

  it("rechaza registros con correo repetido o contraseña débil", () => {
    cy.request({
      method: "POST", url: "/api/auth/registro", failOnStatusCode: false,
      body: { nombre: "Otra", correo: "admin@siga.edu.co", password: "clave1234", estrato: 3 },
    }).its("status").should("eq", 409);
    cy.request({
      method: "POST", url: "/api/auth/registro", failOnStatusCode: false,
      body: { nombre: "Débil", correo: "debil@prueba.co", password: "123", estrato: 3 },
    }).its("status").should("eq", 400);
  });

  it("un estudiante no puede registrar notas ni matricular a otra persona", () => {
    cy.iniciarSesion("estudiante");
    cy.request({
      method: "POST", url: "/api/calificaciones", failOnStatusCode: false,
      body: { estudianteId: "E001", cursoId: "ARQ701", componente: "Trampa", porcentaje: 100, valor: 5 },
    }).its("status").should("eq", 403);
    cy.request({
      method: "POST", url: "/api/matriculas", failOnStatusCode: false,
      body: { estudianteId: "E002", cursos: ["BD501"], medio: "PSE", referencia: "Bancolombia" },
    }).its("status").should("eq", 403);
  });

  it("un docente solo califica sus cursos asignados y no administra usuarios", () => {
    cy.iniciarSesion("docente");
    cy.request({
      method: "POST", url: "/api/calificaciones", failOnStatusCode: false,
      body: { estudianteId: "E001", cursoId: "ING301", componente: "Parcial", porcentaje: 100, valor: 4 },
    }).its("status").should("eq", 403);
    cy.request({ url: "/api/usuarios", failOnStatusCode: false }).its("status").should("eq", 403);
  });

  it("el administrador crea un docente con cursos y ese docente puede entrar", () => {
    cy.iniciarSesion("admin");
    cy.visit("index.html");
    cy.get("#usr-nombre").type("Profesora Nueva");
    cy.get("#usr-correo").type("profe@siga.edu.co");
    cy.get("#usr-password").type("Profe1234");
    cy.get("#usr-rol").select("teacher");
    cy.get('#usr-cursos input[value="ING301"]').check();
    cy.get("#btn-crear-usuario").click();
    cy.get("#usr-resultado").should("contain", "creado como Docente");
    cy.get("#user-directory").should("contain", "profe@siga.edu.co");

    cy.request("POST", "/api/auth/login", { correo: "profe@siga.edu.co", password: "Profe1234" });
    cy.visit("index.html");
    cy.get("#user-role").should("have.text", "Docente");
    cy.get("#course-directory").should("contain", "ING301").and("not.contain", "ARQ701");
  });
});
