import { z } from 'zod'

export const MARKETING_CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']
export const MARKETING_ITEM_STATUSES = ['DRAFT', 'IN_REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']
export const MARKETING_ITEM_TYPES = ['IDEA', 'COPY', 'POST', 'ASSET', 'PROPOSAL']
export const MARKETING_ORIGIN_TYPES = ['MANUAL', 'RULE_BASED', 'AI', 'EXTERNAL']
// Ciclo de vida de HU-28: borrador → programada → publicada.
export const MARKETING_PUBLICATION_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED']
export const MARKETING_SOCIAL_PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TIKTOK', 'X', 'YOUTUBE', 'WHATSAPP', 'OTHER']
export const MARKETING_PUBLICATION_FORMATS = ['POST', 'STORY', 'REEL', 'VIDEO', 'CAROUSEL', 'SHORT', 'AD', 'OTHER']

const optionalPositiveId = z.union([z.coerce.number().int().positive(), z.null()]).optional()
const optionalDate = z.union([z.string().date(), z.null()]).optional()
const optionalText = (max) => z.union([z.string().max(max), z.null()]).optional()
const optionalTimestamp = z.union([z.string().trim().min(1), z.null()]).optional()
const nonNegativeInt = z.coerce.number().int().min(0)
const nonNegativeMoney = z.coerce.number().min(0)

export const marketingCampaignIdParamSchema = z.object({
  campaignId: z.coerce.number().int().positive({ message: 'Campaign id must be a positive integer.' }),
})

export const marketingItemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive({ message: 'Item id must be a positive integer.' }),
})

export const marketingPublicationIdParamSchema = z.object({
  publicationId: z.coerce.number().int().positive({ message: 'Publication id must be a positive integer.' }),
})

export const marketingMetricSnapshotParamsSchema = z.object({
  publicationId: z.coerce.number().int().positive({ message: 'Publication id must be a positive integer.' }),
  snapshotId: z.coerce.number().int().positive({ message: 'Snapshot id must be a positive integer.' }),
})

export const getMarketingCampaignsQuerySchema = z.object({
  status: z.enum(MARKETING_CAMPAIGN_STATUSES).optional(),
  projectId: optionalPositiveId,
})

export const createMarketingCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required.').max(160),
  description: optionalText(600),
  objective: optionalText(240),
  channel: optionalText(120),
  status: z.enum(MARKETING_CAMPAIGN_STATUSES).optional(),
  projectId: z.coerce.number().int().positive('Project is required.'),
  startDate: optionalDate,
  endDate: optionalDate,
})

export const updateMarketingCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: optionalText(600),
    objective: optionalText(240),
    channel: optionalText(120),
    status: z.enum(MARKETING_CAMPAIGN_STATUSES).optional(),
    projectId: z.coerce.number().int().positive().optional(),
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No campaign fields were provided for update.' }
  )

export const getMarketingItemsQuerySchema = z.object({
  status: z.enum(MARKETING_ITEM_STATUSES).optional(),
  contentType: z.enum(MARKETING_ITEM_TYPES).optional(),
  campaignId: optionalPositiveId,
  projectId: optionalPositiveId,
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
})

export const getMarketingPublicationsQuerySchema = z.object({
  status: z.enum(MARKETING_PUBLICATION_STATUSES).optional(),
  platform: z.enum(MARKETING_SOCIAL_PLATFORMS).optional(),
  campaignId: optionalPositiveId,
  projectId: optionalPositiveId,
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(300).optional().default(200),
})

export const createMarketingItemSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(180),
  description: optionalText(600),
  content: z.string().trim().min(1, 'Content is required.').max(20000),
  status: z.enum(MARKETING_ITEM_STATUSES).optional(),
  contentType: z.enum(MARKETING_ITEM_TYPES),
  marketingDate: optionalDate,
  campaignId: optionalPositiveId,
  projectId: optionalPositiveId,
  resourceLink: optionalText(500),
  originType: z.enum(MARKETING_ORIGIN_TYPES).optional(),
})

