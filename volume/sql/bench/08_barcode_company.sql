-- Not an endpoint today: the same lookup across every project of the company
-- (the POS "all projects" view). No index leads with codigo_barras.
SELECT p.id_producto, p.nombre, p.precio_venta, p.stock_actual, p.id_proyecto
FROM public.producto p
JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
WHERE proj.id_empresa = :emp AND p.codigo_barras = 'VOL-' || :code;
