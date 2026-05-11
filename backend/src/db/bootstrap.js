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
    CREATE TABLE IF NOT EXISTS public.marketing_campaign (
      id_campaign SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_proyecto integer,
      name character varying(160) NOT NULL,
      description text,
      objective character varying(240),
      channel character varying(120),
      status character varying(20) NOT NULL DEFAULT 'DRAFT',
      start_date date,
      end_date date,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_campaign_company_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT marketing_campaign_project_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto) ON DELETE SET NULL,
      CONSTRAINT marketing_campaign_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_campaign_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_campaign_status_check
        CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'))
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_campaign_company_name_idx
      ON public.marketing_campaign (id_empresa, LOWER(name))
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_campaign_project_idx
      ON public.marketing_campaign (id_proyecto)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_item (
      id_marketing_item SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_campaign integer,
      id_proyecto integer,
      title character varying(180) NOT NULL,
      description text,
      content text NOT NULL,
      status character varying(20) NOT NULL DEFAULT 'DRAFT',
      content_type character varying(20) NOT NULL,
      marketing_date date NOT NULL DEFAULT CURRENT_DATE,
      resource_link character varying(500),
      origin_type character varying(20) NOT NULL DEFAULT 'MANUAL',
      integration_provider character varying(80),
      integration_reference character varying(180),
      integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_item_company_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT marketing_item_campaign_fkey
        FOREIGN KEY (id_campaign) REFERENCES public.marketing_campaign(id_campaign) ON DELETE SET NULL,
      CONSTRAINT marketing_item_project_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto) ON DELETE SET NULL,
      CONSTRAINT marketing_item_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_item_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_item_status_check
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
      CONSTRAINT marketing_item_type_check
        CHECK (content_type IN ('IDEA', 'COPY', 'POST', 'ASSET', 'PROPOSAL')),
      CONSTRAINT marketing_item_origin_check
        CHECK (origin_type IN ('MANUAL', 'RULE_BASED', 'AI', 'EXTERNAL'))
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_item_company_date_idx
      ON public.marketing_item (id_empresa, marketing_date DESC, updated_at DESC)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_item_campaign_idx
      ON public.marketing_item (id_campaign)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_item_project_idx
      ON public.marketing_item (id_proyecto)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_publication (
      id_publication SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_campaign integer,
      id_proyecto integer NOT NULL,
      title character varying(180) NOT NULL,
      caption text,
      platform character varying(20) NOT NULL,
      publication_format character varying(20) NOT NULL,
      status character varying(20) NOT NULL DEFAULT 'PLANNED',
      scheduled_for timestamp without time zone,
      published_at timestamp without time zone,
      asset_url character varying(500),
      publication_url character varying(500),
      notes text,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_publication_company_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT marketing_publication_campaign_fkey
        FOREIGN KEY (id_campaign) REFERENCES public.marketing_campaign(id_campaign) ON DELETE SET NULL,
      CONSTRAINT marketing_publication_project_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto) ON DELETE CASCADE,
      CONSTRAINT marketing_publication_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_publication_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_publication_status_check
        CHECK (status IN ('PLANNED', 'IN_DESIGN', 'SCHEDULED', 'PUBLISHED', 'PAUSED', 'CANCELLED')),
      CONSTRAINT marketing_publication_platform_check
        CHECK (platform IN ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'X', 'YOUTUBE', 'WHATSAPP', 'OTHER')),
      CONSTRAINT marketing_publication_format_check
        CHECK (publication_format IN ('POST', 'STORY', 'REEL', 'VIDEO', 'CAROUSEL', 'SHORT', 'AD', 'OTHER'))
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_project_campaign_idx
      ON public.marketing_publication (id_proyecto, id_campaign)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_status_idx
      ON public.marketing_publication (status, platform)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_publication_metric_snapshot (
      id_metric_snapshot SERIAL PRIMARY KEY,
      id_publication integer NOT NULL,
      captured_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      impressions integer NOT NULL DEFAULT 0,
      reach integer NOT NULL DEFAULT 0,
      likes integer NOT NULL DEFAULT 0,
      comments integer NOT NULL DEFAULT 0,
      shares integer NOT NULL DEFAULT 0,
      saves integer NOT NULL DEFAULT 0,
      clicks integer NOT NULL DEFAULT 0,
      leads integer NOT NULL DEFAULT 0,
      followers_gained integer NOT NULL DEFAULT 0,
      spend numeric(12,2) NOT NULL DEFAULT 0,
      notes text,
      created_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_metric_snapshot_publication_fkey
        FOREIGN KEY (id_publication) REFERENCES public.marketing_publication(id_publication) ON DELETE CASCADE,
      CONSTRAINT marketing_metric_snapshot_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_metric_snapshot_impressions_check CHECK (impressions >= 0),
      CONSTRAINT marketing_metric_snapshot_reach_check CHECK (reach >= 0),
      CONSTRAINT marketing_metric_snapshot_likes_check CHECK (likes >= 0),
      CONSTRAINT marketing_metric_snapshot_comments_check CHECK (comments >= 0),
      CONSTRAINT marketing_metric_snapshot_shares_check CHECK (shares >= 0),
      CONSTRAINT marketing_metric_snapshot_saves_check CHECK (saves >= 0),
      CONSTRAINT marketing_metric_snapshot_clicks_check CHECK (clicks >= 0),
      CONSTRAINT marketing_metric_snapshot_leads_check CHECK (leads >= 0),
      CONSTRAINT marketing_metric_snapshot_followers_check CHECK (followers_gained >= 0),
      CONSTRAINT marketing_metric_snapshot_spend_check CHECK (spend >= 0)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_metric_snapshot_publication_time_idx
      ON public.marketing_publication_metric_snapshot (id_publication, captured_at DESC, id_metric_snapshot DESC)
  `)

  await pool.query(`
    INSERT INTO public.permiso_empresa (nombre_permiso, descripcion)
    VALUES
      ('ver_marketing', 'View the marketing center'),
      ('gestionar_marketing', 'Create and edit marketing content')
    ON CONFLICT (nombre_permiso) DO UPDATE
    SET descripcion = EXCLUDED.descripcion
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
