if (new URLSearchParams(window.location.search).has("logout")) SIGAAuth.logout();

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  
  const emailInput = document.getElementById("login-email").value.trim().toLowerCase();
  const passwordInput = document.getElementById("login-password").value.trim();
  const remember = document.getElementById("remember-session").checked;

  // 1. Validar primero si es una cuenta de DEMO (Admin o Docente)
  let user = SIGAAuth.login(emailInput, passwordInput, remember);

  if (user) {
    if (emailInput.includes("admin")) {
      localStorage.setItem("usuario_siga", JSON.stringify({
        id: "A001",
        nombre: "Administrador",
        email: emailInput,
        rol: "administrator"
      }));
    } else if (emailInput.includes("docente")) {
      localStorage.setItem("usuario_siga", JSON.stringify({
        id: "D001",
        nombre: "Docente Titular",
        email: emailInput,
        rol: "teacher"
      }));
    }
    window.location.assign("index.html");
    return;
  }

  // 2. Si no es cuenta demo, buscar estrictamente en la base de datos de estudiantes de MongoDB
  try {
    const response = await fetch("/api/estudiantes");
    if (response.ok) {
      const estudiantes = await response.json();
      
      // Busca el estudiante que coincida exactamente con el correo Y la contraseña
      const estudianteEncontrado = estudiantes.find(est => 
        est.email && est.email.toLowerCase() === emailInput && est.password === passwordInput
      );

      if (estudianteEncontrado) {
        localStorage.setItem("usuario_siga", JSON.stringify({
          id: estudianteEncontrado.id,
          nombre: estudianteEncontrado.nombre,
          email: estudianteEncontrado.email,
          rol: "student"
        }));
        window.location.assign("index.html");
        return;
      }
    }
  } catch (err) {
    console.error("Error al validar con la base de datos:", err);
  }

  // Si no coincide con ninguna credencial válida
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