import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT_BODY = `CRITICAL OUTPUT RULES — FOLLOW EXACTLY:

Begin your response IMMEDIATELY with "PROPERTY" as the first word.
Do NOT write any introduction, preamble, or explanation of what you are about to do.
Do NOT narrate your search process.
Do NOT write "Let me search", "I'll research", "Now let me", "Let me gather", or any similar phrases.
If uncertain about a fact, omit it.
For HOMEOWNER section: only include verified public information. Never infer job titles from business associations. Write "Associated with [business]" rather than assuming their role.
Output ONLY the four sections below, nothing else before or after.

PROPERTY
[Year built, sq footage, estimated value, last sale price and date, lot size. Source from county assessor when possible.]

NEIGHBORHOOD
[Area description, typical home values, relevant context for a home improvement sales conversation.]

HOMEOWNER
[Verified public info only. LinkedIn, news mentions, business associations. If nothing verified: write exactly "No verified public information found."]

SALES NOTES
[Specific insight for this appointment]
[Second insight]
[Third insight]`

export interface ResearchParams {
  firstName: string
  lastName: string
  address: string
  city: string
  state: string
  zip: string
  appointmentDate: string
  leadSource: string
  spouseFirstName?: string | null
  spouseLastName?: string | null
  industry?: string | null
  elevation?: number | null
}

export async function researchLead(params: ResearchParams): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return 'AI research not configured.'
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const industryLabel = params.industry
    ? params.industry.replace(/_/g, ' ')
    : 'home improvement'
  const systemPrompt = `You are a sales intelligence assistant preparing a ${industryLabel} sales rep for an in-home appointment.\n${SYSTEM_PROMPT_BODY}`

  const spouseInfo =
    params.spouseFirstName && params.spouseLastName
      ? ` and spouse ${params.spouseFirstName} ${params.spouseLastName}`
      : ''

  const elevationInfo = params.elevation != null ? ` Property elevation: ${Math.round(params.elevation)} feet.` : ''
  const userMessage = `Research this lead: ${params.firstName} ${params.lastName}${spouseInfo}, ${params.address}, ${params.city}, ${params.state} ${params.zip}. Appointment date: ${params.appointmentDate}. Lead source: ${params.leadSource}.${elevationInfo}`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]
  let finalText = ''

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      // web_search_20250305 is Anthropic's server-executed built-in search tool
      tools: [{ type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search' }],
      messages,
    })

    const textBlocks = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)

    if (textBlocks.length) finalText = textBlocks.join('\n')
    if (response.stop_reason === 'end_turn') break

    if (response.stop_reason === 'tool_use') {
      // Anthropic executes web_search server-side; continue the conversation
      messages.push({ role: 'assistant', content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
        .map(b => ({
          type: 'tool_result' as const,
          tool_use_id: b.id,
          content: '',
        }))
      messages.push({ role: 'user', content: toolResults })
    } else {
      break
    }
  }

  return finalText || 'Research complete. No public information found for this address.'
}
