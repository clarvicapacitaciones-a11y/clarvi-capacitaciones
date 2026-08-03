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
   los componentes `Ui*` y `assets/styles` son la única fuente de estilos.
4. **Interfaz plana.** Color sólido, líneas de 1px y esquinas rectas: sin
   degradados, glass, blur ni sombras. Lo único que se anima es el color, así
   que la UI se lee igual en una laptop vieja de planta que en un celular.

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
| La respuesta correcta de un examen nunca sale del servidor hacia un usuario | `exam_questions` guarda `answer_key` y solo es legible por admin/owner; el usuario recibe las preguntas saneadas por RPC. Sin esto, bastaría abrir la pestaña de red del navegador para ver las respuestas. |
| El examen lo califica Postgres, no el navegador | El cliente solo manda lo que eligió. `exam_attempts` no acepta escrituras directas, así que no hay forma de insertarse una calificación. |
| Cada respuesta contestada guarda el `question_snapshot` de su pregunta | El admin puede corregir o borrar preguntas después sin alterar el historial de quienes ya presentaron. Mismo criterio que congelar área/sucursal al escanear el QR. |
| El contenido del examen (`content`/`answer_key`) es `jsonb` y no tablas por tipo | Seis tipos de pregunta con formas muy distintas. Un trigger de validación (`assert_question_shape`) da la garantía que darían las columnas, sin seis tablas ni migraciones nuevas por cada tipo que se agregue. |

## Trabajo futuro (fuera de alcance actual)

- Preguntas de respuesta abierta: necesitan una bandeja de calificación manual
  para el admin, así que el examen dejaría de dar resultado inmediato.
- Generar exámenes automáticamente a partir de la transcripción del audio de la
  capacitación y las diapositivas del instructor.
- Banco de preguntas compartido entre capacitaciones.
- SMTP propio para recuperación de contraseña por correo.
