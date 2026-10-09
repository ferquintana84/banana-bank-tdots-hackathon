# Fix 1. Prueba de aceptación humana

La hace Fernando en el navegador, con un escenario de fallo activo.

- **Cuándo:** una vez, después de las partes (b) y (c). Las secciones C y D (chat) se repiten después de Fix 2.
- **Preparación:** `nvm use`, servicios en marcha con `npm run dev`, y la aplicación abierta como Lucía.
- **Escenarios:** cada uno solo afecta a la primera operación nueva. Hay que volver a ejecutar el comando antes de cada sección.
- **Capturas:** se guardan en `submission/notes/evidencia/aceptacion/` con el nombre indicado en cada paso.

## Resultado de la ejecución

- **Fecha:** 2026-10-09, tras `npm run reset`, sobre el código de Fix 1 completo (partes a, b y c).
- **Resultado:** las cuatro secciones superadas.
- **Saldo de Lucía (Aurora account):** 4.007,50 EUR al empezar y 3.967,50 EUR al terminar: cuatro transferencias de 10 EUR, una por sección, y ningún cargo duplicado.
- **Quién lo comprobó:** Fernando, a mano. Los resultados de esta página son observación humana; las capturas son su evidencia.

## 0. Antes de ninguna prueba: el caso histórico de Lucía

Al abrir las cuentas de Lucía tras el reset, el panel «Transfers checked with the bank» informó de que su pago histórico de 85 EUR por la cena (`ref-historic-lucia`) «was completed, once». Es el mismo pago del que se le dijo que había fallado. No estaba en la lista de comprobación: es la conciliación al leer (caso R8 del script) vista en vivo.

| Captura |
|---|
| `0-historico-lucia.png` |

## A. Formulario, respuesta perdida

1. `npm run scenario -- lost-response`
2. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación A» → Send transfer.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| A-0 | El formulario relleno antes de enviar | `A-0-formulario.png` | — |
| A-1 | Aviso: «Your transfer of €10.00 to Bruno Vidal (Horizon account) is complete. The bank has confirmed it. Reference: …» | `A-1-aviso.png` | Sí |
| A-2 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación A» de −€10.00 | `A-2-overview-lucia.png` | Sí |
| A-3 | Como Bruno, un solo ingreso «Transfer · Aceptación A» de +€10.00 | `A-3-overview-bruno.png` | Sí |

**Resultado A:** SUPERADA. Saldo de Lucía: de 4.007,50 EUR a 3.997,50 EUR.

## B. Formulario, el banco no deja consultar

1. `npm run scenario -- read-unavailable`
2. Como Lucía, la misma transferencia con «Aceptación B» → Send transfer.
3. Sin cambiar ningún campo, Send transfer otra vez.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| B-0 | El formulario relleno antes de enviar | `B-0-formulario.png` | — |
| B-1 | Tras el paso 2, aviso que dice que el banco aún no la ha confirmado, «Please do not send it again: you could pay twice» y una referencia. En ningún sitio aparece «failed». | `B-1-aviso-pendiente.png` | Sí |
| B-2 | Panel «Transfers checked with the bank»: «We have checked with the bank: … was completed, once.» | La misma captura de B-1, que muestra el aviso y el panel a la vez | Sí |
| B-3 | Tras el paso 3, mensaje de completada con la misma referencia que en B-1 (`ea652c01…`) y ningún segundo cargo | `B-3-reenvio.png` | Sí |
| B-4 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación B» de −€10.00 | `B-4-overview.png` | Sí |

El aviso de pendiente y el panel aparecen casi a la vez: el simulador solo falla una consulta, y la aplicación vuelve a preguntar al banco al refrescar las cuentas. Véase la observación O2.

**Resultado B:** SUPERADA.

## C. Chat, respuesta perdida

1. `npm run scenario -- lost-response`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación C».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| C-0 | El chat antes de enviar el mensaje | `C-0-chat-previo.png` | — |
| C-1 | El asistente dice que está completada y da su propia referencia | `C-1-chat.png` | Sí |
| C-2 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación C» de −€10.00 | `C-2-overview.png` | Sí |

**Resultado C:** SUPERADA.

## D. Chat, el banco no deja consultar

