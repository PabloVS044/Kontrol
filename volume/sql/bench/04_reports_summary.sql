-- GET /api/reports/summary (backend/src/controllers/reportsController.js,
-- getCompanySummary). Feeds the reports view and, with /api/reports, every
-- PDF/CSV export of it.
SELECT p.id_proyecto, p.nombre, p.descripcion, p.estado, p.fecha_inicio, p.fecha_fin_planificada,
       p.presupuesto_total,
       COALESCE(t.total_tareas, 0) AS total_tareas,
       COALESCE(t.tareas_completadas, 0) AS tareas_completadas,
       COALESCE(t.tareas_en_progreso, 0) AS tareas_en_progreso,
       COALESCE(t.tareas_pendientes, 0) AS tareas_pendientes,
       COALESCE(b.total_planificado, 0) AS presupuesto_planificado,
       COALESCE(b.total_real, 0) AS presupuesto_real,
       COALESCE(pr.progreso_actual, 0) AS progreso_actual
FROM public.proyecto p
LEFT JOIN (
  SELECT id_proyecto,
    COUNT(*)::int AS total_tareas,
    COUNT(*) FILTER (WHERE estado = 'COMPLETADA')::int AS tareas_completadas,
    COUNT(*) FILTER (WHERE estado = 'EN_PROGRESO')::int AS tareas_en_progreso,
    COUNT(*) FILTER (WHERE estado = 'PENDIENTE')::int AS tareas_pendientes
  FROM public.tarea GROUP BY id_proyecto
) t ON t.id_proyecto = p.id_proyecto
LEFT JOIN (
  SELECT id_proyecto, COALESCE(SUM(monto_planificado), 0) AS total_planificado,
         COALESCE(SUM(monto_real), 0) AS total_real
  FROM public.presupuesto_actividad GROUP BY id_proyecto
) b ON b.id_proyecto = p.id_proyecto
LEFT JOIN LATERAL (
  SELECT progress_percentage AS progreso_actual FROM public.project_progress_entry
  WHERE id_proyecto = p.id_proyecto ORDER BY happened_at DESC, id_progress_entry DESC LIMIT 1
) pr ON true
WHERE p.id_empresa = :emp
ORDER BY p.fecha_inicio DESC;
