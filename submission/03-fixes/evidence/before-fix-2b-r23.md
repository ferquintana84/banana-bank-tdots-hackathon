# Reproducción determinista

- **Etiqueta:** before-fix-2b-r23
- **Fecha:** 2026-10-09T18:38:35.987Z
- **Commit:** 6d21213
- **Node:** v24.21.0
- **Resultado:** 0 de 1 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R23 | Lucía confirma un pago de 10 EUR que nació en una conversación: ¿queda el resultado escrito en esa conversación? | normal | `completed` · mensajes en la conversación: 0 | En la conversación: ningún mensaje con el resultado | La conversación recoge el resultado verificado, con la referencia del banco. | **NO CUMPLE** |
