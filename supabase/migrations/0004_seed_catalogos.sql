-- Catálogos iniciales. Los administradores pueden renombrarlos,
-- desactivarlos o agregar más desde la sección Catálogos de la plataforma.

insert into public.areas (nombre) values
  ('Operaciones'),
  ('Mantenimiento'),
  ('Laboratorio'),
  ('Ingeniería y Proyectos'),
  ('Seguridad e Higiene'),
  ('Administración'),
  ('Recursos Humanos'),
  ('Comercial')
on conflict (nombre) do nothing;

insert into public.sucursales (nombre) values
  ('Matriz')
on conflict (nombre) do nothing;
