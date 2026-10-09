# Reproducción determinista

- **Etiqueta:** after-fix-1a
- **Fecha:** 2026-10-09T17:00:34.244Z
- **Commit:** ba8219d
- **Node:** v24.21.0
- **Resultado:** 9 de 12 casos cumplen el contrato.

Cada caso parte del banco recién restablecido. «Qué dijo la aplicación» es la respuesta que recibe el cliente; «Qué hizo el banco» es lo que el cliente ve después en sus movimientos.

| ID | Historia del cliente | Escenario | Qué dijo la aplicación | Qué hizo el banco | Contrato | Resultado |
|---|---|---|---|---|---|---|
| R0 | El equipo comprueba que lo que ya funcionaba sigue funcionando. | — | npm test: salida 0 · npm run typecheck: salida 0 | — | Las pruebas públicas y la comprobación de tipos pasan. | CUMPLE |
| R1 | Lucía envía 10 EUR a Bruno y se pierde la respuesta del banco: ¿paga una sola vez? | lost-response | `completed` | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | Un solo cargo y ningún «fallida» sobre un pago hecho. | CUMPLE |
| R2 | Lucía hace tres pagos iguales de 10 EUR a Bruno en un día con incidencias: ¿paga 30 EUR, ni más ni menos? | intermittent 17 | `completed` / `completed` / `completed` | 3 cargo(s), 30,00 EUR en total · 3 abono(s) al destinatario · por pago: 10,00 EUR / 10,00 EUR / 10,00 EUR | Tres órdenes distintas, tres cargos: 30,00 EUR. | CUMPLE |
| R3 | Lucía envía 10 EUR a Bruno y el banco tarda en responder: ¿paga una sola vez? | slow-response | `completed` | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | Un solo cargo y ningún «fallida» sobre un pago hecho. | CUMPLE |
| R4 | La aplicación de Lucía reenvía la misma orden de 10 EUR tras un corte de red: ¿se ejecuta una sola vez? | normal | 1.ª: `completed` (op 03f63a8f) · 2.ª: `completed` (op 03f63a8f) | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | La misma orden (mismo intentId) produce un solo cargo. | CUMPLE |
| R5 | Lucía pide una transferencia de 10 EUR: ¿puede revisar importe, origen y destino antes de que salga el dinero? | normal | `completed` · propuestas pendientes visibles: 0 | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario (antes de confirmar) | Sin confirmación explícita no se mueve dinero. | **NO CUMPLE** |
| R7 | Diego, con 75 EUR, envía 50 EUR a Inés y se pierde la respuesta del banco: ¿se le dice la verdad sobre su dinero? | lost-response | `completed` | 1 cargo(s), 50,00 EUR en total · 1 abono(s) al destinatario · saldo de Diego: 25,00 EUR | Un solo cargo y ningún «fondos insuficientes» sobre un pago hecho. | CUMPLE |
| R8 | El viernes se le dijo a Lucía que su pago de 85 EUR había fallado: ¿coincide lo que guarda la aplicación con lo que hizo el banco? | normal (sin mover dinero) | orden guardada como `failed` · «No response received from the bank.» | operación `completed`, 85,00 EUR | El estado guardado coincide con el hecho verificado en el banco. | **NO CUMPLE** |
| R10 | Marta abre el caso de Lucía: ¿ve la conversación, la orden y la operación del banco? | normal (sin mover dinero) | mensajes: 0 · órdenes: 0 · operaciones del banco: 0 | Informativo: último paso registrado (`transfer.completed`) guarda: status | El operador ve conversación, pasos y efectos. | **NO CUMPLE** |
| R13 | Lucía envía 10 EUR a Bruno, se pierde la respuesta y el banco tampoco deja consultar el estado: ¿evita la aplicación afirmar lo que no sabe y pagar dos veces? | read-unavailable | 1.ª respuesta: `pending_verification` · al repetir la misma orden: `completed` | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | Un solo cargo, ningún «fallida», y repetir la misma orden no paga de nuevo. | CUMPLE |
| R14 | Lucía envía 10 EUR a Bruno y el banco rechaza el primer intento sin llegar a ejecutarlo: ¿se completa el pago una sola vez? | reject-before | `completed` | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | Un solo cargo y ningún «fallida» sobre un pago hecho. | CUMPLE |
| R15 | A Lucía le dicen que su pago de 10 EUR a Bruno está pendiente de verificar y lo pide otra vez: ¿se evita un segundo pago y se le explica? | read-unavailable | 1.ª petición: `pending_verification` · 2.ª petición idéntica: `completed` · «We have checked with the bank: your earlier transfer of €10.00 to Bruno Vidal (Horizon account) was completed, once. Reference: 24601132-7326-42b5-bef8-43af7e65a322. We have not sent it again. If you want to make a second, separate payment, ask us again and we will send it.» | 1 cargo(s), 10,00 EUR en total · 1 abono(s) al destinatario | La petición idéntica no envía un segundo pago y el cliente recibe una explicación. | CUMPLE |
