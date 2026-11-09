const registerForm = document.getElementById("register-form");
const registerError = document.getElementById("register-error");
const registerSubmit = registerForm.querySelector("button[type=submit]");
const valor = (id) => document.getElementById(id).value;

function mostrarError(mensaje) {
  registerError.textContent = mensaje;
  registerError.hidden = false;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  registerError.hidden = true;

  const password = valor("reg-password");
  if (valor("reg-nombre").trim().length < 3) return mostrarError("Escribe tu nombre completo.");
  if (!document.getElementById("reg-correo").checkValidity() || !valor("reg-correo")) return mostrarError("Escribe un correo válido.");
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return mostrarError("La contraseña debe tener al menos 8 caracteres, con letras y números.");
  }
  if (password !== valor("reg-confirmar")) return mostrarError("Las contraseñas no coinciden.");

  registerSubmit.disabled = true;
  try {
    await SIGAAuth.registrar({
      nombre: valor("reg-nombre"),
      correo: valor("reg-correo"),
      telefono: valor("reg-telefono"),
      estrato: Number(valor("reg-estrato")),
      password,
    });
    window.location.assign("index.html");
  } catch (error) {
    mostrarError(error.message);
  } finally {
    registerSubmit.disabled = false;
  }
});
