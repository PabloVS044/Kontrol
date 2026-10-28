-- Synthetic fixtures only. Executed exclusively on a newly created P2 source.
INSERT INTO public.usuario(nombre,apellido,email,id_rol)
SELECT 'P2 Usuario ' || n, 'Sintético', 'p2-user-' || n || '@example.test', r.id_rol
FROM generate_series(1,4) n CROSS JOIN public.rol r WHERE r.nombre_rol='usuario';
INSERT INTO public.empresa(nombre,email) VALUES
 ('P2 Empresa A','p2-company-a@example.test'),('P2 Empresa B','p2-company-b@example.test');
INSERT INTO public.empresa_config(id_empresa)
SELECT id_empresa FROM public.empresa;
INSERT INTO public.empresa_usuario(id_empresa,id_usuario,id_rol_empresa)
SELECT e.id_empresa,u.id_usuario,r.id_rol_empresa FROM public.empresa e
JOIN public.usuario u ON u.email='p2-user-' || e.id_empresa || '@example.test'
CROSS JOIN public.rol_empresa r WHERE r.nombre='owner';
INSERT INTO public.proyecto(nombre,fecha_inicio,presupuesto_total,id_empresa,id_encargado)
SELECT 'P2 Proyecto ' || e.id_empresa,DATE '2026-10-25',1000,e.id_empresa,u.id_usuario
FROM public.empresa e JOIN public.usuario u ON u.email='p2-user-' || e.id_empresa || '@example.test';
INSERT INTO public.producto(nombre,precio_venta,precio_costo,costo_promedio_ponderado,stock_actual,id_proyecto)
SELECT 'P2 Producto ' || p.id_proyecto || '-' || n,25.50,10,10,20,p.id_proyecto
FROM public.proyecto p CROSS JOIN generate_series(1,2) n;
INSERT INTO public.venta(subtotal,base_imponible,total,id_empresa,id_usuario)
SELECT 51,51,51,e.id_empresa,u.id_usuario FROM public.empresa e
JOIN public.usuario u ON u.email='p2-user-' || e.id_empresa || '@example.test';
