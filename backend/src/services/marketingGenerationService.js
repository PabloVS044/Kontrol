const IDEA_OPENERS = [
  'Lead with a simple promise and one concrete outcome.',
  'Anchor the message in a daily pain point the audience already feels.',
  'Use a direct contrast between the current friction and the desired result.',
  'Start with a short statement that makes the offer feel immediately useful.',
  'Make the first line feel like a shortcut, not a slogan.',
]

const CAMPAIGN_ANGLES = [
  'speed to value',
  'clear execution',
  'trust and credibility',
  'measurable business results',
  'consistent delivery',
]

const hashTagSeed = ['business', 'growth', 'teamwork', 'execution', 'marketing']

const toTitleCase = (value) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

const buildCampaignLabel = ({ campaignName, projectName }) => {
  if (campaignName) return campaignName
  if (projectName) return `${projectName} launch`
  return 'next campaign'
}

const buildHashtags = ({ productName, channel }) => {
  const extra = []
  if (productName) extra.push(productName.replace(/\s+/g, ''))
  if (channel) extra.push(channel.replace(/\s+/g, ''))
  return [...hashTagSeed, ...extra]
    .filter(Boolean)
    .slice(0, 6)
    .map((tag) => `#${tag}`)
    .join(' ')
}

const buildIdeaDraft = (context, index) => {
  const angle = CAMPAIGN_ANGLES[index % CAMPAIGN_ANGLES.length]
  const opener = IDEA_OPENERS[index % IDEA_OPENERS.length]
  const campaignLabel = buildCampaignLabel(context)

  return {
    title: `${toTitleCase(campaignLabel)} concept ${index + 1}`,
    description: `Starter idea focused on ${angle}.`,
    content: [
      `Campaign focus: ${campaignLabel}.`,
      `Primary objective: ${context.objective}.`,
      `Audience: ${context.audience || 'General decision makers in the target company.'}`,
      `Tone: ${context.tone || 'Clear, confident, and practical.'}`,
      `Creative direction: ${opener}`,
      `Key angle: Show ${context.productName || 'the offer'} as the fastest path to ${context.objective.toLowerCase()}.`,
      `Suggested CTA: ${context.callToAction || 'Request a demo or reply for more information.'}`,
      `Suggested channel: ${context.channel || 'Multi-channel campaign'}.`,
    ].join('\n'),
  }
}

const buildCopyDraft = (context, index) => {
  const campaignLabel = buildCampaignLabel(context)
  const angle = CAMPAIGN_ANGLES[index % CAMPAIGN_ANGLES.length]

  return {
    title: `${toTitleCase(campaignLabel)} ad copy ${index + 1}`,
    description: `Base ad copy for ${context.channel || 'paid or outbound'} placements.`,
    content: [
      `Hook: ${context.productName || 'Your team'} can move faster with a campaign built around ${angle}.`,
      `Body: ${context.objective}. This message is designed for ${context.audience || 'busy stakeholders'} and keeps the value proposition direct, practical, and easy to act on.`,
      `Proof cue: Highlight one measurable result, one customer story, or one operational improvement.`,
      `CTA: ${context.callToAction || 'Book a call today.'}`,
    ].join('\n\n'),
  }
}

const buildPostDraft = (context, index) => {
  const campaignLabel = buildCampaignLabel(context)

  return {
    title: `${toTitleCase(campaignLabel)} social post ${index + 1}`,
    description: `Base social caption for ${context.channel || 'social channels'}.`,
    content: [
      `${context.productName || 'Your team'} does not need more noise. It needs a campaign that turns ${context.objective.toLowerCase()} into a clear next action.`,
      `Built for ${context.audience || 'teams that need clarity and momentum'}, this post frames the offer around practical value and a single CTA.`,
      `${context.callToAction || 'Send us a message to see the full plan.'}`,
      buildHashtags(context),
    ].join('\n\n'),
  }
}

const buildAssetDraft = (context, index) => {
  const campaignLabel = buildCampaignLabel(context)
  const angle = CAMPAIGN_ANGLES[index % CAMPAIGN_ANGLES.length]

  return {
    title: `${toTitleCase(campaignLabel)} creative brief ${index + 1}`,
    description: 'Starter brief for a designer, editor, or external creative team.',
    content: [
      `Asset goal: Support ${context.objective.toLowerCase()}.`,
      `Primary audience: ${context.audience || 'Prospects evaluating alternatives.'}`,
      `Message priority: Emphasize ${angle}.`,
      `Visual direction: Keep the layout bold, readable, and conversion-focused.`,
      `Mandatory CTA: ${context.callToAction || 'Request more details.'}`,
      `Recommended output: ${context.channel || 'Static visual or short-form asset'} with one strong claim and one proof element.`,
    ].join('\n'),
  }
}

const buildProposalDraft = (context, index) => {
  const campaignLabel = buildCampaignLabel(context)

  return {
    title: `${toTitleCase(campaignLabel)} proposal ${index + 1}`,
    description: 'Structured proposal outline for internal review or client approval.',
    content: [
      `Executive summary: Campaign designed to ${context.objective.toLowerCase()}.`,
      `Audience: ${context.audience || 'Primary decision makers and operational stakeholders.'}`,
      `Channels: ${context.channel || 'Email, social, and sales enablement.'}`,
      `Offer framing: Position ${context.productName || 'the solution'} as a practical step with low friction and clear upside.`,
      `Execution note: Start with one hero message, one supporting proof point, and one CTA.`,
      `Next step: ${context.callToAction || 'Approve direction and move to production.'}`,
    ].join('\n\n'),
  }
}

const buildersByType = {
  IDEA: buildIdeaDraft,
  COPY: buildCopyDraft,
  POST: buildPostDraft,
  ASSET: buildAssetDraft,
  PROPOSAL: buildProposalDraft,
}

export const buildMarketingDrafts = ({
  contentType,
  quantity,
  objective,
  audience,
  tone,
  channel,
  callToAction,
  productName,
  campaignName,
  projectName,
}) => {
  const today = new Date().toISOString().slice(0, 10)
  const buildDraft = buildersByType[contentType] ?? buildersByType.IDEA
  const baseContext = {
    objective,
    audience,
    tone,
    channel,
    callToAction,
    productName,
    campaignName,
    projectName,
  }

  return Array.from({ length: quantity }, (_, index) => {
    const draft = buildDraft(baseContext, index)
    return {
      ...draft,
      status: 'DRAFT',
      contentType,
      marketingDate: today,
      originType: 'RULE_BASED',
    }
  })
}
