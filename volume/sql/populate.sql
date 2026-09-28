-- Volume population for the SCRUM-25 test database. Run through populate.sh,
-- which passes the target volume of the level as psql variables and applies
-- the safety guard first. Never run by hand against any other database.
--
-- Cumulative: each block counts the VOL rows already present and inserts only
-- the difference, so N1 -> N2 -> N3 tops up instead of starting over, and
-- re-running a level is a no-op. Every generated row carries a "VOL" marker in
-- a name or motivo column; `npm run reset:test` wipes all of it.
--
-- Distribution. A share of every table (vol.hot_share, 20% by default) goes
-- to one "hot" project of the seeded test company, "VOL Proyecto 1": that is
-- the project the measurements read, so per-project queries see a large
-- tenant. The rest is spread over the other VOL projects — the test company's
-- and those of 20 filler companies — so that queries which should be scoped by
-- project or company are also measured against rows they must skip.

\set ON_ERROR_STOP on
SET statement_timeout = 0;
SET synchronous_commit = off;

-- psql variables do not reach inside DO bodies; custom settings do.
SET vol.n_prod     = :'n_prod';
SET vol.n_mov      = :'n_mov';
SET vol.n_venta    = :'n_venta';
SET vol.n_tarea    = :'n_tarea';
SET vol.n_avance   = :'n_avance';
SET vol.n_reporte  = :'n_reporte';
SET vol.n_act      = :'n_act';
SET vol.n_proj_emp = :'n_proj_emp';
SET vol.hot_share  = :'hot_share';

-- ─── Companies, projects, membership ────────────────────────────────────────
DO $$
DECLARE
  v_emp  int := (SELECT id_empresa FROM public.empresa WHERE email = 'contacto@lospinos-test.dev');
  v_user int := (SELECT id_usuario FROM public.usuario WHERE email = 'participante1@kontrol-test.dev');
  n_proj_emp int := current_setting('vol.n_proj_emp')::int;
BEGIN
  INSERT INTO public.empresa (nombre, industria, email)
  SELECT 'VOL Empresa ' || g, 'Volumen', 'vol-' || g || '@kontrol-volumen.dev'
  FROM generate_series(1, 20) g
  ON CONFLICT (email) DO NOTHING;

  -- 5 projects per filler company, n_proj_emp in the test company.
  INSERT INTO public.proyecto (nombre, descripcion, fecha_inicio, fecha_fin_planificada,
                               presupuesto_total, estado, id_empresa, id_encargado)
  SELECT 'VOL Proyecto ' || k, 'Proyecto generado para las pruebas de volumen',
         CURRENT_DATE - (k * 7), CURRENT_DATE + 180, 250000 + k * 1000,
         (ARRAY['PLANIFICADO','EN_PROGRESO','EN_PROGRESO','PAUSADO','COMPLETADO'])[1 + k % 5],
         e.id_empresa, v_user
  FROM (
    SELECT id_empresa, 5 AS n FROM public.empresa WHERE email LIKE 'vol-%@kontrol-volumen.dev'
    UNION ALL
    SELECT v_emp, n_proj_emp
  ) e
  CROSS JOIN LATERAL generate_series(1, e.n) k
  WHERE NOT EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id_empresa = e.id_empresa AND p.nombre = 'VOL Proyecto ' || k
  );

  -- The six test accounts are members of the hot project, so the team
  -- breakdown of /metrics has rows and k6 can reach it with any account.
  INSERT INTO public.proyecto_usuario (id_proyecto, id_usuario)
  SELECT p.id_proyecto, u.id_usuario
  FROM public.proyecto p
  JOIN public.usuario u ON u.email LIKE '%@kontrol-test.dev'
  WHERE p.id_empresa = v_emp AND p.nombre = 'VOL Proyecto 1'
  ON CONFLICT (id_proyecto, id_usuario) DO NOTHING;

  INSERT INTO public.categoria (nombre, id_empresa)
  SELECT 'VOL Categoría ' || g, v_emp FROM generate_series(1, 12) g
  ON CONFLICT (id_empresa, nombre) DO NOTHING;
