// Autenticación: contraseñas cifradas con scrypt y sesión con JWT en una cookie httpOnly
// (el JavaScript del navegador no puede leerla).
const crypto = require("node:crypto");
const { promisify } = require("node:util");
const jwt = require("jsonwebtoken");

const scrypt = promisify(crypto.scrypt);
const COOKIE = "siga_sesion";
const SIETE_DIAS = 7 * 24 * 60 * 60;

async function hashPassword(password) {
  const sal = crypto.randomBytes(16);
  const hash = await scrypt(password, sal, 64);
  return `scrypt$${sal.toString("hex")}$${hash.toString("hex")}`;
}

// Hash de relleno: si el correo no existe igual se hace el cálculo, para no revelar
// por el tiempo de respuesta qué correos están registrados.
const HASH_RELLENO = "scrypt$" + "00".repeat(16) + "$" + "00".repeat(64);

async function verificarPassword(password, guardado) {
  const [algoritmo, salHex, hashHex] = String(guardado || HASH_RELLENO).split("$");
  if (algoritmo !== "scrypt" || !salHex || !hashHex) return false;
  const calculado = await scrypt(String(password), Buffer.from(salHex, "hex"), 64);
  const esperado = Buffer.from(hashHex, "hex");
  return esperado.length === calculado.length && crypto.timingSafeEqual(calculado, esperado) && Boolean(guardado);
}

function leerCookie(req, nombre) {
  const encabezado = req.headers.cookie || "";
  for (const parte of encabezado.split(";")) {
    const [clave, ...resto] = parte.trim().split("=");
    if (clave === nombre) return decodeURIComponent(resto.join("="));
  }
  return null;
}

function crearGestorSesiones({ secreto, expira = "8h", produccion = false }) {
  function iniciar(res, correo, recordar) {
    const token = jwt.sign({ sub: correo }, secreto, { expiresIn: recordar ? SIETE_DIAS : expira });
    const partes = [`${COOKIE}=${encodeURIComponent(token)}`, "Path=/", "HttpOnly", "SameSite=Strict"];
    if (recordar) partes.push(`Max-Age=${SIETE_DIAS}`);
    if (produccion) partes.push("Secure");
    res.setHeader("Set-Cookie", partes.join("; "));
  }

  function cerrar(res) {
    res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`);
  }

  function correoDeLaSesion(req) {
    const token = leerCookie(req, COOKIE);
    if (!token) return null;
    try {
      return jwt.verify(token, secreto).sub;
    } catch {
      return null;
    }
  }

  return { iniciar, cerrar, correoDeLaSesion };
}

// Límite simple de intentos fallidos de inicio de sesión (por IP y correo).
function crearLimitador({ maximo = 10, ventanaMs = 15 * 60 * 1000 } = {}) {
  const intentos = new Map();
  return {
    bloqueado(clave) {
      const registro = intentos.get(clave);
      if (!registro || Date.now() - registro.desde > ventanaMs) return false;
      return registro.cantidad >= maximo;
    },
    fallo(clave) {
      const registro = intentos.get(clave);
      if (!registro || Date.now() - registro.desde > ventanaMs) intentos.set(clave, { cantidad: 1, desde: Date.now() });
      else registro.cantidad++;
    },
    exito(clave) { intentos.delete(clave); },
  };
}

module.exports = { hashPassword, verificarPassword, crearGestorSesiones, crearLimitador };
