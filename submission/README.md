# Banana Bank: entrega

> **In English.** Two money bugs fixed and verified: a transfer is now charged once and never reported as failed without a bank fact, and no money moves until the customer confirms a proposal. One new feature: the assistant answers personal questions with evidence checked by the server. Start with [`07-recorrido-visual.md`](07-recorrido-visual.md); the decision and its limits are in [`06-go-no-go.md`](06-go-no-go.md).

> Un asistente de IA en un banco no falla por falta de inteligencia. Falla cuando afirma cosas que no puede verificar.

- **Versión:** 2026-10-10. Código congelado en el commit `9b874b7`; los commits posteriores son solo documentación y evidencia (historia completa en [`notes/git-log.txt`](notes/git-log.txt)).
- **Resultado:** 22 de 23 casos del contrato cumplen (al empezar, 2 de 11). GO para esta entrega; NO-GO para producción hasta cumplir las condiciones de `06-go-no-go.md`.

## Por dónde empezar

1. [`07-recorrido-visual.md`](07-recorrido-visual.md): el trabajo entero en 15 capturas.
2. [`06-go-no-go.md`](06-go-no-go.md): la decisión, qué la respalda y qué falta.
3. El resto, en orden, según el mapa de abajo.

## Cómo ejecutarlo

Hace falta Node 24 y una clave de OpenAI. La clave va en `.env.local`, que `npm run setup` crea a partir de `.env.example`; ese archivo nunca se sube al repositorio ni va en el ZIP.

```sh
# Terminal 1
nvm use                  # Node 24
npm ci
npm run setup            # crea .env.local: poner ahí OPENAI_API_KEY
npm run dev              # aplicación en http://127.0.0.1:3000 y banco en el puerto 4001

# Terminal 2
nvm use
npm run scenario -- normal        # o lost-response, read-unavailable…
npm test                          # 54 pruebas, sin clave
npm run repro                     # 23 casos del contrato, sin modelo
npm run eval                      # 7 preguntas al asistente; usa la clave y cuota
```

`npm run reset` (con los servicios parados) devuelve los datos al estado inicial. Conviene ejecutarlo antes de una prueba manual: `repro` y `eval` dejan conversaciones y casos de soporte que solo el reset elimina.

## Part 1 - Fixes

Diagnóstico en [`01-diagnosis.md`](01-diagnosis.md): quince hallazgos, y por qué se eligieron dos.

- **Fix 1, integridad de la transferencia** ([`03-fixes/01-transfer-integrity.md`](03-fixes/01-transfer-integrity.md)). Antes, una respuesta perdida del banco cobraba dos veces o decía «fallida» sobre un pago hecho. Ahora cada intención tiene una referencia estable, se pregunta al banco antes de afirmar nada, y la duda es «pendiente de verificar».
- **Fix 2, revisión antes de ejecutar** ([`03-fixes/02-review-before-execution.md`](03-fixes/02-review-before-execution.md)). Antes, el dinero salía en la misma petición. Ahora el asistente solo prepara una propuesta y la envía el titular con un botón.

Cómo se comprobó: el mismo script antes y después de cada cambio (`03-fixes/evidence/`), y tres pruebas de aceptación hechas a mano, con capturas.

## Part 2 - Agent feature

**«¿Y en mi caso?»** ([`04-feature.md`](04-feature.md)). El asistente responde a preguntas personales («¿pagaré la comisión este mes?») cruzando la política en vigor con los datos del propio cliente, y separa lo verificado, lo no verificado y el siguiente paso. El servidor valida cada cita: lo que no tiene fuente no se presenta como verificado.

Para probarlo: abrir como Lucía y preguntar «Will I pay the Aurora account fee this month?»; abrir como Bruno y preguntar «How much is the monthly fee on my account?».

## Supporting materials

- **Sesiones de IA completas:** `ai-sessions/`.
- **Video de demostración:** `demo.mp4`.
- **Historia del repositorio:** [`notes/git-log.txt`](notes/git-log.txt). El ZIP no incluye `.git`, y varios documentos citan commits (por ejemplo, los casos registrados en rojo antes del código); este archivo permite comprobarlos.
- **Qué está terminado:** las dos correcciones y la funcionalidad, con su evidencia.
- **Qué queda pendiente:** no está listo para producción. La primera condición es dejar de enviar IBAN de terceros al proveedor del modelo (S1); la lista completa está en [`06-go-no-go.md`](06-go-no-go.md) y en [`05-security-audit.md`](05-security-audit.md).

## Mapa de documentos

| Archivo | Contenido |
|---|---|
| `00-method.md` | Tesis, modelos mentales y protocolo de trabajo. |
| `01-diagnosis.md` | Diagnóstico por inversión. |
| `02-decisions.md` | Las 17 decisiones, con lo descartado y el motivo. |
| `03-fixes/` | Las dos correcciones, las listas de aceptación y la evidencia. |
| `04-feature.md` | La funcionalidad de la Parte 2. |
| `05-security-audit.md` | Auditoría de seguridad, de solo lectura. |
| `06-go-no-go.md` | Decisión final y condiciones para producción. |
| `07-recorrido-visual.md` | El recorrido visual. |
| `notes/` | Observaciones manuales, el experimento previo, las capturas y la historia del repositorio (`git-log.txt`). |

## Cómo se dirigió a la IA

La persona decide, prioriza y verifica; la IA investiga e implementa. Las reglas están en [`00-method.md`](00-method.md): solo lectura hasta aprobar un cambio, el diff antes de escribir, y evidencia para cada afirmación. Las sesiones completas, sin editar, están en `ai-sessions/`.
