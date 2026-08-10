# Guía de administración

La sección **Administración** tiene cuatro pestañas: Capacitaciones, Usuarios,
Solicitudes y Catálogos. Administrador y owner las ven todas; el **líder** solo
ve Solicitudes.

## Capacitaciones

### Crear una capacitación
1. Administración → Capacitaciones → **Nueva capacitación**.
2. Captura título, temario/descripción y fecha de la sesión presencial.
3. El link de YouTube es **opcional al crear** — normalmente el video se edita
   y sube después de la sesión. Acepta cualquier formato de link
   (`youtu.be/…`, `youtube.com/watch?v=…`, `live/…`, `shorts/…`) y muestra
   vista previa al pegarlo.
4. **Imagen de portada**: es la imagen que se ve en la tarjeta del dashboard.
   Puedes **subir una imagen** (JPG, PNG o WebP, hasta 5 MB), usar la
   **miniatura del video de YouTube** con un botón, o pegar la dirección de
   una imagen. Si la dejas vacía y la capacitación ya tiene video, se usa la
   miniatura automáticamente; si no hay ni imagen ni video, la tarjeta muestra
   el logotipo.
5. Más abajo, la sección **Examen** (opcional): ver más adelante.
6. Al guardar se genera automáticamente el **QR de asistencia**.

> Sugerencia: crea la capacitación **antes** de la sesión presencial para
> proyectar el QR ese día; agrega el video después con **Editar**.

### Ficha de una capacitación
- **Métricas**: asistentes presenciales, personas que han visto el video,
  completadas y avance promedio.
- **QR**: descargar PNG (para imprimir), copiar link, regenerar (invalida el
  QR anterior; la asistencia registrada se conserva).
- **Transmisión en vivo**: encender, seguir y cerrar el directo (ver abajo).
- **Asistencia presencial**: quién escaneó, de qué área/sucursal y a qué hora.
- **Visualización del video**: por persona: % de avance con barra, tiempo
  visto, fecha en que completó y última actividad. Quien esté viendo el video
  en este momento aparece marcado como **Viendo ahora** (la lista se refresca
  sola cada 30 segundos).
- **Examen**: si lo hay, cuántos lo presentaron y aprobaron, la calificación de
  cada persona y qué preguntas se fallan más.

### Dar una capacitación en vivo

La sesión se transmite por YouTube y se ve **dentro de la plataforma**, que es
lo que permite saber quién la está viendo. Al terminar, la grabación queda
publicada sola: no hay que volver a cargar el video.

1. **En YouTube**: crea la transmisión en el canal de CLARVI y ponla como **no
   listada** (igual que las grabaciones). No hace falta ninguna llave ni
   configuración extra: la plataforma lee la página pública.
2. **En la plataforma**: abre la ficha de la capacitación → tarjeta
   **Transmisión en vivo** → pega el link del canal
   (`https://www.youtube.com/@tucanal`) o el del directo, y pulsa **Activar
   transmisión**.
   - *Probar link* te dice qué encuentra la plataforma en ese link (qué video,
     con qué título y en qué estado) sin guardar nada.
   - Del link **del canal** se lee lo que esté transmitiendo en ese momento;
     del link **del directo**, ese video concreto.
3. En cuanto la transmisión está al aire, la capacitación sube al principio del
   dashboard de todos y les llega el aviso en la campana.
4. Durante la sesión, la tarjeta muestra **quién está viendo**: nombre, área,
   sucursal, a qué hora se conectó y cuánto tiempo lleva. Se actualiza sola
   cada 15 segundos. Si abres la capacitación desde el dashboard, esa misma
   lista aparece debajo del reproductor.
5. Al terminar, la plataforma lo detecta sola (por su cuenta y por el
   reproductor de quienes están viendo) y publica la grabación. Si quieres
   cerrarla tú, usa **Finalizar y publicar grabación**.

Después de eso, la capacitación es un video normal: quien no la vio en vivo la
ve como pendiente y la plataforma mide su avance como siempre. A quien la vio
en vivo se le acredita ese tiempo, así que si estuvo el 90% de la sesión le
queda **completada** sin volver a verla.

**Si algo no cuadra:**

| Lo que ves | Qué pasa |
|---|---|
| "El canal no tiene una transmisión al aire en este momento" | Todavía no arranca en YouTube, o el link del canal está mal escrito. La plataforma sigue revisando sola. |
| "YouTube no confirma el estado desde el servidor…" | YouTube pidió verificación a la consulta del servidor. No hay nada que hacer: en cuanto la transmisión esté al aire se marca sola, y si ya terminó puedes usar *Finalizar y publicar grabación*. |
| Activaste la transmisión equivocada | **Apagar transmisión** y vuelve a activarla con el link correcto. No se pierde nada. |
| Terminó pero la grabación no aparece | *Finalizar y publicar grabación*. Si el video ya estaba cargado a mano, ese se respeta y no se pisa. |

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
- **Roles** (solo visibles para el owner): asignar `colaborador`, `lider`,
  `administrador` u `owner`. Reglas aplicadas por la base de datos:
  - Solo el owner cambia roles.
  - El owner no puede quitarse el rol a sí mismo (evita quedarse sin owner).
  - Un administrador no puede editar la fila de un owner.
- El nombre de usuario y el correo no se pueden cambiar (el inicio de sesión
  depende de ellos).
- La columna **Estado** muestra `Pendiente` o `Rechazado` cuando la cuenta
  todavía no pasó el filtro de aprobación; esas cuentas no entran aunque
  aparezcan activas.

## Solicitudes

La bandeja de altas por **nombre de usuario**, que son las que nadie verificó
(quien se registra con `@clarvi.com` entra directo). La ven el líder, el
administrador y el owner; la pestaña muestra cuántas hay pendientes.

Un **líder solo ve y resuelve a quien se registró en su área**, sin importar
la sucursal: quien lidera Comercial aprueba a los de Comercial estén en Norte,
Sur o Matriz. Compartir sucursal no da alcance sobre las demás áreas de esa
sucursal. Administradores y owner ven todas. Si un área no tiene líder, el
aviso se manda a administradores y owner para que no se quede esperando a
nadie.

- **Aprobar** — la persona entra a la plataforma como colaboradora.
- **Rechazar** — la cuenta queda bloqueada, con un motivo opcional que queda
  registrado. Al intentar entrar se le cierra la sesión con el aviso.

Debajo queda el historial de lo ya resuelto: quién lo resolvió, cuándo y con
qué motivo. Reglas de la base de datos:

- Una solicitud se resuelve **una sola vez**; para revertir un rechazo hay que
  dar de alta la cuenta otra vez.
- Nadie puede aprobar su propio registro.
- El líder **solo** aprueba o rechaza: no edita nombres, áreas, roles ni
  desactiva cuentas.

> No hay correo (falta SMTP), pero sí **aviso dentro de la plataforma**: al
> líder le aparece en la campana del encabezado la próxima vez que entre.

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