END $$;

-- Buckets shared by the blocks below. Temporary, so they vanish with the session.
CREATE TEMP TABLE vol_hot AS
SELECT p.id_proyecto, p.id_empresa
FROM public.proyecto p
JOIN public.empresa e ON e.id_empresa = p.id_empresa
WHERE e.email = 'contacto@lospinos-test.dev' AND p.nombre = 'VOL Proyecto 1';

CREATE TEMP TABLE vol_cold AS
SELECT row_number() OVER (ORDER BY p.id_proyecto) AS idx, p.id_proyecto, p.id_empresa
FROM public.proyecto p
WHERE p.nombre LIKE 'VOL Proyecto %'
  AND p.id_proyecto <> (SELECT id_proyecto FROM vol_hot);

-- Projects of the filler companies only. Tables counted per company (venta,
-- reporte) spread their cold share here, so none of it lands in the test
-- company and is mistaken for its share on the next top-up.
CREATE TEMP TABLE vol_cold_ext AS
SELECT row_number() OVER (ORDER BY id_proyecto) AS idx, id_proyecto, id_empresa
FROM vol_cold WHERE id_empresa <> (SELECT id_empresa FROM vol_hot);

-- Top-up helper: how many rows are missing in a bucket.
CREATE FUNCTION pg_temp.vol_missing(total int, share numeric, have bigint, hot boolean)
RETURNS int LANGUAGE sql AS $$
  SELECT GREATEST(0, (CASE WHEN hot THEN round(total * share) ELSE total - round(total * share) END)::int - have::int)
$$;

-- ─── producto ───────────────────────────────────────────────────────────────
-- 90% carry a barcode ("VOL-<seq>", globally unique so the per-project unique
-- index never collides); the rest have none, as real catalogs do.
DO $$
DECLARE
  total int := current_setting('vol.n_prod')::int;
  share numeric := current_setting('vol.hot_share')::numeric;
  hot int := (SELECT id_proyecto FROM vol_hot);
  n_cold int := (SELECT count(*) FROM vol_cold);
  have_hot bigint; have_cold bigint; base bigint; add_hot int; add_cold int;
BEGIN
  SELECT count(*) FILTER (WHERE id_proyecto = hot), count(*) FILTER (WHERE id_proyecto <> hot)
    INTO have_hot, have_cold
  FROM public.producto WHERE nombre LIKE 'VOL Producto %';
  add_hot  := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);
  base := have_hot + have_cold;

  INSERT INTO public.producto (nombre, descripcion, precio_venta, precio_costo, costo_promedio_ponderado,
                               stock_actual, stock_minimo, id_categoria, id_proyecto, codigo_barras)
  SELECT 'VOL Producto ' || (base + g), 'Artículo de ferretería generado',
         round((5 + (g % 500) * 1.7)::numeric, 2), round((3 + (g % 500) * 1.1)::numeric, 2),
         round((3 + (g % 500) * 1.1)::numeric, 2),
         (g * 37) % 400, 10 + g % 20,
         (SELECT id_categoria FROM public.categoria c
           WHERE c.id_empresa = (SELECT id_empresa FROM vol_hot)
             AND c.nombre = 'VOL Categoría ' || (1 + g % 12)),
         hot,
         CASE WHEN g % 10 = 0 THEN NULL ELSE 'VOL-' || (base + g) END
  FROM generate_series(1, add_hot) g;

  base := base + add_hot;
  INSERT INTO public.producto (nombre, descripcion, precio_venta, precio_costo, costo_promedio_ponderado,
                               stock_actual, stock_minimo, id_proyecto, codigo_barras)
  SELECT 'VOL Producto ' || (base + g), 'Artículo de ferretería generado',
         round((5 + (g % 500) * 1.7)::numeric, 2), round((3 + (g % 500) * 1.1)::numeric, 2),
         round((3 + (g % 500) * 1.1)::numeric, 2),
         (g * 37) % 400, 10 + g % 20,
         c.id_proyecto,
         CASE WHEN g % 10 = 0 THEN NULL ELSE 'VOL-' || (base + g) END
  FROM generate_series(1, add_cold) g
  JOIN vol_cold c ON c.idx = 1 + (g % n_cold);

  RAISE NOTICE 'producto: +% (proyecto caliente), +% (resto)', add_hot, add_cold;
