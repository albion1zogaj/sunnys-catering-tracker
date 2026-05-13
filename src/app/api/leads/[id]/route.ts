import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: lead, error: leadError } = await supabase
      .from('catering_leads')
      .select('*')
      .eq('id', params.id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data: notes } = await supabase
      .from('lead_notes')
      .select('*')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })

    const { data: activity } = await supabase
      .from('activity_log')
      .select('*')
      .eq('lead_id', params.id)
      .order('created_at', { ascending: false })

    return NextResponse.json({ lead, notes: notes || [], activity: activity || [] })
  } catch (err) {
    console.error('GET /api/leads/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get current lead for activity log
    const { data: existingLead } = await supabase
      .from('catering_leads')
      .select('*')
      .eq('id', params.id)
      .single()

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('catering_leads')
      .update(body)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log changed fields
    const ignoredFields = ['updated_at', 'created_at', 'id', 'created_by']
    const activityEntries = []

    for (const key of Object.keys(body)) {
      if (ignoredFields.includes(key)) continue
      const oldVal = existingLead[key as keyof typeof existingLead]
      const newVal = body[key]
      if (String(oldVal) !== String(newVal)) {
        activityEntries.push({
          lead_id: params.id,
          action: `Updated ${key}`,
          field_changed: key,
          old_value: oldVal != null ? String(oldVal) : null,
          new_value: newVal != null ? String(newVal) : null,
          created_by: user.id,
        })
      }
    }

    if (activityEntries.length > 0) {
      await supabase.from('activity_log').insert(activityEntries)
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('PATCH /api/leads/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    const { error } = await supabase
      .from('catering_leads')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/leads/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
