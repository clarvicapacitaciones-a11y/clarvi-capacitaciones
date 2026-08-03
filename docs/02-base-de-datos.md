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
| `role` | `owner` \| `administrador` \| `usuario` |
| `is_active` | cuentas desactivadas no pueden usar la plataforma (guard del router) |

### `trainings`
| Columna | Notas |
|---|---|
| `youtube_video_id` | ID de 11 caracteres; `null` hasta que el video esté editado y publicado |
| `qr_token` | uuid **distinto del id**, es lo que codifica el QR; regenerable |
| `session_date` | fecha de la sesión presencial |
| `duration_seconds` | opcional; la duración real la reporta el reproductor |

### `training_areas` (a qué áreas aplica cada capacitación)
Relación N:M `(training_id, area_id)`, porque una capacitación suele aplicar a
varias áreas. **Una capacitación sin filas aquí es para todo el personal**, así
que las que ya existían siguen viéndose igual sin reclasificarlas.

El filtro lo aplica la vista `user_training_status`, no RLS: `trainings` sigue
siendo legible por cualquier usuario autenticado, porque el check-in por QR
necesita resolver el token de alguien de otra área que asistió a la sesión.

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

### Vista `user_training_status`
Cruza capacitaciones × perfiles con progreso, asistencia y examen; deriva
`status`: `pending` (sin fila de progreso), `in_progress` (fila sin
`completed_at`), `completed`. Incluye la capacitación que todavía no tiene
video si ya tiene examen publicado. Es `security_invoker`: cada usuario solo ve
sus propias filas; admin/owner ven todas. Alimenta el dashboard.

**Filtra por área**: solo emite la fila si la capacitación no tiene áreas (es
para todos) o si alguna coincide con la del perfil. Un perfil sin área ve
únicamente las generales.

El filtro es **estricto**: quien cambia de área deja de ver en su dashboard las
capacitaciones del área anterior aunque ya las haya visto o presentado. El
registro no se pierde — sigue en `watch_progress`, `attendance` y
`exam_attempts`, y el admin lo ve completo en la ficha de la capacitación.

## Reglas de acceso (RLS)

| Tabla | usuario | administrador / owner |
|---|---|---|
| `areas`/`sucursales` | lee activas (también anon, para el registro) | todo |
| `profiles` | lee/edita solo su fila | lee/edita todas |
| `trainings` | lee todas | todo |
| `attendance` | lee/inserta solo la suya | lee todas |
| `watch_progress` | lee/escribe solo la suya | lee todas |
| `training_areas` | lee todas (la clasificación no es secreta) | todo |
| `exams` | lee solo los publicados | todo |
| `exam_questions` | **sin acceso** (traen la respuesta correcta) | todo |
| `exam_attempts` | lee los suyos | lee todos |
| `exam_attempt_answers` | lee las suyas | lee todas |

`exam_attempts` y `exam_attempt_answers` no tienen políticas de escritura: las
únicas escrituras vienen de los RPC `security definer`, así nadie puede
fabricarse una calificación desde el cliente.

Reglas finas que las políticas no cubren van en el trigger
`guard_profile_changes` (BEFORE UPDATE en profiles):

- `role` solo lo cambia el **owner**, y no puede quitarse el rol a sí mismo.
- `is_active` solo admin/owner.
- `username`, `email` y `auth_method` son inmutables.
- Un administrador no puede editar la fila de un owner.

## Triggers sobre `auth.users`

- `enforce_signup_email_rules` (BEFORE INSERT): cuentas `email` deben terminar
  en `@clarvi.com`; cuentas `username` deben usar el dominio sintético
  `@users.internal.clarvi`. Es la garantía de servidor, independiente del
  cliente y de la Edge Function.
- `handle_new_user` (AFTER INSERT): crea la fila de `profiles` con los datos
  del registro (`raw_user_meta_data`).

## Funciones RPC

### `upsert_watch_progress(training_id, ranges, position, duration)`
Guarda el progreso. `SECURITY INVOKER` (pasa por RLS). Valida que los rangos
sean un arreglo ordenado y sin traslape, y aplica dos guardas anti-trampa:

1. `watched_seconds` solo puede crecer (`greatest` con lo guardado).
2. El crecimiento se limita a `2.5 × segundos reales transcurridos + 30` desde
   el último heartbeat (permite ver a 2x; impide saltar al final y acreditarlo).
   En el primer registro el tope es 60s (el primer flush ocurre ~15s de
   reproducción).

### `checkin_via_qr(token)`
Registra asistencia. Devuelve `checked_in` | `already_checked_in` |
`invalid_token`. Congela área/sucursal del perfil. `SECURITY INVOKER`.

### `training_title_for_token(token)` *(pública, también anon)*
Devuelve solo el título de la capacitación del token — para que la página de
check-in muestre a qué sesión se está registrando alguien antes de iniciar
sesión, sin exponer el resto de la tabla (ni el ID del video).

### `current_user_role()`
Helper `SECURITY DEFINER` que usan las políticas RLS para leer el rol propio
sin recursión. Para anon devuelve `null`.

### `set_training_areas(training_id, area_ids)` *(admin)*
Reemplaza el conjunto completo de áreas de una capacitación en una sola
transacción, para que no quede un instante sin clasificar (que la volvería
"para todos"). `SECURITY INVOKER`: autoriza la política de admin.

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
otorga ese rol). Los siguientes administradores se nombran desde
Administración → Usuarios con la sesión del owner.

## Regenerar tipos TypeScript

Tras cualquier migración nueva: generar con el MCP de Supabase
(`generate_typescript_types`) o `supabase gen types typescript`, y reemplazar
`src/types/database.types.ts`.
