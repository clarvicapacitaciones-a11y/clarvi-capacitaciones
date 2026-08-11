# CLARVI · Plataforma de Capacitaciones

Plataforma interna de CLARVI para gestionar capacitaciones: los videos viven en
YouTube (no listados), la plataforma los reproduce embebidos y **mide quién los
ve, cuánto tiempo y si los completó**, además de registrar la asistencia
presencial escaneando un código QR por sesión. Las sesiones también se pueden
**dar en vivo por YouTube**: se ven dentro de la plataforma, se sabe quién las
está viendo y al terminar la grabación queda publicada sola.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite, Pinia, Vue Router |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Video | YouTube IFrame Player API (sin API key) |
| Transmisiones | Lectura de la página pública de YouTube (sin API de Google) |
| Hosting | Vercel (SPA) |

## Desarrollo local

```bash
cp .env.example .env   # las llaves anon son públicas por diseño (RLS protege los datos)
npm install
npm run dev            # http://localhost:5173
npm run build          # type-check (vue-tsc) + build de producción
```

## Estructura

```
supabase/
  migrations/          # esquema completo de la BD (ya aplicado al proyecto)
  functions/register/      # Edge Function de registro (correo y usuario)
  functions/youtube-live/  # estado del directo leyendo la página de YouTube
src/
  assets/styles/       # tokens de marca (#00205c, #009bdd) + sistema plano
  components/
    ui/                # UiCard, UiButton, UiInput, UiSelect, UiBadge, UiModal
    trainings/         # YoutubePlayer (con tracking), LiveYoutubePlayer,
                       #   LiveViewersTable, TrainingCard, QrCodeDisplay
    exams/             # constructor del examen (editors/) y aplicación (runners/)
    certificates/      # DiplomaSheet (formato imprimible; apagado por bandera)
    layout/            # AppHeader, AuthLayout, NotificationsBell
  config/features.ts   # interruptores de lo construido pero todavía sin abrir
  composables/
    useWatchTracking.ts  # medición de visualización (rangos vistos + anti-salto)
    useLivePresence.ts   # presencia en la transmisión (latido cada 15s)
    useYoutubePlayer.ts  # carga del IFrame API + parseo de links
    useQrCode.ts         # generación de QR de check-in
    useTrainingCover.ts  # portada de la tarjeta (imagen propia → miniatura de YouTube)
  services/            # acceso a datos (supabase, trainings, live, profiles,
                       #   exams, notifications, certificates)
  stores/              # auth (sesión/rol), catalogs (áreas/sucursales),
                       #   approvals (solicitudes), notifications (campana)
  views/               # auth, dashboard, capacitación, examen, checkin, admin, perfil
docs/                  # documentación detallada (ver abajo)
```

## Diseño

Interfaz **plana, moderna y minimalista**: superficies blancas de esquinas
redondeadas sobre un fondo gris muy claro, sin profundidad simulada.

- Color plano: nada de degradados, glass, blur, sombras ni destellos.
- Curvas consistentes (`--radius-sm/md/lg/xl` y píldoras para tabs y badges).
- Tipografía **Sora** (Google Fonts). La jerarquía se hace con tamaño, peso y
  color: títulos en 600, el resto en regular. Las mayúsculas se reservan para
  micro-etiquetas sueltas (`.eyebrow`), no para botones, tabs ni labels.
- Paleta: navy `#00205c` y azul `#009bdd`; como texto se usa
  `--clarvi-blue-ink`, que sí alcanza contraste AA.
- Lo único que se anima es el color (`color`, `background-color`,
  `border-color`); no hay movimiento, escalas ni sombras animadas.
- La barra de navegación es sólida (sin transparencias) y solo muestra el menú
  a quien administra o aprueba registros: un colaborador únicamente ve sus
  capacitaciones.

Todo esto vive en `src/assets/styles/tokens.css` (variables) y `base.css`
(clases compartidas). Los componentes consumen esas variables; no se escriben
colores sueltos en los componentes.

### Portada de las capacitaciones

Cada tarjeta del dashboard muestra una imagen. El admin puede subirla desde el
formulario (bucket público `training-covers`, escritura solo para
administradores) o pegar una URL; si no elige ninguna y la capacitación ya
tiene video, se usa la miniatura de YouTube (`maxresdefault`, con respaldo a
`hqdefault`). Sin imagen ni video, la tarjeta pinta el logotipo.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/01-arquitectura.md](docs/01-arquitectura.md) | Visión general, decisiones de diseño |
| [docs/02-base-de-datos.md](docs/02-base-de-datos.md) | Esquema, RLS, triggers y funciones |
| [docs/03-flujos.md](docs/03-flujos.md) | Registro/login, QR, tracking de video, exámenes |
| [docs/04-administracion.md](docs/04-administracion.md) | Guía del panel admin y roles |
| [docs/05-despliegue.md](docs/05-despliegue.md) | Infraestructura, variables, operación |

