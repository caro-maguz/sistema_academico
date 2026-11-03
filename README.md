# SIGA — Sistema Integrado de Gestión Académica

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
- Navegación colapsable y contenido de ejemplo por perfil.
- Panel de indicadores, matrícula con búsqueda/resumen de créditos y costo, historial de pagos simulado, calificaciones y reporte.
- Los validadores y cálculos de matrícula, pagos y notas permanecen en sus servicios originales.

## Patrones de diseño

| Patrón | Archivo |
|---|---|
| Strategy | `js/pagos.js` (descuentos) y `js/calificaciones.js` (nota final) |
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
