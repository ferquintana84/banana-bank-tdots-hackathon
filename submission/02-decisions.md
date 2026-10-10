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

## D7. Qué puede usar el script de reproducción

- **Fecha:** 2026-10-09.
- **Decisión:** `scripts/repro.ts` es un arnés de pruebas, no código de la aplicación. Puede usar la API administrativa del banco (`/admin/reset` y `/admin/scenario`) para partir siempre del mismo estado, y puede abrir `.data/app.sqlite` en modo de solo lectura para comprobar lo que la aplicación guarda. Carga la configuración en el propio proceso, igual que `scripts/scenario.ts`, y nunca imprime ni registra el valor de ningún secreto. Dos condiciones: el código de la aplicación (`src/` y `app/`) nunca llama a la API administrativa, y nada abre nunca la base de datos del banco.
- **Alternativas descartadas:** no restablecer el banco entre casos; renunciar a las comprobaciones que necesitan leer la base de datos de la aplicación (R8 y la parte informativa de R10); usar `npm run reset` desde el script.
- **Motivo:** el contrato prohíbe la API administrativa a la aplicación de cliente, no a una utilidad de pruebas (`docs/contracts.md:54`), y el propio proyecto la usa para los escenarios (`scripts/scenario.ts:9-13`). Sin restablecer el banco el script no es repetible: Diego se queda sin saldo tras la primera ejecución. `npm run reset` exige parar los servicios y borra también las conversaciones locales.

## D8. Petición idéntica mientras otra está pendiente de verificar

- **Fecha:** 2026-10-09.
- **Decisión:** cuando un cliente pide una transferencia idéntica a otra suya que está en `pending_verification`, la aplicación no la bloquea ni la envía a ciegas: primero concilia la pendiente con una consulta al banco. Si sigue pendiente, la nueva no se envía y se explica al cliente. Si es de verdad un segundo pago distinto, exige una confirmación explícita, que aportará Fix 2.
- **Alternativas descartadas:** bloquear toda petición idéntica mientras haya una pendiente; tratar siempre la petición idéntica como una intención nueva y enviarla.
- **Motivo:** la regla del contrato tiene dos caras (`docs/contracts.md:8`): reintentar una intención no multiplica sus efectos, y dos intenciones legítimas pueden tener el mismo importe y destino. Bloquear incumple la segunda si el banco tarda en responder; enviar siempre incumple la primera, y es justo el caso de los datos iniciales, en el que a Lucía se le dijo «puedes intentarlo de nuevo». Conciliar primero evita los duplicados silenciosos sin dejar ningún pago legítimo bloqueado indefinidamente.

## D9. El agente recibe el estado verificado de las transferencias de la conversación

- **Fecha:** 2026-10-09.
- **Decisión:** la parte (b) de Fix 1 amplía su alcance: en cada turno, las instrucciones del agente incluyen las transferencias ya pedidas en esa conversación con su estado verificado en el banco (completada, no ejecutada o pendiente de verificar), y la indicación de no repetir ninguna salvo que el cliente pida con claridad un segundo pago distinto.
- **Alternativas descartadas:** dejar el hueco abierto hasta Fix 2; bloquear en el servidor toda transferencia idéntica a una ya completada.
- **Motivo:** al preparar la prueba de aceptación apareció un hueco real. D8 solo protege mientras una transferencia está pendiente. Una vez que la consulta la resuelve como completada, un cliente que escribe «inténtalo de nuevo» abre un mensaje nuevo, el modelo no sabe que el pago anterior se completó y puede enviar un segundo. Bloquear en el servidor incumpliría la regla de que dos intenciones legítimas pueden ser idénticas (`docs/contracts.md:8`). Dar al agente los hechos verificados reduce el riesgo sin bloquear nada, pero depende del modelo: la garantía firme es la confirmación explícita de Fix 2.

## D10. «La comprobación ha fallado» no es «no hay nada que contar»

- **Fecha:** 2026-10-09.
- **Decisión:** cuando la conciliación de transferencias falla, el servidor devuelve `null` en lugar de una lista vacía, y la interfaz conserva lo que estaba mostrando. Cada estado de una transferencia se muestra en un solo sitio: una transferencia pendiente aparece solo en el panel «Transfers checked with the bank», donde la misma intención se sustituye cuando el banco responde. Además, el aviso amarillo se borra al cambiar de página; los avisos de error se dejan como estaban.
- **Alternativas descartadas:** mantener la lista vacía ante un fallo de comprobación; mostrar el estado pendiente a la vez en el aviso y en el panel; borrar también los avisos de error al cambiar de página; dejar las observaciones O2 y O3 para Fix 2.
- **Motivo:** en la prueba de aceptación humana el aviso de pendiente y el panel se contradecían en pantalla (O2), y el aviso seguía al cliente a otra página (O3) (`03-fixes/01-acceptance-checklist.md`). Al corregirlo apareció un hueco: una lista vacía tras un fallo habría borrado el aviso de pendiente en silencio. Es la misma lección del `.catch` silencioso de la parte (b): un sistema que calla ante un fallo está afirmando algo que no ha verificado. O2 y O3 se resuelven en Fix 1 porque afectan a sus propios estados y porque Fix 2 reutiliza ese mismo aviso.

## D11. Una petición idéntica se convierte en una propuesta con advertencia

