import pool from './pool.js'

export const ensureDatabaseSchema = async () => {
  await pool.query(`
    ALTER TABLE public.empresa
      ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT true
  `)

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
    CREATE TABLE IF NOT EXISTS public.integracion (
      id_integracion  SERIAL PRIMARY KEY,
      id_empresa      INTEGER NOT NULL,
      slug            VARCHAR(50) NOT NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'inactive'
                        CHECK (status IN ('active', 'inactive', 'error')),
      credentials_enc TEXT,
      config          JSONB NOT NULL DEFAULT '{}',
      creado_por      INTEGER,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT integracion_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT integracion_usuario_fkey
        FOREIGN KEY (creado_por) REFERENCES public.usuario(id_usuario),
      CONSTRAINT integracion_empresa_slug_unique UNIQUE (id_empresa, slug)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.integracion_log (
      id_log      SERIAL PRIMARY KEY,
      id_empresa  INTEGER NOT NULL,
      slug        VARCHAR(50) NOT NULL,
      event       VARCHAR(100),
      status      VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error')),
      error_msg   TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT integracion_log_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS integracion_log_empresa_slug_idx
      ON public.integracion_log (id_empresa, slug, created_at DESC)
  `)

  await pool.query(`
    INSERT INTO public.rol (nombre_rol, descripcion)
    VALUES ('super_user', 'Super usuario — acceso global irrestricto a toda la plataforma')
    ON CONFLICT (nombre_rol) DO NOTHING
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

  // Audit log for top-up additions / withdrawals against a project's allocated
  // budget. Each row records who changed it, by how much, and why.
  // Conceptually distinct from movimiento_inventario (which is a cash-flow
  // ledger) — this records changes to the project's capital allocation.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.presupuesto_ajuste (
      id_ajuste SERIAL PRIMARY KEY,
      id_proyecto integer NOT NULL,
      monto numeric NOT NULL CHECK (monto <> 0),
      motivo text,
      fecha timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      id_usuario integer NOT NULL,
      CONSTRAINT presupuesto_ajuste_proyecto_fkey
        FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto) ON DELETE CASCADE,
      CONSTRAINT presupuesto_ajuste_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
    )
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS presupuesto_ajuste_proyecto_idx
      ON public.presupuesto_ajuste (id_proyecto, fecha DESC)
  `)

  // Reuse movimiento_inventario as the source of truth for activity expenses:
  // GASTO_ADMIN movements can now optionally link to a presupuesto_actividad
  // so the activity row can show its own expense history without a parallel
  // table. id_producto stays NULL for these (admin/services spend).
  await pool.query(`
    ALTER TABLE public.movimiento_inventario
      ADD COLUMN IF NOT EXISTS id_actividad integer
  `)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'mi_actividad_fkey'
          AND table_name = 'movimiento_inventario'
      ) THEN
        ALTER TABLE public.movimiento_inventario
          ADD CONSTRAINT mi_actividad_fkey
          FOREIGN KEY (id_actividad)
          REFERENCES public.presupuesto_actividad(id_actividad)
          ON DELETE SET NULL;
      END IF;
    END $$
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS movimiento_inventario_actividad_idx
      ON public.movimiento_inventario (id_actividad)
      WHERE id_actividad IS NOT NULL
  `)

  // Snapshot of the product's weighted-average cost at the moment of a SALIDA.
  // Lets sales/profit analytics compute COGS against the cost that actually
  // applied when the sale happened, instead of the product's current cost
  // (which drifts as new stock comes in). Nullable: only SALIDA rows set it,
  // and pre-existing rows fall back to costo_promedio_ponderado at query time.
  await pool.query(`
    ALTER TABLE public.movimiento_inventario
      ADD COLUMN IF NOT EXISTS costo_unitario_venta numeric
  `)

  // Barcode for camera-scan POS. Nullable; unique per project so the same
  // physical product can live in several projects' inventories, but a code
  // resolves unambiguously within one project.
  await pool.query(`
    ALTER TABLE public.producto
      ADD COLUMN IF NOT EXISTS codigo_barras varchar
  `)
  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS producto_codigo_barras_unique
      ON public.producto (id_proyecto, codigo_barras)
      WHERE codigo_barras IS NOT NULL
  `)

  // Indexes for the sales/finance analytics + movement listings, which filter
  // by project + date range and by product. Avoids full scans as the ledger grows.
  await pool.query(`
    CREATE INDEX IF NOT EXISTS movimiento_inventario_proyecto_fecha_idx
      ON public.movimiento_inventario (id_proyecto, fecha)
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS movimiento_inventario_producto_idx
      ON public.movimiento_inventario (id_producto)
      WHERE id_producto IS NOT NULL
  `)

  // Generating an export (PDF/CSV) from the reports view is recorded as a row
  // in REPORTE, but that view spans every project the company has, so such a
  // row belongs to no single project: id_proyecto becomes optional and the
  // company is stored directly instead of being read through the project join.
  await pool.query(`
    ALTER TABLE public.reporte
      ADD COLUMN IF NOT EXISTS id_empresa integer
  `)
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'reporte_id_empresa_fkey'
          AND table_name = 'reporte'
      ) THEN
        ALTER TABLE public.reporte
          ADD CONSTRAINT reporte_id_empresa_fkey
          FOREIGN KEY (id_empresa)
          REFERENCES public.empresa(id_empresa)
          ON DELETE CASCADE;
      END IF;
    END $$
  `)
  await pool.query(`
    ALTER TABLE public.reporte
      ALTER COLUMN id_proyecto DROP NOT NULL
  `)

  // Backfill so every pre-existing report resolves its company without the
  // project join, which is what the listing queries now rely on.
  await pool.query(`
    UPDATE public.reporte r
    SET id_empresa = p.id_empresa
    FROM public.proyecto p
    WHERE p.id_proyecto = r.id_proyecto
      AND r.id_empresa IS NULL
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS reporte_empresa_fecha_idx
      ON public.reporte (id_empresa, fecha_generacion DESC)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.equipo (
      id_equipo SERIAL PRIMARY KEY,
      nombre character varying NOT NULL,
      descripcion text,
      id_empresa integer NOT NULL,
      id_lider integer NOT NULL,
      activo boolean NOT NULL DEFAULT true,
      creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT equipo_id_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT equipo_id_lider_fkey
        FOREIGN KEY (id_lider) REFERENCES public.usuario(id_usuario)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.equipo_usuario (
      id_equipo integer NOT NULL,
      id_usuario integer NOT NULL,
      PRIMARY KEY (id_equipo, id_usuario),
      CONSTRAINT eq_u_id_equipo_fkey
        FOREIGN KEY (id_equipo) REFERENCES public.equipo(id_equipo) ON DELETE CASCADE,
      CONSTRAINT eq_u_id_usuario_fkey
        FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE
    )
  `)

  await pool.query(`
    ALTER TABLE public.proyecto
      ADD COLUMN IF NOT EXISTS id_equipo integer
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'proyecto_id_equipo_fkey'
          AND table_name = 'proyecto'
      ) THEN
        ALTER TABLE public.proyecto
          ADD CONSTRAINT proyecto_id_equipo_fkey
          FOREIGN KEY (id_equipo)
          REFERENCES public.equipo(id_equipo)
          ON DELETE SET NULL;
      END IF;
    END $$
  `)

  // ── Marketing (HU-28) ──────────────────────────────────────────────────────
  // Administración interna de publicaciones. Las FK compuestas contra
  // proyecto(id_empresa, id_proyecto) garantizan el aislamiento multi-empresa a
  // nivel de base, no solo en el controller.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_campaign (
      id_campaign SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_proyecto integer NOT NULL,
      name character varying NOT NULL,
      description text,
      objective character varying,
      channel character varying,
      status character varying NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED')),
      start_date date,
      end_date date,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_campaign_empresa_proyecto_fkey
        FOREIGN KEY (id_empresa, id_proyecto)
        REFERENCES public.proyecto(id_empresa, id_proyecto) ON DELETE CASCADE,
      CONSTRAINT marketing_campaign_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_campaign_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_campaign_empresa_id_unique UNIQUE (id_empresa, id_campaign),
      CONSTRAINT marketing_campaign_fechas_check
        CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_campaign_empresa_status_idx
      ON public.marketing_campaign (id_empresa, status)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_campaign_proyecto_idx
      ON public.marketing_campaign (id_proyecto)
  `)

  // Estados de la publicación: DRAFT → SCHEDULED → PUBLISHED.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_publication (
      id_publication SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_proyecto integer NOT NULL,
      id_campaign integer,
      title character varying NOT NULL,
      caption text,
      asset_url character varying,
      platform character varying NOT NULL
        CHECK (platform IN ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'X', 'YOUTUBE', 'WHATSAPP', 'OTHER')),
      publication_format character varying NOT NULL DEFAULT 'POST'
        CHECK (publication_format IN ('POST', 'STORY', 'REEL', 'VIDEO', 'CAROUSEL', 'SHORT', 'AD', 'OTHER')),
      status character varying NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED')),
      scheduled_for timestamp without time zone,
      published_at timestamp without time zone,
      publication_url character varying,
      notes text,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_publication_empresa_proyecto_fkey
        FOREIGN KEY (id_empresa, id_proyecto)
        REFERENCES public.proyecto(id_empresa, id_proyecto) ON DELETE CASCADE,
      CONSTRAINT marketing_publication_empresa_campaign_fkey
        FOREIGN KEY (id_empresa, id_campaign)
        REFERENCES public.marketing_campaign(id_empresa, id_campaign) ON DELETE RESTRICT,
      CONSTRAINT marketing_publication_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_publication_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_publication_transicion_check CHECK (
        (status = 'DRAFT')
        OR (status = 'SCHEDULED' AND scheduled_for IS NOT NULL)
        OR (status = 'PUBLISHED' AND published_at IS NOT NULL)
      )
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_empresa_status_idx
      ON public.marketing_publication (id_empresa, status)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_empresa_platform_idx
      ON public.marketing_publication (id_empresa, platform)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_empresa_proyecto_idx
      ON public.marketing_publication (id_empresa, id_proyecto)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_campaign_idx
      ON public.marketing_publication (id_campaign)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_publication_agenda_idx
      ON public.marketing_publication (id_empresa, scheduled_for DESC)
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_item (
      id_marketing_item SERIAL PRIMARY KEY,
      id_empresa integer NOT NULL,
      id_proyecto integer,
      id_campaign integer,
      title character varying NOT NULL,
      description text,
      content text NOT NULL,
      status character varying NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
      content_type character varying NOT NULL
        CHECK (content_type IN ('IDEA', 'COPY', 'POST', 'ASSET', 'PROPOSAL')),
      marketing_date date NOT NULL DEFAULT CURRENT_DATE,
      resource_link character varying,
      origin_type character varying NOT NULL DEFAULT 'MANUAL'
        CHECK (origin_type IN ('MANUAL', 'RULE_BASED', 'AI', 'EXTERNAL')),
      integration_provider character varying,
      integration_reference character varying,
      integration_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_by integer NOT NULL,
      updated_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_item_empresa_fkey
        FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa) ON DELETE CASCADE,
      CONSTRAINT marketing_item_empresa_proyecto_fkey
        FOREIGN KEY (id_empresa, id_proyecto)
        REFERENCES public.proyecto(id_empresa, id_proyecto) ON DELETE CASCADE,
      CONSTRAINT marketing_item_empresa_campaign_fkey
        FOREIGN KEY (id_empresa, id_campaign)
        REFERENCES public.marketing_campaign(id_empresa, id_campaign) ON DELETE RESTRICT,
      CONSTRAINT marketing_item_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario),
      CONSTRAINT marketing_item_updated_by_fkey
        FOREIGN KEY (updated_by) REFERENCES public.usuario(id_usuario)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_item_empresa_status_idx
      ON public.marketing_item (id_empresa, status)
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_item_campaign_idx
      ON public.marketing_item (id_campaign)
  `)

  // Métricas capturadas manualmente. La ingesta automática desde las APIs de
  // redes sociales queda fuera de alcance (HU-36).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.marketing_publication_metric_snapshot (
      id_metric_snapshot SERIAL PRIMARY KEY,
      id_publication integer NOT NULL,
      captured_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      impressions integer NOT NULL DEFAULT 0 CHECK (impressions >= 0),
      reach integer NOT NULL DEFAULT 0 CHECK (reach >= 0),
      likes integer NOT NULL DEFAULT 0 CHECK (likes >= 0),
      comments integer NOT NULL DEFAULT 0 CHECK (comments >= 0),
      shares integer NOT NULL DEFAULT 0 CHECK (shares >= 0),
      saves integer NOT NULL DEFAULT 0 CHECK (saves >= 0),
      clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0),
      leads integer NOT NULL DEFAULT 0 CHECK (leads >= 0),
      followers_gained integer NOT NULL DEFAULT 0 CHECK (followers_gained >= 0),
      spend numeric NOT NULL DEFAULT 0 CHECK (spend >= 0),
      notes text,
      created_by integer NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT marketing_metric_snapshot_publication_fkey
        FOREIGN KEY (id_publication)
        REFERENCES public.marketing_publication(id_publication) ON DELETE CASCADE,
      CONSTRAINT marketing_metric_snapshot_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.usuario(id_usuario)
    )
  `)

  await pool.query(`
    CREATE INDEX IF NOT EXISTS marketing_metric_snapshot_publication_idx
      ON public.marketing_publication_metric_snapshot (id_publication, captured_at DESC, id_metric_snapshot DESC)
  `)

  // ── Marketing · alineación de bases anteriores a HU-28 ─────────────────────
  // Las tablas de marketing ya existían con otra forma: la campaña era
  // obligatoria, el estado usaba otro catálogo ('PLANNED', 'IN_DESIGN', …) y las
  // FKs miraban una sola columna. CREATE TABLE IF NOT EXISTS no toca una tabla
  // que ya existe, así que hace falta migrarla explícitamente.
  // Todo lo que sigue es idempotente y en una base recién creada no cambia nada.

  // La publicación cuelga del proyecto; la campaña pasa a ser opcional.
  await pool.query(`
    ALTER TABLE public.marketing_publication
      ALTER COLUMN id_campaign DROP NOT NULL
  `)

  await pool.query(`
    ALTER TABLE public.marketing_publication
      ALTER COLUMN status SET DEFAULT 'DRAFT'
  `)

  // El CHECK viejo se suelta antes de tocar los datos: no admite 'DRAFT', así
  // que la normalización de estados fallaría contra él.
  await pool.query(`
    ALTER TABLE public.marketing_publication
      DROP CONSTRAINT IF EXISTS marketing_publication_status_check
  `)

  // Estados del catálogo anterior → ciclo de HU-28. Todo lo que no llegó a
  // publicarse vuelve a borrador, que es el único destino que no inventa datos.
  await pool.query(`
    UPDATE public.marketing_publication
    SET status = 'DRAFT'
    WHERE status IN ('PLANNED', 'IN_DESIGN', 'PAUSED', 'CANCELLED')
  `)

  // Filas que incumplirían el invariante de fechas, saneadas antes de imponerlo:
  // sin ellas el ALTER fallaría y el servidor no arrancaría.
  await pool.query(`
    UPDATE public.marketing_publication
    SET status = 'DRAFT'
    WHERE status = 'SCHEDULED' AND scheduled_for IS NULL
  `)

  await pool.query(`
    UPDATE public.marketing_publication
    SET published_at = COALESCE(published_at, updated_at, CURRENT_TIMESTAMP)
    WHERE status = 'PUBLISHED' AND published_at IS NULL
  `)

  await pool.query(`
    ALTER TABLE public.marketing_publication
      ADD CONSTRAINT marketing_publication_status_check
      CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED'))
  `)

  await pool.query(`
    ALTER TABLE public.marketing_publication
      DROP CONSTRAINT IF EXISTS marketing_publication_transicion_check
  `)

  await pool.query(`
    ALTER TABLE public.marketing_publication
      ADD CONSTRAINT marketing_publication_transicion_check CHECK (
        (status = 'DRAFT')
        OR (status = 'SCHEDULED' AND scheduled_for IS NOT NULL)
        OR (status = 'PUBLISHED' AND published_at IS NOT NULL)
      )
  `)

  // Aislamiento multi-empresa a nivel de base: el proyecto y la campaña de una
  // publicación deben ser de su misma empresa. Las FKs de una sola columna no lo
  // garantizaban. Se agregan NOT VALID para que una fila heredada inconsistente
  // no impida arrancar; a partir de aquí toda escritura sí queda validada.
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketing_campaign_empresa_id_unique'
      ) THEN
        ALTER TABLE public.marketing_campaign
          ADD CONSTRAINT marketing_campaign_empresa_id_unique UNIQUE (id_empresa, id_campaign);
      END IF;
    END $$
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketing_publication_empresa_proyecto_fkey'
      ) THEN
        ALTER TABLE public.marketing_publication
          DROP CONSTRAINT IF EXISTS marketing_publication_project_fkey;
        ALTER TABLE public.marketing_publication
          ADD CONSTRAINT marketing_publication_empresa_proyecto_fkey
          FOREIGN KEY (id_empresa, id_proyecto)
          REFERENCES public.proyecto(id_empresa, id_proyecto) ON DELETE CASCADE NOT VALID;
      END IF;
    END $$
  `)

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'marketing_publication_empresa_campaign_fkey'
      ) THEN
        ALTER TABLE public.marketing_publication
          DROP CONSTRAINT IF EXISTS marketing_publication_campaign_fkey;
        ALTER TABLE public.marketing_publication
          ADD CONSTRAINT marketing_publication_empresa_campaign_fkey
          FOREIGN KEY (id_empresa, id_campaign)
          REFERENCES public.marketing_campaign(id_empresa, id_campaign) ON DELETE RESTRICT NOT VALID;
      END IF;
    END $$
  `)
}
