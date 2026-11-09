const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const loginSubmit = loginForm.querySelector("button[type=submit]");

// Si ya hay sesión, va directo al panel; si viene de "Cerrar sesión", la cierra.
(async () => {
  if (new URLSearchParams(window.location.search).has("logout")) {
    await SIGAAuth.logout();
    window.history.replaceState(null, "", "login.html");
  } else if (await SIGAAuth.sesionActual().catch(() => null)) {
    window.location.replace("index.html");
  }
})();

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginSubmit.disabled = true;
  try {
    await SIGAAuth.login(
      document.getElementById("login-email").value,
      document.getElementById("login-password").value,
      document.getElementById("remember-session").checked,
    );
    window.location.assign("index.html");
  } catch (error) {
    loginError.textContent = error.estado === 401 ? "Correo o contraseña incorrectos." : error.message;
    loginError.hidden = false;
    document.getElementById("login-password").setAttribute("aria-invalid", "true");
  } finally {
    loginSubmit.disabled = false;
  }
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
