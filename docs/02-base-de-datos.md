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

### Vista `user_training_status`
Cruza capacitaciones (solo las que ya tienen video) × perfiles con progreso y
asistencia; deriva `status`: `pending` (sin fila de progreso), `in_progress`
(fila sin `completed_at`), `completed`. Es `security_invoker`: cada usuario
solo ve sus propias filas; admin/owner ven todas. Alimenta el dashboard.

## Reglas de acceso (RLS)

| Tabla | usuario | administrador / owner |
|---|---|---|
| `areas`/`sucursales` | lee activas (también anon, para el registro) | todo |
| `profiles` | lee/edita solo su fila | lee/edita todas |
| `trainings` | lee todas | todo |
| `attendance` | lee/inserta solo la suya | lee todas |
| `watch_progress` | lee/escribe solo la suya | lee todas |

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

## Cuenta owner inicial

`lnoris@clarvi.com` se sembró por SQL con rol `owner` (ningún flujo de registro
otorga ese rol). Los siguientes administradores se nombran desde
Administración → Usuarios con la sesión del owner.

## Regenerar tipos TypeScript

Tras cualquier migración nueva: generar con el MCP de Supabase
(`generate_typescript_types`) o `supabase gen types typescript`, y reemplazar
`src/types/database.types.ts`.
