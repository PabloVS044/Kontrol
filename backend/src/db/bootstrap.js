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
    INSERT INTO public.permiso_proyecto (nombre_permiso, descripcion)
    VALUES
      ('ver_inventario', 'Ver inventario del proyecto'),
      ('gestionar_inventario', 'Gestionar inventario del proyecto'),
      ('editar_proyecto', 'Editar información del proyecto'),
      ('gestionar_tareas', 'Crear y editar tareas'),
      ('asignar_usuarios', 'Asignar usuarios a tareas'),
      ('gestionar_presupuesto', 'Gestionar presupuesto del proyecto'),
      ('crear_reportes', 'Crear reportes del proyecto')
    ON CONFLICT (nombre_permiso) DO NOTHING
  `)
}
