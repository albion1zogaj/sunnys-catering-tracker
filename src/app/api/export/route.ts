import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

function escapeCSV(value: string | number | null | undefined): string {
  if (value == null) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: leads, error } = await supabase
      .from('catering_leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const headers = [
      'ID',
      'Contact Name',
      'Company',
      'Phone',
      'Email',
      'Event Date',
      'Event Time',
      'Guest Count',
      'Estimated Amount',
      'Final Amount',
      'Status',
      'Follow-up Date',
      'Event Type',
      'Source',
      'Notes',
      'Lost Reason',
      'Created At',
      'Updated At',
    ]

    const rows = (leads || []).map(lead => [
      escapeCSV(lead.id),
      escapeCSV(lead.contact_name),
      escapeCSV(lead.client_company_name),
      escapeCSV(lead.phone),
      escapeCSV(lead.email),
      escapeCSV(lead.event_date),
      escapeCSV(lead.event_time),
      escapeCSV(lead.guest_count),
      escapeCSV(lead.estimated_amount),
      escapeCSV(lead.final_amount),
      escapeCSV(lead.status),
      escapeCSV(lead.follow_up_date),
      escapeCSV(lead.event_type),
      escapeCSV(lead.source),
      escapeCSV(lead.notes),
      escapeCSV(lead.lost_reason),
      escapeCSV(lead.created_at),
      escapeCSV(lead.updated_at),
    ])

    const csvLines = [headers.join(','), ...rows.map(r => r.join(','))]
    const csv = csvLines.join('\n')

    const filename = `catering-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (err) {
    console.error('GET /api/export error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
