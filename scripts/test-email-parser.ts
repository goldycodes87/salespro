// Run: npx dotenv -e .env.local -- npx tsx scripts/test-email-parser.ts
import Anthropic from '@anthropic-ai/sdk'
import { extractEmailContent } from '../app/api/agentmail/leads/route'

const TEST_EMAIL = `Eric Goldberg
Sales Representative | Lifetime Home Remodeling
eric@lifetimewindows.com | (303) 555-0100

________________________________
From: admin@lifetimewindows.com
Subject: Appointment scheduled for Daniel Shultz

An appointment has been set

NAME: Daniel Shultz
ADDRESS: 4817 S Elk Way, Aurora, CO 80016
PHONE: Phone: (719) 433-3902
DATE/TIME: 5/16/2026 2:00 PM
DURATION: 1.5 hours
TYPE: Sales Appointment
REP 1: Eric Goldberg
COMMENTS: Appt - 5/16 @ 2PM JJ Daniel is interested in replacing their SGD. Daniel and Ruvini will be there.
14464550

________________________________
Lifetime Home Remodeling
9525 E. 40th Ave. Suite 400
DENVER, CO 80238
Thank You,
Scheduling Team`

const EXPECTED = {
  lead: {
    first_name: 'Daniel',
    last_name: 'Shultz',
    address: '4817 S Elk Way',
    city: 'Aurora',
    state: 'CO',
    zip: '80016',
    phone: '(719) 433-3902',
    email: null,
    spouse_first_name: 'Ruvini',
  },
  appointment: {
    date: '5/16/2026',
    time: '2:00 PM',
    duration: '1.5 hours',
    type: 'Sales Appointment',
  },
  rep: { name: 'Eric Goldberg' },
  job: {
    internal_id: '14464550',
    comments: 'Appt - 5/16 @ 2PM JJ Daniel is interested in replacing their SGD. Daniel and Ruvini will be there.',
  },
}

async function runTest() {
  console.log('\n=== TEST 1: extractEmailContent ===')
  const extracted = extractEmailContent(TEST_EMAIL)
  console.log('Extracted content:\n', extracted)
  const hasSignatureStripped = !extracted.includes('eric@lifetimewindows.com')
  const hasAppointmentData   = extracted.includes('Daniel Shultz')
  const hasFooterTrimmed     = !extracted.includes('E. 40th Ave')
  console.log('✓ Signature stripped:', hasSignatureStripped)
  console.log('✓ Appointment data present:', hasAppointmentData)
  console.log('✓ Footer trimmed:', hasFooterTrimmed)

  if (!hasSignatureStripped || !hasAppointmentData) {
    console.error('❌ extractEmailContent failed — aborting AI test')
    process.exit(1)
  }

  console.log('\n=== TEST 2: AI extraction ===')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: `You are an appointment data extractor. Extract structured appointment and lead information from home improvement scheduling emails. Follow these rules exactly:

1. Extract ONLY from the structured fields in the email body (NAME:, ADDRESS:, PHONE:, etc.)
2. The REP field = the assigned sales rep from "REP 1:" field in the email body — NOT the sender, NOT the person who forwarded it
3. IGNORE all email signatures, headers, and footer content
4. IGNORE the From:, To:, and forwarding headers
5. Strip any prefixes from values: "Phone: (719)..." → "(719)...", "Address: 123..." → "123..."
6. If a field is blank or missing, return null for that field
7. Never use forwarding metadata as lead data`,
    messages: [{
      role: 'user',
      content: `Extract appointment data from this email. Return ONLY valid JSON.

Email content:
${extracted}

Return this exact JSON structure:
{
  "lead": {
    "first_name": string | null,
    "last_name": string | null,
    "address": string | null,
    "city": string | null,
    "state": string | null,
    "zip": string | null,
    "phone": string | null,
    "email": string | null,
    "spouse_first_name": string | null
  },
  "appointment": {
    "date": string | null,
    "time": string | null,
    "duration": string | null,
    "type": string | null
  },
  "rep": {
    "name": string | null
  },
  "job": {
    "internal_id": string | null,
    "comments": string | null
  }
}

Rules for this specific email format:
- NAME field → split into first_name and last_name
- ADDRESS field → parse into address, city, state, zip
- PHONE field → strip "Phone: " prefix, keep number only
- COMMENTS field → capture full text as comments. Also look for a standalone number on its own line (like "14464550") — that is the internal job ID, extract it as job.internal_id
- REP 1 field → rep.name
- If two people mentioned in comments (e.g. "Daniel and Ruvini will be there") → second person = spouse_first_name
- DATE/TIME field → split into date and time
- DURATION field → duration`,
    }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  console.log('\nRaw AI response:\n', rawText)
  const fenced = rawText.match(/```(?:json)?\s*([\s\S]+?)\s*```/)
  const cleaned = fenced ? fenced[1].trim() : rawText.trim()
  const result = JSON.parse(cleaned)

  console.log('\nAI Result:')
  console.log(JSON.stringify(result, null, 2))

  const checks = [
    ['first_name',       result.lead?.first_name,         EXPECTED.lead.first_name],
    ['last_name',        result.lead?.last_name,          EXPECTED.lead.last_name],
    ['address',          result.lead?.address,            EXPECTED.lead.address],
    ['city',             result.lead?.city,               EXPECTED.lead.city],
    ['state',            result.lead?.state,              EXPECTED.lead.state],
    ['zip',              result.lead?.zip,                EXPECTED.lead.zip],
    ['phone',            result.lead?.phone,              EXPECTED.lead.phone],
    ['spouse_first_name',result.lead?.spouse_first_name,  EXPECTED.lead.spouse_first_name],
    ['rep.name',         result.rep?.name,                EXPECTED.rep.name],
    ['appointment.date', result.appointment?.date,        EXPECTED.appointment.date],
    ['appointment.time', result.appointment?.time,        EXPECTED.appointment.time],
    ['job.internal_id',  result.job?.internal_id,         EXPECTED.job.internal_id],
  ] as const

  console.log('\n=== VERIFICATION ===')
  let allPass = true
  for (const [field, actual, expected] of checks) {
    const pass = String(actual ?? '').trim() === String(expected ?? '').trim()
    console.log(`${pass ? '✓' : '❌'} ${field}: ${JSON.stringify(actual)} ${pass ? '' : `(expected: ${JSON.stringify(expected)})`}`)
    if (!pass) allPass = false
  }

  console.log(allPass ? '\n✅ ALL CHECKS PASSED' : '\n❌ SOME CHECKS FAILED')
  process.exit(allPass ? 0 : 1)
}

runTest().catch(e => { console.error(e); process.exit(1) })
