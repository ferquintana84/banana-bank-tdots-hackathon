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
