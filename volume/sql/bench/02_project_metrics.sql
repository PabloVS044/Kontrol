-- GET /api/projects/:id/metrics (backend/src/controllers/projectMetricsController.js).
-- One existence check, then six aggregates the app runs in parallel with
-- Promise.all; here they run in sequence, an upper bound.
SELECT id_proyecto FROM public.proyecto WHERE id_proyecto = :proj;
SELECT estado, COUNT(*)::int AS count FROM public.tarea WHERE id_proyecto = :proj GROUP BY estado;
SELECT COALESCE(SUM(monto_planificado), 0) AS total_planificado, COALESCE(SUM(monto_real), 0) AS total_real
FROM public.presupuesto_actividad WHERE id_proyecto = :proj;
SELECT tipo, COUNT(*)::int AS count, COALESCE(SUM(precio_unitario * COALESCE(cantidad, 1)), 0) AS total
FROM public.movimiento_inventario WHERE id_proyecto = :proj GROUP BY tipo;
SELECT rp.nombre AS rol, COUNT(*)::int AS total
FROM public.proyecto_usuario pu
LEFT JOIN public.rol_proyecto rp ON rp.id_rol_proyecto = pu.id_rol_proyecto
WHERE pu.id_proyecto = :proj GROUP BY rp.nombre;
SELECT COUNT(*)::int AS entries_total,
       COUNT(*) FILTER (WHERE update_type = 'MILESTONE')::int AS milestones_total,
       COUNT(*) FILTER (WHERE update_type = 'BLOCKER')::int AS blockers_total,
       MAX(happened_at) AS last_update_at
FROM public.project_progress_entry WHERE id_proyecto = :proj;
SELECT progress_percentage, happened_at FROM public.project_progress_entry
WHERE id_proyecto = :proj ORDER BY happened_at DESC, id_progress_entry DESC LIMIT 1;
