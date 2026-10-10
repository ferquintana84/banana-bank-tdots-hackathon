# Reproducción determinista

- **Etiqueta:** before-feature-c-r26
- **Fecha:** 2026-10-10T05:45:27.072Z
- **Commit:** d3e6857
- **Node:** v24.21.0
- **Resultado:** 0 de 1 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R26 | Lucía pide sus movimientos al asistente: ¿puede verlos, y solo los suyos? | normal | Lucía: HTTP 400 · «Invalid request data.» · Marta: HTTP 400 · «Invalid request data.» | Movimientos de cuentas ajenas: 0 | El asistente puede leer los movimientos del cliente, y solo el cliente. | **NO CUMPLE** |
