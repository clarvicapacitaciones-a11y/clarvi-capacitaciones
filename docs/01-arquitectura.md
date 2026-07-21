# Arquitectura

## El problema

Las capacitaciones presenciales de CLARVI se graban y suben a una playlist no
listada de YouTube para quienes no pudieron asistir. Con solo el link no hay
forma de saber quién vio la grabación, cuánto tiempo, ni si la terminó; la
asistencia presencial se registra en papel. Esta plataforma cierra ambos huecos.

## Principios de diseño

1. **Los videos siguen en YouTube.** La plataforma no almacena ni transmite
   video; embebe el reproductor oficial (IFrame Player API) y solo guarda
   métricas. Costo de almacenamiento/ancho de banda: cero.
2. **La seguridad vive en la base de datos.** Todas las reglas (quién ve qué,
   quién edita qué, validación de dominio de correo, anti-trampa del progreso)
   están en Postgres como políticas RLS, triggers y funciones. El frontend
   puede tener bugs sin comprometer datos.
3. **Funciones claras y simples.** Cada servicio/composable hace una cosa;
   los componentes glass son la única fuente de estilos de marca.

## Componentes

```
┌─────────────────────┐         ┌──────────────────────────────┐
│  Navegador (Vue 3)  │ iframe  │  YouTube (videos no listados) │
│  Vercel (SPA)       │────────▶│  IFrame Player API            │
└─────────┬───────────┘         └──────────────────────────────┘
          │ supabase-js (anon key + JWT del usuario)
          ▼
┌─────────────────────────────────────────────────┐
│  Supabase                                       │
│  ├─ Auth (correo @clarvi.com o usuario)         │
│  ├─ Postgres + RLS (datos y reglas)             │
│  └─ Edge Function `register` (alta de cuentas)  │
└─────────────────────────────────────────────────┘
```

## Decisiones clave

| Decisión | Por qué |
|---|---|
| Cuentas sin correo usan un correo sintético `usuario@users.internal.clarvi` | Supabase Auth exige un correo por usuario. El dominio es reservado y no enrutable; el login mapea `usuario` → correo sintético de forma transparente. |
| Alta de cuentas vía Edge Function (no `auth.signUp`) | Crea las cuentas ya confirmadas con la service role key: no depende de envío de correos (el SMTP integrado de Supabase está limitado a ~2/hora) y funciona igual para cuentas con y sin correo. |
| El QR codifica un `qr_token` opaco, no el ID de la capacitación | Permite regenerar/invalidar un QR impreso sin romper la asistencia ya registrada (que cuelga del ID real). |
| Progreso como **rangos vistos** `[[inicio,fin],…]` y no "segundo máximo alcanzado" | Adelantar el video no acredita el tramo saltado; re-ver un tramo no lo cuenta doble; el total cubierto es tiempo de video realmente reproducido. |
| `completed_at` se fija una sola vez (trigger) al llegar a 90% | El historial de cumplimiento no se degrada si alguien re-mira parcialmente el video después. |
| Áreas y sucursales son catálogos administrables | Datos consistentes para reportes (nada de "RH" vs "Recursos Humanos" escritos a mano). |
| Asistencia (QR) y visualización (video) son tablas separadas | Son hechos distintos: alguien pudo asistir y no ver el video, ver el video sin haber asistido, ambas o ninguna. La ficha admin muestra las dos listas. |

## Trabajo futuro (fuera de alcance actual)

- Exámenes dentro de la plataforma, generados a partir de transcribir el audio
  de las capacitaciones y las diapositivas del instructor. El esquema actual no
  reserva tablas para esto; se agregará como módulo nuevo cuando se aborde.
- SMTP propio para recuperación de contraseña por correo.
