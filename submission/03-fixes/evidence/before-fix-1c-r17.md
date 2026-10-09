# Reproducción determinista

- **Etiqueta:** before-fix-1c-r17
- **Fecha:** 2026-10-09T17:18:34.233Z
- **Commit:** 0241613
- **Node:** v24.21.0
- **Resultado:** 0 de 1 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R17 | Lucía envía 10 EUR a Bruno y se pierde la respuesta del banco: si mañana pregunta, ¿queda constancia de cada paso? | lost-response | `completed` | Registro: ningún paso asociado a la orden | Quedan registrados el envío, la consulta y el resultado verificado, con referencia y operación. | **NO CUMPLE** |
