# Flujos principales

## Registro e inicio de sesión

Hay dos formas de tener cuenta; ambas piden nombre completo, área, sucursal y
contraseña (mínimo 8 caracteres):

- **Con correo** — debe ser `@clarvi.com`. Se valida en el cliente, en la Edge
  Function y en un trigger de la base de datos.
- **Sin correo (usuario)** — para personal sin correo corporativo. Elige un
  nombre de usuario (3–30 caracteres); internamente se crea el correo sintético
  `usuario@users.internal.clarvi` porque Supabase Auth exige uno. El usuario
  nunca ve ese correo. **Requiere aprobación** (ver abajo).

El alta pasa por la Edge Function **`register`** (`supabase/functions/register`),
que usa la service role key para crear la cuenta **ya confirmada**
(`email_confirm: true`) y así no depender de correos de confirmación. Después
del alta, el frontend inicia sesión automáticamente con `signInWithPassword`.

El login con usuario simplemente convierte `usuario` → correo sintético y usa
el mismo `signInWithPassword`.

## Aprobación de registros

El registro con correo se verifica solo: el trigger de `auth.users` no deja
pasar nada que no sea `@clarvi.com`, así que quien entra ya es de la empresa.
El registro por nombre de usuario no verifica nada — cualquiera con el link
podría crearse una cuenta — así que nace `approval_status = 'pendiente'` y la
tiene que aprobar un **líder** (o un admin/owner).

1. La persona se registra por usuario. Se le abre sesión, pero el guard del
   router solo la deja ver `/pendiente`: una pantalla que explica que falta la
   aprobación, con un botón para volver a consultar y otro para salir.
2. Los líderes de esa área reciben un **aviso en la campana** del encabezado
   (si el área no tiene líder, lo reciben administradores y owner). En Administración → **Solicitudes** ven la fila con nombre, usuario,
   área, sucursal y fecha, y **Aprueban** o **Rechazan** (con motivo opcional).
   La pestaña trae el número de pendientes al lado del nombre.
3. Aprobada, la persona entra normal (el botón "Ya me aprobaron" o un login
   nuevo bastan). Rechazada, se le cierra la sesión con el aviso al intentar
   entrar.

La regla no es solo del frontend: mientras esté pendiente, la RLS no le
devuelve capacitaciones, no la deja registrar asistencia ni guardar progreso, y
un trigger le impide abrir un intento de examen. `checkin_via_qr` responde
`not_approved` en vez de un confuso "código no válido".

Quién resolvió la solicitud y cuándo lo sella el trigger
`guard_profile_changes`; el cliente solo manda el estado nuevo. Una solicitud
ya resuelta no se puede volver a resolver, nadie puede aprobar su propia fila y
un líder solo alcanza a quien se registró en **su área**.

## Avisos dentro de la plataforma

No hay SMTP, así que el aviso vive en la **campana del encabezado**: contador
de no leídos, lista con los últimos avisos y, al pulsar uno, se marca leído y
lleva a donde apunta. La lista se refresca al abrirla y cada minuto mientras la
pestaña esté visible (no hay suscripción realtime abierta: un aviso que se
atiende en horas no la necesita).

Los avisos los escribe **solo la base de datos**; el cliente únicamente puede
marcarlos como leídos. Hoy se emiten dos: *nueva solicitud de registro* (a los
líderes que la cubren) y *tu registro fue aprobado* (a quien se registró).
Cuando alguien resuelve una solicitud, el aviso se da por atendido para el
resto de los aprobadores.

## Diplomas *(construido, todavía sin mostrar)*

Cada persona que acredita una capacitación recibe un diploma con folio. Se
emite solo: si la capacitación tiene examen publicado, al aprobarlo; si no, al
completar el video. El documento **congela** los datos con los que se emitió
(nombre, capacitación, área, sucursal, calificación), así que renombrar un área
después no reescribe un diploma ya entregado, y trae un folio
`CLARVI-<año>-<consecutivo>` verificable con `certificate_by_folio`.

El formato es una hoja horizontal imprimible (`DiplomaSheet.vue`): se guarda
como PDF desde el propio diálogo de impresión del navegador, sin librerías.

