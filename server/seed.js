require("dotenv").config();
const { MongoClient } = require("mongodb");
const { reiniciar } = require("./datos-ejemplo");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const r = await reiniciar(client.db(process.env.DB_NAME));
    console.log("✅ Datos cargados:", r.estudiantes, "estudiantes y", r.cursos, "cursos");
  } catch (e) {
    console.error("❌ Error:", e.message);
  } finally {
    await client.close();
  }
}

main();
