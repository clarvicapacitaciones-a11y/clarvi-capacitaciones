-- Cambios al catálogo de roles:
--   · `usuario` pasa a llamarse `colaborador` (nomenclatura interna).
--   · nuevo rol `lider`: aprueba los registros por nombre de usuario.
--
-- Va en una migración aparte a propósito: Postgres no permite *usar* un valor
-- de enum recién agregado dentro de la misma transacción en que se agregó, así
-- que 'lider' se agrega aquí y se usa en la 0011.

alter type public.user_role rename value 'usuario' to 'colaborador';
alter type public.user_role add value if not exists 'lider' after 'administrador';

-- Estado de aprobación de una cuenta. Es un tipo nuevo (no un valor agregado a
-- un enum existente), por lo que la 0011 puede usarlo sin restricciones aunque
-- ambas migraciones corran en la misma transacción.
create type public.approval_status_type as enum ('pendiente', 'aprobado', 'rechazado');