La interfaz está apagada con `FEATURES.diplomas` en `src/config/features.ts`.
Ponerla en `true` enciende de una vez el bloque "Mis diplomas" del perfil, el
botón en la ficha de la capacitación y la ruta `/diploma/:id`. Mientras tanto
la base de datos ya los emite y acumula.

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

## Capacitación en vivo (transmisión de YouTube)

Una sesión se transmite por YouTube y se ve **dentro de la plataforma**, que es
lo que permite saber quién la está viendo. Al terminar, la grabación queda
publicada sola: nadie tiene que volver a cargar el video.

### El camino completo

1. El instructor abre la transmisión en el canal de YouTube (como **no
   listada**, igual que las grabaciones).
2. El admin la **activa** desde la ficha de la capacitación pegando el link del
   canal (`https://www.youtube.com/@tucanal`) o el del directo.
3. La Edge Function `youtube-live` lee la página pública de YouTube y averigua
   qué video está al aire, cómo se llama y en qué estado está. Sin API de
   Google: sin proyecto de Google Cloud, sin llave y sin cuota.
4. La capacitación pasa a `en_vivo`, sube al principio del dashboard de todos
   (sección **En vivo ahora**) y les llega el aviso en la campana.
5. Quien la ve la reproduce embebida. Mientras el video está reproduciéndose y
   la pestaña visible, el reproductor manda un latido cada 15 s: eso es lo que
   alimenta **quién está viendo** y cuánto tiempo lleva.
6. Al terminar, la transmisión pasa a `finalizada`, `live_video_id` se copia a
   `youtube_video_id` y esa misma capacitación se convierte en un video normal,
   con su medición de avance de siempre.
7. El tiempo que cada quien estuvo conectado se escribe como progreso de la
   grabación. Con la regla de siempre (90%), quien la vio completa en vivo
   queda **completada** —y con diploma, cuando se enciendan— sin volver a
   verla; quien entró tarde completa lo que le falta con la grabación.

### Cómo se lee YouTube sin su API

