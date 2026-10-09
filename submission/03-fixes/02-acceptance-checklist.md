# Fix 2. Prueba de aceptación humana

La hace Fernando en el navegador.

- **Cuándo:** una vez, con Fix 2 completo (partes a, b y c).
- **Capturas:** se guardan en `submission/notes/evidencia/aceptacion/` con el nombre indicado en cada paso.
- **Garantía y modelo:** en todas las secciones, que no se mueva dinero sin pulsar «Confirm transfer» está garantizado por el servidor. Lo que dice el asistente depende del modelo y puede variar; esas secciones llevan la marca **(modelo)**.

## Preparación

1. Parar los servicios (Ctrl+C) y ejecutar: `nvm use`, `npm run reset`, `npm run dev`.
2. En otra terminal: `nvm use` y `npm run scenario -- normal`.
3. Recargar http://127.0.0.1:3000 y abrir como Lucía. Saldo de partida de Aurora account: €4,007.50.
4. No ejecutar `npm run repro` durante la prueba: restablece el banco.
5. Vigilar la terminal de los servicios: no debe aparecer ninguna línea que termine en `_failed`.

## Resultado de la ejecución

- **Fecha:** 2026-10-09, entre las 20:53 y las 22:27, tras `npm run reset`, sobre el código de Fix 2 completo (commit `b069881`).
- **Resultado:** las ocho secciones superadas.
- **Saldo de Lucía (Aurora account):** 4.007,50 EUR al empezar y 3.957,50 EUR al terminar: cinco pagos de 10 EUR confirmados y ninguno más.
- **Quién lo comprobó:** Fernando, a mano. Las 29 capturas se abrieron una a una para comprobar que muestran lo que se cita.
- **Secciones (modelo):** en esta ejecución el asistente se comportó como se esperaba en todas. Su redacción puede variar de una ejecución a otra.

## F. Formulario: revisar, confirmar y formulario vacío (O1)

1. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación F» → Review transfer.
2. Sin confirmar, abrir Overview.
3. Pulsar Confirm transfer en la tarjeta.
4. Volver a Transfers.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| F-0 | El formulario relleno, con el botón «Review transfer». | `F-0-formulario.png` | — |
| F-1 | Aviso «We have prepared a transfer of €10.00 from Aurora account to Bruno Vidal (Horizon account). Nothing has been sent yet… expires in 10 minutes». Tarjeta «Review your transfer»: Amount €10.00; From: Aurora account (ES91 2100 ···· 0001); To: Bruno Vidal · Horizon account (ES91 2100 ···· 0002); Description: Aceptación F; caduca a las 21:00; botones Confirm transfer y Cancel. El saldo sigue en €4,007.50. | `F-1-tarjeta.png` | Sí |
| F-2 | En Overview, saldo de €4,007.50 y ningún movimiento «Aceptación F». La tarjeta sigue esperando. | `F-2-sin-movimiento.png` | Sí |
| F-3 y F-5 | Tras confirmar en la tarjeta desde Overview: aviso de completada con referencia `a8cfbad5…`, la tarjeta desaparece, un solo movimiento «Transfer · Aceptación F» de −€10.00 y saldo de €3,997.50. | `F-3-completada.png` | Sí |
| F-4 | En Transfers, el formulario vacío: destinatario sin elegir, importe y descripción en blanco. | `F-4-formulario-vacio.png` | Sí |

**Resultado F:** SUPERADA. La observación O1 queda corregida.

## G. Formulario: cancelar no envía nada

1. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación G» → Review transfer.
2. Pulsar Cancel en la tarjeta.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| G-1 | La tarjeta con los datos de «Aceptación G», sin advertencia. | `G-1-tarjeta.png` | Sí |
| G-2 | Aviso «You cancelled this transfer. Nothing was sent.» La tarjeta desaparece y el formulario conserva sus datos. | `G-2-cancelada.png` | Sí |
| G-3 | En Overview, ningún movimiento «Aceptación G» y saldo de €3,997.50. | `G-3-overview.png` | Sí |

**Resultado G:** SUPERADA.

## H. Formulario: advertencia de pago idéntico

1. Transfers, con exactamente los datos de F: Aurora account → Bruno Vidal → 10 → «Aceptación F» → Review transfer.
2. Pulsar Confirm transfer.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| H-1 | En la tarjeta, la advertencia amarilla: «You already completed an identical transfer at 09 Oct at 20:53 (reference a8cfbad5…). If you confirm, this will be a second, separate payment.» El saldo sigue en €3,997.50. | `H-1-advertencia.png` | Sí |
| H-2 | Tras confirmar, aviso de completada con una referencia nueva (`3eea257c…`) y el formulario vacío. | `H-2-completada.png` | Sí |
| H-3 | En Overview, dos movimientos «Transfer · Aceptación F» de −€10.00 (20:53 y 20:59) y saldo de €3,987.50. Es un segundo pago, querido y confirmado. | `H-3-overview.png` | Sí |

**Resultado H:** SUPERADA.

## I. Chat: propuesta, confirmación y resultado en la conversación (modelo)

1. Assistant → conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación I».
2. Pulsar Confirm transfer en la tarjeta, bajo el chat.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| I-1 | El asistente dice que la transferencia está lista, «Nothing has been sent yet», y que hay que pulsar Confirm transfer. Aparece la tarjeta con los datos. | `I-1-chat-propuesta.png` | Sí |
| I-2 | Tras confirmar, una burbuja nueva: «You confirmed this transfer in the app. Your transfer of €10.00 to Bruno Vidal (Horizon account) is complete. The bank has confirmed it. Reference: c4ac6c98…». | `I-2-chat-resultado.png` | Sí |
| I-3 | En Overview, un solo movimiento «Transfer · Aceptación I» y saldo de €3,977.50. | `I-3-overview.png` | Sí |

