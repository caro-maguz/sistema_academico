# SIGA — Sistema Integrado de Gestión Académica

Proyecto final de Arquitectura de Software. Página web en HTML + JavaScript
(sin servidor ni base de datos) con 6 patrones de diseño y pruebas en Cypress.

## Cómo abrirlo

1. En VS Code: **Archivo → Abrir carpeta…** → `sistema-academico`.
2. Para usar el sistema: doble clic en `index.html` (se abre en el navegador).

## Cómo ejecutar las pruebas (Cypress)

En la terminal de VS Code (**Terminal → Nueva terminal**):

```bash
npm install          # solo la primera vez
npx cypress open     # abre Cypress para ver las pruebas paso a paso
npx cypress run      # o las ejecuta todas sin abrir ventana
```

En `cypress open`: elige **E2E Testing** → un navegador → haz clic en cada prueba.

## Dónde está cada patrón

| Patrón | Archivo |
|---|---|
| Strategy | `js/pagos.js` (descuentos) y `js/calificaciones.js` (nota final) |
| Observer | `js/eventos.js` (bus de eventos) y `js/notificaciones.js` (avisos) |
| Adapter | `js/pagos.js` (`PasarelaPseAdapter`, `PasarelaTarjetaAdapter`) |
| Facade | `js/matricula.js` (`MatriculaFacade`) |
| Repository | `js/repositorios.js` |
| Singleton | `js/config.js` (`ConfiguracionAcademica`) |

`js/sistema.js` conecta todas las piezas y carga los datos de ejemplo; `js/app.js` maneja la pantalla.

## Pruebas (12)

| Archivo | Qué prueba |
|---|---|
| `1_matricula.cy.js` | Facade: matrícula exitosa, cruce de horario, más de 20 créditos, pago rechazado |
| `2_pagos.cy.js` | Strategy (beca del 50 %) y Adapter (PSE con y sin banco) |
| `3_calificaciones.cy.js` | Strategy: nota por porcentajes y quitando la peor nota |
| `4_avisos_y_configuracion.cy.js` | Observer (avisos y fallos) y Singleton |
| `5_flujo_completo.cy.js` | Matricular, calificar, avisos y reporte |
