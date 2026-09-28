-- State of the database at the moment of a measurement: rows, sizes and the
-- indexes that actually exist (the deployed database may differ from
-- kontrol.sql, which is why this is read from the catalog, not assumed).

\echo '## Filas y tamaño por tabla'
SELECT c.relname AS tabla,
       c.reltuples::bigint AS filas_estimadas,
       pg_size_pretty(pg_table_size(c.oid)) AS datos,
       pg_size_pretty(pg_indexes_size(c.oid)) AS indices
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN ('producto','movimiento_inventario','venta','tarea','project_progress_entry',
                    'presupuesto_actividad','reporte','proyecto','empresa')
ORDER BY c.reltuples DESC;

\echo '## Filas exactas en el ámbito medido (empresa de prueba y proyecto caliente)'
SELECT (SELECT count(*) FROM public.proyecto WHERE id_empresa = :emp)                    AS proyectos_empresa,
       (SELECT count(*) FROM public.producto WHERE id_proyecto = :proj)                  AS productos_proyecto,
       (SELECT count(*) FROM public.producto p JOIN public.proyecto pr USING (id_proyecto)
         WHERE pr.id_empresa = :emp)                                                     AS productos_empresa,
       (SELECT count(*) FROM public.movimiento_inventario WHERE id_proyecto = :proj)     AS movimientos_proyecto,
       (SELECT count(*) FROM public.tarea WHERE id_proyecto = :proj)                     AS tareas_proyecto,
       (SELECT count(*) FROM public.project_progress_entry WHERE id_proyecto = :proj)    AS avances_proyecto,
       (SELECT count(*) FROM public.reporte WHERE id_empresa = :emp)                     AS reportes_empresa,
       pg_size_pretty(pg_database_size(current_database()))                              AS tamano_base;

\echo '## Índices existentes en las tablas medidas'
SELECT tablename AS tabla, indexname AS indice, indexdef AS definicion
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('producto','movimiento_inventario','venta','tarea','project_progress_entry',
                    'presupuesto_actividad','reporte','proyecto','proyecto_usuario')
ORDER BY tablename, indexname;

\echo '## Comprobación del hallazgo 3 de SCRUM-28: índices que empiezan por id_proyecto o codigo_barras'
SELECT t.relname AS tabla,
       a.attname AS columna,
       COALESCE(string_agg(i.relname, ', '), '(ninguno)') AS indices_que_la_encabezan
FROM (VALUES ('producto','id_proyecto'), ('producto','codigo_barras'),
             ('tarea','id_proyecto'), ('presupuesto_actividad','id_proyecto'),
             ('movimiento_inventario','id_proyecto'), ('project_progress_entry','id_proyecto'),
             ('reporte','id_empresa')) AS want(tbl, col)
JOIN pg_class t ON t.relname = want.tbl AND t.relnamespace = 'public'::regnamespace
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attname = want.col
LEFT JOIN pg_index x ON x.indrelid = t.oid AND x.indkey[0] = a.attnum
LEFT JOIN pg_class i ON i.oid = x.indexrelid
GROUP BY t.relname, a.attname
ORDER BY t.relname, a.attname;
