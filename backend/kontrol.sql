-- 1. TABLAS BASE Y DICCIONARIOS INDEPENDIENTES
CREATE TABLE public.rol (
  id_rol SERIAL PRIMARY KEY,
  nombre_rol character varying NOT NULL UNIQUE,
  descripcion text
);

CREATE TABLE public.permiso_empresa (
  id_permiso_empresa SERIAL PRIMARY KEY,
  nombre_permiso character varying NOT NULL UNIQUE,
  descripcion text
);

CREATE TABLE public.permiso_proyecto (
  id_permiso_proyecto SERIAL PRIMARY KEY,
  nombre_permiso character varying NOT NULL UNIQUE,
  descripcion text
);

-- 2. USUARIO Y EMPRESA (INDIVIDUALES)
CREATE TABLE public.usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  apellido character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying,
  telefono character varying,
  id_rol integer NOT NULL, -- Rol de sistema (mantenido)
  activo boolean NOT NULL DEFAULT true,
  google_id character varying UNIQUE,
  token_version integer NOT NULL DEFAULT 1,
  CONSTRAINT usuario_id_rol_fkey FOREIGN KEY (id_rol) REFERENCES public.rol(id_rol)
);

CREATE TABLE public.empresa (
  id_empresa SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  industria character varying,
  telefono character varying,
  direccion text,
  email character varying NOT NULL UNIQUE
);

CREATE TABLE public.categoria (
  id_categoria SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  id_empresa integer NOT NULL,
  CONSTRAINT categoria_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
  CONSTRAINT categoria_empresa_nombre_unique UNIQUE (id_empresa, nombre)
);

-- Proveedores globales: pueden ser compartidos entre empresas
CREATE TABLE public.proveedor (
  id_proveedor SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  contacto_nombre character varying,
  telefono character varying,
  email character varying
);

-- 3. ROLES Y RELACIÓN EMPRESA - USUARIO (MUCHOS A MUCHOS ESTRICTO)
-- Roles de empresa estándar y globales (compartidos entre todas las empresas)
CREATE TABLE public.rol_empresa (
  id_rol_empresa SERIAL PRIMARY KEY,
  nombre character varying NOT NULL UNIQUE,
  descripcion text
);

CREATE TABLE public.rol_empresa_permiso (
  id_rol_empresa integer NOT NULL,
  id_permiso_empresa integer NOT NULL,
  PRIMARY KEY (id_rol_empresa, id_permiso_empresa),
  CONSTRAINT fk_rep_rol FOREIGN KEY (id_rol_empresa) REFERENCES public.rol_empresa(id_rol_empresa),
  CONSTRAINT fk_rep_permiso FOREIGN KEY (id_permiso_empresa) REFERENCES public.permiso_empresa(id_permiso_empresa)
);

CREATE TABLE public.empresa_usuario (
  id_empresa integer NOT NULL,
  id_usuario integer NOT NULL,
  id_rol_empresa integer NOT NULL,
  PRIMARY KEY (id_empresa, id_usuario),
  CONSTRAINT eu_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
  CONSTRAINT eu_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT eu_id_rol_empresa_fkey FOREIGN KEY (id_rol_empresa) REFERENCES public.rol_empresa(id_rol_empresa)
);

CREATE TABLE public.empresa_invitacion (
  id_invitacion SERIAL PRIMARY KEY,
  id_empresa integer NOT NULL,
  token character varying NOT NULL UNIQUE,
  id_usuario_owner integer NOT NULL,
  activa boolean NOT NULL DEFAULT true,
  creada_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  desactivada_en timestamp without time zone,
  ultimo_uso_en timestamp without time zone,
  CONSTRAINT empresa_invitacion_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
  CONSTRAINT empresa_invitacion_id_usuario_owner_fkey FOREIGN KEY (id_usuario_owner) REFERENCES public.usuario(id_usuario)
);

CREATE INDEX empresa_invitacion_empresa_idx ON public.empresa_invitacion (id_empresa);
CREATE UNIQUE INDEX empresa_invitacion_empresa_activa_unique
  ON public.empresa_invitacion (id_empresa)
  WHERE activa = true;

