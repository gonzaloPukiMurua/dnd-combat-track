@AGENTS.md

## Operaciones destructivas de base de datos — jamás sin confirmación explícita

Ningún comando que pueda borrar o truncar datos contra DATABASE_URL se ejecuta sin que el
usuario lo confirme explícitamente en ESE momento, sin importar qué problema esté tratando
de resolver (un migrate dev que falla no interactivo, un P3005, lo que sea). Esto incluye
sin excepción:
- prisma migrate reset
- prisma db push --force-reset o --accept-data-loss
- TRUNCATE, DROP TABLE, DROP SCHEMA, DROP DATABASE
- Cualquier DELETE/deleteMany sin WHERE, o con un WHERE que no esté acotado a IDs
  específicos verificados antes de ejecutar

Si un flujo de trabajo (migración, seed, verificación) parece requerir uno de estos comandos
para "destrabar" un error, la respuesta correcta es PARAR y preguntarle al usuario cómo
quiere proceder — nunca ejecutarlo como solución de paso intermedio, ni siquiera con la
intención de revertirlo después. No existe una versión "segura" de estos comandos contra una
base compartida real.

Regla adicional: cualquier script de verificación/diagnóstico que toque DATABASE_URL debe
confirmar primero, imprimiéndolo, contra qué base está apuntando (host/nombre de DB de la
URL, sin exponer credenciales) antes de escribir o borrar nada — un typo de entorno no debe
poder pasar desapercibido.

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
