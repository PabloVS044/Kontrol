import pool from './pool.js'

export const ensureDatabaseSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.empresa_invitacion (
      id_invitacion SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      token character varying NOT NULL UNIQUE,
      id_usuario_owner integer NOT NULL,
      activa boolean NOT NULL DEFAULT true,
      creada_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      desactivada_en timestamp without time zone,
      ultimo_uso_en timestamp without time zone,
      CONSTRAINT empresa_invitacion_id_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
      CONSTRAINT empresa_invitacion_id_usuario_owner_fkey
        FOREIGN KEY (id_usuario_owner) REFERENCES public.usuario(id_usuario)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS empresa_invitacion_empresa_idx
      ON public.empresa_invitacion (id_empresa)
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS empresa_invitacion_empresa_activa_unique
      ON public.empresa_invitacion (id_empresa)
      WHERE activa = true
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.proyecto_invitacion (
      id_invitacion SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_proyecto integer NOT NULL,
      token character varying NOT NULL UNIQUE,
      id_usuario_invitador integer NOT NULL,
      activa boolean NOT NULL DEFAULT true,
      creada_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      desactivada_en timestamp without time zone,
      ultimo_uso_en timestamp without time zone,
      CONSTRAINT proyecto_invitacion_id_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
      CONSTRAINT proyecto_invitacion_id_proyecto_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
      CONSTRAINT proyecto_invitacion_id_usuario_invitador_fkey
        FOREIGN KEY (id_usuario_invitador) REFERENCES public.usuario(id_usuario)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.proyecto_invitacion_permiso (
      id_invitacion integer NOT NULL,
      id_permiso_proyecto integer NOT NULL,
      PRIMARY KEY (id_invitacion, id_permiso_proyecto),
      CONSTRAINT proyecto_invitacion_permiso_invitacion_fkey
        FOREIGN KEY (id_invitacion) REFERENCES public.proyecto_invitacion(id_invitacion),
      CONSTRAINT proyecto_invitacion_permiso_permiso_fkey
        FOREIGN KEY (id_permiso_proyecto) REFERENCES public.permiso_proyecto(id_permiso_proyecto)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS proyecto_invitacion_proyecto_idx
      ON public.proyecto_invitacion (id_proyecto)
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS proyecto_invitacion_proyecto_activa_unique
      ON public.proyecto_invitacion (id_proyecto)
      WHERE activa = true
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.project_progress_entry (
      id_progress_entry SERIAL PRIMARY KEY,
      id_proyecto integer NOT NULL,
      id_usuario integer NOT NULL,
      title character varying(200) NOT NULL,
      details text,
      update_type character varying(20) NOT NULL DEFAULT 'UPDATE',
      progress_percentage numeric(5,2) NOT NULL,
      happened_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT project_progress_entry_project_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto) ON DELETE CASCADE,
      CONSTRAINT project_progress_entry_user_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
      CONSTRAINT project_progress_entry_type_check
        CHECK (update_type IN ('UPDATE', 'MILESTONE', 'BLOCKER')),
      CONSTRAINT project_progress_entry_percentage_check
        CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS project_progress_entry_project_happened_idx
      ON public.project_progress_entry (id_proyecto, happened_at DESC, id_progress_entry DESC)
  `)

  await pool.query(`
    INSERT INTO public.permiso_proyecto (nombre_permiso, descripcion)
    VALUES
      ('ver_inventario', 'View project inventory'),
      ('gestionar_inventario', 'Manage project inventory'),
      ('editar_proyecto', 'Edit project information'),
      ('gestionar_tareas', 'Create and edit tasks'),
      ('asignar_usuarios', 'Assign users to tasks'),
      ('gestionar_presupuesto', 'Manage project budget'),
      ('crear_reportes', 'Create project reports')
    ON CONFLICT (nombre_permiso) DO UPDATE
    SET descripcion = EXCLUDED.descripcion
  `)
}