-- 4. PROYECTOS
CREATE TABLE public.proyecto (
  id_proyecto SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  fecha_inicio date NOT NULL,
  fecha_fin_planificada date,
  presupuesto_total numeric NOT NULL CHECK (presupuesto_total >= 0::numeric),
  estado character varying NOT NULL DEFAULT 'PLANIFICADO'::character varying CHECK (estado::text = ANY (ARRAY['PLANIFICADO', 'EN_PROGRESO', 'PAUSADO', 'COMPLETADO', 'CANCELADO'])),
  id_empresa integer NOT NULL,
  id_encargado integer NOT NULL,
  CONSTRAINT proyecto_id_empresa_fkey FOREIGN KEY (id_empresa) REFERENCES public.empresa(id_empresa),
  CONSTRAINT proyecto_id_encargado_fkey FOREIGN KEY (id_encargado) REFERENCES public.usuario(id_usuario),
  CONSTRAINT proyecto_empresa_id_unique UNIQUE (id_empresa, id_proyecto)
);

-- 5. ROLES Y RELACIÓN PROYECTO - USUARIO (MUCHOS A MUCHOS FLEXIBLE/CUSTOM)
CREATE TABLE public.rol_proyecto (
  id_rol_proyecto SERIAL PRIMARY KEY,
  id_proyecto integer NOT NULL,  -- Para permitir roles custom por proyecto
  nombre character varying NOT NULL,
  descripcion text,
  CONSTRAINT rp_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
  CONSTRAINT rol_proyecto_proyecto_nombre_unique UNIQUE (id_proyecto, nombre),
  CONSTRAINT rol_proyecto_proyecto_id_unique UNIQUE (id_proyecto, id_rol_proyecto)
);

CREATE TABLE public.rol_proyecto_permiso (
  id_rol_proyecto integer NOT NULL,
  id_permiso_proyecto integer NOT NULL,
  PRIMARY KEY (id_rol_proyecto, id_permiso_proyecto),
  CONSTRAINT fk_rpp_rol FOREIGN KEY (id_rol_proyecto) REFERENCES public.rol_proyecto(id_rol_proyecto),
  CONSTRAINT fk_rpp_permiso FOREIGN KEY (id_permiso_proyecto) REFERENCES public.permiso_proyecto(id_permiso_proyecto)
);

CREATE TABLE public.proyecto_usuario (
  id_proyecto integer NOT NULL,
  id_usuario integer NOT NULL,
  id_rol_proyecto integer, -- Puede ser Null si sus permisos son 100% custom y no parten de un rol, o puede tener el rol base.
  PRIMARY KEY (id_proyecto, id_usuario),
  CONSTRAINT pu_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
  CONSTRAINT pu_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  -- FK compuesta: garantiza que el rol pertenezca al mismo proyecto
  CONSTRAINT pu_rol_proyecto_fkey FOREIGN KEY (id_proyecto, id_rol_proyecto) REFERENCES public.rol_proyecto(id_proyecto, id_rol_proyecto)
);

-- Permisos extra específicos para un usuario dentro de un proyecto
CREATE TABLE public.proyecto_usuario_permiso (
  id_proyecto integer NOT NULL,
  id_usuario integer NOT NULL,
  id_permiso_proyecto integer NOT NULL,
  PRIMARY KEY (id_proyecto, id_usuario, id_permiso_proyecto),
  CONSTRAINT pup_proyecto_usuario_fkey FOREIGN KEY (id_proyecto, id_usuario) REFERENCES public.proyecto_usuario(id_proyecto, id_usuario),
  CONSTRAINT pup_permiso_fkey FOREIGN KEY (id_permiso_proyecto) REFERENCES public.permiso_proyecto(id_permiso_proyecto)
);

-- 6. PRODUCTOS, TAREAS Y DEMÁS DEPENDENCIAS
CREATE TABLE public.producto (
  id_producto SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  precio_venta numeric NOT NULL CHECK (precio_venta >= 0::numeric),
  precio_costo numeric NOT NULL CHECK (precio_costo >= 0::numeric),
  costo_promedio_ponderado numeric NOT NULL DEFAULT 0 CHECK (costo_promedio_ponderado >= 0::numeric),
  stock_actual integer NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
  stock_minimo integer NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  id_categoria integer,
  id_proyecto integer NOT NULL,
  CONSTRAINT producto_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria),
  CONSTRAINT producto_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
  CONSTRAINT producto_proyecto_id_unique UNIQUE (id_proyecto, id_producto)
);