1. `npm run scenario -- read-unavailable`
2. Conversación nueva: «Send EUR 10 from my Aurora account to Bruno. Description: Aceptación D».
3. En la misma conversación: «Try again».

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| D-0 | El chat antes de enviar el mensaje | `D-0-chat-previo.png` | — |
| D-1 | Tras el paso 2, el asistente dice que el banco no la ha confirmado, que no la repita, y da la referencia. No dice que falló. | `D-1-chat-pendiente.png` | Sí |
| D-1 (panel) | Panel «Transfers checked with the bank» con «completed, once» y la misma referencia que da el asistente (`4141560e…`) | La misma captura de D-1, que muestra el panel al pie | Sí |
| D-2 | Tras el paso 3, el asistente dice que ya se completó, se niega a enviar un duplicado y pide confirmación explícita para un segundo pago | `D-2-chat-reintento.png` | Sí |
| D-3 | En Overview de Lucía, un solo movimiento «Transfer · Aceptación D» de −€10.00 | `D-3-overview.png` | Sí |

**Resultado D:** SUPERADA. Saldo final de Lucía: 3.967,50 EUR.

## E. Repetición de B tras corregir O2 y O3

Se ejecutó el 2026-10-09 sobre el commit `82f4856` («fix: show each transfer status in one place»), con el banco recién restablecido.

1. Recargar la página y abrir como Lucía.
2. `npm run scenario -- read-unavailable`
3. Transfers → Aurora account → Bruno Vidal → 10 → «Aceptación B5» → Send transfer.
4. Sin cambiar ningún campo, Send transfer otra vez.
5. Pulsar Assistant en el menú.

| Paso | Debo ver | Captura | Resultado |
|---|---|---|---|
| B-5 (inicio) | Overview tras recargar: saldo de €4,007.50 y ningún panel | `B-5-inicio.png` | — |
| B-5-0 | El formulario relleno con «Aceptación B5» antes de enviar | `B-5-0-formulario.png` | — |
| B-5 | Tras el paso 3, ningún aviso amarillo. Solo el panel «Transfers checked with the bank» con «completed, once» (referencia `c933977c…`). Nada dice que esté pendiente. | `B-5-sin-contradiccion.png` | Sí |
| B-6-0 | Tras el paso 4, aviso amarillo de completada con la misma referencia y ningún segundo cargo (el saldo sigue en €3,997.50) | `B-6-0-aviso-completada.png` | Sí |
| B-6 | Tras el paso 5, la página Assistant sin el aviso amarillo y con el panel todavía visible | `B-6-cambio-pestana.png` | Sí |
| B-5 (overview) | En Overview, un solo movimiento «Transfer · Aceptación B5» de −€10.00 y saldo de €3,997.50 | `B-5-overview.png` | Sí |

**Resultado E:** SUPERADA. O2 y O3 quedan corregidas.

## Observaciones humanas

Lo que Fernando vio durante la prueba y que ningún script comprueba.

| ID | Observación | Estado |
|---|---|---|
| O1 | Tras una transferencia completada, el formulario conserva los mismos datos. Un segundo clic sería un pago nuevo y legítimo, probablemente no deseado. | Lo mitiga Fix 2, con la confirmación explícita. |
| O2 | En B, el aviso de pendiente y el panel que dice «completed, once» se veían a la vez y se contradecían (`B-1-aviso-pendiente.png`). El aviso debería actualizarse cuando el panel resuelve la misma intención. | Corregida en `82f4856` (D10). Evidencia: `B-5-sin-contradiccion.png`. |
| O3 | El aviso amarillo persiste al cambiar de página: en el chat seguía mostrando la referencia de la transferencia B del formulario, lo que puede confundir al cliente (`D-1-chat-pendiente.png`). | Corregida en `82f4856` (D10). Evidencia: `B-6-0-aviso-completada.png` y `B-6-cambio-pestana.png`. |

## Límites conocidos

- El texto del chat lo redacta el modelo y puede variar de una ejecución a otra.
- El paso D-2 depende del modelo; la garantía firme llega con Fix 2 (D9).
- En C y D el dinero sale sin confirmación previa. Es lo que corrige Fix 2, y por eso estas dos secciones se repiten después.
- El script de reproducción restablece el banco al terminar. Si se ejecuta entre secciones, los movimientos de la prueba desaparecen.
