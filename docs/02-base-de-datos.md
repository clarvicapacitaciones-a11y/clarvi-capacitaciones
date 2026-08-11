# Base de datos

Proyecto Supabase: `clarvi-capacitaciones` (`hwotaytvjjlvwkpnhotd`), org CLARVI,
región `us-east-1`. El esquema completo está en `supabase/migrations/` y ya se
aplicó al proyecto.

## Tablas

### `areas` / `sucursales`
Catálogos administrables. No se eliminan filas (hay historial que las
referencia); se marcan `activo = false` para que dejen de aparecer en el
registro de usuarios.

### `profiles`
Una fila por usuario, creada automáticamente al registrarse (trigger
`handle_new_user` sobre `auth.users`).

| Columna | Notas |
|---|---|
| `id` | = `auth.users.id` |
| `full_name` | nombre para mostrar |
| `email` | solo cuentas con correo real; `null` en cuentas por usuario |
| `username` | solo cuentas por usuario; **inmutable** (el login depende de él) |
| `auth_method` | `email` \| `username` |
| `area_id`, `sucursal_id` | FK a catálogos |
| `role` | `owner` \| `administrador` \| `lider` \| `colaborador` |
| `is_active` | cuentas desactivadas no pueden usar la plataforma (guard del router) |
| `approval_status` | `pendiente` \| `aprobado` \| `rechazado`; las altas por usuario nacen pendientes, las de correo aprobadas |
| `approved_by`, `approved_at` | quién resolvió la solicitud y cuándo; **los sella el trigger**, no el cliente |
| `rejection_reason` | motivo opcional del rechazo |

El enum `user_role` cambió en la migración **0010**: `usuario` se renombró a
`colaborador` (`alter type … rename value`, no toca los datos) y se agregó
`lider`. Va en una migración aparte porque Postgres no permite *usar* un valor
de enum recién agregado en la misma transacción en que se agregó; por eso la
0011 compara contra `'lider'` como texto.

### `trainings`
| Columna | Notas |
|---|---|
| `youtube_video_id` | ID de 11 caracteres; `null` hasta que el video esté editado y publicado |
| `qr_token` | uuid **distinto del id**, es lo que codifica el QR; regenerable |
| `session_date` | fecha de la sesión presencial |
| `duration_seconds` | opcional; la duración real la reporta el reproductor |
| `cover_image_url` | portada de la tarjeta; `null` = se usa la miniatura de YouTube |
| `live_enabled` | interruptor del admin: mientras esté encendido se consulta el estado del directo |
| `live_source_url` | canal o link del directo que se lee (sin API de Google) |
| `live_video_id` | video que está transmitiendo; al terminar se copia a `youtube_video_id` |
| `live_status` | `inactiva` · `programada` · `en_vivo` · `finalizada` |
| `live_title` | título que tiene la transmisión en YouTube |
| `live_scheduled_at` / `live_started_at` / `live_ended_at` | hora anunciada, de arranque y de cierre |
| `live_checked_at` | última lectura de la página de YouTube (antirebote) |
| `live_error` | por qué falló la última lectura, para que el admin lo vea |

### `app_settings` (ajustes de la plataforma)
Tabla llave/valor. Hoy solo guarda `youtube_channel_url`: el canal del que se
leen las transmisiones, para que se configure **una vez** y no por
capacitación. La lee cualquiera con sesión (es un link público); solo
`administrador` y `owner` la escriben.

Ojo con `trainings.live_video_id`: tiene un **índice único parcial**
(`uq_trainings_live_video`, donde no es null). "Revisar canal" es un botón y se
va a pulsar dos veces seguidas; sin eso, la segunda pulsación crearía una
tarjeta duplicada de la misma transmisión.

### `live_attendance` (quién ve la transmisión en vivo)
`unique (training_id, user_id)` — una fila por persona y transmisión. Solo la
escribe `live_heartbeat`; **no tiene políticas de escritura**, así que el
cliente no puede inventarse tiempo.

| Columna | Notas |
|---|---|
| `joined_at` / `last_seen_at` | cuándo entró y cuándo fue su último latido (cada 15 s) |
| `watched_seconds` | lo suma el servidor entre latidos, y solo si el hueco es ≤ 90 s |
| `is_watching` | lo apaga el reproductor al salir; con el latido vencido (>45 s) también cuenta como desconectado |
| `video_id` | qué transmisión vio (por si la capacitación tuviera otra después) |
| `credited_at` | cuándo ese tiempo se convirtió en progreso de la grabación |
| `area_id` / `sucursal_id` | congelados al conectarse, igual que en `attendance` |

