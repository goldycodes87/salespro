import { getSupabaseAdmin } from '@/lib/supabase/admin'

// Cost per call (USD). Adjust as pricing changes.
export const API_COSTS = {
  perplexity_sonar_pro: 0.005,
  rentcast_property: 0.01,
  agentmail_send: 0.001,
  twilio_sms: 0.0079,
  twilio_call_per_min: 0.0085,
  vapi_per_min: 0.05,
  elevenlabs_per_1k_chars: 0.03,
  google_maps_geocode: 0.005,
  google_street_view: 0.007,
  dalle3_hd: 0.080,
  anthropic_research: 0.05,
  anthropic_chat: 0.01,
} as const

interface LogApiCallParams {
  repId: string
  service: string
  endpoint: string
  tokensInput?: number
  tokensOutput?: number
  costUsd: number
  responseMs?: number | null
  success?: boolean
  errorMessage?: string | null
}

export async function logApiCall(params: LogApiCallParams): Promise<void> {
  const admin = getSupabaseAdmin()
  const {
    repId, service, endpoint,
    tokensInput = 0, tokensOutput = 0,
    costUsd, responseMs, success = true, errorMessage,
  } = params

  await admin.from('api_usage_log').insert({
    rep_id: repId,
    service,
    endpoint,
    tokens_used: tokensInput + tokensOutput,
    estimated_cost_usd: costUsd,
    response_time_ms: responseMs ?? null,
    error_message: errorMessage ?? null,
  } as any)
}
