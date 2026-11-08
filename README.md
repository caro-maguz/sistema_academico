# SIGA — Sistema Integrado de Gestión Académica

<<<<<<< HEAD
SIGA es un prototipo académico de gestión universitaria. La aplicación conserva los patrones de arquitectura y los flujos locales en JavaScript; los datos funcionales continúan en memoria y se reinician al recargar la página.

## Inicio rápido

### Servidor local

Requiere Node.js 20 o superior.

```bash
npm install
npm start
```

Abre <http://localhost:3000>. También puedes abrir `index.html` directamente, aunque el servidor local se parece más al modo de despliegue.

La página de acceso de demostración es `login.html`. Credenciales disponibles:

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@siga.edu.co` | `Admin123!` |
| Docente | `docente@siga.edu.co` | `Docente123!` |
| Estudiante | `estudiante@siga.edu.co` | `Estudiante123!` |

El panel `index.html` conserva el acceso directo usado por las pruebas existentes. Las credenciales y permisos se implementan únicamente en el navegador para mostrar los perfiles; **no son autenticación ni autorización seguras** y no deben proteger información real.

## Pruebas Cypress

```bash
npm install
npx cypress open
# o
npm test
```

Las pruebas existentes siguen entrando directamente a `index.html` y usan los mismos identificadores de formulario.

## Interfaz

- Diseño responsive con Bootstrap 5, Bootstrap Icons y Chart.js (recursos CDN).
- Navegación por perfil: el Estudiante ve sus propias notas e historial; el Docente consulta sus cursos asignados y gestiona calificaciones; Administración conserva la gestión general.
- Panel de indicadores, matrícula con búsqueda/resumen de créditos y costo, historial de pagos simulado, calificaciones y reporte.
- Los validadores y cálculos de matrícula, pagos y notas permanecen en sus servicios originales.

## Patrones de diseño
=======
Proyecto final de Arquitectura de Software. Página web en HTML + JavaScript
con **6 patrones de diseño**, un **servidor Node.js (Express)**, base de datos
en **MongoDB Atlas** y pruebas en Cypress.

> Versión original: la página funcionaba sola en el navegador, con los datos en
> memoria (se perdían al recargar). Ahora los datos se guardan en MongoDB Atlas.

## Arquitectura

```
Página (index.html + js/)  --fetch-->  Servidor Node/Express  -->  MongoDB Atlas
   pantalla y lógica                    API en /api/...             base de datos "siga"
```

El navegador nunca se conecta directo a Atlas: el servidor guarda la contraseña
(archivo `.env`) y expone una API. La lógica de negocio (patrones de diseño) no
cambió; el cambio quedó concentrado en el patrón **Repository** (`js/repositorios.js`),
que antes guardaba en memoria y ahora le pide los datos al servidor.

## Requisitos

- Node.js
- VS Code (opcional, para abrir la carpeta)
- Una cuenta de MongoDB Atlas con un clúster gratuito (M0), un usuario de base
  de datos y tu IP permitida en **Network Access**.

## Cómo abrirlo

1. En VS Code: **Archivo → Abrir carpeta…** → `sistema-academico`
   (la carpeta que contiene `index.html`).
2. Abre una terminal: **Terminal → Nueva terminal**.

## Configuración (solo la primera vez)

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` en la raíz del proyecto, junto a `package.json`
   (no se sube a GitHub):

   ```
   MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@TU_CLUSTER.mongodb.net/
   DB_NAME=siga
   ```

   Si la contraseña tiene caracteres especiales (`@ : / ? # %`), hay que
   codificarla en formato URL.

3. Crea un archivo `.gitignore` con estas líneas, para no subir la contraseña:

   ```
   .env
   node_modules
   ```

4. (Opcional) Comprueba la conexión con Atlas:

   ```bash
   node server/probar-conexion.js
   ```

   Debe mostrar: `✅ Conectado a MongoDB Atlas`.

5. Carga los datos de ejemplo (3 estudiantes y 6 cursos):

   ```bash
   node server/seed.js
   ```

   Este comando **borra todo y vuelve a cargar**, así que se puede repetir
   cuando quieras dejar la base en su estado inicial.

## Cómo usarlo

```bash
npm start
```

Debe salir `✅ SIGA corriendo en http://localhost:3000`. Abre
**http://localhost:3000** en el navegador.

> Ya no funciona abrir `index.html` con doble clic: la página necesita el
> servidor para leer y guardar los datos.

## Base de datos (MongoDB Atlas)

Base `siga` con estas colecciones:

| Colección | Contenido |
|---|---|
| `estudiantes` | id, nombre, email, teléfono, estrato, beca |
| `cursos` | id, nombre, créditos, cupo, inscritos, esquema, horario |
| `matriculas` | id, estudianteId, periodo, cursos, créditos, valor, referenciaPago |
| `calificaciones` | estudianteId, cursoId, componente, porcentaje, valor |
| `notasFinales` | estudianteId, cursoId, nota, aprobado |

`estudiantes`, `cursos` y `notasFinales` tienen índice único para que no se
repitan los registros.

## API del servidor (`server/server.js`)

| Ruta | Qué hace |
|---|---|
| `GET /api/estudiantes`, `/api/cursos`, `/api/matriculas` | Lista (las matrículas aceptan `?estudianteId=&periodo=`) |
| `GET /api/<recurso>/:id` | Busca un registro por id |
| `PUT /api/<recurso>/:id` | Crea o actualiza un registro |
| `POST /api/cursos/:id/apartar-cupo` | Aparta un cupo de forma atómica (responde 409 si no hay) |
| `POST /api/cursos/:id/liberar-cupo` | Devuelve un cupo (si el pago falla) |
| `GET /api/calificaciones` | Notas parciales (`?estudianteId=&cursoId=`) |
| `POST /api/calificaciones` | Agrega una nota parcial |
| `GET /api/notasFinales` | Notas finales (`?estudianteId=`) |
| `PUT /api/notasFinales` | Guarda la nota final de un curso |

