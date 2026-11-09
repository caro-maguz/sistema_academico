# SIGA — Sistema Integrado de Gestión Académica

SIGA es un sistema académico de gestión universitaria. El frontend (HTML + Bootstrap) habla con una API en Node.js/Express que guarda los datos en MongoDB Atlas, valida usuarios y aplica los permisos de cada rol en el servidor.

## Inicio rápido

Requiere Node.js 20.12 o superior.

1. Copia `.env.example` como `.env` y completa `MONGODB_URI`, `DB_NAME` y `JWT_SECRET` (pídelos al equipo; **nunca** subas `.env` a GitHub).
2. Instala y arranca:

```bash
npm install
npm start
```

3. Abre `http://localhost:<PORT>` (por defecto 3000; el `.env` del equipo usa 4000).

Sin `MONGODB_URI`, o con `npm run start:memoria`, el servidor usa datos en memoria (se pierden al reiniciar). Útil para probar sin tocar la base compartida.

Al arrancar se crean, **solo si no existen**, los cursos y estudiantes de ejemplo y estas cuentas de demostración (cambia sus contraseñas antes de publicar):

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@siga.edu.co` | `Admin123!` |
| Docente | `docente@siga.edu.co` | `Docente123!` |
| Estudiante | `estudiante@siga.edu.co` | `Estudiante123!` |

## Registro, inicio de sesión y roles

- **Registro** (`register.html`): cualquiera puede crear una cuenta de **estudiante**; se crea su registro académico (`E004`, `E005`…) y queda con sesión iniciada.
- **Docentes y administradores** los crea un administrador en la sección *Usuarios y roles*, donde también se cambia el rol, se asignan cursos a docentes y se activan o desactivan cuentas.
- Las contraseñas se guardan cifradas (scrypt) en la colección `usuarios`. La sesión es un JWT en una cookie `httpOnly`.
- Cada ruta de la API valida el rol en el servidor (`js/permissions.js` es la única lista de permisos, compartida por el navegador y el servidor):
  - **Estudiante**: solo ve y matricula sus propios datos; no registra notas.
  - **Docente**: registra y publica notas solo de sus cursos asignados.
  - **Administrador**: todo, incluida la gestión de usuarios.

## Pruebas Cypress

```bash
npm test          # o: npx cypress open
```

Cypress arranca solo un servidor **en memoria** (puerto 4321) y lo reinicia antes de cada prueba: las pruebas nunca tocan MongoDB.

## Interfaz

- Diseño responsive con Bootstrap 5, Bootstrap Icons y Chart.js (recursos CDN).
- Navegación por perfil: el Estudiante ve sus propias notas e historial; el Docente consulta sus cursos asignados y gestiona calificaciones; Administración conserva la gestión general.
- Panel de indicadores, matrícula con búsqueda/resumen de créditos y costo, historial de pagos simulado, calificaciones y reporte.
- Los validadores y cálculos de matrícula, pagos y notas permanecen en sus servicios originales.

## Patrones de diseño

| Patrón | Archivo |
|---|---|
| Strategy | `js/pagos.js` (descuentos) y `js/calificaciones.js` (nota final) |
| Observer | `js/eventos.js` (bus), `js/notificaciones.js` (suscriptores) |
| Adapter | `js/pagos.js` (pasarelas PSE y tarjeta) |
| Facade | `js/matricula.js` (`MatriculaFacade`) |
| Repository | `backend/repositorios/mongo.js` y `backend/repositorios/memoria.js` |
| Singleton | `js/config.js` (`ConfiguracionAcademica`) |

`backend/sistema.js` conecta las piezas; `js/app.js` maneja la presentación.

## Estructura

| Carpeta / archivo | Qué hace |
|---|---|
| `js/` | Clases del dominio (patrones) y la interfaz. `config`, `permissions`, `eventos`, `pagos`, `calificaciones`, `notificaciones` y `matricula` se usan **también en el servidor**. |
| `js/app.js`, `js/auth.js`, `js/login.js`, `js/register.js` | Interfaz: pide datos a la API y muestra resultados. |
| `backend/server.js` | Lee `.env`, conecta MongoDB (o memoria) y arranca la API. |
| `backend/app.js` | Rutas de la API y control de acceso por rol. |
| `backend/dominio.js` | Carga en Node las clases de `js/` para no duplicar reglas de negocio. |
| `backend/sistema.js` | Arma el sistema: repositorios, pasarelas, servicios y suscriptores. |
| `backend/repositorios/` | Repository en dos versiones con la misma interfaz: `mongo.js` y `memoria.js`. |
| `backend/auth.js` | Cifrado de contraseñas, sesiones JWT y límite de intentos de inicio de sesión. |
| `backend/datos-ejemplo.js` | Datos y cuentas de demostración (se insertan solo si faltan). |

Colecciones de MongoDB: `estudiantes`, `cursos`, `matriculas`, `calificaciones`, `notasFinales`, `usuarios`, `pagos` y `notificaciones`.
