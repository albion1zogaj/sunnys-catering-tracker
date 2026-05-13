import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(
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
    const { note } = body as { note: string }

    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json({ error: 'Note text is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: params.id,
        note: note.trim(),
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log to activity
    await supabase.from('activity_log').insert({
      lead_id: params.id,
      action: 'Added note',
      new_value: note.trim(),
      created_by: user.id,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads/[id]/notes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
