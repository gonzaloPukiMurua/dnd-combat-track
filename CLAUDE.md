@AGENTS.md

## Formato de reporte al cerrar una tarea

Aplica a cualquier tarea que toque más de un archivo, o cualquier cosa relacionada a
autorización / datos compartidos.

Todo reporte de cierre de tarea sigue este orden — no reordenar, no resumir de más los
primeros dos puntos aunque el resto sea largo:

1. **TL;DR de 2-3 líneas, primero que nada**: qué cambió, qué es lo más riesgoso de este
   cambio (si algo toca autorización, un cálculo compartido, o una migración), y qué quedó
   sin verificar. Esto va primero porque si el mensaje se corta al pegarlo, esto es lo único
   que necesito ver igual.

2. **Confirmado vs. asumido, explícito por cada afirmación** — no escribir "funciona" o
   "está resuelto" sin decir CÓMO se sabe. Tres categorías, usalas literalmente:
   - "Verificado en vivo: [comando/trace exacto + resultado exacto]"
   - "Verificado por lectura de código: [qué archivo/línea revisaste]"
   - "NO verificado: [por qué — sin navegador, sin acceso a X, etc.]"
   Nunca mezcles las tres bajo un solo "✅ funciona".

3. **Cualquier cosa que toque autorización, un cálculo/función compartida entre varios
   lugares (ej. computeTurnOrder, computeAcTotal, cualquier guard de action-guards.ts), o un
   fallback/default que se aplica en más de un sitio**: listar CADA archivo/función donde se
   aplicó, uno por uno, no resumir como "lo actualicé en los lugares correspondientes". Si
   tocaste 3 lugares, nombralos los 3.

4. **Alcance**: ¿tocaste solo lo que el prompt pedía? Si tocaste algo más (aunque sea
   chico), decilo explícito y por qué, ANTES de la lista de archivos, no enterrado en el
   medio.

5. Recién después: el detalle archivo por archivo, comandos de verificación con su output
   real, y el estado de git.

Esto no reemplaza las reglas ya existentes de parar y preguntar ante ambigüedad — es sobre
CÓMO reportar lo que ya se decidió hacer, no sobre cuándo pedir permiso.
