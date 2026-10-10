# Reproducción determinista

- **Etiqueta:** before-feature-f-r27
- **Fecha:** 2026-10-10T07:08:24.622Z
- **Commit:** badaf3c
- **Node:** v24.21.0
- **Resultado:** 0 de 1 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R27 | Lucía tiene propuestas vivas nacidas en dos conversaciones y en el formulario: ¿sabe la aplicación de dónde es cada una, y pone primero la más reciente? | normal | propuesta A: sin dato · propuesta B: sin dato · propuesta del formulario: sin dato | Orden en que se muestran: A → B → formulario | Cada propuesta lleva su conversación, la del formulario no lleva ninguna, y la más reciente va primero. | **NO CUMPLE** |
