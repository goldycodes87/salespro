export const dynamic = 'force-dynamic'
import { NextResponse, type NextRequest } from 'next/server'
import { getAdminUser } from '@/lib/admin-auth'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { systemPrompt, message } = await request.json()
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: systemPrompt,
    messages: [{ role: 'user', content: message }],
  })

  const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ response: text })
}
