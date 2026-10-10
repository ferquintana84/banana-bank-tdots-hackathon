# Go / No-Go

- **Fecha:** 2026-10-10, sobre el código congelado (commit `9b874b7`).

## 1. Decisión

- **Para esta entrega: GO.** Los dos fallos que costaban dinero están corregidos y verificados, la funcionalidad nueva cumple sus criterios, y lo que no está resuelto está declarado.
- **Para producción: NO-GO**, hasta cumplir las condiciones de la sección 3. La primera, S1, bloquea por sí sola.

## 2. Qué respalda la decisión

| Qué | Cómo se sabe | Evidencia |
|---|---|---|
| Una transferencia se cobra una sola vez aunque la respuesta del banco se pierda, tarde o no se pueda consultar | **Por construcción** (una referencia por intención) y medido | `03-fixes/01-transfer-integrity.md`; casos R1 a R4, R7, R13 y R14 |
| Nunca se afirma «fallida» sin un hecho del banco; la duda es «pendiente de verificar» | **Por construcción** | `tests/transfer-outcome.test.ts`; casos R8, R13 y R16 |
| No sale dinero sin que el titular pulse Confirm, y se ejecuta lo que revisó | **Por construcción** (el agente solo propone; se ejecuta la propuesta guardada) | `03-fixes/02-review-before-execution.md`; casos R5, R18, R20, R21 y R22 |
| Una fuente citada existe, está en vigor y contiene las cifras citadas; ningún importe sin respaldo llega al cliente | **Por construcción** (validador de citas) | `04-feature.md`; `tests/evidence.test.ts`; casos R24 a R27 |
| Un cliente no puede leer las cuentas, los movimientos, las conversaciones, las propuestas ni los casos de soporte de otro cliente | **Por construcción**, comprobado con peticiones | `05-security-audit.md`, área 2 |
| **Excepción declarada, S1:** la lista de destinatarios envía al navegador y al modelo el nombre del titular y el IBAN completo de las cuentas de otros clientes | Leído en el código y comprobado con una petición | `05-security-audit.md`, área 5 |
| El conjunto: 22 de 23 casos cumplen el contrato | **Medido**, sin modelo | `03-fixes/evidence/after-feature-f.md` |
| El asistente responde con evidencia a siete preguntas fijas | **Medido** con el modelo: 7 de 7, tres ejecuciones cada una | `03-fixes/evidence/questions-after-feature-f.md` |
| Lo que ve el cliente en pantalla | **Verificado por una persona**, con 84 capturas | Las tres listas de aceptación de `03-fixes/` |
| Una instrucción escondida en un movimiento no movió dinero | **Verificado por una persona**, una vez | Sección Z de `03-fixes/03-feature-acceptance-checklist.md` |

Punto de partida: 2 de 11 casos cumplían (`03-fixes/evidence/baseline.md`). El único caso que sigue sin cumplir es R10, la vista de operador, que quedó fuera de las prioridades (D5).

La prueba de aceptación humana encontró dos defectos que ningún script detectó: O9, la tarjeta de evidencia contradecía a la pantalla, y O10, bajo un chat aparecían propuestas de otras conversaciones. Por eso la verificación humana forma parte del método y no es un trámite.

## 3. Condiciones antes de producción, por orden

1. **S1. Dejar de enviar IBAN al proveedor del modelo.** Hoy salen los IBAN completos de clientes ajenos a la conversación. No pone dinero en riesgo; es privacidad y minimización de datos, y bloquea por sí solo.
2. **S5. Autenticación real y secretos propios.** El selector de personas y los secretos por defecto son del entorno de prueba.
3. **S2 y S3. Inyección de instrucciones.** Probar con más redacciones, repetidas veces y con un documento malicioso. Una ejecución superada no es una prueba.
4. **R10. Vista de operador.** Marta sigue viendo solo el último mensaje de un caso. Los datos para reconstruirlo ya se guardan.
5. **O9b. Afirmaciones compuestas.** El validador no comprueba que cada parte de una afirmación tenga su fuente.
6. **Siguiente paso de elección fija**, en lugar de texto libre, para garantizarlo por construcción.
7. **S4. Actualizar dependencias:** `next` y dos indirectas, con 3 avisos altos.

## 4. Límites declarados y observaciones

- **La redacción del asistente depende del modelo.** Se mide con tres ejecuciones por pregunta: una muestra pequeña.
- **Las preguntas históricas no se responden** (D14): solo se recuperan documentos en vigor.
- **Una cifra calculada legítimamente se reconstruye** (D13): se prefiere una respuesta seca a una cifra sin respaldo.
- **Los documentos de producto se eligen por el título** (D15).
- **El filtro de propuestas por conversación se ejecuta en el navegador** (D17).
- **O6.** El documento original se muestra en Markdown sin formato. De la aplicación original.
- **O7.** Un siguiente paso remitía a algo que la aplicación no muestra. Corregido con instrucciones; se mide, no se garantiza.
- **O8.** El asistente podía decir que abría un caso sin abrirlo. Corregido: el caso es una fuente comprobada.
- **O9.** Una afirmación cierta sobre la propuesta aparecía como no verificada. Corregido; queda O9b.
- **O10.** Bajo un chat aparecían propuestas de otras conversaciones. Corregido y comprobado en pantalla.
- **O11.** Un ingreso descrito sin decir que es un ingreso. Redacción menor, sin corregir.

## 5. Los modelos mentales detrás de la decisión

- **Inversión.** El diagnóstico empezó preguntando cómo hacer que un cliente perdiera la confianza el lunes; de ahí salieron las dos correcciones.
- **Margen de seguridad.** Ante la duda, «pendiente de verificar», nunca «fallida»; y si la consulta al banco falla, la aplicación se detiene en lugar de reenviar.
- **Checklist.** Cada regla del contrato es un caso del script, registrado en rojo antes del código y en verde después.
- **Círculo de competencia.** Solo se corrigió lo que se podía verificar; lo demás está en la sección 3, no escondido.
- **Efectos de segundo orden.** Cada cambio se probó contra lo que ya funcionaba. S1 queda declarado y sin corregir por eso mismo: cambiar código el día de la entrega pondría en riesgo lo ya verificado, y cada cambio obliga a repetir las pruebas.
- **Efecto lollapalooza.** Varias causas juntas dan un resultado que ninguna da sola, para mal y para bien.
  - **Para mal:** el doble cobro original necesitó tres cosas a la vez (una respuesta perdida, un reintento automático y ninguna referencia estable). Ninguna era dañina por separado.
  - **Para bien:** la sección Z muestra lo contrario, tres capas independientes. El modelo trató el texto como un dato, la construcción habría parado cualquier transferencia, y la persona ve la tarjeta y decide.
