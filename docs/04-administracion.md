# Guía de administración

La sección **Administración** (visible solo para administradores y el owner)
tiene tres pestañas: Capacitaciones, Usuarios y Catálogos.

## Capacitaciones

### Crear una capacitación
1. Administración → Capacitaciones → **Nueva capacitación**.
2. Captura título, temario/descripción y fecha de la sesión presencial.
3. El link de YouTube es **opcional al crear** — normalmente el video se edita
   y sube después de la sesión. Acepta cualquier formato de link
   (`youtu.be/…`, `youtube.com/watch?v=…`, `live/…`, `shorts/…`) y muestra
   vista previa al pegarlo.
4. Al guardar se genera automáticamente el **QR de asistencia**.

> Sugerencia: crea la capacitación **antes** de la sesión presencial para
> proyectar el QR ese día; agrega el video después con **Editar**.

### Ficha de una capacitación
- **Métricas**: asistentes presenciales, personas que han visto el video,
  completadas y avance promedio.
- **QR**: descargar PNG (para imprimir), copiar link, regenerar (invalida el
  QR anterior; la asistencia registrada se conserva).
- **Asistencia presencial**: quién escaneó, de qué área/sucursal y a qué hora.
- **Visualización del video**: por persona: % de avance con barra, tiempo
  visto, fecha en que completó y última actividad.

### Eliminar
Borra también su asistencia y el progreso de todos los usuarios (confirmación
previa). Si solo quieres ocultarla temporalmente, mejor quita el link del video.

## Usuarios

- Búsqueda por nombre/correo/usuario y filtros por área, sucursal, rol y estado.
- **Editar** permite corregir nombre, área y sucursal, y activar/desactivar la
  cuenta. Una cuenta desactivada no puede usar la plataforma (al intentar
  entrar se le cierra la sesión con aviso).
- **Roles** (solo visibles para el owner): asignar `usuario`,
  `administrador` u `owner`. Reglas aplicadas por la base de datos:
  - Solo el owner cambia roles.
  - El owner no puede quitarse el rol a sí mismo (evita quedarse sin owner).
  - Un administrador no puede editar la fila de un owner.
- El nombre de usuario y el correo no se pueden cambiar (el inicio de sesión
  depende de ellos).

## Catálogos

Áreas y sucursales que aparecen en el formulario de registro y en los reportes.

- **Agregar**: escribe el nombre y pulsa Agregar.
- **Renombrar**: afecta cómo se muestra en todos lados (histórico incluido).
- **Desactivar**: deja de aparecer para nuevos registros; los usuarios que ya
  la tienen asignada no se tocan. No hay borrado definitivo a propósito.

## Contraseñas

- Cada quien cambia la suya en **Mi perfil** (menú del usuario, arriba a la
  derecha).
- Para cuentas **por usuario** (sin correo) no existe "olvidé mi contraseña":
  no hay bandeja donde recibir el link. Mientras no haya SMTP configurado, la
  vía de rescate es que un administrador de la base de datos la restablezca
  (Supabase Dashboard → Authentication → Users → Reset password / o SQL).
