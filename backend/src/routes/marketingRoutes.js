import { Router } from 'express'
import requireAuth from '../middleware/requireAuth.js'
import requireCompany from '../middleware/requireCompany.js'
import requireCompanyRole from '../middleware/requireCompanyRole.js'
import validate from '../middleware/validate.js'
import {
  createMarketingCampaign,
  createMarketingItem,
  deleteMarketingCampaign,
  deleteMarketingItem,
  generateMarketingDrafts,
  getMarketingCampaigns,
  getMarketingItems,
  updateMarketingCampaign,
  updateMarketingItem,
} from '../controllers/marketingController.js'
import {
  createMarketingCampaignSchema,
  createMarketingItemSchema,
  generateMarketingDraftsSchema,
  getMarketingCampaignsQuerySchema,
  getMarketingItemsQuerySchema,
  marketingCampaignIdParamSchema,
  marketingItemIdParamSchema,
  updateMarketingCampaignSchema,
  updateMarketingItemSchema,
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

router.post('/generate', requireCompanyRole('owner', 'admin', 'manager'), validate(generateMarketingDraftsSchema), generateMarketingDrafts)

export default router
