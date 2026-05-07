import { z } from 'zod'

export const MARKETING_CAMPAIGN_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED']
export const MARKETING_ITEM_STATUSES = ['DRAFT', 'IN_REVIEW', 'READY', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']
export const MARKETING_ITEM_TYPES = ['IDEA', 'COPY', 'POST', 'ASSET', 'PROPOSAL']
export const MARKETING_ORIGIN_TYPES = ['MANUAL', 'RULE_BASED', 'AI', 'EXTERNAL']

const optionalPositiveId = z.union([z.coerce.number().int().positive(), z.null()]).optional()
const optionalDate = z.union([z.string().date(), z.null()]).optional()
const optionalText = (max) => z.union([z.string().max(max), z.null()]).optional()

export const marketingCampaignIdParamSchema = z.object({
  campaignId: z.coerce.number().int().positive({ message: 'Campaign id must be a positive integer.' }),
})

export const marketingItemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive({ message: 'Item id must be a positive integer.' }),
})

export const getMarketingCampaignsQuerySchema = z.object({
  status: z.enum(MARKETING_CAMPAIGN_STATUSES).optional(),
})

export const createMarketingCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required.').max(160),
  description: optionalText(600),
  objective: optionalText(240),
  channel: optionalText(120),
  status: z.enum(MARKETING_CAMPAIGN_STATUSES).optional(),
  projectId: optionalPositiveId,
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
    projectId: optionalPositiveId,
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
