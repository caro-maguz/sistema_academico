if (new URLSearchParams(window.location.search).has("logout")) SIGAAuth.logout();

const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const user = SIGAAuth.login(
    document.getElementById("login-email").value,
    document.getElementById("login-password").value,
    document.getElementById("remember-session").checked,
  );
  if (!user) {
    loginError.hidden = false;
    document.getElementById("login-password").setAttribute("aria-invalid", "true");
    return;
  }
  window.location.assign("index.html");
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
