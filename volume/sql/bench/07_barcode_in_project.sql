-- Not an endpoint today: a server-side barcode lookup inside one project, as
-- the mitigation would implement it. Measures what the existing partial
-- index producto_codigo_barras_unique (id_proyecto, codigo_barras) delivers.
SELECT p.id_producto, p.nombre, p.precio_venta, p.stock_actual
FROM public.producto p
WHERE p.id_proyecto = :proj AND p.codigo_barras = 'VOL-' || :code;
