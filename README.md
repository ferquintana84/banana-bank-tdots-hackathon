# Banana Bank: un asistente bancario que no afirma lo que no puede verificar

**2.º puesto de 464 participantes, Hackathon t·Dots, octubre 2026**

> My entry to the t·Dots hackathon (Banana Bank challenge), placed 2nd of 464.
> A Next.js banking app with an AI assistant and a simulated bank. I fixed the two defects that put
> customers' money at risk: transfers are now charged once and never reported as failed without confirmation
> from the bank, and no money moves until the customer confirms a proposal. I also added answers about the
> customer's own situation whose every citation is checked by the server. Demo project: not production-ready.
> Built by directing an AI coding assistant: I set the method, made the decisions and verified every change with evidence.

> Un asistente de IA en un banco no falla por falta de inteligencia. Falla cuando afirma cosas que no puede verificar.

## Qué se resolvió

- **Integridad de la transferencia.** Cada orden tiene una referencia estable y se pregunta al banco antes de afirmar nada: un pago se cobra una sola vez y la duda es «pendiente de verificar», nunca «fallida» ([detalle](submission/03-fixes/01-transfer-integrity.md)).
- **Revisión antes de ejecutar.** El asistente solo prepara propuestas; el dinero sale únicamente cuando el titular pulsa Confirmar, y se ejecuta exactamente lo que revisó ([detalle](submission/03-fixes/02-review-before-execution.md)).
- **«¿Y en mi caso?»** El asistente responde a preguntas personales cruzando la política en vigor con los datos del cliente, y separa lo verificado, lo no verificado y el siguiente paso; el servidor valida cada cita ([detalle](submission/04-feature.md)).

## Resultados

| | Al empezar | Al terminar |
|---|---|---|
| Comprobaciones originales del reto | 2 de 11 | 10 de 11 |
| Contando las nuevas | — | 22 de 23 |
| Preguntas de evaluación al asistente | — | 7 de 7, tres ejecuciones cada una |

La única comprobación que no se cumple es la vista de operador (R10), que quedó fuera de alcance por decisión. Todo se mide con scripts reproducibles; la evidencia está en [`submission/03-fixes/evidence/`](submission/03-fixes/evidence/).

> **Aviso.** Es un proyecto de demostración y **no está listo para producción**. La primera condición pendiente es dejar de enviar al proveedor del modelo los IBAN completos de otros clientes. Las condiciones y los límites están en [`submission/06-go-no-go.md`](submission/06-go-no-go.md).

## Cómo ejecutarlo en local

Hace falta Node 24 y una clave propia de OpenAI. `npm run setup` crea `.env.local` a partir de [`.env.example`](.env.example); la clave va ahí y ese archivo nunca se sube.

```sh
# Terminal 1
nvm use                  # Node 24
npm ci
npm run setup            # crea .env.local: poner ahí OPENAI_API_KEY
npm run dev              # aplicación en http://127.0.0.1:3000 y banco simulado en el puerto 4001

# Terminal 2
nvm use
npm run scenario -- normal        # o lost-response, read-unavailable…
npm test                          # 54 pruebas, sin clave
npm run repro                     # 23 comprobaciones del contrato, sin modelo
npm run eval                      # 7 preguntas al asistente; usa la clave y consume cuota
```

`npm run reset`, con los servicios parados, devuelve los datos al estado inicial.

## Por dónde empezar

1. [`submission/07-recorrido-visual.md`](submission/07-recorrido-visual.md): el trabajo entero en 15 capturas.
2. [`submission/06-go-no-go.md`](submission/06-go-no-go.md): la decisión final, qué la respalda y qué falta.
3. [`submission/README.md`](submission/README.md): el índice completo de la entrega.

## Mapa de `submission/`

| Ruta | Contenido |
|---|---|
| `00-method.md` | Tesis, modelos mentales y protocolo de trabajo con la IA. |
| `01-diagnosis.md` | Diagnóstico por inversión: quince hallazgos y por qué se eligieron dos. |
| `02-decisions.md` | Las 17 decisiones, con lo descartado y el motivo. |
| `03-fixes/` | Las dos correcciones, sus listas de aceptación y la evidencia antes/después. |
| `04-feature.md` | La funcionalidad «¿Y en mi caso?». |
| `05-security-audit.md` | Auditoría de seguridad. |
| `06-go-no-go.md` | Decisión final y condiciones para producción. |
| `07-recorrido-visual.md` | El recorrido visual, para leer primero. |
| `notes/` | Observaciones manuales, un experimento previo, capturas y la historia del repositorio tal como se entregó. |
| `ai-sessions/` | Exportaciones legibles de la sesión de trabajo con la IA. |
| `transcript.vtt` | Transcripción del vídeo de demostración. |

La sesión completa con el asistente de IA se entregó al jurado; está disponible bajo petición.

La entrega incluyó un vídeo de demostración para el jurado; está disponible bajo petición.

## Autoría

El código base del reto (la aplicación, el banco simulado, los datos y el enunciado) pertenece a t·Dots y se publica con su permiso. El commit [`5d9c8da`](../../commit/5d9c8da) contiene ese código original sin modificar; todos los commits posteriores son mi trabajo, hecho con un asistente de IA bajo mi dirección (ver [`submission/00-method.md`](submission/00-method.md)). El enunciado original está en [`docs/challenge-readme.md`](docs/challenge-readme.md) y [`docs/challenge.md`](docs/challenge.md).

Este repositorio no se publica con ninguna licencia de código abierto.

## Agradecimientos

Gracias al equipo de t·Dots por un reto tan bien planteado, por su trato cercano durante todo el proceso y por permitirme publicar la entrega.

## Contacto

Fernando Quintana Agüero · [LinkedIn](https://www.linkedin.com/in/ferqa)