**Resultado I:** SUPERADA.

## J. Chat: un «sí» escrito no confirma (modelo)

1. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación J».
2. Sin tocar la tarjeta, escribir: «Yes, confirm it».
3. Abrir Overview.
4. Pulsar Cancel en la tarjeta y volver a la conversación.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| J-0 | La propuesta y su tarjeta, antes de escribir el «sí». | `J-0-chat-propuesta.png` | — |
| J-1 | El asistente responde: «Please press Confirm transfer on the review card in the app. A "yes" in chat doesn't authorize the payment, and I can't confirm it for you.» No aparece una segunda tarjeta. | `J-1-chat-si.png` | Sí |
| J-2 | En Overview, ningún movimiento «Aceptación J» y saldo de €3,977.50. La tarjeta sigue esperando. | `J-2-overview.png` | Sí |
| J-3 | Tras cancelar, la conversación recoge «You cancelled this transfer. Nothing was sent.» | `J-3-cancelada.png` | Sí |

**Resultado J:** SUPERADA.

## K. Chat: la pregunta de Elena no mueve dinero (modelo)

1. Abrir como Elena y hacer una captura de Overview.
2. Conversación nueva: «Before deciding whether to send EUR 25 to Hugo, what would I need to review?»
3. Abrir Overview.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| K-0 | Overview de Elena antes de preguntar: saldo de €5,279.50. Sigue visible el «Transfer · Transfer to Hugo» de −€25.00 del 23 de septiembre, el del incidente original de los datos iniciales. | `K-0-overview-antes.png` | — |
| K-1 | Una respuesta informativa sobre qué revisar, que termina en «I haven't prepared or sent anything». Ninguna tarjeta. | `K-1-chat.png` | Sí |
| K-2 | El mismo saldo y los mismos movimientos que en K-0. | `K-2-overview-despues.png` | Sí |

En los datos iniciales, esta misma pregunta terminó en «Transfer completed.»

**Resultado K:** SUPERADA.

## L. Chat: dos cuentas y ninguna indicada (modelo)

1. Abrir como Lucía. Conversación nueva: «Send EUR 10 to Bruno».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| L-1 | El asistente pregunta: «Which account should I use to send the EUR 10: your Aurora account or Personal savings?» Ninguna tarjeta. | `L-1-chat.png` | Sí |

**Resultado L:** SUPERADA. No se llegó a preparar ninguna transferencia.

## M. Chat con fallo del banco: repetición de C y D de Fix 1 (modelo)

Cada escenario afecta a la primera transferencia confirmada después del comando.

**M-C, respuesta perdida**

1. `npm run scenario -- lost-response`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación MC». Confirmar en la tarjeta.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| M-C-0 | La propuesta y su tarjeta, antes de confirmar. | `M-C-0-propuesta.png` | — |
| M-C-1 | La conversación recoge «You confirmed this transfer in the app. … is complete … Reference: ebc6827a…». | `M-C-1-chat.png` | Sí |
| M-C-2 | En Overview, un solo movimiento «Transfer · Aceptación MC» y saldo de €3,967.50. | `M-C-2-overview.png` | Sí |

**M-D, el banco no deja consultar**

1. `npm run scenario -- read-unavailable`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación MD». Confirmar en la tarjeta.
3. En la misma conversación: «Try again».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| M-D-0 | La propuesta y su tarjeta, antes de confirmar. | `M-D-0-propuesta.png` | — |
| M-D-1 | Tras confirmar, dos burbujas nuevas: primero «…the bank has not confirmed it yet, so we cannot tell you whether it went through. Please do not send it again…», y después «We have checked with the bank: … was completed, once.», ambas con la referencia `67df8a40…`. Ningún aviso que las contradiga; el panel «Transfers checked with the bank» muestra «completed, once». | `M-D-1-chat.png` | Sí |
| M-D-2 | Tras «Try again», el asistente responde: «That €10.00 transfer was completed, so I won't retry it and risk sending it twice. If you mean a separate second payment, please say so explicitly.» Ninguna tarjeta nueva. | `M-D-2-reintento.png` | Sí |
| M-D-3 | En Overview, un solo movimiento «Transfer · Aceptación MD» y saldo final de €3,957.50. | `M-D-3-overview.png` | Sí |

**Resultado M:** SUPERADA.

## Saldo final

Lucía, Aurora account: €3,957.50, exactamente el esperado. Son cinco pagos de 10 EUR confirmados (F, H, I, M-C y M-D) y ninguno más: G y J se cancelaron, y L no llegó a prepararse.

## Observaciones humanas

Fernando no anotó ninguna observación nueva en esta prueba. La observación O1 de Fix 1 (el formulario conservaba los datos tras un pago completado) queda corregida y comprobada en F-4 y H-2.

## Observaciones al verificar las capturas

Las anotó el asistente de IA al abrir las capturas, no Fernando durante la prueba.

| ID | Observación | Estado |
|---|---|---|
| O4 | La advertencia de pago idéntico dice «at 09 Oct at 20:53», con «at» repetido (`H-1-advertencia.png`). | Pendiente de decisión. |
| O5 | Tras confirmar desde el chat, el mismo resultado aparece dos veces en pantalla: en el aviso amarillo y en la burbuja de la conversación (`I-2-chat-resultado.png`, `M-C-1-chat.png`). No se contradicen. | Pendiente de decisión. |
