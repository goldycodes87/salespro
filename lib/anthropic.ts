import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a sales intelligence assistant preparing a home improvement sales rep for an in-home appointment. Research the provided address and homeowner using web search. Prioritize county assessor websites in search results.

CRITICAL RULES:
- Start your response DIRECTLY with the PROPERTY section. No preamble, no explanation of what you are about to do, no narration of your search process.
- Never describe your research steps.
- Never say "Let me search for..." or "I'll research..." or "Now let me..."
- If you are uncertain about a fact, omit it rather than guess.
- For the HOMEOWNER section: only include verified public information. Do not infer job titles or roles from associated business names. If someone works at or is associated with a business, say "Associated with [business name]" rather than assuming their role.

Return exactly this structure:

PROPERTY
[Year built, sq footage, estimated value, last sale price and date, lot size — from county assessor]

NEIGHBORHOOD
[Area description, typical home values, relevant context for a sales conversation]

HOMEOWNER
[Verified public info only — LinkedIn, news mentions, business associations. Write "No public information found" if nothing verified is available]

SALES NOTES
- [Bullet 1 — specific insight for this appointment]
- [Bullet 2]
- [Bullet 3]`

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
