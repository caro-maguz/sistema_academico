if (new URLSearchParams(window.location.search).has("logout")) SIGAAuth.logout();

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const emailInput = document.getElementById("login-email").value.trim().toLowerCase();
  const passwordInput = document.getElementById("login-password").value.trim();
  const remember = document.getElementById("remember-session").checked;

  // 1. Intentar primero con el sistema de autenticación de demostración existente (SIGAAuth)
  let user = SIGAAuth.login(emailInput, passwordInput, remember);

  if (user) {
    // Redirección dinámica basada en el rol de la cuenta demo
    if (emailInput.includes("admin")) {
      window.location.assign("index.html#dashboard");
    } else if (emailInput.includes("docente")) {
      window.location.assign("index.html#docentes");
    } else {
      window.location.assign("index.html#estudiantes");
    }
    return;
  }

  // 2. Si no es cuenta demo, verificar si es un estudiante registrado en la Base de Datos (MongoDB)
  try {
    const response = await fetch("/api/estudiantes");
    if (response.ok) {
      const estudiantes = await response.json();
      const estudianteEncontrado = estudiantes.find(est => est.email && est.email.toLowerCase() === emailInput);

      if (estudianteEncontrado) {
        // Simulamos la sesión del estudiante registrado y lo enviamos a su sección
        localStorage.setItem("usuario_siga", JSON.stringify({
          id: estudianteEncontrado.id,
          nombre: estudianteEncontrado.nombre,
          email: estudianteEncontrado.email,
          rol: "estudiante"
        }));
        window.location.assign("index.html#estudiantes");
        return;
      }
    }
  } catch (err) {
    console.error("Error al validar con la base de datos:", err);
  }

  // Si no coincide con nada, mostrar error de credenciales incorrectas
  loginError.hidden = false;
  document.getElementById("login-password").setAttribute("aria-invalid", "true");
});

document.getElementById("toggle-password").addEventListener("click", (event) => {
  const password = document.getElementById("login-password");
  const button = event.currentTarget;
  const visible = password.type === "password";
  password.type = visible ? "text" : "password";
  button.setAttribute("aria-label", visible ? "Ocultar contraseña" : "Mostrar contraseña");
  button.innerHTML = `<i class="bi bi-eye${visible ? "-slash" : ""}"></i>`;
});

loginForm.addEventListener("input", () => {
  loginError.hidden = true;
  document.getElementById("login-password").removeAttribute("aria-invalid");
});