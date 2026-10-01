-- GET /api/products without projectId (productController.js:118-136): the
-- POS "all projects" view, every product of the company.
SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.precio_costo,
       p.costo_promedio_ponderado, p.stock_actual, p.stock_minimo, p.codigo_barras, p.id_proyecto,
       proj.nombre AS proyecto_nombre, c.nombre AS categoria, c.id_categoria
FROM public.producto p
LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
WHERE proj.id_empresa = :emp
ORDER BY proj.id_proyecto, p.id_producto;