- **Fecha:** 2026-10-09.
- **Decisión:** con la confirmación explícita de Fix 2, una petición idéntica a otra transferencia del cliente ya no se retiene. Se crea una propuesta que lleva una advertencia en la tarjeta de revisión, y solo la confirmación del cliente envía un segundo pago. La advertencia aparece cuando la otra transferencia está pendiente de verificar (antes se concilia con el banco) o se completó en las últimas 24 horas. Esta decisión modifica D8.
- **Cambio de criterio en el caso R15 del script.**
  - **Criterio anterior (D8, Fix 1):** una petición idéntica mientras otra está pendiente no envía un segundo pago; se concilia la pendiente y se explica al cliente. El caso pasaba con un solo cargo y un mensaje que decía que no se había enviado de nuevo.
  - **Criterio nuevo (D11, Fix 2):** la segunda petición idéntica no mueve dinero por sí sola, devuelve `requires_confirmation`, y su propuesta lleva la advertencia. Un segundo cargo solo puede ocurrir tras una confirmación explícita, y entonces es legítimo.
  - **Evidencia ya registrada:** los archivos de `03-fixes/evidence/` anteriores a Fix 2 se dejan como están; reflejan el criterio anterior, que era el vigente cuando se registraron.
- **Alternativas descartadas:** mantener D8 tal cual y seguir reteniendo la petición idéntica; advertir solo cuando la otra transferencia está pendiente, sin cubrir las completadas; bloquear los pagos idénticos durante 24 horas.
- **Motivo:** D8 era la mejor protección posible sin una confirmación explícita, pero dejaba sin enviar un pago que podía ser legítimo. Con la revisión de Fix 2 ya no hace falta elegir: el cliente ve la advertencia y decide. Extenderla a las transferencias completadas en 24 horas cierra la observación humana O1 (un segundo clic en el formulario tras un pago completado) y el hueco que D9 solo cubría con instrucciones al modelo. Bloquear incumpliría la regla de que dos intenciones legítimas pueden ser idénticas (`docs/contracts.md:8`).

## D12. El resultado escrito en la conversación no se repite como aviso

- **Fecha:** 2026-10-09.
- **Decisión:** cuando el resultado de confirmar o cancelar una propuesta se escribe en la conversación que el cliente tiene abierta en pantalla, la interfaz no muestra además el aviso amarillo. El servidor indica en qué conversación lo ha escrito y la página decide. Si el cliente está en otra página, o la propuesta no nació en una conversación, el aviso se muestra como antes. El panel «Transfers checked with the bank» se mantiene: es el sitio que acompaña al cliente de una página a otra (D10), no un duplicado. En el mismo cambio se corrige la redacción de la advertencia de pago idéntico: «on {fecha} at {hora}».
- **Alternativas descartadas:** dejar el resultado en los dos sitios; quitar siempre el aviso amarillo; dejar de escribir el resultado en la conversación; retirar también el panel cuando la conversación ya muestra el resultado.
- **Motivo:** es el mismo principio de D10, cada estado en un solo sitio. Al verificar las capturas de la prueba de aceptación de Fix 2, el mismo resultado aparecía a la vez en el aviso y en la burbuja del chat (O5); no se contradecían, pero dos sitios para un mismo hecho acaban divergiendo. La conversación es el sitio que perdura y el que verá un operador, así que es el aviso el que se retira.

## D13. Las citas se validan por construcción

- **Fecha:** 2026-10-10.
- **Decisión:** en la Parte 2, el modelo devuelve cada respuesta con una estructura fija (verificado, no verificado y siguiente paso) y el servidor comprueba cada cita antes de guardarla. Una fuente solo vale si es un documento recuperado en ese turno y en vigor, o un dato del banco que una herramienta devolvió en ese turno. Una afirmación «verificada» sin fuente válida, o con un importe en euros que no aparece en su fuente, pasa a «no verificada». Antes de construirlo se hace un experimento pequeño para confirmar que el modelo configurado admite respuesta estructurada junto con herramientas.
- **Alternativas descartadas:** pedir las fuentes solo con instrucciones al modelo; mostrar como fuentes todos los fragmentos recuperados, sin ligarlos a cada afirmación.
- **Ampliación (2026-10-10):** el texto que lee el cliente también se comprueba, no solo las afirmaciones. Si contiene un importe en euros que no aparece en ninguna fuente, en ningún resultado de herramienta ni en la conversación, el servidor reconstruye la respuesta a partir de la evidencia validada. Con esto, «ningún importe inventado» deja de ser algo que medimos y pasa a ser una garantía del servidor. Coste asumido: una cifra calculada legítimamente (por ejemplo, un saldo tras un pago) también se reconstruye; preferimos una respuesta más seca a una cifra sin respaldo.
- **Motivo:** es el mismo principio de Fix 2, garantizado por construcción y no por instrucciones. Unas instrucciones no impiden que el modelo cite algo que no ha leído; un validador sí. Límite declarado: el servidor comprueba que la fuente existe, está en vigor y contiene las cifras citadas, no que el modelo haya interpretado bien el texto.

## D14. Solo se recuperan documentos en vigor

- **Fecha:** 2026-10-10.
- **Decisión:** la búsqueda descarta los documentos cuya vigencia no incluye la fecha de referencia, 2026-09-24. Las preguntas históricas («¿cuál era la comisión en julio?») quedan como límite declarado: el asistente dice que solo puede confirmar las condiciones vigentes y ofrece un siguiente paso. La versión y la vigencia de cada fuente se toman del manifiesto en el momento de buscar, sin regenerar el índice.
- **Alternativas descartadas:** seguir recuperando los documentos archivados marcados como históricos y prohibir citarlos para condiciones vigentes; corregir el troceado y regenerar el índice; añadir un umbral de relevancia.
- **Motivo:** es el alcance más pequeño que impide que una condición archivada pase por vigente, y hoy es el día de entrega. Unir con el manifiesto no consume cuota de embeddings y funciona con un índice suministrado por otro. Recuperar archivos marcados como históricos es mejor producto, pero añade un camino más que verificar.