### Bucket `training-covers` (portadas)
Bucket público de Storage para las portadas que sube el admin. Lectura
abierta (la imagen se muestra en el dashboard de todos), escritura solo para
`administrador` y `owner` vía políticas sobre `storage.objects`. Límite de
5 MB y solo `image/jpeg`, `image/png`, `image/webp` y `image/avif`.

### `attendance` (asistencia presencial vía QR)
`unique (training_id, user_id)` — un check-in por persona por capacitación.
`area_id`/`sucursal_id` se **congelan al momento del escaneo**: si la persona
cambia de área después, el reporte histórico no cambia.

### `watch_progress` (visualización del video)
`unique (training_id, user_id)` — una fila por persona por capacitación.

| Columna | Notas |
|---|---|
| `watched_ranges` | jsonb `[[inicio,fin],…]` en segundos, fusionados y sin traslape |
| `watched_seconds` | total cubierto; **monotónico** (nunca baja) |
| `watch_percent` | columna generada: `watched_seconds / duración * 100` (tope 100) |
| `video_duration_seconds` | reportada por el reproductor en el primer heartbeat |
| `completed_at` | la fija el trigger al cruzar 90%; **nunca se limpia** |
| `session_count` | +1 cuando pasan >30 min entre heartbeats (sesiones distintas) |
| `last_position_seconds` | para "continuar donde te quedaste" |

### `exams` (examen de la capacitación)
`training_id` **unique**: un examen por capacitación, se borra con ella.

| Columna | Notas |
|---|---|
| `is_published` | nace en `false`; mientras esté así el examen no existe para los usuarios |
| `passing_percent` | calificación mínima para aprobar (default 80) |
| `max_attempts` | `null` = intentos ilimitados |
| `requires_video_completed` | si es `true`, exige ≥90% visto antes de aplicar |
| `shuffle_questions` | revuelve preguntas y opciones por intento |

### `exam_questions`
Una fila por pregunta, ordenada por `position` (unique por examen,
`deferrable` para poder reordenar dentro de una transacción).

`type` es el enum `question_type`: `multiple_choice`, `multiple_select`,
`true_false`, `matching`, `ordering`, `fill_blank`.

`content` es lo que se le muestra al usuario y `answer_key` la respuesta
correcta. Su forma depende del tipo y la valida `assert_question_shape`:

| tipo | `content` | `answer_key` |
|---|---|---|
| `multiple_choice` | `{options:[{id,text}]}` | `{option_id}` |
| `multiple_select` | `{options:[{id,text}]}` | `{option_ids:[…]}` |
| `true_false` | `{}` | `{value: true\|false}` |
| `matching` | `{left:[{id,text}], right:[{id,text}]}` | `{pairs:{left_id: right_id}}` |
| `ordering` | `{items:[{id,text}]}` **en el orden correcto** | `{order:[id,…]}` |
| `fill_blank` | `{text:"… {{1}} …", blanks:[{id}], word_bank?}` | `{blanks:{"1":[aceptadas…]}}` |

**`answer_key` nunca llega al navegador de un usuario**: la tabla solo es
legible por admin/owner y el usuario recibe las preguntas saneadas por RPC.

### `exam_attempts`
Un renglón por intento. Se crea al abrir el examen y se cierra al entregar; uno
sin `submitted_at` es un intento abierto, que se **reanuda** en vez de
duplicarse (recargar la página no quema un intento). `score_percent` es columna
generada, como `watch_percent`.

### `exam_attempt_answers`
La respuesta de cada pregunta con su calificación. `question_snapshot` congela
enunciado, opciones y respuesta correcta del momento en que se contestó: si el
admin edita o borra la pregunta después, **el reporte histórico no cambia**
(mismo criterio que congelar área/sucursal en `attendance`).

### `notifications` (avisos dentro de la plataforma)
Sin SMTP, el aviso vive en la campana del encabezado. Las filas **solo las
escribe la base de datos** (funciones `security definer` disparadas por
triggers): no hay política de `insert`, y un trigger deja que el cliente
cambie únicamente `read_at`.

