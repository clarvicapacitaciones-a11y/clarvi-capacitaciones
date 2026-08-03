-- Faltaba el índice de la llave foránea `exams.created_by`. El resto del
-- esquema sí los tiene (idx_trainings_created_by, idx_profiles_area, …) y sin
-- él el borrado de un perfil escanea la tabla completa para aplicar el
-- `on delete set null`.

create index idx_exams_created_by on public.exams(created_by);
