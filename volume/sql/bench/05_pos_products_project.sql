-- GET /api/products?projectId=<id> (backend/src/controllers/productController.js:94-115).
-- This is the POS "product search": the browser downloads the whole project
-- inventory and matches the scanned code locally (frontend/src/views/InventoryPage.vue:880).
SELECT p.id_producto, p.nombre, p.descripcion, p.precio_venta, p.precio_costo,
       p.costo_promedio_ponderado, p.stock_actual, p.stock_minimo, p.codigo_barras, p.id_proyecto,
       proj.nombre AS proyecto_nombre, c.nombre AS categoria, c.id_categoria,
       COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.cantidad ELSE 0 END),0) AS entradas_proyecto,
       COALESCE(SUM(CASE WHEN m.tipo='SALIDA'  THEN m.cantidad ELSE 0 END),0) AS salidas_proyecto,
       COALESCE(SUM(CASE WHEN m.tipo='ENTRADA' THEN m.cantidad WHEN m.tipo='SALIDA' THEN -m.cantidad ELSE 0 END),0) AS neto_proyecto
FROM public.producto p
LEFT JOIN public.categoria c ON c.id_categoria = p.id_categoria
JOIN public.proyecto proj ON proj.id_proyecto = p.id_proyecto
LEFT JOIN public.movimiento_inventario m
  ON m.id_producto = p.id_producto AND m.id_proyecto = p.id_proyecto
  AND m.tipo IN ('ENTRADA','SALIDA','AJUSTE')
WHERE p.id_proyecto = :proj AND proj.id_empresa = :emp
GROUP BY p.id_producto, proj.nombre, c.nombre, c.id_categoria
ORDER BY p.id_producto;
