import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a sales intelligence assistant preparing a home improvement sales rep for an in-home appointment. Research the provided address and homeowner using web search. Prioritize county assessor websites in search results. Return a structured summary with these sections: PROPERTY (year built, sq footage, estimated value, last sale price/date, lot size — pull from county assessor if possible), NEIGHBORHOOD (area description, typical home values, any relevant context), HOMEOWNER (any publicly available professional or personal info relevant to a sales conversation — LinkedIn, news mentions, business ownership, etc. Skip if nothing found), SALES NOTES (2-3 bullet points Eric should know walking into this appointment). Be concise. Use real data from web search, not assumptions.`

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
}

export async function researchLead(params: ResearchParams): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return 'AI research not configured.'
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const spouseInfo =
    params.spouseFirstName && params.spouseLastName
      ? ` and spouse ${params.spouseFirstName} ${params.spouseLastName}`
      : ''

  const userMessage = `Research this lead: ${params.firstName} ${params.lastName}${spouseInfo}, ${params.address}, ${params.city}, ${params.state} ${params.zip}. Appointment date: ${params.appointmentDate}. Lead source: ${params.leadSource}.`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: userMessage }]
  let finalText = ''

  for (let turn = 0; turn < 5; turn++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
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
