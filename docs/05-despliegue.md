# Despliegue e infraestructura

## Recursos productivos

| Recurso | Detalle |
|---|---|
| Supabase | Proyecto `clarvi-capacitaciones` (`hwotaytvjjlvwkpnhotd`), org CLARVI, región `us-east-1`, plan gratuito |
| API Supabase | `https://hwotaytvjjlvwkpnhotd.supabase.co` |
| Edge Function | `register` (registro de cuentas con auto-confirmación) |
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

## Cómo se construyó el primer deploy (bootstrap)

El repo de GitHub es privado y este primer despliegue se hizo sin conectar
Git: el código fuente se empaquetó (`tar.gz`), se guardó en la tabla
`deploy_source` de Supabase — protegida por RLS con un header secreto
`x-deploy-key` — y el `installCommand` de Vercel (`bootstrap.sh`) lo descarga,
**verifica su SHA-256** y lo compila (`npm run build`, que incluye el
type-check de vue-tsc).

> **Recomendado para el día a día:** conectar el proyecto de Vercel al repo
> de GitHub (Vercel → Settings → Git → Connect). Con eso, cada push a `main`
> despliega solo, y `bootstrap.sh` + la tabla `deploy_source` se pueden
> eliminar. Hasta entonces, para redesplegar cambios hay que actualizar la
> tabla `deploy_source` con el nuevo tarball o conectar Git.

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

## Operación

- **Logs de la Edge Function**: Supabase Dashboard → Edge Functions →
  `register` → Logs.
- **Advisors**: revisar Security/Performance advisors tras cada migración.
- **Migraciones**: están en `supabase/migrations/` y se aplican con el MCP de
  Supabase o `supabase db push`; tras cada cambio, regenerar
  `src/types/database.types.ts`.
- **Respaldo**: el plan gratuito de Supabase no incluye backups automáticos;
  considerar exportes periódicos (`pg_dump`) cuando haya datos valiosos.
