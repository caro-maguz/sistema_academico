document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("register-form");
  const errorAlert = document.getElementById("register-error");
  const successAlert = document.getElementById("register-success");
  const estudianteRepo = new EstudianteRepository();

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
        beca: 0
      };

      await estudianteRepo.guardar(nuevoEstudiante);
      successAlert.hidden = false;
      form.reset();

      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    } catch (err) {
      errorAlert.textContent = err.message || "Error al registrar el estudiante en la base de datos.";
      errorAlert.hidden = false;
    }
  });
});