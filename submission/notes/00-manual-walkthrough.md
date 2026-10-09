# Recorrido manual previo a la lectura del código

- **Autor:** Fernando (observación humana).
- **Fecha:** 2026-10-09.
- **Estado:** observaciones **no verificadas**. Se anotaron usando la aplicación antes de leer el código. Ninguna cuenta como hallazgo hasta que tenga evidencia (`archivo:línea`, reproducción o test) en `01-diagnosis.md`.

## 1. Instalación

- El proyecto requiere Node 24. Tenía Node 22 y lo instalé con nvm.
- `npm ci` informa de 3 vulnerabilidades de severidad alta y de scripts de instalación sin aprobar (`better-sqlite3`, `esbuild`, `fsevents`).
- No ejecuté `npm audit fix`, para mantener intacto el lockfile.
- La instalación y el comando `doctor` funcionaron.

## 2. Resumen (Lucía)

- Los saldos cuadran con los movimientos: 2.400 + 1.750 − 85 − 17 − 15,25 − 13,50 − 11,75 = 4.007,50.
- Las dos cuentas aparecen enmascaradas como «···· 0001». La clienta no puede distinguirlas al elegir la cuenta de origen.

## 3. Documentos

- La interfaz muestra 68 fuentes y el README indica 80 documentos.
- **Hipótesis por verificar:** ¿a qué se debe la diferencia?

## 4. Asistente

- «¿Qué cuentas tengo?»: respuesta correcta.
- «¿Cuándo se exime la comisión de la cuenta Aurora?»: respuesta correcta según `aurora-fees-2026` v2. No usó la versión archivada de 8 EUR.
- No citó ninguna fuente, así que la clienta no puede verificar la respuesta.
- Responde en general, no para Lucía: ella no puede saber si pagará la comisión este mes. Posible idea para la Parte 2.

## 5. Selector de usuario

- Muestra un marcador «Loading...» como si fuera una opción seleccionable. Problema menor de interfaz.

## 6. Operadora (Marta)

- Hay 9 casos abiertos visibles. El README indica 17 en total: 9 abiertos y 8 resueltos.
- **Por confirmar.**