La página del video trae embebido el JSON con el que arranca su propio
reproductor. La función lo lee en dos capas, porque **YouTube le contesta a un
servidor con un muro anti-bot**: la página llega completa (HTTP 200) pero el
bloque rico viene vacío, con `playabilityStatus = LOGIN_REQUIRED` ("Accede para
confirmar que no eres un bot"). Comprobado contra YouTube real desde la
infraestructura de Supabase.

| Capa | Qué lee | Cuándo sirve |
|---|---|---|
| `ytInitialPlayerResponse` | `isLive`, `liveBroadcastDetails` (inicio/fin), `lengthSeconds`, título | cuando YouTube contesta completo: es el mejor dato |
| `ytInitialData` | `currentVideoEndpoint` (qué video es), `videoViewCountRenderer.isLive` (está al aire), `upcomingEventData.startTime` (hora anunciada) | **también con el muro anti-bot**: son las marcas que sí sobreviven |

Con la segunda capa alcanza para lo que la plataforma necesita: resolver
`/@canal/live` → id del directo, y saber si está al aire. Lo que el muro sí
impide es distinguir "todavía no empieza" de "ya terminó" en una capacitación
que nunca se vio al aire, así que en ese caso la función **no publica nada por
suposición**: espera a verla al aire, y el admin siempre tiene el botón
*Finalizar y publicar grabación*.

### Tres caminos para enterarse de que terminó

Que la grabación se publique no depende de uno solo:

1. **La lectura periódica.** Mientras la transmisión está encendida, quien
   tenga abierto el dashboard o la página de la capacitación dispara una
   consulta cada minuto. El servidor no lee YouTube más de una vez cada 15 s
   (antirebote sobre `live_checked_at`), así que cien personas viendo no son
   cien consultas.
2. **El reproductor.** El navegador de quien está viendo sí ve YouTube sin
   muro: cuando el directo termina, el iframe pasa a `ENDED` y avisa
   (`finish_live_broadcast`). Es la vía más confiable.
3. **El admin.** Botón *Finalizar y publicar grabación* en la ficha.

Los tres terminan en la misma función, que es idempotente: el primero que
llegue cierra la transmisión y los demás no hacen nada.

### Qué se puede falsificar y qué no

- El tiempo en la transmisión lo suma **el servidor** entre latidos, y solo si
  el hueco es creíble (≤ 90 s). Dejar la pestaña abierta sin reproducir no
  acredita nada: el latido solo sale mientras el video está reproduciéndose.
- El aviso de "terminó" solo se acepta de alguien que estuvo conectado y
  cuando la transmisión lleva al menos 2 minutos al aire. Lo peor que logra un
  aviso falso es publicar la grabación antes de tiempo; el admin lo revierte
  reactivando la transmisión.
- Los nombres de quienes están viendo son de admin/owner (RLS). Al resto la
  plataforma solo le dice **cuántos** son.

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

## Exámenes

### El admin arma el examen

Dentro del formulario de la capacitación (`Nueva` y `Editar`) hay una sección
**Examen**: ajustes arriba (publicar, calificación mínima, intentos, requiere
video, revolver) y debajo las preguntas, que se agregan una por una eligiendo
su tipo. Guardar la capacitación guarda también el examen (RPC `save_exam`).

Seis tipos, todos de calificación automática:

| Tipo | Cómo lo captura el admin | Cómo lo contesta el usuario |
|---|---|---|
| Opción múltiple | opciones + marcar la correcta | elige una |
| Selección múltiple | opciones + marcar varias correctas | marca las que quiera |
| Verdadero o falso | solo indica cuál es | elige una |
| Relacionar conceptos | parejas (+ distractores opcionales) | un desplegable por concepto |
| Ordenar pasos | los pasos **en el orden correcto** | los acomoda con ↑ / ↓ |
| Completar la frase | frase con `{{1}}`, `{{2}}` + respuestas aceptadas | escribe en los huecos |

El examen **nace despublicado**: mientras se arma nadie lo ve. Editarlo después
de que hubo intentos no daña el historial, porque cada respuesta guardó su
propio `question_snapshot`.

### El usuario lo aplica

En la página de la capacitación aparece la tarjeta del examen con el botón
**Aplicar examen** (o *Repetir* / *Continuar*), la calificación mínima y los
intentos restantes. Si está bloqueado dice por qué (falta terminar el video, o
ya no hay intentos).

El examen se muestra **una pregunta por pantalla**, con barra de avance,
*Anterior* / *Siguiente* y puntos para saltar a cualquier pregunta (los
contestados se ven rellenos). Las respuestas viven en memoria hasta entregar;
al pulsar *Entregar* se avisa cuántas quedaron sin contestar.

Al entregar, el servidor califica y devuelve el resultado con el **repaso**:
qué contestó, cuál era la respuesta correcta y la explicación del instructor.

> Con intentos ilimitados, ese repaso revela las respuestas después del primer
> intento. Si eso importa para una capacitación, fija `max_attempts`.

### El admin mide

La ficha de la capacitación tiene una tarjeta **Examen** con:

- cuántos lo presentaron, cuántos aprobaron, calificación promedio y tasa de
  aprobación;
- la tabla de **quién lo presentó**: nombre, área, sucursal, número de intentos,
  mejor calificación, aprobado/no aprobado y fecha del último intento;
- **dificultad por pregunta**, ordenada de menor a mayor acierto, para ver qué
  temas no quedaron claros.

### Anti-trampa

Mismo principio que la medición de video: la regla vive en la base de datos.

- `exam_questions` (que guarda `answer_key`) **no es legible por un usuario**;
  las preguntas llegan saneadas desde `start_exam_attempt`.
- La calificación la calcula Postgres en `submit_exam_attempt`; el cliente solo
  manda lo que eligió.
- `exam_attempts` y `exam_attempt_answers` no aceptan escrituras desde el
  cliente: no hay forma de insertarse una calificación.
- Recargar la página reanuda el intento abierto en vez de gastar otro, y un
  intento ya entregado no se puede volver a entregar.
