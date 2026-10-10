# Reproducción determinista

- **Etiqueta:** before-feature-b
- **Fecha:** 2026-10-10T05:41:22.271Z
- **Commit:** 78f452f
- **Node:** v24.21.0
- **Resultado:** 0 de 2 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R24 | Lucía busca una condición con las mismas palabras que un documento archivado: ¿se le devuelve como si estuviera vigente? | — (sin banco ni modelo) | resultados: archive-aurora-1 (1.00), archive-aurora-9 (1.00), archive-family-5 (0.95), archive-travel-4 (0.94), archive-cloud-11 (0.94) | Fuera de vigor: archive-aurora-1, archive-aurora-9, archive-family-5, archive-travel-4, archive-cloud-11 | La búsqueda no devuelve documentos fuera de vigor el 2026-09-24. | **NO CUMPLE** |
| R25 | Lucía ve los fragmentos que respaldan una respuesta: ¿dice cada uno de qué documento, versión y fecha es? | — (sin banco ni modelo) | resultados: aurora-fees-2026 · sin título · v— · desde — / family-fees-2026 · sin título · v— · desde — / travel-fees-2026 · sin título · v— · desde — / aurora-conditions-2026 · sin título · v— · desde — / aurora-operations-2026 · sin título · v— · desde — | Sin título, versión o vigencia: 5 de 5 | Cada resultado de la búsqueda lleva título, versión y fecha de vigencia. | **NO CUMPLE** |