| Columna | Notas |
|---|---|
| `user_id` | destinatario; cada quien lee solo los suyos |
| `type` | `solicitud_registro` \| `registro_aprobado` |
| `link` | ruta interna de la app (`/admin/solicitudes`), nunca una URL externa |
| `subject_id` | de qué habla el aviso; permite darlo por atendido cuando **otro** lo resuelve |
| `read_at` | `null` = sin leer (alimenta el contador de la campana) |

Quién recibe qué:

- **Nuevo registro pendiente** → los líderes de esa área (de cualquier
  sucursal). Si el área no tiene líder, el aviso va a administradores y owner
  para que la solicitud no se quede esperando a nadie.
- **Solicitud resuelta** → se marcan como leídos los avisos de esa solicitud
  para los demás aprobadores, y quien se registró recibe "Tu registro fue
  aprobado".

### `certificates` (diplomas)
Un diploma por persona y capacitación (`unique (training_id, user_id)`). Se
emiten solos: con examen publicado, al aprobarlo; sin examen, al completar el
video. Solo los escribe `grant_certificate_if_earned`; desde el cliente son de
lectura (los propios, o todos para admin/owner).

| Columna | Notas |
|---|---|
| `folio` | `CLARVI-<año>-<consecutivo>`; es lo que se verifica |
| `earned_via` | `examen` \| `video` |
| `earned_at` | cuándo se ganó (fecha real, no la de emisión) |
| `snapshot` | nombre, capacitación, fecha de sesión, área y sucursal **congelados** |

El `snapshot` sigue el mismo criterio que `attendance` y `question_snapshot`:
renombrar un área o corregir el título de la capacitación no reescribe un
documento ya entregado.

> La interfaz todavía no los muestra (bandera `FEATURES.diplomas` en
> `src/config/features.ts`). La base sí los emite y acumula desde ya, para que
> el día que se encienda no arranque vacía.

### Vista `user_training_status`
Cruza capacitaciones × perfiles con progreso, asistencia y examen; deriva
`status`: `pending` (sin fila de progreso), `in_progress` (fila sin
`completed_at`), `completed`. Incluye la capacitación que todavía no tiene
video si ya tiene examen publicado **o si tiene una transmisión al aire o
anunciada** (con `live_status`, `live_video_id`, `live_title`,
`live_scheduled_at` y `live_started_at`, que es lo que pinta las secciones
"En vivo ahora" y "Próximas transmisiones"). Es `security_invoker`: cada
usuario solo ve sus propias filas; admin/owner ven todas. Alimenta el
dashboard.

## Reglas de acceso (RLS)

| Tabla | colaborador | líder | administrador / owner |
|---|---|---|---|
| `areas`/`sucursales` | lee activas (también anon, para el registro) | igual | todo |
| `profiles` | lee/edita solo su fila | + las solicitudes sin resolver, las rechazadas y las que él resolvió | lee/edita todas |
| `trainings` | lee todas | igual | todo |
| `attendance` | lee/inserta solo la suya | igual | lee todas |
| `watch_progress` | lee/escribe solo la suya | igual | lee todas |
| `live_attendance` | lee solo la suya; **escribe nadie** (la escribe `live_heartbeat`) | igual | lee todas |
| `exams` | lee solo los publicados | igual | todo |
| `exam_questions` | **sin acceso** (traen la respuesta correcta) | igual | todo |
| `exam_attempts` | lee los suyos | igual | lee todos |
| `exam_attempt_answers` | lee las suyas | igual | lee todas |
| `notifications` | lee las suyas y las marca leídas | igual | igual |
| `certificates` | lee los suyos | igual | lee todos |

Fuera de aprobar registros, un **líder es un colaborador**: ve y aplica sus
propias capacitaciones, nada más. Y su cola de solicitudes está acotada a **su
área** (`lider_cubre()`), en todas las sucursales: quien lidera Comercial
aprueba a los de Comercial estén donde estén, y compartir sucursal no da
alcance sobre las demás áreas de esa sucursal.

Una cuenta **pendiente de aprobación** no pasa de la puerta: `trainings` solo
es legible con `current_user_is_approved()`, y las escrituras de `attendance` y
`watch_progress` lo exigen también. Como los intentos de examen se crean desde
RPC `security definer` (que se saltan la RLS), esa guarda vive ahí en un
trigger `BEFORE INSERT` sobre `exam_attempts`.