END $$;

-- ─── venta ──────────────────────────────────────────────────────────────────
-- Headers first, so the SALIDA lines below can point at one of their company.
DO $$
DECLARE
  total int := current_setting('vol.n_venta')::int;
  share numeric := current_setting('vol.hot_share')::numeric;
  v_emp int := (SELECT id_empresa FROM vol_hot);
  v_user int := (SELECT id_usuario FROM public.usuario WHERE email = 'participante1@kontrol-test.dev');
  n_cold int := (SELECT count(*) FROM vol_cold_ext);
  have_hot bigint; have_cold bigint; add_hot int; add_cold int;
BEGIN
  -- The sale header came after main's 07/09 schema; a database deployed from
  -- that point has no venta table, and its SALIDA lines carry no header.
  IF to_regclass('public.venta') IS NULL THEN
    RAISE NOTICE 'venta: la tabla no existe en este esquema; las ventas quedan como líneas SALIDA sin cabecera';
    RETURN;
  END IF;

  SELECT count(*) FILTER (WHERE id_empresa = v_emp), count(*) FILTER (WHERE id_empresa <> v_emp)
    INTO have_hot, have_cold
  FROM public.venta WHERE motivo = 'VOL';
  add_hot  := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);

  INSERT INTO public.venta (fecha, subtotal, base_imponible, total, motivo, id_empresa, id_usuario)
  SELECT now() - make_interval(mins => (g * 53) % 525600), s, s, s, 'VOL', e, v_user
  FROM (
    SELECT g, v_emp AS e, round((20 + (g % 300) * 3.5)::numeric, 2) AS s
    FROM generate_series(1, add_hot) g
    UNION ALL
    SELECT g, c.id_empresa, round((20 + (g % 300) * 3.5)::numeric, 2)
    FROM generate_series(1, add_cold) g
    JOIN vol_cold_ext c ON c.idx = 1 + (g % n_cold)
  ) v;

  RAISE NOTICE 'venta: +% (empresa de prueba), +% (resto)', add_hot, add_cold;
END $$;

-- ─── movimiento_inventario ──────────────────────────────────────────────────
-- Mix: 50% ENTRADA, 40% SALIDA (linked to a sale of the same company), 5%
-- AJUSTE, 5% GASTO_ADMIN (no product, as the check constraint requires).
-- Dates spread over the last two years.
DO $$
DECLARE
  total int := current_setting('vol.n_mov')::int;
  share numeric := current_setting('vol.hot_share')::numeric;
  hot int := (SELECT id_proyecto FROM vol_hot);
  v_user int := (SELECT id_usuario FROM public.usuario WHERE email = 'participante1@kontrol-test.dev');
  have_hot bigint; have_cold bigint; add_hot int; add_cold int;
  n_hot_prod int; n_cold_prod int;
  has_venta boolean := to_regclass('public.venta') IS NOT NULL;
  venta_col text;
