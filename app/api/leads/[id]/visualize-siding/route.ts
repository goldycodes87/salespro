export const dynamic = 'force-dynamic'

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: lead } = await admin
    .from('leads')
    .select('id, rep_id')
    .eq('id', id)
    .eq('rep_id', user.id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  const body = await request.json()
  const { imageUrl, imageBase64, color } = body

  if (!color?.name || !color?.hex) {
    return NextResponse.json({ error: 'Color required' }, { status: 400 })
  }
  if (!imageUrl && !imageBase64) {
    return NextResponse.json({ error: 'Image required' }, { status: 400 })
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return NextResponse.json({ error: 'OpenAI not configured' }, { status: 500 })
  }

  // Step 1: Resolve image to base64
  let base64: string
  if (imageBase64) {
    base64 = imageBase64
  } else {
    try {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) throw new Error('fetch failed')
      base64 = Buffer.from(await imgRes.arrayBuffer()).toString('base64')
    } catch {
      return NextResponse.json({ error: "Couldn't load that photo, try uploading directly." }, { status: 400 })
    }
  }

  // Step 2: GPT-4o vision — describe the home
  let gptDescription = 'single-story residential home with standard siding and architectural features'
  try {
    const visionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
            {
              type: 'text',
              text: 'Describe this home exterior in one sentence for image generation. Include architectural style, roof type, and notable structural features. Be concise and factual.',
            },
          ],
        }],
      }),
    })
    if (visionRes.ok) {
      const visionData = await visionRes.json()
      const desc = visionData.choices?.[0]?.message?.content?.trim()
      if (desc) gptDescription = desc
    }
  } catch (e) {
    console.error('GPT-4o vision error:', e)
  }

  // Step 3: DALL-E 3 generation
  let dalleUrl: string | null = null
  try {
    const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `Photorealistic exterior photograph of a ${gptDescription}. The siding has been replaced with James Hardie ${color.name} fiber cement siding (${color.hex}). Bright natural daylight, high resolution, architectural photography. Preserve the exact camera angle and composition of the original.`,
        size: '1792x1024',
        quality: 'hd',
        n: 1,
      }),
    })
    if (!dalleRes.ok) {
      const err = await dalleRes.text()
      console.error('DALL-E error:', err)
      return NextResponse.json({ error: 'Generation failed, try again' }, { status: 500 })
    }
    const dalleData = await dalleRes.json()
    dalleUrl = dalleData.data?.[0]?.url ?? null
    if (!dalleUrl) throw new Error('No URL in DALL-E response')
  } catch (e) {
    console.error('DALL-E error:', e)
    return NextResponse.json({ error: 'Generation failed, try again' }, { status: 500 })
  }

  // Step 4: Download DALL-E image → upload to Supabase Storage for permanence
  let generatedUrl = dalleUrl
  let storagePath: string | null = null
  try {
    const imgRes = await fetch(dalleUrl)
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
    const colorSlug = color.name.replace(/\s+/g, '_').toLowerCase()
    const fileName = `siding_${colorSlug}_${Date.now()}.jpg`
    storagePath = `${user.id}/${id}/${fileName}`

    const { error: uploadError } = await admin.storage
      .from('lead-photos')
      .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: false })

    if (!uploadError) {
      const { data: urlData } = admin.storage.from('lead-photos').getPublicUrl(storagePath)
      generatedUrl = urlData.publicUrl
    } else {
      console.error('Storage upload error:', uploadError)
      storagePath = null
    }
  } catch (e) {
    console.error('Storage upload failed, returning DALL-E URL:', e)
  }

  // Log usage
  void admin.from('api_usage_log').insert({
    rep_id: user.id,
    service: 'openai',
    endpoint: 'siding_visualizer',
    tokens_used: 0,
    estimated_cost_usd: 0.08,
  })

  return NextResponse.json({ generatedUrl, storagePath, colorName: color.name })
}
