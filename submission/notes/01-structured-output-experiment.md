# Experimento: respuesta estructurada con herramientas

- **Fecha:** 2026-10-10T05:38:45.390Z
- **Modelo configurado:** gpt-6-luna
- **Pregunta:** «Will I pay the Aurora account fee this month?», con una fuente y una herramienta fijas.
- **Script:** `scripts/experiment-structured-answer.ts`

| Intento | Llamó a la herramienta | Respuesta válida según la estructura | Cita el documento | Cita el movimiento | No verificadas | Siguiente paso | Tokens | Segundos |
|---|---|---|---|---|---|---|---|---|
| 1 | sí (1) | sí | sí | sí | 1 | sí | 1261 | 5.5 |
| 2 | sí (1) | sí | sí | sí | 1 | sí | 1262 | 4.8 |
| 3 | sí (1) | sí | sí | sí | 1 | sí | 1204 | 3.7 |

**Ejemplo de respuesta (intento válido):**

```json
{
  "answer": "Based on the movements available, the September salary meets the EUR 1,200 requirement, but I can verify only one card purchase—not the required three settled purchases. So I can’t confirm whether the fee will be waived. The monthly fee is EUR 6 if both requirements aren’t met.",
  "verified": [
    {
      "claim": "A salary payment of EUR 1,750 was recorded in September, meeting the EUR 1,200 salary requirement.",
      "sources": [
        {
          "kind": "movement",
          "id": "movement-lucia-0"
        }
      ]
    },
    {
      "claim": "One purchase-like movement for groceries, amounting to EUR 11.75, was recorded in September.",
      "sources": [
        {
          "kind": "movement",
          "id": "movement-lucia-1"
        }
      ]
    },
    {
      "claim": "The Aurora fee is EUR 6 per month and is waived only if both requirements are met in the same month: salary of at least EUR 1,200 and three settled card purchases.",
      "sources": [
        {
          "kind": "document",
          "id": "aurora-fees-2026"
        }
      ]
    }
  ],
  "notVerified": [
    {
      "claim": "Whether the fee will be waived this month.",
      "reason": "The available movements do not establish that three settled card purchases were made in September."
    }
  ],
  "nextStep": "Check your September card activity for two additional settled purchases."
}
```
