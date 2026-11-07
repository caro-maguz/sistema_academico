// Datos de ejemplo y función para dejar la base de datos en su estado inicial.
// La usan: server/seed.js (a mano) y Cypress (antes de cada prueba).

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
].map((c) => ({ ...c, inscritos: 0 }));

async function reiniciar(db) {
  // Borra todo y vuelve a cargar (se puede repetir las veces que quieras)
  for (const nombre of ["estudiantes", "cursos", "matriculas", "calificaciones", "notasFinales"]) {
    await db.collection(nombre).deleteMany({});
  }

  await db.collection("estudiantes").insertMany(estudiantes.map((e) => ({ ...e })));
  await db.collection("cursos").insertMany(cursos.map((c) => ({ ...c })));

  // Índices: que el "id" no se repita y que las búsquedas sean rápidas
  await db.collection("estudiantes").createIndex({ id: 1 }, { unique: true });
  await db.collection("cursos").createIndex({ id: 1 }, { unique: true });
  await db.collection("matriculas").createIndex({ estudianteId: 1, periodo: 1 });
  await db.collection("calificaciones").createIndex({ estudianteId: 1, cursoId: 1 });
  await db.collection("notasFinales").createIndex({ estudianteId: 1, cursoId: 1 }, { unique: true });

  return { estudiantes: estudiantes.length, cursos: cursos.length };
}

module.exports = { estudiantes, cursos, reiniciar };
