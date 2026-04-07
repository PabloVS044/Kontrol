import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireRole from '../middleware/requireRole.js'
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

// All routes require authentication
router.use(requireAuth)

// ── Productos ─────────────────────────────────────────────────────────────────

// /alertas/stock-bajo must come before /:id to avoid "alertas" matching as an id
router.get(
  '/alertas/stock-bajo',
  requireRole('admin', 'manager', 'collaborator'),
  getAlertasStockBajo
)

router.get(
  '/',
  requireRole('admin', 'manager', 'collaborator'),
  validate(getProductosQuerySchema, 'query'),
  getProductos
)

router.get(
  '/:id',
  requireRole('admin', 'manager', 'collaborator'),
  validate(productoIdParamSchema, 'params'),
  getProductoById
)

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate(createProductoSchema),
  createProducto
)

router.put(
  '/:id',
  requireRole('admin', 'manager'),
  validate(productoIdParamSchema, 'params'),
  validate(updateProductoSchema),
  updateProducto
)

router.delete(
  '/:id',
  requireRole('admin'),
  validate(productoIdParamSchema, 'params'),
  deleteProducto
)

// ── Producto ↔ Proveedor ──────────────────────────────────────────────────────

router.post(
  '/:id/proveedores',
  requireRole('admin', 'manager'),
  validate(productoIdParamSchema, 'params'),
  validate(linkProveedorSchema),
  linkProveedor
)

router.put(
  '/:id/proveedores/:pid',
  requireRole('admin', 'manager'),
  validate(productoProveedorParamsSchema, 'params'),
  validate(updateLinkProveedorSchema),
  updateLinkProveedor
)

router.delete(
  '/:id/proveedores/:pid',
  requireRole('admin'),
  validate(productoProveedorParamsSchema, 'params'),
  unlinkProveedor
)

export default router
