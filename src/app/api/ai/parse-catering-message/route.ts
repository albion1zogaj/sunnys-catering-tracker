import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { format } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, existing_leads } = body as { message: string; existing_leads?: Array<{ id: string; contact_name: string | null; client_company_name: string | null; event_date: string | null }> }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const todayReadable = format(new Date(), 'EEEE, MMMM d, yyyy')

    const systemPrompt = `You are a catering lead data extraction assistant for Sunny's restaurant catering team.
Today's date is ${todayReadable} (${today}).

Extract catering lead information from the user's message and return ONLY valid JSON.

Respond with this exact JSON structure:
{
  "intent": "add_lead" | "update_lead" | "mark_booked" | "mark_lost" | "add_note" | "set_follow_up" | "search_leads",
  "confidence": 0.0-1.0,
  "lead_data": {
    "client_company_name": string | null,
    "contact_name": string | null,
    "phone": string | null,
    "email": string | null,
    "event_date": "YYYY-MM-DD" | null,
    "event_time": string | null,
    "guest_count": number | null,
    "estimated_amount": number | null,
    "final_amount": number | null,
    "status": "New Lead" | "Contacted" | "Proposal Sent" | "Booked" | "Completed" | "Lost" | null,
    "follow_up_date": "YYYY-MM-DD" | null,
    "event_type": "Catering" | "Private Dining Room" | "Party Room" | "Delivery" | "Pickup" | "Other" | null,
    "source": "Phone" | "Website" | "Instagram" | "Referral" | "Walk-In" | "Existing Guest" | "Other" | null,
    "notes": string | null,
    "lost_reason": string | null
  },
  "missing_fields": [],
  "clarifying_question": string | null
}

Rules:
- Always return valid JSON only, no other text
- Resolve relative dates like "next Friday", "tomorrow", "next month" using today's date (${today})
- For monetary amounts, extract the number only (no $ sign)
- If the intent is update/mark_booked/mark_lost/add_note/set_follow_up and you see a name or company, include it in lead_data so we can search for matching leads
- missing_fields should list field names that seem important but were not provided (e.g. for a new lead: contact_name, event_date, guest_count, etc.)
- clarifying_question should be a single question to ask if critical info is missing, or null if you have enough info
- For "add_lead" intent, the minimum useful fields are contact_name or client_company_name
- Set confidence based on how clear and complete the information is (1.0 = very clear, 0.5 = somewhat ambiguous)
- event_type options: "Catering" (off-site or general), "Private Dining Room", "Party Room", "Delivery", "Pickup", "Other"
- source options: "Phone", "Website", "Instagram", "Referral", "Walk-In", "Existing Guest", "Other"`

    const leadsContext = existing_leads && existing_leads.length > 0
      ? `\n\nExisting leads in the system:\n${existing_leads.map(l => `- ID: ${l.id}, Name: ${l.contact_name || 'N/A'}, Company: ${l.client_company_name || 'N/A'}, Event: ${l.event_date || 'TBD'}`).join('\n')}`
      : ''

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const aiMessage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: message + leadsContext }],
    })

    const rawText = aiMessage.content[0].type === 'text' ? aiMessage.content[0].text : ''

    // Parse JSON from response
    let parsed
    try {
      // Handle potential markdown code blocks
      const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response', raw: rawText },
        { status: 500 }
      )
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI parse error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
