# Fix 1. Prueba de aceptación humana

La hace Fernando en el navegador, con un escenario de fallo activo.

- **Cuándo:** una vez, después de las partes (b) y (c). Las secciones C y D (chat) se repiten después de Fix 2.
- **Preparación:** `nvm use`, servicios en marcha con `npm run dev`, y la aplicación abierta como Lucía.
- **Escenarios:** cada uno solo afecta a la primera operación nueva. Hay que volver a ejecutar el comando antes de cada sección.
- **Capturas:** se guardan en `submission/notes/evidencia/aceptacion/` con el nombre indicado en cada paso.

## A. Formulario, respuesta perdida

1. `npm run scenario -- lost-response`
2. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación A» → Send transfer.

| Paso | Debo ver | Captura | Sí / No |
|---|---|---|---|
| A-1 | Aviso: «Your transfer of €10.00 to Bruno Vidal (Horizon account) is complete. The bank has confirmed it. Reference: …» | `A-1-aviso.png` | |
| A-2 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación A» de −€10.00 | `A-2-overview-lucia.png` | |
| A-3 | Como Bruno, un solo ingreso «Transfer · Aceptación A» de +€10.00 | `A-3-overview-bruno.png` | |

**Resultado A:** ______

## B. Formulario, el banco no deja consultar

1. `npm run scenario -- read-unavailable`
2. Como Lucía, la misma transferencia con «Aceptación B» → Send transfer.
3. Sin cambiar ningún campo, Send transfer otra vez.

| Paso | Debo ver | Captura | Sí / No |
|---|---|---|---|
| B-1 | Tras el paso 2, aviso que dice que el banco aún no la ha confirmado, «Please do not send it again: you could pay twice» y una referencia. En ningún sitio aparece «failed». | `B-1-aviso-pendiente.png` | |
| B-2 | Panel «Transfers checked with the bank»: «We have checked with the bank: … was completed, once.» | `B-2-panel-comprobada.png` | |
| B-3 | Tras el paso 3, mensaje de completada con la misma referencia que en B-1 | `B-3-reenvio.png` | |
| B-4 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación B» | `B-4-overview-lucia.png` | |

El aviso de pendiente y el panel aparecen casi a la vez: el simulador solo falla una consulta, y la aplicación vuelve a preguntar al banco al refrescar las cuentas.

**Resultado B:** ______

## C. Chat, respuesta perdida

1. `npm run scenario -- lost-response`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación C».

| Paso | Debo ver | Captura | Sí / No |
|---|---|---|---|
| C-1 | El asistente dice que está completada y da la referencia | `C-1-chat-completada.png` | |
| C-2 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación C» | `C-2-overview-lucia.png` | |

**Resultado C:** ______

## D. Chat, el banco no deja consultar

1. `npm run scenario -- read-unavailable`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación D».
3. En la misma conversación: «Try again».

| Paso | Debo ver | Captura | Sí / No |
|---|---|---|---|
| D-1 | Tras el paso 2, el asistente dice que el banco no la ha confirmado, que no la repita, y da la referencia. No dice que falló. | `D-1-chat-pendiente.png` | |
| D-2 | Panel «Transfers checked with the bank» con «completed, once» | `D-2-panel-comprobada.png` | |
| D-3 | Tras el paso 3, el asistente dice que ya se completó y pregunta si quiero un segundo pago distinto. No envía otro. | `D-3-chat-reintento.png` | |
| D-4 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación D» | `D-4-overview-lucia.png` | |

**Resultado D:** ______

## Límites conocidos

- El texto del chat lo redacta el modelo y puede variar de una ejecución a otra.
- El paso D-3 depende del modelo; la garantía firme llega con Fix 2 (D9).
- En C y D el dinero sale sin confirmación previa. Es lo que corrige Fix 2, y por eso estas dos secciones se repiten después.
- El script de reproducción restablece el banco al terminar. Si se ejecuta entre secciones, los movimientos de la prueba desaparecen.