export const updateMarketingItemSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    description: optionalText(600),
    content: z.string().trim().min(1).max(20000).optional(),
    status: z.enum(MARKETING_ITEM_STATUSES).optional(),
    contentType: z.enum(MARKETING_ITEM_TYPES).optional(),
    marketingDate: optionalDate,
    campaignId: optionalPositiveId,
    projectId: optionalPositiveId,
    resourceLink: optionalText(500),
    originType: z.enum(MARKETING_ORIGIN_TYPES).optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No item fields were provided for update.' }
  )

// La publicación cuelga siempre de un proyecto (y por tanto de una empresa).
// La campaña es un agrupador opcional.
export const createMarketingPublicationSchema = z.object({
  title: z.string().trim().min(1, 'Publication title is required.').max(180),
  caption: optionalText(12000),
  platform: z.enum(MARKETING_SOCIAL_PLATFORMS),
  format: z.enum(MARKETING_PUBLICATION_FORMATS).optional().default('POST'),
  status: z.enum(MARKETING_PUBLICATION_STATUSES).optional(),
  campaignId: optionalPositiveId,
  projectId: z.coerce.number().int().positive('Project is required.'),
  scheduledFor: optionalTimestamp,
  publishedAt: optionalTimestamp,
  assetUrl: optionalText(500),
  publicationUrl: optionalText(500),
  notes: optionalText(1200),
})

export const updateMarketingPublicationSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    caption: optionalText(12000),
    platform: z.enum(MARKETING_SOCIAL_PLATFORMS).optional(),
    format: z.enum(MARKETING_PUBLICATION_FORMATS).optional(),
    status: z.enum(MARKETING_PUBLICATION_STATUSES).optional(),
    campaignId: optionalPositiveId,
    projectId: z.coerce.number().int().positive().optional(),
    scheduledFor: optionalTimestamp,
    publishedAt: optionalTimestamp,
    assetUrl: optionalText(500),
    publicationUrl: optionalText(500),
    notes: optionalText(1200),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No publication fields were provided for update.' }
  )

export const createMarketingMetricSnapshotSchema = z.object({
  capturedAt: optionalTimestamp,
  impressions: nonNegativeInt.optional().default(0),
  reach: nonNegativeInt.optional().default(0),
  likes: nonNegativeInt.optional().default(0),
  comments: nonNegativeInt.optional().default(0),
  shares: nonNegativeInt.optional().default(0),
  saves: nonNegativeInt.optional().default(0),
  clicks: nonNegativeInt.optional().default(0),
  leads: nonNegativeInt.optional().default(0),
  followersGained: nonNegativeInt.optional().default(0),
  spend: nonNegativeMoney.optional().default(0),
  notes: optionalText(1200),
})

export const updateMarketingMetricSnapshotSchema = z
  .object({
    capturedAt: optionalTimestamp,
    impressions: nonNegativeInt.optional(),
    reach: nonNegativeInt.optional(),
    likes: nonNegativeInt.optional(),
    comments: nonNegativeInt.optional(),
    shares: nonNegativeInt.optional(),
    saves: nonNegativeInt.optional(),
    clicks: nonNegativeInt.optional(),
    leads: nonNegativeInt.optional(),
    followersGained: nonNegativeInt.optional(),
    spend: nonNegativeMoney.optional(),
    notes: optionalText(1200),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'No metric fields were provided for update.' }
  )

export const generateMarketingDraftsSchema = z.object({
  objective: z.string().trim().min(1, 'Objective is required.').max(240),
  audience: optionalText(240),
  tone: optionalText(120),
  channel: optionalText(120),
  callToAction: optionalText(160),
  productName: optionalText(160),
  contentType: z.enum(MARKETING_ITEM_TYPES).optional().default('IDEA'),
  quantity: z.coerce.number().int().min(1).max(5).optional().default(3),
  campaignId: optionalPositiveId,
  projectId: optionalPositiveId,
})
