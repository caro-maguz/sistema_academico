document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const errorAlert = document.getElementById("register-error");
  const successAlert = document.getElementById("register-success");
  const estudianteRepo = typeof EstudianteRepository !== "undefined" ? new EstudianteRepository() : null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorAlert.hidden = true;
    successAlert.hidden = true;

    const id = document.getElementById("reg-id").value.trim();
    const nombre = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const telefono = document.getElementById("reg-phone").value.trim();
    const password = document.getElementById("reg-password").value.trim();

    if (!id || !nombre || !email || !password) {
      errorAlert.textContent = "Por favor completa los campos obligatorios (ID, Nombre, Correo y Contraseña).";
      errorAlert.hidden = false;
      return;
    }

    try {
      const nuevoEstudiante = {
        id,
        nombre,
        email,
        telefono,
        password, // <--- Contraseña incluida para la persistencia
        estrato: 3,
        beca: 0,
        rol: "student" // Rol asignado explícitamente para el control de acceso
      };

      if (estudianteRepo) {
        await estudianteRepo.guardar(nuevoEstudiante);
      } else {
        const respuesta = await fetch(`/api/estudiantes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoEstudiante)
        });
        if (!respuesta.ok) throw new Error("Error al guardar en el servidor.");
      }

      successAlert.hidden = false;
      form.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

    } catch (err) {
      console.error("Error en el registro:", err);
      errorAlert.textContent = err.message || "Error al registrar el estudiante en la base de datos.";
      errorAlert.hidden = false;
    }
  });
});