## Cómo ejecutar las pruebas (Cypress)

Con el servidor corriendo (`npm start`), en **otra terminal** de VS Code, dentro
de la misma carpeta del proyecto:

```bash
npm install          # solo la primera vez
npx cypress open     # abre Cypress para ver las pruebas paso a paso
npx cypress run      # o las ejecuta todas sin abrir ventana
```

En `cypress open`: elige **E2E Testing** → un navegador → haz clic en cada prueba.

**Importante:** antes de cada prueba, Cypress borra y recarga los datos de
ejemplo en la base de datos (`cy.task("reiniciarBD")`). Si guardaste datos que
quieras conservar, no corras las pruebas. Al terminar, `node server/seed.js`
deja la base limpia.

## Dónde está cada patrón
>>>>>>> origin/feature/mongodb-atlas

| Patrón | Archivo |
|---|---|
| Strategy | `js/pagos.js` (descuentos) y `js/calificaciones.js` (nota final) |
<<<<<<< HEAD
| Observer | `js/eventos.js` (bus), `js/notificaciones.js` (suscriptores) |
| Adapter | `js/pagos.js` (pasarelas PSE y tarjeta) |
| Facade | `js/matricula.js` (`MatriculaFacade`) |
| Repository | `js/repositorios.js` |
| Singleton | `js/config.js` (`ConfiguracionAcademica`) |

`js/sistema.js` conecta las piezas y carga datos de ejemplo; `js/app.js` maneja la presentación.

## Estructura y preparación de backend

- `backend/server.js` sirve el frontend y expone `GET /api/health`.
- `backend/server.js` todavía **no implementa** autenticación JWT, persistencia MongoDB ni los endpoints de negocio. La autenticación de la página es solo demostrativa.
- `.env.example` enumera variables reservadas para una siguiente fase. No copies credenciales reales al repositorio.
- `render.yaml` configura el servicio Node de Render. La ruta de salud confirma el servidor web, no que exista una API de negocio.
- `package.json` incluye comandos para servir la aplicación y ejecutar Cypress.

Antes de usar SIGA con datos reales, se deben implementar y probar en el servidor las rutas `/api/auth/login`, `/api/estudiantes`, `/api/cursos`, `/api/matriculas`, `/api/pagos` y `/api/calificaciones`; además de MongoDB/Mongoose, contraseñas con hash, JWT, autorización RBAC, validación de datos, CORS y manejo de secretos. No se debe confiar en los permisos del frontend.
=======
| Observer | `js/eventos.js` (bus de eventos) y `js/notificaciones.js` (avisos) |
| Adapter | `js/pagos.js` (`PasarelaPseAdapter`, `PasarelaTarjetaAdapter`) |
| Facade | `js/matricula.js` (`MatriculaFacade`) |
| Repository | `js/repositorios.js` (pide los datos al servidor, que usa Atlas) |
| Singleton | `js/config.js` (`ConfiguracionAcademica`) |

## Estructura del proyecto

| Archivo o carpeta | Para qué sirve |
|---|---|
| `index.html`, `estilos.css` | Pantalla |
| `js/app.js` | Maneja la pantalla; las acciones se ejecutan en una cola, una tras otra |
| `js/sistema.js` | Conecta todas las piezas (repositorios, servicios, suscriptores) |
| `server/server.js` | Servidor Express: sirve la página y la API que habla con Atlas |
| `server/datos-ejemplo.js` | Datos de ejemplo y función para reiniciar la base |
| `server/seed.js` | Carga los datos de ejemplo en Atlas |
| `server/probar-conexion.js` | Prueba rápida de la conexión con Atlas |
| `cypress/`, `cypress.config.js` | Pruebas automáticas |
| `.env` | Datos de conexión a Atlas (secreto, no se sube a GitHub) |

## Cambios al conectar la base de datos

- Los repositorios ahora usan `fetch` hacia el servidor en lugar de `Map` en memoria.
- Matrícula, pagos, calificaciones y avisos pasaron a ser `async` (usan `await`).
- El bus de eventos espera a sus suscriptores; si uno falla, los demás igual
  reciben el evento.
- Los cupos se apartan y devuelven con operaciones atómicas en el servidor, así
  dos matrículas a la vez no pueden pasarse del cupo.
- Los datos de ejemplo salieron de `js/sistema.js` y viven en `server/datos-ejemplo.js`.
- `ConfiguracionAcademica` (Singleton) sigue en memoria: es configuración del
  periodo, no datos de usuarios.
- Los avisos de correo y SMS siguen siendo simulados (se ven en pantalla).

## Pruebas (12)

| Archivo | Qué prueba |
|---|---|
| `1_matricula.cy.js` | Facade: matrícula exitosa, cruce de horario, más de 20 créditos, pago rechazado |
| `2_pagos.cy.js` | Strategy (beca del 50 %) y Adapter (PSE con y sin banco) |
| `3_calificaciones.cy.js` | Strategy: nota por porcentajes y quitando la peor nota |
| `4_avisos_y_configuracion.cy.js` | Observer (avisos y fallos) y Singleton |
| `5_flujo_completo.cy.js` | Matricular, calificar, avisos y reporte |
>>>>>>> origin/feature/mongodb-atlas