`exam_attempts` y `exam_attempt_answers` no tienen políticas de escritura: las
únicas escrituras vienen de los RPC `security definer`, así nadie puede
fabricarse una calificación desde el cliente.

Reglas finas que las políticas no cubren van en el trigger
`guard_profile_changes` (BEFORE UPDATE en profiles):

- `role` solo lo cambia el **owner**, y no puede quitarse el rol a sí mismo.
- `is_active` solo admin/owner.
- `username`, `email` y `auth_method` son inmutables.
- Un administrador no puede editar la fila de un owner.
- `approval_status` solo lo cambia líder/admin/owner, solo desde `pendiente`
  (una solicitud no se re-resuelve), nunca sobre la propia fila, y el trigger
  sella `approved_by`/`approved_at` — el cliente no puede fingir quién aprobó.
- Un líder **solo** puede aprobar o rechazar: si el mismo UPDATE toca nombre,
  área, sucursal, rol o `is_active`, se rechaza.
- Un líder solo resuelve registros de su área (`lider_cubre()`, comprobado
  también en la política de `update`).

## Triggers sobre `auth.users`

- `enforce_signup_email_rules` (BEFORE INSERT): cuentas `email` deben terminar
  en `@clarvi.com`; cuentas `username` deben usar el dominio sintético
  `@users.internal.clarvi`. Es la garantía de servidor, independiente del
  cliente y de la Edge Function.
- `handle_new_user` (AFTER INSERT): crea la fila de `profiles` con los datos
  del registro (`raw_user_meta_data`) y decide su `approval_status`:
  `pendiente` si el alta fue por nombre de usuario, `aprobado` si fue por
  correo `@clarvi.com`.

## Funciones RPC

### `upsert_watch_progress(training_id, ranges, position, duration)`
Guarda el progreso. `SECURITY INVOKER` (pasa por RLS). Valida que los rangos
sean un arreglo ordenado y sin traslape, y aplica dos guardas anti-trampa:

1. `watched_seconds` solo puede crecer (`greatest` con lo guardado).
2. El crecimiento se limita a `2.5 × segundos reales transcurridos + 30` desde
   el último heartbeat (permite ver a 2x; impide saltar al final y acreditarlo).
   En el primer registro el tope es 60s (el primer flush ocurre ~15s de
   reproducción).

### `live_heartbeat(training_id, leaving)`
`SECURITY DEFINER`. El reproductor dice "sigo aquí" cada 15 segundos; el
servidor crea o refresca la fila de `live_attendance` y **suma él mismo** el
tiempo transcurrido desde el latido anterior, solo si es creíble (≤ 90 s: un
par de latidos perdidos). El cliente nunca manda segundos. Devuelve
`{ status, viewers }`. Solo funciona con la transmisión `en_vivo`.

### `live_viewer_count(training_id)`
Cuánta gente está viendo el directo ahora (latido de hace menos de 45 s). Es lo
único de la asistencia en vivo que ve cualquiera: el número, nunca los nombres.

### `finish_live_broadcast(training_id)`
`SECURITY DEFINER`. Cierra la transmisión: la marca `finalizada`, apaga
`live_enabled`, copia `live_video_id` a `youtube_video_id` **si no había video
cargado a mano** y acredita el tiempo de quienes la vieron. La llaman dos
caminos: el botón del admin y el reproductor de quien está viendo cuando
YouTube le avisa que terminó. A quien no es admin se le exige haber estado
conectado (latido de hace menos de 5 min) y que la transmisión lleve al menos
2 minutos al aire. La duración la calcula el servidor con el reloj de la
transmisión; el cliente no manda números.

### `credit_live_attendance(training_id, duration)` *(interna)*
Convierte el tiempo del directo en progreso de la grabación: escribe
`watch_progress` con `[[0, segundos]]` y deja que el trigger de siempre decida
quién llegó al 90% (y por tanto quién la completó y quién gana diploma). El
rango arranca en 0 porque el directo no permite saber qué tramo vio cada quien;
quien entró tarde completa lo que le falta con la grabación. Solo la llaman la
Edge Function `youtube-live` y `finish_live_broadcast`.

