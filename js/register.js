document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const errorAlert = document.getElementById("register-error");
  const successAlert = document.getElementById("register-success");
  
  // Verificamos si existe el repositorio para evitar errores de referencia
  const estudianteRepo = typeof EstudianteRepository !== "undefined" ? new EstudianteRepository() : null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorAlert.hidden = true;
    successAlert.hidden = true;

    const id = document.getElementById("reg-id").value.trim();
    const nombre = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const telefono = document.getElementById("reg-phone").value.trim();

    if (!id || !nombre || !email) {
      errorAlert.textContent = "Por favor completa los campos obligatorios (ID, Nombre y Correo).";
      errorAlert.hidden = false;
      return;
    }

    try {
      const nuevoEstudiante = {
        id,
        nombre,
        email,
        telefono,
        estrato: 3,
        beca: 0,
        rol: "estudiante" // Aseguramos que se cree con rol de estudiante
      };

      if (estudianteRepo) {
        await estudianteRepo.guardar(nuevoEstudiante);
      } else {
        // Fallback por si el repositorio no está cargado, usando fetch directo
        const respuesta = await fetch(`/api/estudiantes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nuevoEstudiante)
        });
        if (!respuesta.ok) throw new Error("Error al guardar en el servidor.");
      }

      successAlert.hidden = false;
      form.reset();

      // Redirigir al login después de 1.5 segundos para que alcance a leer el mensaje de éxito
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