BEGIN
  SELECT count(*) FILTER (WHERE id_proyecto = hot), count(*) FILTER (WHERE id_proyecto <> hot)
    INTO have_hot, have_cold
  FROM public.movimiento_inventario WHERE motivo = 'VOL';
  add_hot  := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);

  CREATE TEMP TABLE vol_prod ON COMMIT DROP AS
  SELECT (p.id_proyecto = hot) AS is_hot,
         row_number() OVER (PARTITION BY p.id_proyecto = hot ORDER BY p.id_producto) AS idx,
         p.id_producto, p.id_proyecto, pr.id_empresa, p.precio_venta, p.precio_costo
  FROM public.producto p
  JOIN public.proyecto pr ON pr.id_proyecto = p.id_proyecto
  WHERE p.nombre LIKE 'VOL Producto %';
  CREATE INDEX ON vol_prod (is_hot, idx);

  -- Empty when the schema has no sale header: the lookup below then yields NULL.
  CREATE TEMP TABLE vol_sale (id_empresa int, idx bigint, n bigint, id_venta int) ON COMMIT DROP;
  IF has_venta THEN
    INSERT INTO vol_sale
    SELECT id_empresa, row_number() OVER (PARTITION BY id_empresa ORDER BY id_venta),
           count(*) OVER (PARTITION BY id_empresa), id_venta
    FROM public.venta WHERE motivo = 'VOL';
  END IF;
  CREATE INDEX ON vol_sale (id_empresa, idx);

  SELECT count(*) FILTER (WHERE is_hot), count(*) FILTER (WHERE NOT is_hot)
    INTO n_hot_prod, n_cold_prod FROM vol_prod;

  -- Staged first, so the final insert can leave id_venta out on a schema
  -- that does not have the column.
  CREATE TEMP TABLE vol_mov ON COMMIT DROP AS
  SELECT t.tipo,
         CASE WHEN t.tipo = 'GASTO_ADMIN' THEN NULL ELSE 1 + (m.g % 12) END AS cantidad,
         CASE WHEN t.tipo = 'SALIDA' THEN p.precio_venta
              WHEN t.tipo = 'GASTO_ADMIN' THEN 150 + (m.g % 50) * 10
              ELSE p.precio_costo END AS precio_unitario,
         now() - make_interval(mins => (m.g * 97) % 1051200) AS fecha,
         'VOL'::text AS motivo, p.id_empresa,
         CASE WHEN t.tipo = 'GASTO_ADMIN' THEN NULL ELSE p.id_producto END AS id_producto,
         v_user AS id_usuario, p.id_proyecto,
         CASE WHEN t.tipo = 'SALIDA' THEN p.precio_costo END AS costo_unitario_venta,
         CASE WHEN t.tipo = 'SALIDA' THEN
           (SELECT s.id_venta FROM vol_sale s
             WHERE s.id_empresa = p.id_empresa AND s.idx = 1 + (m.g % s.n))
         END AS id_venta
  FROM (
    SELECT g, true AS is_hot, 1 + ((g::bigint * 7919) % n_hot_prod) AS pidx
    FROM generate_series(1, CASE WHEN n_hot_prod > 0 THEN add_hot ELSE 0 END) g
    UNION ALL
    SELECT g, false, 1 + ((g::bigint * 7919) % n_cold_prod)
    FROM generate_series(1, CASE WHEN n_cold_prod > 0 THEN add_cold ELSE 0 END) g
  ) m
  JOIN vol_prod p ON p.is_hot = m.is_hot AND p.idx = m.pidx
  CROSS JOIN LATERAL (
    SELECT CASE WHEN m.g % 20 < 10 THEN 'ENTRADA'
                WHEN m.g % 20 < 18 THEN 'SALIDA'
                WHEN m.g % 20 = 18 THEN 'AJUSTE'
                ELSE 'GASTO_ADMIN' END AS tipo
  ) t;

  venta_col := CASE WHEN has_venta THEN ', id_venta' ELSE '' END;
  EXECUTE format(
    'INSERT INTO public.movimiento_inventario (tipo, cantidad, precio_unitario, fecha, motivo, id_empresa,
       id_producto, id_usuario, id_proyecto, costo_unitario_venta%1$s)
     SELECT tipo, cantidad, precio_unitario, fecha, motivo, id_empresa,
       id_producto, id_usuario, id_proyecto, costo_unitario_venta%1$s
     FROM vol_mov', venta_col);

  RAISE NOTICE 'movimiento_inventario: +% (proyecto caliente), +% (resto)', add_hot, add_cold;
