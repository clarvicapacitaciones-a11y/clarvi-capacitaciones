# Flujos principales

## Registro e inicio de sesión

Hay dos formas de tener cuenta; ambas piden nombre completo, área, sucursal y
contraseña (mínimo 8 caracteres):

- **Con correo** — debe ser `@clarvi.com`. Se valida en el cliente, en la Edge
  Function y en un trigger de la base de datos.
- **Sin correo (usuario)** — para personal sin correo corporativo. Elige un
  nombre de usuario (3–30 caracteres); internamente se crea el correo sintético
  `usuario@users.internal.clarvi` porque Supabase Auth exige uno. El usuario
  nunca ve ese correo.

El alta pasa por la Edge Function **`register`** (`supabase/functions/register`),
que usa la service role key para crear la cuenta **ya confirmada**
(`email_confirm: true`) y así no depender de correos de confirmación. Después
del alta, el frontend inicia sesión automáticamente con `signInWithPassword`.

El login con usuario simplemente convierte `usuario` → correo sintético y usa
el mismo `signInWithPassword`.

**Contraseñas olvidadas:** las cuentas con correo podrán usar recuperación por
correo cuando se configure SMTP propio; para cuentas por usuario no hay bandeja
donde recibir el link, así que un administrador debe asistir (por ahora:
cambiarla desde Mi perfil requiere sesión activa).

## Check-in con QR (asistencia presencial)

1. Cada capacitación tiene un `qr_token` (uuid opaco). El QR codifica
   `https://<dominio>/checkin/<token>` y se genera en el navegador
   (`useQrCode.ts`, librería `qrcode`); se puede descargar como PNG desde la
   ficha admin.
2. En la sesión presencial se proyecta o imprime el QR.
3. El asistente lo escanea con su teléfono:
   - **Sin sesión** → la página muestra el nombre de la capacitación (RPC
     pública `training_title_for_token`) y botones de iniciar sesión o crear
     cuenta; el token viaja en `?redirect=` y al autenticarse vuelve
     automáticamente al check-in.
   - **Con sesión** → se llama `checkin_via_qr`; la pantalla confirma con
     nombre, área, sucursal y hora, o avisa si ya estaba registrado.
4. "Regenerar código" en la ficha admin crea un token nuevo: el QR viejo deja
   de funcionar y la asistencia previa se conserva.

## Medición de visualización (el corazón de la plataforma)

Implementada en `src/composables/useWatchTracking.ts` +
`src/components/trainings/YoutubePlayer.vue` + RPC `upsert_watch_progress`.

### En el navegador

- El reproductor es el IFrame oficial de YouTube; via `postMessage` se lee
  `getCurrentTime()`/`getPlayerState()` cada **5 segundos** mientras el estado
  sea `PLAYING` y la pestaña esté visible.
- Con esas lecturas se construyen **rangos vistos** `[inicio, fin]`:
  - Avance normal (≤ 2.5× velocidad real) → el rango crece.
  - Salto hacia adelante (scrub), retroceso o pestaña oculta → se cierra el
    rango y se abre otro en la nueva posición. **El tramo saltado no se
    acredita.**
  - Los rangos se fusionan: re-ver un tramo no suma doble.
- El total cubierto ÷ duración = **% visto real**, visible en vivo bajo el
  reproductor.

### Escritura a Supabase

- Cada 3 lecturas (~15s de reproducción) se llama al RPC.
- Además se hace flush inmediato al **pausar**, **terminar el video**,
  **ocultar la pestaña** y al **salir de la página** (con `fetch keepalive`
  para sobrevivir al cierre).
- El RPC re-valida los rangos y aplica su propio tope de crecimiento por tiempo
  real transcurrido, de modo que un cliente alterado tampoco pueda inflar su
  progreso.

### Estados y completado

- Sin fila de progreso → **Pendiente**.
- Con fila → **En curso** (se guarda `last_position_seconds` para reanudar).
- Al cubrir **≥ 90%** un trigger fija `completed_at` → **Completada**, para
  siempre (re-ver el video no la des-completa; `session_count` registra las
  re-visitas).

### Límites conocidos (aceptados)

- Si el usuario deja el video reproduciéndose y se va, el tiempo cuenta
  (igual que en una capacitación presencial nadie garantiza atención).
  La pestaña en segundo plano NO cuenta.
- El tope anti-salto permite hasta 2.5× tiempo real para no penalizar la
  reproducción a 2x.