## Roles

- **Owner** — todo lo del administrador + asignar roles (incluido crear más administradores).
- **Administrador** — crear/editar/eliminar capacitaciones, ver resultados por
  usuario y por capacitación, administrar usuarios (área, sucursal, activar/
  desactivar), catálogos y resolver solicitudes de registro.
- **Líder** — solo la pestaña **Solicitudes**, y solo de **su área** (en
  todas las sucursales): aprueba o rechaza a quien se registró sin correo
  corporativo. No administra capacitaciones ni usuarios.
- **Colaborador** — ver capacitaciones, registrar asistencia con QR, aplicar exámenes y consultar su propio avance.

## Aprobación de registros

Quien tiene correo `@clarvi.com` se registra y entra: el dominio ya lo
identifica. Quien no tiene correo se registra **por nombre de usuario**, y ahí
no hay nada que verifique quién es, así que su cuenta nace **pendiente** y
espera en una pantalla de aviso hasta que un líder (o un admin/owner) la
apruebe desde Administración → Solicitudes. Mientras siga pendiente no ve
capacitaciones, no registra asistencia ni aplica exámenes — lo aplica la RLS,
no solo el frontend.

Al líder le llega el aviso en la **campana del encabezado** (no hay SMTP: las
notificaciones viven dentro de la plataforma).

## Diplomas

Quien acredita una capacitación (aprobar el examen, o completar el video si no
hay examen) recibe un **diploma con folio**, con los datos congelados al
emitirlo y una hoja imprimible que se guarda como PDF desde el navegador.

> Construido pero **todavía sin mostrar**: la base de datos ya los emite y
> acumula; la interfaz se enciende poniendo `diplomas: true` en
> `src/config/features.ts`.

## Capacitaciones en vivo

Una sesión se puede transmitir por YouTube y verse **dentro de la plataforma**.
El punto: no tener que cargar la grabación a mano, y saber quién la vio.

1. El instructor abre la transmisión en el canal de YouTube (**no listada**).
2. El admin pulsa **Revisar canal** en Administración → Capacitaciones.
3. La plataforma lee la **página pública** del canal —sin la API de Google: sin
   proyecto de Google Cloud, sin llave y sin cuota— y, si está al aire, **crea
   sola la capacitación** con el título, el video y la miniatura del directo.
   Se acabó capturar la tarjeta a mano.
4. La capacitación sube al principio del dashboard de todos (**En vivo ahora**)
   y les llega el aviso en la campana.
5. Mientras la ven, la plataforma registra **quién está conectado** y cuánto
   tiempo lleva: nombre, área, sucursal y hora de conexión, para el admin.
6. Al terminar, la grabación queda publicada sola (YouTube la deja con el mismo
   id del directo) y la capacitación pasa a ser un video normal.
7. El tiempo que cada quien estuvo en vivo se acredita como avance, así que
   quien la vio completa no tiene que volver a verla.

Que la grabación se publique no depende de un solo camino: la lectura periódica
de YouTube, el reproductor de quien está viendo (que avisa cuando el directo
termina) y el botón del admin llevan al mismo cierre. Los detalles —incluido
el muro anti-bot que YouTube le pone a las consultas de un servidor y cómo se
sortea— están en [docs/03-flujos.md](docs/03-flujos.md).

## Flujo de una capacitación

1. El admin crea la capacitación (título, fecha, temario) → la plataforma genera su **QR de asistencia**.
2. En la sesión presencial se proyecta/imprime el QR; cada asistente lo escanea e inicia sesión → queda registrada su asistencia con área y sucursal.
3. Después de la sesión, el admin agrega el link del video de YouTube (no listado).
4. Quien no asistió la ve en su dashboard como **pendiente**; al reproducirla, la plataforma mide su avance real (los saltos no cuentan) y al llegar al 90% la marca **completada**.
5. Opcionalmente el admin arma un **examen** (opción múltiple, selección múltiple, verdadero/falso, relacionar conceptos, ordenar pasos y completar frases) y lo publica; el usuario lo contesta una pregunta por pantalla y lo califica el servidor.
6. El admin ve en la ficha de la capacitación: asistentes, quiénes vieron el video, % de avance, tiempo visto, fecha de completado y los resultados del examen por persona.
