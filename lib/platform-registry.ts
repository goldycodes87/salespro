export type PlatformStatus = 'active' | 'coming_soon'
export type SetupType = 'email_forward' | 'oauth' | 'api_key'

export interface Platform {
  key: string
  name: string
  description: string
  icon: string
  industries: string[]
  setup_type: SetupType
  instructions?: string
  status: PlatformStatus
}

export const PLATFORM_REGISTRY: Record<string, Platform> = {
  vendo: {
    key: 'vendo',
    name: 'Paradigm Vendo',
    description: 'Import proposals from Paradigm Vendo',
    icon: '📋',
    industries: ['windows_siding'],
    setup_type: 'email_forward',
    instructions: 'Forward Vendo proposal emails to vendo@clozrhq.com',
    status: 'active',
  },
  salesforce: {
    key: 'salesforce',
    name: 'Salesforce',
    description: 'Sync leads and deals',
    icon: '☁️',
    industries: ['insurance', 'saas', 'financial', 'real_estate'],
    setup_type: 'oauth',
    status: 'coming_soon',
  },
  hubspot: {
    key: 'hubspot',
    name: 'HubSpot',
    description: 'Sync contacts and deals',
    icon: '🔶',
    industries: ['saas', 'financial'],
    setup_type: 'oauth',
    status: 'coming_soon',
  },
  servicetitan: {
    key: 'servicetitan',
    name: 'ServiceTitan',
    description: 'Sync jobs and estimates',
    icon: '🔧',
    industries: ['hvac'],
    setup_type: 'api_key',
    status: 'coming_soon',
  },
  eagleview: {
    key: 'eagleview',
    name: 'EagleView',
    description: 'Import roof measurements',
    icon: '🦅',
    industries: ['roofing'],
    setup_type: 'api_key',
    status: 'coming_soon',
  },
  hover: {
    key: 'hover',
    name: 'Hover',
    description: 'Import 3D measurements',
    icon: '📐',
    industries: ['windows_siding', 'roofing'],
    setup_type: 'oauth',
    status: 'coming_soon',
  },
  aurora: {
    key: 'aurora',
    name: 'Aurora Solar',
    description: 'Import solar designs',
    icon: '☀️',
    industries: ['solar'],
    setup_type: 'oauth',
    status: 'coming_soon',
  },
}

export function getPlatformsForIndustry(industryKey: string): Platform[] {
  return Object.values(PLATFORM_REGISTRY).filter(p =>
    p.industries.includes(industryKey)
  )
}

export const INDUSTRY_TERMINOLOGY: Record<string, { proposal: string; product: string; customer: string; project: string }> = {
  windows_siding: { proposal: 'Proposal', product: 'Window', customer: 'Homeowner', project: 'Installation' },
  roofing:        { proposal: 'Estimate', product: 'Roofing System', customer: 'Homeowner', project: 'Roof Replacement' },
  solar:          { proposal: 'Solar Proposal', product: 'Solar System', customer: 'Homeowner', project: 'Solar Installation' },
  hvac:           { proposal: 'Quote', product: 'HVAC System', customer: 'Customer', project: 'HVAC Installation' },
  insurance:      { proposal: 'Quote', product: 'Policy', customer: 'Client', project: 'Coverage' },
  real_estate:    { proposal: 'Offer', product: 'Property', customer: 'Buyer/Seller', project: 'Transaction' },
  saas:           { proposal: 'Proposal', product: 'Software', customer: 'Client', project: 'Implementation' },
  financial:      { proposal: 'Proposal', product: 'Financial Product', customer: 'Client', project: 'Engagement' },
  other:          { proposal: 'Proposal', product: 'Product', customer: 'Customer', project: 'Project' },
}

export function getTerminology(industryKey?: string | null) {
  return INDUSTRY_TERMINOLOGY[industryKey ?? ''] ?? INDUSTRY_TERMINOLOGY.other
}
