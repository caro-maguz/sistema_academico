// Permisos de presentación para el prototipo local. El backend debe revalidarlos.
const SIGAPermissions = Object.freeze({
  administrator: ["dashboard", "users", "students", "courses", "enroll", "payments", "grades", "reports", "notifications", "config"],
  teacher: ["dashboard", "students", "courses", "grades", "notifications", "profile"],
  student: ["dashboard", "enroll", "courses", "payments", "grades", "reports", "notifications", "profile", "schedule"],
});

function tienePermiso(rol, permiso) {
  return Boolean(SIGAPermissions[rol] && SIGAPermissions[rol].includes(permiso));
}
