# Guía de administración

La sección **Administración** (visible solo para administradores y el owner)
tiene tres pestañas: Capacitaciones, Usuarios y Catálogos.

## Capacitaciones

### Crear una capacitación
1. Administración → Capacitaciones → **Nueva capacitación**.
2. Captura título, temario/descripción y fecha de la sesión presencial.
3. El link de YouTube es **opcional al crear** — normalmente el video se edita
   y sube después de la sesión. Acepta cualquier formato de link
   (`youtu.be/…`, `youtube.com/watch?v=…`, `live/…`, `shorts/…`) y muestra
   vista previa al pegarlo.
4. **Áreas a las que aplica**: marca las áreas que deben verla. Si no marcas
   ninguna queda como **Todo el personal**, que es lo correcto para inducción,
   código de conducta y similares. Una capacitación puede aplicar a varias.
5. Más abajo, la sección **Examen** (opcional): ver más adelante.
6. Al guardar se genera automáticamente el **QR de asistencia**.

> Sugerencia: crea la capacitación **antes** de la sesión presencial para
> proyectar el QR ese día; agrega el video después con **Editar**.

> Ojo con las áreas: cada persona ve en su dashboard solo las capacitaciones de
> su área más las generales. Si alguien cambia de área, deja de ver las de la
> anterior aunque ya las hubiera completado (el registro no se pierde: sigue
> apareciendo en la ficha de la capacitación). Y si alguien de otra área asiste
> a la sesión y escanea el QR, su asistencia se registra igual, pero la
> capacitación no le aparecerá en el dashboard.

### Ficha de una capacitación
- **Áreas**: a quiénes aplica, junto al título.
- **Métricas**: asistentes presenciales, personas que han visto el video,
  completadas y avance promedio.
- **QR**: descargar PNG (para imprimir), copiar link, regenerar (invalida el
  QR anterior; la asistencia registrada se conserva).
- **Asistencia presencial**: quién escaneó, de qué área/sucursal y a qué hora.
- **Visualización del video**: por persona: % de avance con barra, tiempo
  visto, fecha en que completó y última actividad.
- **Examen**: si lo hay, cuántos lo presentaron y aprobaron, la calificación de
  cada persona y qué preguntas se fallan más.

### Examen (opcional)

Se arma en el mismo formulario de la capacitación, en **Nueva** o en **Editar**.

1. Ajusta el examen: calificación mínima para aprobar (80% por omisión),
   intentos permitidos (vacío = ilimitados), si exige haber terminado el video
   y si quieres revolver preguntas y opciones.
2. Agrega preguntas una por una eligiendo su tipo:
   - **Opción múltiple** — varias opciones, una correcta.
   - **Selección múltiple** — varias correctas; se califica proporcionalmente y
     marcar de más resta.
   - **Verdadero o falso**.
   - **Relacionar conceptos** — capturas las parejas; al usuario se le muestra
     la columna derecha revuelta. Puedes agregar *distractores*: conceptos que
     aparecen pero no son la respuesta de nadie.
   - **Ordenar pasos** — los capturas en el orden correcto; al usuario se le
     muestran revueltos.
   - **Completar la frase** — escribes la frase marcando los huecos con
     `{{1}}`, `{{2}}` y las respuestas aceptadas de cada uno, separadas por
     coma. No importan mayúsculas, acentos ni espacios de más.
3. La **explicación** de cada pregunta es opcional y se le muestra a la persona
   al terminar, junto con la respuesta correcta.
4. Marca **Publicado** cuando esté listo. Mientras no lo esté, nadie más lo ve.

Puedes editar el examen después de que ya hubo intentos: los resultados
anteriores no cambian, porque cada respuesta guardó copia de su pregunta.

> Ojo: al terminar, la persona ve cuáles falló y la respuesta correcta. Con
> intentos ilimitados eso significa que a partir del segundo intento ya conoce
> las respuestas. Si el examen es de cumplimiento, fija los intentos.

### Eliminar
Borra también su asistencia, el progreso de todos los usuarios y el examen con
sus resultados (confirmación previa). Si solo quieres ocultarla temporalmente,
mejor quita el link del video.

## Usuarios

- Búsqueda por nombre/correo/usuario y filtros por área, sucursal, rol y estado.
- **Editar** permite corregir nombre, área y sucursal, y activar/desactivar la
  cuenta. Una cuenta desactivada no puede usar la plataforma (al intentar
  entrar se le cierra la sesión con aviso).
- **Roles** (solo visibles para el owner): asignar `usuario`,
  `administrador` u `owner`. Reglas aplicadas por la base de datos:
  - Solo el owner cambia roles.
  - El owner no puede quitarse el rol a sí mismo (evita quedarse sin owner).
  - Un administrador no puede editar la fila de un owner.
- El nombre de usuario y el correo no se pueden cambiar (el inicio de sesión
  depende de ellos).

## Catálogos

Áreas y sucursales que aparecen en el formulario de registro y en los reportes.

- **Agregar**: escribe el nombre y pulsa Agregar.
- **Renombrar**: afecta cómo se muestra en todos lados (histórico incluido).
- **Desactivar**: deja de aparecer para nuevos registros; los usuarios que ya
  la tienen asignada no se tocan. No hay borrado definitivo a propósito.

## Contraseñas

- Cada quien cambia la suya en **Mi perfil** (menú del usuario, arriba a la
  derecha).
- Para cuentas **por usuario** (sin correo) no existe "olvidé mi contraseña":
  no hay bandeja donde recibir el link. Mientras no haya SMTP configurado, la
  vía de rescate es que un administrador de la base de datos la restablezca
  (Supabase Dashboard → Authentication → Users → Reset password / o SQL).
