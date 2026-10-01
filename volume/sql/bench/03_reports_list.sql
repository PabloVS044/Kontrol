-- GET /api/reports (backend/src/controllers/reportsController.js:9-26).
-- Unpaginated: returns every report of the company.
SELECT r.*
FROM public.reporte r
LEFT JOIN public.proyecto p ON p.id_proyecto = r.id_proyecto
WHERE COALESCE(r.id_empresa, p.id_empresa) = :emp
ORDER BY r.fecha_generacion DESC;
