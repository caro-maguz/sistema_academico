// =====================================================================
// PATRÓN REPOSITORY — versión MongoDB.
// Misma interfaz que la versión en memoria: el resto del sistema no sabe
// dónde se guardan los datos.
// Colecciones: estudiantes, cursos, matriculas, calificaciones,
// notasFinales, notificaciones, pagos y usuarios.
// =====================================================================
const { MongoClient } = require("mongodb");

// Nunca devolvemos el _id interno ni contraseñas guardadas por error en texto plano.
const OCULTAR = { projection: { _id: 0, password: 0 } };

const esDuplicado = (error) => error && error.code === 11000;

class RepositorioMongo {
  constructor(coleccion) { this.col = coleccion; }

  async guardar(objeto) {
    const doc = { ...objeto };
    delete doc._id;
    await this.col.replaceOne({ id: doc.id }, doc, { upsert: true });
    return doc;
  }

  buscarPorId(id) { return this.col.findOne({ id }, OCULTAR); }
  listar() { return this.col.find({}, OCULTAR).sort({ id: 1 }).toArray(); }
}

class EstudianteRepositoryMongo extends RepositorioMongo {
  async crear(estudiante) {
    try {
      await this.col.insertOne({ ...estudiante });
      return true;
    } catch (error) {
      if (esDuplicado(error)) return false;
      throw error;
    }
  }
}

class CursoRepositoryMongo extends RepositorioMongo {
  // Operación atómica: solo suma si todavía hay cupo.
  async apartarCupo(id) {
    const resultado = await this.col.updateOne(
      { id, $expr: { $lt: [{ $ifNull: ["$inscritos", 0] }, "$cupo"] } },
      { $inc: { inscritos: 1 } },
    );
    return resultado.modifiedCount === 1;
  }

  async liberarCupo(id) {
    await this.col.updateOne({ id, inscritos: { $gt: 0 } }, { $inc: { inscritos: -1 } });
  }
}

class MatriculaRepositoryMongo extends RepositorioMongo {
  buscarActiva(estudianteId, periodo) { return this.col.findOne({ estudianteId, periodo }, OCULTAR); }
  listarPorEstudiante(estudianteId) { return this.col.find({ estudianteId }, OCULTAR).toArray(); }
}

class CalificacionRepositoryMongo {
  constructor(notas, definitivas) {
    this.notas = notas;
    this.definitivas = definitivas;
  }

  async agregar(estudianteId, cursoId, { componente, porcentaje, valor }) {
    await this.notas.insertOne({ estudianteId, cursoId, componente, porcentaje, valor, fecha: new Date().toISOString() });
  }

  listar(estudianteId, cursoId) {
    return this.notas.find({ estudianteId, cursoId }, { projection: { _id: 0, componente: 1, porcentaje: 1, valor: 1 } })
      .toArray();
  }

  async guardarNotaFinal({ estudianteId, cursoId, nota, aprobado }) {
    await this.definitivas.replaceOne(
      { estudianteId, cursoId },
      { estudianteId, cursoId, nota, aprobado, fecha: new Date().toISOString() },
      { upsert: true },
    );
  }

  notasFinalesDe(estudianteId) { return this.definitivas.find({ estudianteId }, OCULTAR).toArray(); }
  listarNotasFinales() { return this.definitivas.find({}, OCULTAR).toArray(); }
}

class BitacoraMongo {
  constructor(coleccion) { this.col = coleccion; }
  async agregar(registro) { await this.col.insertOne({ ...registro, fecha: new Date().toISOString() }); }
  listar(filtro = {}) { return this.col.find(filtro, OCULTAR).sort({ fecha: -1 }).limit(200).toArray(); }
}

class UsuarioRepositoryMongo {
  constructor(coleccion) { this.col = coleccion; }

  // Aquí sí necesitamos el hash de la contraseña para validar el inicio de sesión.
  buscarPorCorreo(correo) { return this.col.findOne({ correo }, { projection: { _id: 0 } }); }

  async crear(usuario) {
    try {
      await this.col.insertOne({ ...usuario });
      return true;
    } catch (error) {
      if (esDuplicado(error)) return false;
      throw error;
    }
  }

  actualizar(correo, cambios) {
    return this.col.findOneAndUpdate({ correo }, { $set: cambios }, { returnDocument: "after", projection: { _id: 0 } });
  }

  listar() { return this.col.find({}, { projection: { _id: 0, passwordHash: 0 } }).sort({ rol: 1, correo: 1 }).toArray(); }
}

async function crearIndice(coleccion, campos, opciones = {}) {
  try {
    await coleccion.createIndex(campos, opciones);
  } catch (error) {
    // Si ya existe un índice parecido creado por otra persona, seguimos con ese.
    console.warn(`Aviso: no se creó el índice ${JSON.stringify(campos)} en ${coleccion.collectionName}: ${error.message}`);
  }
}

async function crearRepositoriosMongo(uri, nombreBase) {
  const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  await cliente.connect();
  const db = cliente.db(nombreBase);

  await Promise.all([
    crearIndice(db.collection("estudiantes"), { id: 1 }, { unique: true }),
    crearIndice(db.collection("cursos"), { id: 1 }, { unique: true }),
    crearIndice(db.collection("matriculas"), { estudianteId: 1, periodo: 1 }),
    crearIndice(db.collection("calificaciones"), { estudianteId: 1, cursoId: 1 }),
    crearIndice(db.collection("notasFinales"), { estudianteId: 1, cursoId: 1 }, { unique: true }),
    crearIndice(db.collection("usuarios"), { correo: 1 }, { unique: true }),
    crearIndice(db.collection("notificaciones"), { estudianteId: 1, fecha: -1 }),
    crearIndice(db.collection("pagos"), { estudianteId: 1, fecha: -1 }),
  ]);

  const repos = {
    tipo: "mongodb",
    estudiantes: new EstudianteRepositoryMongo(db.collection("estudiantes")),
    cursos: new CursoRepositoryMongo(db.collection("cursos")),
    matriculas: new MatriculaRepositoryMongo(db.collection("matriculas")),
    calificaciones: new CalificacionRepositoryMongo(db.collection("calificaciones"), db.collection("notasFinales")),
    notificaciones: new BitacoraMongo(db.collection("notificaciones")),
    pagos: new BitacoraMongo(db.collection("pagos")),
    usuarios: new UsuarioRepositoryMongo(db.collection("usuarios")),
    // Inserta documentos de ejemplo solo si no existen (nunca borra ni modifica datos).
    async insertarSiFalta(nombre, documentos) {
      const coleccion = db.collection(nombre);
      for (const doc of documentos) {
        await coleccion.updateOne({ id: doc.id }, { $setOnInsert: doc }, { upsert: true });
      }
    },
    cerrar: () => cliente.close(),
  };
  return repos;
}

module.exports = { crearRepositoriosMongo };
