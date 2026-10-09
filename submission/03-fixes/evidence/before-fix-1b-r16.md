# Reproducción determinista

- **Etiqueta:** before-fix-1b-r16
- **Fecha:** 2026-10-09T17:03:21.424Z
- **Commit:** 69ab340
- **Node:** v24.21.0
- **Resultado:** 0 de 1 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R16 | A Lucía le dicen que su pago de 10 EUR a Bruno está pendiente de verificar y después abre sus cuentas: ¿le confirma la aplicación lo que pasó sin que ella haga nada más? | read-unavailable | al enviar: `pending_verification` · al abrir las cuentas: ninguna noticia de la transferencia | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | Al abrir las cuentas se comprueba con el banco y se informa del resultado; un solo cargo. | **NO CUMPLE** |
