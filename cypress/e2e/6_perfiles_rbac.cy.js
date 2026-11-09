describe("Vistas por perfil (RBAC)", () => {
  function iniciarSesion(correo, contraseña) {
    cy.visit("login.html");
    cy.get("#login-email").type(correo);
    cy.get("#login-password").type(contraseña);
    cy.get("#login-form").submit();
    cy.url().should("include", "index.html");
  }

  it("limita las calificaciones e historial del estudiante a su propio registro", () => {
    iniciarSesion("estudiante@siga.edu.co", "Estudiante123!");

    cy.get("#calificaciones")
      .should("be.visible")
      .and("contain", "Mis calificaciones")
      .and("not.contain", "Registra notas y publica resultados finales");
    cy.get("[data-grade-management]").should("not.be.visible");
    cy.get("#grades-quick-title").should("have.text", "Mis calificaciones");
    cy.get("#grades-quick-description").should("have.text", "Consulta tus notas");
    cy.get("#grades-quick-icon").should("have.class", "bi-eye");
    cy.get("#cal-student-name").should("be.visible").and("contain", "E001 - Laura Gómez");
    cy.get("#rep-student-name").should("be.visible").and("contain", "E001 - Laura Gómez");
    cy.get("#rep-student-field").should("not.be.visible");
    cy.get("#rep-estudiante option").should("have.length", 1).and("have.value", "E001");
    cy.get("#btn-reporte").click();
    cy.get("#rep-resultado").should("have.text", "El estudiante aún no tiene notas finales.");

    // Datos cargados directamente en el servidor de pruebas.
    cy.task("agregarCalificacion", {
      estudianteId: "E001", cursoId: "ARQ701", componente: "Parcial propio", porcentaje: 100, valor: 4.2,
    });
    cy.task("agregarCalificacion", {
      estudianteId: "E002", cursoId: "ARQ701", componente: "Parcial ajeno", porcentaje: 100, valor: 2.1,
    });
    cy.task("guardarNotaFinal", { estudianteId: "E001", cursoId: "ARQ701", nota: 4.2, aprobado: true });
    cy.task("guardarNotaFinal", { estudianteId: "E002", cursoId: "BD501", nota: 2.1, aprobado: false });

    // Aunque alguien manipule los selectores en el navegador, solo ve sus propios datos.
    cy.window().then((window) => {

      const curso = window.document.querySelector("#cal-curso");
      curso.add(new window.Option("ARQ701 - Arquitectura de Software", "ARQ701"));
      curso.value = "ARQ701";
      curso.dispatchEvent(new window.Event("change"));

      const estudiante = window.document.querySelector("#rep-estudiante");
      estudiante.add(new window.Option("E002 - Andrés Ruiz", "E002"));
      estudiante.value = "E002";
    });

    cy.get("#cal-lista").should("contain", "Parcial propio").and("not.contain", "Parcial ajeno");
    cy.get("#btn-reporte").click();
    cy.get("#rep-resultado").should("contain", "Arquitectura de Software").and("not.contain", "Bases de Datos");

    // El servidor rechaza pedir datos de otro estudiante directamente.
    cy.request({ url: "/api/notas-finales?estudianteId=E002", failOnStatusCode: false })
      .its("status").should("eq", 403);
  });

  it("mantiene para Docente solo el catálogo de sus cursos asignados y la gestión de notas", () => {
    iniciarSesion("docente@siga.edu.co", "Docente123!");

    cy.get("#course-directory-title").should("have.text", "Mis cursos asignados");
    cy.get("#course-directory")
      .should("contain", "ARQ701")
      .and("contain", "BD501")
      .and("contain", "CAL601")
      .and("not.contain", "ING301")
      .and("not.contain", "ELE101");
    cy.get("#calificaciones .grade-entry").should("be.visible");
    cy.get("#calificaciones .button-row").should("be.visible");
  });

  it("usa otro mensaje al consultar un estudiante sin notas desde Administración", () => {
    iniciarSesion("admin@siga.edu.co", "Admin123!");

    cy.get("#rep-estudiante").select("E002");
    cy.get("#btn-reporte").click();
    cy.get("#rep-resultado")
      .should("have.text", "No hay notas finales para el estudiante consultado.")
      .and("not.contain", "El estudiante aún no tiene notas finales.");
  });
});
