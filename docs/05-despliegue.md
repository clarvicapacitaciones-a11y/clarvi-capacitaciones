# Despliegue e infraestructura

## Recursos productivos

| Recurso | Detalle |
|---|---|
| Supabase | Proyecto `clarvi-capacitaciones` (`hwotaytvjjlvwkpnhotd`), org CLARVI, región `us-east-1`, plan gratuito |
| API Supabase | `https://hwotaytvjjlvwkpnhotd.supabase.co` |
| Edge Functions | `register` (registro de cuentas con auto-confirmación) y `youtube-live` (estado de la transmisión, leyendo la página pública de YouTube) |
| Vercel | Proyecto `clarvi-capacitaciones`, team `clarvicapacitaciones-1010s-projects` |
| URL producción | `https://clarvi-capacitaciones-clarvicapacitaciones-1010s-projects.vercel.app` |

## Variables de entorno

El frontend solo necesita dos, definidas en `.env` (local) y `.env.production`
(build de producción):

```
VITE_SUPABASE_URL=https://hwotaytvjjlvwkpnhotd.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Ambas son **públicas por diseño**: viajan en el bundle del navegador y la
seguridad real la aplican las políticas RLS de Postgres. La service role key
(secreta) solo vive dentro de la Edge Function, inyectada por Supabase.

> **No hace falta dar de alta variables de entorno en el panel de Vercel.**
> `.env.production` está versionado en el repo y Vite lo lee en modo producción
> durante `vite build`, así que la URL y la anon key quedan **embebidas en el
> bundle** que Vercel publica. (Si algún día quieres gestionarlas desde el panel
> de Vercel en lugar del archivo, define ahí `VITE_SUPABASE_URL` y
> `VITE_SUPABASE_ANON_KEY`; las de Vercel tienen prioridad sobre el archivo.)

## Despliegue por Git (actual)

El proyecto de Vercel está conectado al repo de GitHub: cada push a la rama de
producción dispara un build automático. Los comandos del build están fijados en
`vercel.json` (`framework: vite`, `installCommand: npm install`,
`buildCommand: npm run build`, `outputDirectory: dist`) para que no dependan de
la configuración del dashboard y el deploy sea reproducible desde el código.

> **Importante:** lo definido en `vercel.json` tiene prioridad sobre los
> "Build & Development Settings" del dashboard. Si el dashboard aún tiene un
> Install Command override (p. ej. `bash bootstrap.sh`), conviene quitar ese
> override para evitar confusión, pero `vercel.json` ya lo sobrescribe.

### Bootstrap original (histórico)

El primer despliegue se hizo **sin** conectar Git: el código se empaquetó
(`tar.gz`), se guardó en la tabla `deploy_source` de Supabase — protegida por
RLS con un header secreto `x-deploy-key` — y un `installCommand` `bootstrap.sh`
lo descargaba, verificaba su SHA-256 y lo compilaba. Ese `bootstrap.sh` **no
vive en el repo**; al conectar Git dejó de usarse. La tabla `deploy_source` y
ese mecanismo se pueden eliminar.

## Cuenta owner inicial

`lnoris@clarvi.com` (rol `owner`), sembrada por SQL. La contraseña temporal se
entregó por separado — **cambiarla en Mi perfil en el primer inicio de
sesión**.

## Pendientes de configuración recomendados

1. **SMTP propio** (Supabase → Auth → SMTP): habilita "olvidé mi contraseña"
   para cuentas con correo. El SMTP integrado está limitado a ~2 correos/hora.
2. **Protección de contraseñas filtradas** (Supabase → Auth → Passwords):
   activar el check contra HaveIBeenPwned (lo señala el advisor de seguridad).
3. **Dominio propio** (p. ej. `capacitaciones.clarvi.com`) en Vercel →
   Domains, si se quiere una URL corporativa en los QR impresos.
4. **Conectar GitHub a Vercel** (ver arriba).
5. **Cierre automático de transmisiones sin público** (opcional): si una
   transmisión termina y nadie tiene la plataforma abierta, la grabación se
   publica en cuanto alguien entre (o cuando el admin pulse *Finalizar*). Para
   que ocurra sin esperar a nadie se puede programar `pg_cron` + `pg_net`
   llamando a la Edge Function `youtube-live` cada minuto por cada
   capacitación con `live_enabled`. Requiere guardar la service role key en la
   base, así que **no está activado**: los tres caminos actuales cubren el caso
   real sin ese riesgo.

## Operación

- **Logs de las Edge Functions**: Supabase Dashboard → Edge Functions →
  `register` / `youtube-live` → Logs. En `youtube-live`, `bot_wall: true` en la
  respuesta significa que YouTube pidió verificación a esa consulta y se
  usaron las señales de respaldo (ver `docs/03-flujos.md`); no es una falla.
- **Transmisiones**: la consulta a YouTube sale de la Edge Function y está
  limitada a una lectura cada 15 s por capacitación, sin importar cuánta gente
  esté viendo. Solo se consulta mientras `trainings.live_enabled` esté
  encendido, y se apaga solo al terminar la transmisión.
- **Advisors**: revisar Security/Performance advisors tras cada migración.
- **Migraciones**: están en `supabase/migrations/` y se aplican con el MCP de
  Supabase o `supabase db push`; tras cada cambio, regenerar
  `src/types/database.types.ts`.
- **Recargar la caché de PostgREST tras cada migración**:

  ```sql
  notify pgrst, 'reload schema';
  ```

  PostgREST guarda en memoria las tablas, columnas y **relaciones** del
  esquema, y las consultas que embeben otra tabla dependen de esa caché. Si se
  queda desfasada, la API responde cosas como *"Could not find a relationship
  between 'profiles' and 'profiles' in the schema cache"* aunque la llave
  foránea exista y la consulta esté bien escrita (le pasó a la pestaña
  Solicitudes, que embebe `approver:profiles!profiles_approved_by_fkey`).
  Normalmente el disparador `pgrst_ddl_watch` la recarga solo; el `notify` es
  la forma manual de forzarlo y es inofensivo, así que conviene correrlo
  siempre al terminar una migración.
- **Respaldo**: el plan gratuito de Supabase no incluye backups automáticos;
  considerar exportes periódicos (`pg_dump`) cuando haya datos valiosos.
