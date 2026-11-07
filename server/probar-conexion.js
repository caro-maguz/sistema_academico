require("dotenv").config();
const { MongoClient } = require("mongodb");

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    await client.db(process.env.DB_NAME).command({ ping: 1 });
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (e) {
    console.error("❌ Error de conexión:", e.message);
  } finally {
    await client.close();
  }
}

main();