END $$;

-- ─── tarea, project_progress_entry, presupuesto_actividad ───────────────────
DO $$
DECLARE
  share numeric := current_setting('vol.hot_share')::numeric;
  hot int := (SELECT id_proyecto FROM vol_hot);
  n_cold int := (SELECT count(*) FROM vol_cold);
  v_user int := (SELECT id_usuario FROM public.usuario WHERE email = 'participante1@kontrol-test.dev');
  total int; have_hot bigint; have_cold bigint; add_hot int; add_cold int; base bigint;
BEGIN
  -- tarea
  total := current_setting('vol.n_tarea')::int;
  SELECT count(*) FILTER (WHERE id_proyecto = hot), count(*) FILTER (WHERE id_proyecto <> hot)
    INTO have_hot, have_cold FROM public.tarea WHERE nombre LIKE 'VOL Tarea %';
  add_hot := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);
  base := have_hot + have_cold;

  INSERT INTO public.tarea (nombre, descripcion, fecha_vencimiento, estado, prioridad, id_proyecto)
  SELECT 'VOL Tarea ' || (base + q.n), 'Tarea generada para las pruebas de volumen',
         CURRENT_DATE + (q.n % 120) - 30,
         (ARRAY['PENDIENTE','EN_PROGRESO','COMPLETADA','CANCELADA'])[1 + q.n % 4],
         (ARRAY['BAJA','MEDIA','ALTA','CRITICA'])[1 + (q.n / 4) % 4],
         q.id_proyecto
  FROM (
    SELECT g AS n, hot AS id_proyecto FROM generate_series(1, add_hot) g
    UNION ALL
    SELECT add_hot + g, c.id_proyecto FROM generate_series(1, add_cold) g
    JOIN vol_cold c ON c.idx = 1 + (g % n_cold)
  ) q;
  RAISE NOTICE 'tarea: +% (proyecto caliente), +% (resto)', add_hot, add_cold;

  -- project_progress_entry
  total := current_setting('vol.n_avance')::int;
  SELECT count(*) FILTER (WHERE id_proyecto = hot), count(*) FILTER (WHERE id_proyecto <> hot)
    INTO have_hot, have_cold FROM public.project_progress_entry WHERE title LIKE 'VOL Avance %';
  add_hot := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);
  base := have_hot + have_cold;

  INSERT INTO public.project_progress_entry (id_proyecto, id_usuario, title, details, update_type,
                                             progress_percentage, happened_at)
  SELECT q.id_proyecto, v_user, 'VOL Avance ' || (base + q.n), 'Avance generado para las pruebas de volumen',
         CASE q.n % 10 WHEN 0 THEN 'MILESTONE' WHEN 1 THEN 'BLOCKER' ELSE 'UPDATE' END,
         q.n % 101,
         now() - make_interval(mins => (q.n * 61) % 525600)
  FROM (
    SELECT g AS n, hot AS id_proyecto FROM generate_series(1, add_hot) g
    UNION ALL
    SELECT add_hot + g, c.id_proyecto FROM generate_series(1, add_cold) g
    JOIN vol_cold c ON c.idx = 1 + (g % n_cold)
  ) q;
  RAISE NOTICE 'project_progress_entry: +% (proyecto caliente), +% (resto)', add_hot, add_cold;

  -- presupuesto_actividad
  total := current_setting('vol.n_act')::int;
  SELECT count(*) FILTER (WHERE id_proyecto = hot), count(*) FILTER (WHERE id_proyecto <> hot)
    INTO have_hot, have_cold FROM public.presupuesto_actividad WHERE nombre LIKE 'VOL Actividad %';
  add_hot := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);
  base := have_hot + have_cold;

  INSERT INTO public.presupuesto_actividad (nombre, monto_planificado, monto_real, id_proyecto)
  SELECT 'VOL Actividad ' || (base + q.n), 1000 + (q.n % 90) * 250, 800 + (q.n % 110) * 230, q.id_proyecto
  FROM (
    SELECT g AS n, hot AS id_proyecto FROM generate_series(1, add_hot) g
    UNION ALL
    SELECT add_hot + g, c.id_proyecto FROM generate_series(1, add_cold) g
    JOIN vol_cold c ON c.idx = 1 + (g % n_cold)
  ) q;
  RAISE NOTICE 'presupuesto_actividad: +% (proyecto caliente), +% (resto)', add_hot, add_cold;
