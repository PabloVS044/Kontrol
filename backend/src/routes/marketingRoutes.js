import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  createMarketingCampaign,
  createMarketingItem,
  createMarketingMetricSnapshot,
  createMarketingPublication,
  deleteMarketingCampaign,
  deleteMarketingItem,
  deleteMarketingMetricSnapshot,
  deleteMarketingPublication,
  generateMarketingDrafts,
  getMarketingCampaigns,
  getMarketingItems,
  getMarketingPublicationMetrics,
  getMarketingPublications,
  updateMarketingCampaign,
  updateMarketingItem,
  updateMarketingMetricSnapshot,
  updateMarketingPublication,
} from '../controllers/marketingController.js'
import {
  createMarketingCampaignSchema,
  createMarketingItemSchema,
  createMarketingMetricSnapshotSchema,
  createMarketingPublicationSchema,
  generateMarketingDraftsSchema,
  getMarketingCampaignsQuerySchema,
  getMarketingItemsQuerySchema,
  getMarketingPublicationsQuerySchema,
  marketingCampaignIdParamSchema,
  marketingItemIdParamSchema,
  marketingMetricSnapshotParamsSchema,
  marketingPublicationIdParamSchema,
  updateMarketingCampaignSchema,
  updateMarketingItemSchema,
  updateMarketingMetricSnapshotSchema,
  updateMarketingPublicationSchema,
} from '../schemas/marketingSchemas.js'

const router = Router()

router.use(requireAuth, requireCompany)

router.get('/campaigns', validate(getMarketingCampaignsQuerySchema, 'query'), getMarketingCampaigns)
router.post('/campaigns', requireCompanyRole('owner', 'admin', 'manager'), validate(createMarketingCampaignSchema), createMarketingCampaign)
router.put('/campaigns/:campaignId', requireCompanyRole('owner', 'admin', 'manager'), validate(marketingCampaignIdParamSchema, 'params'), validate(updateMarketingCampaignSchema), updateMarketingCampaign)
router.delete('/campaigns/:campaignId', requireCompanyRole('owner', 'admin'), validate(marketingCampaignIdParamSchema, 'params'), deleteMarketingCampaign)

router.get('/items', validate(getMarketingItemsQuerySchema, 'query'), getMarketingItems)
router.post('/items', requireCompanyRole('owner', 'admin', 'manager'), validate(createMarketingItemSchema), createMarketingItem)
router.put('/items/:itemId', requireCompanyRole('owner', 'admin', 'manager'), validate(marketingItemIdParamSchema, 'params'), validate(updateMarketingItemSchema), updateMarketingItem)
router.delete('/items/:itemId', requireCompanyRole('owner', 'admin'), validate(marketingItemIdParamSchema, 'params'), deleteMarketingItem)

router.get('/publications', validate(getMarketingPublicationsQuerySchema, 'query'), getMarketingPublications)
router.post('/publications', requireCompanyRole('owner', 'admin', 'manager'), validate(createMarketingPublicationSchema), createMarketingPublication)
router.put('/publications/:publicationId', requireCompanyRole('owner', 'admin', 'manager'), validate(marketingPublicationIdParamSchema, 'params'), validate(updateMarketingPublicationSchema), updateMarketingPublication)
router.delete('/publications/:publicationId', requireCompanyRole('owner', 'admin'), validate(marketingPublicationIdParamSchema, 'params'), deleteMarketingPublication)

router.get('/publications/:publicationId/metrics', validate(marketingPublicationIdParamSchema, 'params'), getMarketingPublicationMetrics)
router.post('/publications/:publicationId/metrics', requireCompanyRole('owner', 'admin', 'manager'), validate(marketingPublicationIdParamSchema, 'params'), validate(createMarketingMetricSnapshotSchema), createMarketingMetricSnapshot)
router.put('/publications/:publicationId/metrics/:snapshotId', requireCompanyRole('owner', 'admin', 'manager'), validate(marketingMetricSnapshotParamsSchema, 'params'), validate(updateMarketingMetricSnapshotSchema), updateMarketingMetricSnapshot)
router.delete('/publications/:publicationId/metrics/:snapshotId', requireCompanyRole('owner', 'admin'), validate(marketingMetricSnapshotParamsSchema, 'params'), deleteMarketingMetricSnapshot)

router.post('/generate', requireCompanyRole('owner', 'admin', 'manager'), validate(generateMarketingDraftsSchema), generateMarketingDrafts)

export default router