CREATE TABLE public.producto_proveedor (
  id_producto integer NOT NULL,
  id_proveedor integer NOT NULL,
  precio_unitario numeric NOT NULL CHECK (precio_unitario >= 0::numeric),
  fecha_ultima_cotizacion date NOT NULL DEFAULT CURRENT_DATE,
  PRIMARY KEY (id_producto, id_proveedor),
  CONSTRAINT producto_proveedor_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto),
  CONSTRAINT producto_proveedor_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor)
);

-- id_producto es nullable: permite registrar gastos administrativos del proyecto
-- que impactan el presupuesto sin corresponder a un item de inventario.
-- cantidad también nullable por la misma razón (un gasto admin no tiene unidades).
CREATE TABLE public.movimiento_inventario (
  id_movimiento SERIAL PRIMARY KEY,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['ENTRADA', 'SALIDA', 'AJUSTE', 'GASTO_ADMIN'])),
  cantidad integer CHECK (cantidad IS NULL OR cantidad > 0),
  precio_unitario numeric NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0::numeric),
  fecha timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  motivo text,
  id_empresa integer NOT NULL,
  id_producto integer,
  id_usuario integer NOT NULL,
  id_proyecto integer NOT NULL,
  id_proveedor integer,
  -- FK compuesta: producto (si existe) debe pertenecer al mismo proyecto
  CONSTRAINT mi_producto_proyecto_fkey FOREIGN KEY (id_proyecto, id_producto) REFERENCES public.producto(id_proyecto, id_producto),
  CONSTRAINT mi_proyecto_empresa_fkey FOREIGN KEY (id_empresa, id_proyecto) REFERENCES public.proyecto(id_empresa, id_proyecto),
  CONSTRAINT movimiento_inventario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario),
  CONSTRAINT movimiento_inventario_id_proveedor_fkey FOREIGN KEY (id_proveedor) REFERENCES public.proveedor(id_proveedor),
  -- Coherencia: si es inventario, debe haber producto y cantidad; si es gasto admin, no.
  CONSTRAINT mi_tipo_producto_check CHECK (
    (tipo IN ('ENTRADA','SALIDA','AJUSTE') AND id_producto IS NOT NULL AND cantidad IS NOT NULL)
    OR (tipo = 'GASTO_ADMIN' AND id_producto IS NULL)
  )
);

CREATE TABLE public.tarea (
  id_tarea SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  descripcion text,
  fecha_vencimiento date,
  estado character varying NOT NULL DEFAULT 'PENDIENTE'::character varying CHECK (estado::text = ANY (ARRAY['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'])),
  prioridad character varying NOT NULL DEFAULT 'MEDIA'::character varying CHECK (prioridad::text = ANY (ARRAY['BAJA', 'MEDIA', 'ALTA', 'CRITICA'])),
  id_proyecto integer NOT NULL,
  CONSTRAINT tarea_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
  CONSTRAINT tarea_proyecto_id_unique UNIQUE (id_proyecto, id_tarea)
);

CREATE TABLE public.asignacion (
  id_tarea integer NOT NULL,
  id_usuario integer NOT NULL,
  id_proyecto integer NOT NULL,
  fecha_asignacion timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_tarea, id_usuario),
  -- FK compuesta: la tarea debe pertenecer al proyecto indicado
  CONSTRAINT asignacion_tarea_fkey FOREIGN KEY (id_proyecto, id_tarea) REFERENCES public.tarea(id_proyecto, id_tarea),
  -- FK compuesta: el usuario debe estar asignado al proyecto
  CONSTRAINT asignacion_proyecto_usuario_fkey FOREIGN KEY (id_proyecto, id_usuario) REFERENCES public.proyecto_usuario(id_proyecto, id_usuario)
);

CREATE TABLE public.evidencia (
  id_evidencia SERIAL PRIMARY KEY,
  descripcion text,
  url_archivo character varying NOT NULL,
  tipo_archivo character varying NOT NULL CHECK (tipo_archivo::text = ANY (ARRAY['IMAGEN', 'VIDEO', 'DOCUMENTO', 'OTRO'])),
  timestamp_captura timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  latitud numeric,
  longitud numeric,
  id_tarea integer NOT NULL,
  id_usuario integer NOT NULL,
  CONSTRAINT evidencia_id_tarea_fkey FOREIGN KEY (id_tarea) REFERENCES public.tarea(id_tarea),
  CONSTRAINT evidencia_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

CREATE TABLE public.presupuesto_actividad (
  id_actividad SERIAL PRIMARY KEY,
  nombre character varying NOT NULL,
  monto_planificado numeric NOT NULL CHECK (monto_planificado >= 0::numeric),
  monto_real numeric CHECK (monto_real >= 0::numeric),
  id_proyecto integer NOT NULL,
  CONSTRAINT presupuesto_actividad_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto)
);

