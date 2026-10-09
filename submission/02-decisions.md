# Registro de decisiones

Cada entrada sigue el mismo formato: fecha, decisión, alternativas descartadas y motivo. Las entradas se añaden al final y no se reescriben: si una decisión cambia, se añade una entrada nueva que referencia a la anterior.

## D1. Idioma de la documentación

- **Fecha:** 2026-10-09.
- **Decisión:** la documentación de `submission/` se escribe en español neutro y profesional (España), con formato numérico español. El código, los identificadores, los nombres de archivo y los mensajes de commit se escriben en inglés.
- **Alternativas descartadas:** escribir toda la entrega en inglés; traducir también identificadores y mensajes de commit al español.
- **Motivo:** Los organizadores (t·Dots, Valencia) y las empresas a las que se conecta a los participantes son españolas, y su comunicación con los participantes es en español. Además, es el idioma en el que Fernando explica y defiende mejor sus decisiones. El inglés en el código mantiene la coherencia con el proyecto recibido.

## D2. No ejecutar `npm audit fix`

- **Fecha:** 2026-10-09.
- **Decisión:** no se ejecuta `npm audit fix`. Las 3 vulnerabilidades de severidad alta que informa `npm ci` quedan anotadas como observación sin verificar en `notes/00-manual-walkthrough.md`.
- **Alternativas descartadas:** ejecutar `npm audit fix` (o `--force`) durante la instalación.
- **Motivo:** mantener intacto el lockfile. El enunciado pide incluirlo en la entrega para reproducir el trabajo (`docs/challenge.md:38`), y cambiar dependencias antes del diagnóstico impediría distinguir los problemas del proyecto recibido de los que introdujéramos nosotros.

## D3. Importar el método desde `CLAUDE.md`

- **Fecha:** 2026-10-09.
- **Decisión:** `CLAUDE.md` importa `submission/00-method.md` con la línea `@submission/00-method.md`, de modo que cada sesión nueva carga la tesis y el protocolo de trabajo.
- **Alternativas descartadas:** repetir el protocolo a mano al inicio de cada sesión; escribirlo en `AGENTS.md`.
- **Motivo:** el protocolo debe aplicarse siempre, sin depender de la memoria de nadie. `AGENTS.md` lo gestiona `next dev`, mientras que `CLAUDE.md` no se reescribe mientras `AGENTS.md` contenga el bloque gestionado (`node_modules/next/dist/server/lib/generate-agent-files.js:99-103`).

## D4. Enfoque: profundidad antes que amplitud

- **Fecha:** 2026-10-09.
- **Decisión:** abordamos uno o dos problemas de alto daño a fondo, en lugar de muchos de forma superficial. Cada corrección se acepta con una historia real de cliente del lunes (por ejemplo, «Lucía envía 85 EUR y se corta la conexión»), no solo con tests aislados.
- **Alternativas descartadas:** dejar que varios agentes corrijan todo en paralelo.
- **Motivo:** el enunciado valora las correcciones bien elegidas y bien evidenciadas (`docs/challenge.md:86`) y pide comprobar los cambios con conversaciones y operaciones nuevas (`docs/challenge.md:13`). Al invertir la revisión («¿cómo fallará la mayoría de las entregas?»), la respuesta apunta a correcciones superficiales y sin evidencia.

## D5. Prioridades de la Parte 1

- **Fecha:** 2026-10-09.
- **Decisión:** se abordan dos correcciones, en este orden. Fix 1: integridad de la transferencia ante la incertidumbre (H1, H2 y H3 de `01-diagnosis.md`; reglas 4 y 5 del contrato). Fix 2: revisión explícita antes de ejecutar (H4 y H5; regla 3), que cubre también la cuenta de origen ambigua (H14).
- **Alternativas descartadas:** priorizar la fundamentación documental (H6-H9) como segunda corrección; corregir la vista de operador y el registro de evidencia (H10, H11) dentro de la Parte 1; corregir los detalles menores de interfaz (H15), incluida la máscara del IBAN.
- **Motivo:** Fix 1 y Fix 2 son los fallos con mayor daño (dinero), ocurren en el camino normal con el perfil por defecto del banco y se verifican de forma determinista con los escenarios del simulador, sin depender del modelo. La fundamentación documental es muy probable, pero su verificación depende del modelo y encaja mejor como base de la Parte 2 (D6). La vista de operador queda documentada como pendiente. La hipótesis del enmascarado se rebajó a detalle menor porque la evidencia la corrigió (`01-diagnosis.md`, sección 6).

## D6. Dirección de la Parte 2 y lenguaje común de confianza

- **Fecha:** 2026-10-09.
- **Decisión:** la Parte 2 es «¿Y en mi caso?»: el asistente responde a preguntas personales cruzando la política vigente con los movimientos reales del cliente, y cada afirmación lleva su fuente. Sus cimientos son quitar la instrucción que pide inventar (H6) y hacer visibles las fuentes (H7). Toda la entrega usa un mismo lenguaje de confianza con tres elementos: verificado, no verificado y siguiente paso. Fix 1 lo introduce para el dinero con el estado «pendiente de verificar»; la Parte 2 lo aplica a la información.
- **Alternativas descartadas:** el expediente de caso con evidencia para el operador (candidata B), que queda como opcional si sobra tiempo; tratar H6 y H7 como correcciones independientes de la Parte 1.
- **Motivo:** la candidata A es visible para el cliente, nace de una observación propia del recorrido manual (observación 4) y es la aplicación directa de la tesis a la información. Un único lenguaje para el dinero y para la información hace que correcciones y funcionalidad se refuercen entre sí en lugar de ser piezas sueltas.