### `checkin_via_qr(token)`
Registra asistencia. Devuelve `checked_in` | `already_checked_in` |
`invalid_token` | `not_approved`. Congela área/sucursal del perfil.
`SECURITY INVOKER`.

### `training_title_for_token(token)` *(pública, también anon)*
Devuelve solo el título de la capacitación del token — para que la página de
check-in muestre a qué sesión se está registrando alguien antes de iniciar
sesión, sin exponer el resto de la tabla (ni el ID del video).

### `current_user_role()`
Helper `SECURITY DEFINER` que usan las políticas RLS para leer el rol propio
sin recursión. Para anon devuelve `null`.

### `current_user_is_approved()`
El mismo patrón para el estado de aprobación: `true` solo si la fila propia
está `aprobado`. Para anon (y para una cuenta pendiente o rechazada) devuelve
`false`.

### `lider_cubre(area_id, sucursal_id)`
`true` si quien consulta pertenece a esa **área**. Es el alcance del líder
(su área completa, en todas las sucursales): lo usan las políticas de
`profiles` y el trigger que resuelve solicitudes.

### `grant_certificate_if_earned(training_id, user_id)`
Emite el diploma si ya se cumplió el requisito (examen aprobado, o video
completado cuando no hay examen publicado) y todavía no existe. Idempotente.
La disparan cuatro triggers —`exam_attempts` y `watch_progress`, uno por
operación— con cláusulas `when` que sonan **solo en el momento de acreditar**:
`upsert_watch_progress` escribe cada ~15 s de reproducción y sería un
desperdicio revisarlo en cada latido.

### `certificate_by_folio(folio)` *(pública, también anon)*
Verificación del folio impreso: confirma que el diploma existe y de qué es, sin
exponer la tabla ni el resto de los datos de la persona.

### `save_exam(training_id, exam, questions)` *(admin)*
`SECURITY INVOKER`: quien autoriza son las políticas de `exams` /
`exam_questions`. Hace upsert del examen y **reconcilia** las preguntas por id
(actualiza las que llegan, inserta las nuevas, borra las que faltan) en una
sola transacción, en vez de recrearlas. Valida cada pregunta con
`assert_question_shape` y aborta con un mensaje en español si el examen está
mal armado ("Marca cuál es la opción correcta", etc.).

### `exam_status_for_training(training_id)`
Alimenta el botón "Aplicar examen": conteo de preguntas, mínimo para aprobar,
intentos usados, mejor calificación, si ya aprobó, y `can_attempt` con su
`block_reason` (`not_published` | `video_incomplete` | `no_attempts_left`).
**No incluye preguntas.** Para un usuario normal un examen despublicado o vacío
simplemente responde `has_exam: false`.

### `start_exam_attempt(training_id)`
Abre el examen (o reanuda el intento sin entregar) y devuelve las preguntas
**saneadas**: sin `answer_key` y con las opciones revueltas. `ordering` y la
columna derecha de `matching` se revuelven **siempre**, porque en `content`
están en el orden correcto.

### `submit_exam_attempt(attempt_id, answers)`
Califica en el servidor con `grade_answer`, guarda cada respuesta con su
snapshot y cierra el intento. Devuelve calificación, aprobado/reprobado y el
repaso pregunta por pregunta. Rechaza el intento ajeno y el ya entregado.

### `grade_answer(type, content, answer_key, response)` *(interna)*
Fracción acertada de 0 a 1. Todo-o-nada en opción múltiple y verdadero/falso;
**crédito proporcional** en los demás: pares acertados en `matching`, pasos en
su posición en `ordering`, huecos correctos en `fill_blank`, y
`(aciertos − errores) / total` con piso en 0 en `multiple_select`. Las
respuestas de texto se comparan con `normalize_text` (sin acentos, sin
mayúsculas, sin espacios de más), así "  SOLUCION   QUIMICA " acierta
"solución química".

## Cuenta owner inicial

`lnoris@clarvi.com` se sembró por SQL con rol `owner` (ningún flujo de registro
otorga ese rol). Los administradores y líderes que siguen se nombran desde
Administración → Usuarios con la sesión del owner.

## Regenerar tipos TypeScript

Tras cualquier migración nueva: generar con el MCP de Supabase
(`generate_typescript_types`) o `supabase gen types typescript`, y reemplazar
`src/types/database.types.ts`.
