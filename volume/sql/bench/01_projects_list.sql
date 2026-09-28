-- GET /api/projects, company-management branch
-- (backend/src/controllers/projectController.js:108-125). The app runs both
-- statements in parallel; here they run in sequence, an upper bound.
SELECT COUNT(*) FROM public.proyecto WHERE id_empresa = :emp;
SELECT id_proyecto, nombre, descripcion, fecha_inicio, fecha_fin_planificada,
       presupuesto_total, estado, id_empresa, id_encargado
FROM public.proyecto WHERE id_empresa = :emp
ORDER BY id_proyecto LIMIT 20 OFFSET 0;
