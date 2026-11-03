// Autenticación local de demostración; nunca usar estas credenciales en producción.
const SIGAAuth = (() => {
  const ACCOUNTS = Object.freeze({
    "admin@siga.edu.co": { password: "Admin123!", nombre: "Administrador SIGA", rol: "administrator" },
    "docente@siga.edu.co": {
      password: "Docente123!", nombre: "Docente SIGA", rol: "teacher",
      cursosAsignados: ["ARQ701", "BD501", "CAL601"],
    },
    "estudiante@siga.edu.co": {
      password: "Estudiante123!", nombre: "Estudiante SIGA", rol: "student", estudianteId: "E001",
    },
  });
  const SESSION_KEY = "siga.demo.user";

  function login(correo, password, recordar) {
    const account = ACCOUNTS[correo.trim().toLowerCase()];
    if (!account || account.password !== password) return null;
    const user = {
      correo: correo.trim().toLowerCase(),
      nombre: account.nombre,
      rol: account.rol,
      estudianteId: account.estudianteId,
      cursosAsignados: account.cursosAsignados,
    };
    const storage = recordar ? localStorage : sessionStorage;
    const otherStorage = recordar ? sessionStorage : localStorage;
    otherStorage.removeItem(SESSION_KEY);
    storage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  function getCurrentUser() {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return { nombre: "Administrador", correo: "", rol: "administrator", legacy: true };
    try {
      const user = JSON.parse(raw);
      if (!user || !SIGAPermissions[user.rol]) throw new Error("Perfil de sesión inválido");
      return user;
    } catch (error) {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
      throw error;
    }
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  return Object.freeze({ login, getCurrentUser, logout });
})();
