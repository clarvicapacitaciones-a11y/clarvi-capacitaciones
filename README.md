# CLARVI · Plataforma de Capacitaciones

Plataforma interna de CLARVI para gestionar capacitaciones: los videos viven en
YouTube (no listados), la plataforma los reproduce embebidos y **mide quién los
ve, cuánto tiempo y si los completó**, además de registrar la asistencia
presencial escaneando un código QR por sesión.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 + TypeScript + Vite, Pinia, Vue Router |
| Backend | Supabase (Postgres, Auth, RLS, Edge Functions) |
| Video | YouTube IFrame Player API (sin API key) |
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
  functions/register/  # Edge Function de registro (correo y usuario)
src/
  assets/styles/       # tokens de marca (#00205c, #009bdd) + sistema plano
  components/
    ui/                # UiCard, UiButton, UiInput, UiSelect, UiBadge, UiModal
    trainings/         # YoutubePlayer (con tracking), TrainingCard, QrCodeDisplay
    exams/             # constructor del examen (editors/) y aplicación (runners/)
    layout/            # AppHeader, AuthLayout
  composables/
    useWatchTracking.ts  # medición de visualización (rangos vistos + anti-salto)
    useYoutubePlayer.ts  # carga del IFrame API + parseo de links
    useQrCode.ts         # generación de QR de check-in
    useTrainingCover.ts  # portada de la tarjeta (imagen propia → miniatura de YouTube)
  services/            # acceso a datos (supabase, trainings, profiles, exams)
  stores/              # auth.store (sesión/rol), catalogs.store (áreas/sucursales)
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
  a quien administra: un usuario normal únicamente ve sus capacitaciones.

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
  desactivar) y catálogos.
- **Usuario** — ver capacitaciones, registrar asistencia con QR, aplicar exámenes y consultar su propio avance.

## Flujo de una capacitación

1. El admin crea la capacitación (título, fecha, temario) → la plataforma genera su **QR de asistencia**.
2. En la sesión presencial se proyecta/imprime el QR; cada asistente lo escanea e inicia sesión → queda registrada su asistencia con área y sucursal.
3. Después de la sesión, el admin agrega el link del video de YouTube (no listado).
4. Quien no asistió la ve en su dashboard como **pendiente**; al reproducirla, la plataforma mide su avance real (los saltos no cuentan) y al llegar al 90% la marca **completada**.
5. Opcionalmente el admin arma un **examen** (opción múltiple, selección múltiple, verdadero/falso, relacionar conceptos, ordenar pasos y completar frases) y lo publica; el usuario lo contesta una pregunta por pantalla y lo califica el servidor.
6. El admin ve en la ficha de la capacitación: asistentes, quiénes vieron el video, % de avance, tiempo visto, fecha de completado y los resultados del examen por persona.