CREATE TABLE public.reporte (
  id_reporte SERIAL PRIMARY KEY,
  titulo character varying NOT NULL,
  fecha_generacion timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tipo character varying NOT NULL CHECK (tipo::text = ANY (ARRAY['AVANCE', 'PRESUPUESTO', 'INCIDENTE', 'CONSOLIDADO'])),
  contenido_url character varying,
  id_proyecto integer NOT NULL,
  id_usuario integer NOT NULL,
  CONSTRAINT reporte_id_proyecto_fkey FOREIGN KEY (id_proyecto) REFERENCES public.proyecto(id_proyecto),
  CONSTRAINT reporte_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

-- Roles de sistema (asignado a cada usuario de la plataforma)
INSERT INTO public.rol (nombre_rol, descripcion) VALUES
  ('admin',   'Administrador de la plataforma'),
  ('usuario', 'Usuario estándar de la plataforma');

-- Permisos de empresa
INSERT INTO public.permiso_empresa (nombre_permiso, descripcion) VALUES
  ('gestionar_miembros',   'Agregar, editar y eliminar miembros de la empresa'),
  ('ver_proyectos',        'Ver proyectos de la empresa'),
  ('crear_proyectos',      'Crear nuevos proyectos'),
  ('editar_proyectos',     'Editar proyectos existentes'),
  ('eliminar_proyectos',   'Eliminar proyectos'),
  ('ver_inventario',       'Ver inventario de la empresa'),
  ('gestionar_inventario', 'Gestionar inventario'),
  ('ver_reportes',         'Ver reportes'),
  ('crear_reportes',       'Crear reportes');

-- Permisos de proyecto
INSERT INTO public.permiso_proyecto (nombre_permiso, descripcion) VALUES
  ('ver_inventario',        'Ver inventario del proyecto'),
  ('editar_proyecto',       'Editar información del proyecto'),
  ('gestionar_tareas',      'Crear y editar tareas'),
  ('asignar_usuarios',      'Asignar usuarios a tareas'),
  ('gestionar_inventario',  'Gestionar inventario del proyecto'),
  ('gestionar_presupuesto', 'Gestionar presupuesto del proyecto'),
  ('crear_reportes',        'Crear reportes del proyecto');

-- Roles estándar de empresa
INSERT INTO public.rol_empresa (nombre, descripcion) VALUES
  ('owner',        'Propietario — acceso total a la empresa'),
  ('admin',        'Administrador — gestión completa excepto eliminar empresa'),
  ('manager',      'Gerente — gestiona proyectos y equipo'),
  ('collaborator', 'Colaborador — acceso básico y ejecución de tareas');

-- Permisos del rol owner (todos)
INSERT INTO public.rol_empresa_permiso (id_rol_empresa, id_permiso_empresa)
SELECT re.id_rol_empresa, pe.id_permiso_empresa
FROM public.rol_empresa re, public.permiso_empresa pe
WHERE re.nombre = 'owner';

-- Permisos del rol admin (todos excepto gestionar_miembros de nivel owner)
INSERT INTO public.rol_empresa_permiso (id_rol_empresa, id_permiso_empresa)
SELECT re.id_rol_empresa, pe.id_permiso_empresa
FROM public.rol_empresa re, public.permiso_empresa pe
WHERE re.nombre = 'admin';

-- Permisos del rol manager
INSERT INTO public.rol_empresa_permiso (id_rol_empresa, id_permiso_empresa)
SELECT re.id_rol_empresa, pe.id_permiso_empresa
FROM public.rol_empresa re, public.permiso_empresa pe
WHERE re.nombre = 'manager'
  AND pe.nombre_permiso IN ('ver_proyectos','crear_proyectos','editar_proyectos','ver_inventario','gestionar_inventario','ver_reportes','crear_reportes');

-- Permisos del rol collaborator
INSERT INTO public.rol_empresa_permiso (id_rol_empresa, id_permiso_empresa)
SELECT re.id_rol_empresa, pe.id_permiso_empresa
FROM public.rol_empresa re, public.permiso_empresa pe
WHERE re.nombre = 'collaborator'
  AND pe.nombre_permiso IN ('ver_proyectos','ver_inventario','ver_reportes');
