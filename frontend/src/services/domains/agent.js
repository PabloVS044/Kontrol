import { createDomainService } from './createDomainService.js'

export const requestAgent = createDomainService('agent', { json: true })
