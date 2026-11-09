// Datos de ejemplo. Al arrancar se insertan SOLO si no existen: nunca se borra
// ni se modifica lo que ya hay en la base de datos.
const { hashPassword } = require("./auth");

const estudiantes = [
  { id: "E001", nombre: "Laura Gómez", email: "laura@uni.edu.co", telefono: "3001234567", estrato: 2, beca: 0 },
  { id: "E002", nombre: "Andrés Ruiz", email: "andres@uni.edu.co", telefono: "", estrato: 5, beca: 50 },
  { id: "E003", nombre: "Sofía Díaz", email: "sofia@uni.edu.co", telefono: "3109876543", estrato: 6, beca: 0 },
];

const cursos = [
  { id: "ARQ701", nombre: "Arquitectura de Software", creditos: 4, cupo: 30, esquema: "PONDERADO",
    horario: [{ dia: "Lunes", inicio: 8, fin: 10 }, { dia: "Miércoles", inicio: 8, fin: 10 }] },
  { id: "BD501", nombre: "Bases de Datos", creditos: 3, cupo: 30, esquema: "PONDERADO",
    horario: [{ dia: "Martes", inicio: 10, fin: 12 }] },
  { id: "CAL601", nombre: "Calidad de Software", creditos: 3, cupo: 30, esquema: "DESCARTA_PEOR_NOTA",
    horario: [{ dia: "Jueves", inicio: 14, fin: 16 }] },
  { id: "ING301", nombre: "Inglés III", creditos: 2, cupo: 30, esquema: "PROMEDIO_SIMPLE",
    horario: [{ dia: "Lunes", inicio: 9, fin: 11 }] },
  { id: "ELE101", nombre: "Electiva (1 cupo)", creditos: 2, cupo: 1, esquema: "PROMEDIO_SIMPLE",
    horario: [{ dia: "Viernes", inicio: 7, fin: 9 }] },
  { id: "PRA901", nombre: "Práctica profesional", creditos: 18, cupo: 30, esquema: "PROMEDIO_SIMPLE",
    horario: [{ dia: "Sábado", inicio: 7, fin: 12 }] },
].map((curso) => ({ ...curso, inscritos: 0 }));

// Cuentas de demostración. Cambia estas contraseñas antes de publicar el sistema.
const usuariosDemo = [
  { correo: "admin@siga.edu.co", password: "Admin123!", nombre: "Administrador SIGA", rol: "administrator" },
  { correo: "docente@siga.edu.co", password: "Docente123!", nombre: "Docente SIGA", rol: "teacher",
    cursosAsignados: ["ARQ701", "BD501", "CAL601"] },
  { correo: "estudiante@siga.edu.co", password: "Estudiante123!", nombre: "Laura Gómez", rol: "student",
    estudianteId: "E001" },
];

async function asegurarDatosIniciales(repos) {
  await repos.insertarSiFalta("estudiantes", estudiantes);
  await repos.insertarSiFalta("cursos", cursos);
  for (const { password, ...usuario } of usuariosDemo) {
    if (await repos.usuarios.buscarPorCorreo(usuario.correo)) continue;
    await repos.usuarios.crear({ ...usuario, passwordHash: await hashPassword(password), creadoEn: new Date().toISOString() });
  }
}

module.exports = { estudiantes, cursos, usuariosDemo, asegurarDatosIniciales };
