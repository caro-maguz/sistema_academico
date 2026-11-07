require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const RAIZ = path.join(__dirname, "..");
const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);
let db;
const SIN_ID = { projection: { _id: 0 } }; // no mandamos el _id interno de Mongo

// Solo acepta los campos permitidos, y solo como texto
function filtroDesde(query, permitidos) {
  const filtro = {};
  for (const k of permitidos) {
    if (typeof query[k] === "string") filtro[k] = query[k];
  }
  return filtro;
}

// ---------- Página (solo los archivos públicos, NO el .env ni el servidor)
const paginaPrincipal = (req, res) => res.sendFile(path.join(RAIZ, "index.html"));
app.get("/", paginaPrincipal);
app.get("/index.html", paginaPrincipal);
app.get("/estilos.css", (req, res) => res.sendFile(path.join(RAIZ, "estilos.css")));
app.use("/js", express.static(path.join(RAIZ, "js")));

// ---------- Cupos de los cursos (operaciones atómicas: no se puede pasar del cupo)
app.post("/api/cursos/:id/apartar-cupo", async (req, res) => {
  const curso = await db.collection("cursos").findOneAndUpdate(
    { id: req.params.id, $expr: { $lt: ["$inscritos", "$cupo"] } },
    { $inc: { inscritos: 1 } },
    { returnDocument: "after", ...SIN_ID }
  );
  if (!curso) return res.status(409).json({ error: "El curso " + req.params.id + " no tiene cupos disponibles" });
  res.json(curso);
});

app.post("/api/cursos/:id/liberar-cupo", async (req, res) => {
  await db.collection("cursos").updateOne(
    { id: req.params.id, inscritos: { $gt: 0 } },
    { $inc: { inscritos: -1 } }
  );
  res.json({ ok: true });
});

// ---------- Estudiantes, cursos y matrículas (todos tienen "id")
for (const nombre of ["estudiantes", "cursos", "matriculas"]) {
  app.get(`/api/${nombre}`, async (req, res) => {
    const filtro = filtroDesde(req.query, ["estudianteId", "periodo"]);
    res.json(await db.collection(nombre).find(filtro, SIN_ID).toArray());
  });

  app.get(`/api/${nombre}/:id`, async (req, res) => {
    const doc = await db.collection(nombre).findOne({ id: req.params.id }, SIN_ID);
    if (!doc) return res.status(404).json({ error: "No encontrado" });
    res.json(doc);
  });

  // Crea o actualiza (equivale a "guardar" del Repository)
  app.put(`/api/${nombre}/:id`, async (req, res) => {
    const doc = { ...req.body, id: req.params.id };
    delete doc._id;
    await db.collection(nombre).replaceOne({ id: req.params.id }, doc, { upsert: true });
    res.json(doc);
  });
}

// ---------- Calificaciones (notas parciales)
app.get("/api/calificaciones", async (req, res) => {
  const filtro = filtroDesde(req.query, ["estudianteId", "cursoId"]);
  res.json(await db.collection("calificaciones").find(filtro, SIN_ID).toArray());
});

app.post("/api/calificaciones", async (req, res) => {
  const { estudianteId, cursoId, componente, porcentaje, valor } = req.body;
  await db.collection("calificaciones").insertOne({ estudianteId, cursoId, componente, porcentaje, valor });
  res.status(201).json({ estudianteId, cursoId, componente, porcentaje, valor });
});

// ---------- Notas finales
app.get("/api/notasFinales", async (req, res) => {
  const filtro = filtroDesde(req.query, ["estudianteId", "cursoId"]);
  res.json(await db.collection("notasFinales").find(filtro, SIN_ID).toArray());
});

app.put("/api/notasFinales", async (req, res) => {
  const { estudianteId, cursoId, nota, aprobado } = req.body;
  await db.collection("notasFinales").replaceOne(
    { estudianteId, cursoId },
    { estudianteId, cursoId, nota, aprobado },
    { upsert: true }
  );
  res.json({ estudianteId, cursoId, nota, aprobado });
});

// ---------- Errores
app.use((err, req, res, next) => {
  console.error("❌", err.message);
  res.status(500).json({ error: err.message });
});

// ---------- Arranque
async function iniciar() {
  await client.connect();
  db = client.db(process.env.DB_NAME);
  const puerto = process.env.PORT || 3000;
  app.listen(puerto, () => console.log("✅ SIGA corriendo en http://localhost:" + puerto));
}

iniciar().catch((e) => {
  console.error("❌ No se pudo iniciar:", e.message);
  process.exit(1);
});
