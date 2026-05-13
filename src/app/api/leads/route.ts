import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabase
      .from('catering_leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(
        `contact_name.ilike.%${search}%,client_company_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('GET /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const { data, error } = await supabase
      .from('catering_leads')
      .insert({
        ...body,
        created_by: user.id,
        status: body.status || 'New Lead',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      lead_id: data.id,
      action: 'Created lead',
      created_by: user.id,
    })

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/leads error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