END $$;

-- ─── reporte ────────────────────────────────────────────────────────────────
-- The listing is per company, not per project, so the test company's share is
-- spread over its VOL projects, and one in five is a company-wide export
-- (id_proyecto NULL), which is what POST /api/reports/exports writes.
DO $$
DECLARE
  total int := current_setting('vol.n_reporte')::int;
  share numeric := current_setting('vol.hot_share')::numeric;
  v_emp int := (SELECT id_empresa FROM vol_hot);
  v_user int := (SELECT id_usuario FROM public.usuario WHERE email = 'participante1@kontrol-test.dev');
  n_cold int := (SELECT count(*) FROM vol_cold_ext);
  have_hot bigint; have_cold bigint; add_hot int; add_cold int; base bigint;
BEGIN
  SELECT count(*) FILTER (WHERE id_empresa = v_emp), count(*) FILTER (WHERE id_empresa <> v_emp)
    INTO have_hot, have_cold FROM public.reporte WHERE titulo LIKE 'VOL Reporte %';
  add_hot := pg_temp.vol_missing(total, share, have_hot, true);
  add_cold := pg_temp.vol_missing(total, share, have_cold, false);
  base := have_hot + have_cold;

  CREATE TEMP TABLE vol_emp_proj ON COMMIT DROP AS
  SELECT row_number() OVER (ORDER BY id_proyecto) AS idx, id_proyecto, count(*) OVER () AS n
  FROM public.proyecto WHERE id_empresa = v_emp AND nombre LIKE 'VOL Proyecto %';

  INSERT INTO public.reporte (titulo, fecha_generacion, tipo, id_proyecto, id_empresa, id_usuario)
  SELECT 'VOL Reporte ' || (base + q.n), now() - make_interval(mins => (q.n * 43) % 525600),
         (ARRAY['AVANCE','PRESUPUESTO','INCIDENTE','CONSOLIDADO'])[1 + q.n % 4],
         CASE WHEN q.n % 5 = 0 THEN NULL ELSE q.id_proyecto END, q.id_empresa, v_user
  FROM (
    SELECT g AS n, ep.id_proyecto, v_emp AS id_empresa
    FROM generate_series(1, add_hot) g
    JOIN vol_emp_proj ep ON ep.idx = 1 + (g % ep.n)
    UNION ALL
    SELECT add_hot + g, c.id_proyecto, c.id_empresa FROM generate_series(1, add_cold) g
    JOIN vol_cold_ext c ON c.idx = 1 + (g % n_cold)
  ) q;
  RAISE NOTICE 'reporte: +% (empresa de prueba), +% (resto)', add_hot, add_cold;
END $$;

-- Fresh statistics, as autovacuum would have produced on a database that grew
-- to this size over time; without them the planner judges on stale counts.
ANALYZE public.producto, public.movimiento_inventario, public.tarea,
        public.project_progress_entry, public.presupuesto_actividad, public.reporte,
        public.proyecto, public.proyecto_usuario, public.categoria;
DO $$
BEGIN
  IF to_regclass('public.venta') IS NOT NULL THEN
    ANALYZE public.venta;
  END IF;
END $$;
