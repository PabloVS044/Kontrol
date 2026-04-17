import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireEmpresa from '../middleware/requireEmpresa.js'
import requireProyecto from '../middleware/requireProyecto.js'
import requireProjectPermission from '../middleware/requireProjectPermission.js'
import validate from '../middleware/validate.js'
import {
  getProductosQuerySchema,
  productoIdParamSchema,
  productoProveedorParamsSchema,
  createProductoSchema,
  updateProductoSchema,
  linkProveedorSchema,
  updateLinkProveedorSchema,
} from '../schemas/productoSchemas.js'
import {
  getProductos,
  getAlertasStockBajo,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  linkProveedor,
  updateLinkProveedor,
  unlinkProveedor,
} from '../controllers/productoController.js'

const router = Router()

// All routes require authentication + empresa context
router.use(requireAuth)
router.use(requireEmpresa)

// ── Productos ─────────────────────────────────────────────────────────────────

// /alertas/stock-bajo must come before /:id to avoid "alertas" matching as an id
router.get(
  '/alertas/stock-bajo',
  getAlertasStockBajo
)

router.get(
  '/',
  validate(getProductosQuerySchema, 'query'),
  getProductos
)

router.get(
  '/:id',
  validate(productoIdParamSchema, 'params'),
  getProductoById
)

router.post(
  '/',
  requireProyecto,
  requireProjectPermission('gestionar_inventario'),
  validate(createProductoSchema),
  createProducto
)

router.put(
  '/:id',
  validate(productoIdParamSchema, 'params'),
  validate(updateProductoSchema),
  updateProducto
)

router.delete(
  '/:id',
  validate(productoIdParamSchema, 'params'),
  deleteProducto
)

// ── Producto ↔ Proveedor ──────────────────────────────────────────────────────

router.post(
  '/:id/proveedores',
  validate(productoIdParamSchema, 'params'),
  validate(linkProveedorSchema),
  linkProveedor
)

router.put(
  '/:id/proveedores/:pid',
  validate(productoProveedorParamsSchema, 'params'),
  validate(updateLinkProveedorSchema),
  updateLinkProveedor
)

router.delete(
  '/:id/proveedores/:pid',
  validate(productoProveedorParamsSchema, 'params'),
  unlinkProveedor
)

export default router
