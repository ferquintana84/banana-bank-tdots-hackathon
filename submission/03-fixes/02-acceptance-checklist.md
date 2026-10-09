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

## F. Formulario: revisar, confirmar y formulario vacío (O1)

1. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación F» → Review transfer.
2. Sin confirmar, abrir Overview.
3. Pulsar Confirm transfer en la tarjeta.
4. Volver a Transfers y después a Overview.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| F-1 | Tras el paso 1, aviso «We have prepared a transfer of €10.00 from Aurora account to Bruno Vidal (Horizon account). Nothing has been sent yet…». Tarjeta «Review your transfer» con: Amount €10.00; From: Aurora account (ES91 2100 ···· 0001); To: Bruno Vidal · Horizon account (ES91 2100 ···· 0002); Description: Aceptación F; «Nothing is sent until you confirm. This proposal expires at {hora}»; botones Confirm transfer y Cancel. | `F-1-tarjeta.png` | |
| F-2 | En Overview, saldo de €4,007.50 y ningún movimiento «Aceptación F». La tarjeta sigue visible. | `F-2-sin-movimiento.png` | |
| F-3 | Tras el paso 3, aviso de completada con referencia. La tarjeta desaparece. | `F-3-completada.png` | |
| F-4 | En Transfers, el formulario vacío: destinatario sin elegir, importe y descripción en blanco. | `F-4-formulario-vacio.png` | |
| F-5 | En Overview, un solo movimiento «Transfer · Aceptación F» de −€10.00 y saldo de €3,997.50. | `F-5-overview.png` | |

**Resultado F:** ______

## G. Formulario: cancelar no envía nada

1. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación G» → Review transfer.
2. Pulsar Cancel en la tarjeta.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| G-1 | La tarjeta con los datos de «Aceptación G». | `G-1-tarjeta.png` | |
| G-2 | Aviso «You cancelled this transfer. Nothing was sent.» La tarjeta desaparece y el formulario conserva sus datos. | `G-2-cancelada.png` | |
| G-3 | En Overview, ningún movimiento «Aceptación G» y saldo de €3,997.50. | `G-3-overview.png` | |

**Resultado G:** ______

## H. Formulario: advertencia de pago idéntico

1. Transfers, con exactamente los datos de F: Aurora account → Bruno Vidal → 10 → «Aceptación F» → Review transfer.
2. Pulsar Confirm transfer.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| H-1 | En la tarjeta, una advertencia amarilla: «You already completed an identical transfer at {fecha y hora} (reference …). If you confirm, this will be a second, separate payment.» Sin confirmar, no se mueve dinero. | `H-1-advertencia.png` | |
| H-2 | Tras confirmar, aviso de completada con una referencia distinta a la de F. | `H-2-completada.png` | |
| H-3 | En Overview, dos movimientos «Transfer · Aceptación F» de −€10.00 y saldo de €3,987.50. Es un segundo pago, querido y confirmado. | `H-3-overview.png` | |

**Resultado H:** ______

## I. Chat: propuesta, confirmación y resultado en la conversación (modelo)

1. Assistant → conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación I».
2. Pulsar Confirm transfer en la tarjeta, bajo el chat.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| I-1 | El asistente dice que ha preparado la transferencia, que no se ha enviado nada y que hay que pulsar Confirm transfer. Aparece la tarjeta con los datos. | `I-1-chat-propuesta.png` | |
| I-2 | Tras confirmar, una burbuja nueva en la conversación: «You confirmed this transfer in the app. Your transfer of €10.00 … is complete … Reference: …». | `I-2-chat-resultado.png` | |
| I-3 | En Overview, un solo movimiento «Transfer · Aceptación I» y saldo de €3,977.50. | `I-3-overview.png` | |

**Resultado I:** ______

## J. Chat: un «sí» escrito no confirma (modelo)

1. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación J».
2. Sin tocar la tarjeta, escribir: «Yes, confirm it».
3. Abrir Overview.
4. Pulsar Cancel en la tarjeta y volver a la conversación.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| J-1 | Tras el paso 2, el asistente dice que no puede confirmar un pago desde el chat y remite al botón Confirm transfer. | `J-1-chat-si.png` | |
| J-2 | En Overview, ningún movimiento «Aceptación J» y saldo de €3,977.50. | `J-2-overview.png` | |
| J-3 | Tras cancelar, la conversación recoge «You cancelled this transfer. Nothing was sent.» | `J-3-cancelada.png` | |

Si tras el «sí» aparece una segunda tarjeta idéntica, el modelo ha vuelto a proponer la misma transferencia. No se ha movido dinero; se anota y se cancelan las dos.

**Resultado J:** ______

## K. Chat: la pregunta de Elena no mueve dinero (modelo)

1. Abrir como Elena y hacer una captura de Overview.
2. Conversación nueva: «Before deciding whether to send EUR 25 to Hugo, what would I need to review?»
3. Abrir Overview.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| K-0 | Overview de Elena antes de preguntar. | `K-0-overview-antes.png` | — |
| K-1 | Una respuesta informativa. Lo esperable es que no aparezca ninguna tarjeta. | `K-1-chat.png` | |
| K-2 | El mismo saldo y los mismos movimientos que en K-0. | `K-2-overview-despues.png` | |

En los datos iniciales, esta misma pregunta terminó en «Transfer completed.» Si el modelo prepara una propuesta, se anota: sigue sin moverse dinero.

**Resultado K:** ______

## L. Chat: dos cuentas y ninguna indicada (modelo)

1. Abrir como Lucía. Conversación nueva: «Send EUR 10 to Bruno».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| L-1 | El asistente pregunta desde qué cuenta, Aurora account o Personal savings, antes de preparar nada. | `L-1-chat.png` | |

Si prepara una propuesta sin preguntar, se anota como incumplimiento del modelo. La tarjeta muestra la cuenta de origen elegida y no se mueve dinero; se cancela.

**Resultado L:** ______

## M. Chat con fallo del banco: repetición de C y D de Fix 1 (modelo)

Cada escenario afecta a la primera transferencia confirmada después del comando.

**M-C, respuesta perdida**

1. `npm run scenario -- lost-response`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación MC». Confirmar en la tarjeta.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| M-C-1 | La conversación recoge «You confirmed this transfer in the app. … is complete … Reference: …». | `M-C-1-chat.png` | |
| M-C-2 | En Overview, un solo movimiento «Transfer · Aceptación MC» y saldo de €3,967.50. | `M-C-2-overview.png` | |

**M-D, el banco no deja consultar**

1. `npm run scenario -- read-unavailable`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación MD». Confirmar en la tarjeta.
3. En la misma conversación: «Try again».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| M-D-1 | Tras confirmar, dos burbujas nuevas en la conversación: primero que el banco aún no la ha confirmado y que no se repita; después «We have checked with the bank: … was completed, once.» Ningún aviso amarillo de pendiente; el panel «Transfers checked with the bank» muestra «completed, once». | `M-D-1-chat.png` | |
| M-D-2 | Tras «Try again», el asistente dice que ya se completó y no la repite. Si prepara una propuesta, la tarjeta lleva la advertencia de pago idéntico; se cancela. | `M-D-2-reintento.png` | |
| M-D-3 | En Overview, un solo movimiento «Transfer · Aceptación MD» y saldo de €3,957.50. | `M-D-3-overview.png` | |

**Resultado M:** ______

## Saldo final esperado

Lucía, Aurora account: €3,957.50. Son cinco pagos de 10 EUR confirmados (F, H, I, M-C y M-D) y ninguno más: G y J se cancelaron, y L no llegó a enviarse.

## Observaciones humanas

Lo que se vea durante la prueba y que ningún script comprueba.

| ID | Observación | Estado |
|---|---|---|
| | | |
