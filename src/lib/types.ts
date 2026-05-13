export type LeadStatus = 'New Lead' | 'Contacted' | 'Proposal Sent' | 'Booked' | 'Completed' | 'Lost'
export type EventType = 'Catering' | 'Private Dining Room' | 'Party Room' | 'Delivery' | 'Pickup' | 'Other'
export type LeadSource = 'Phone' | 'Website' | 'Instagram' | 'Referral' | 'Walk-In' | 'Existing Guest' | 'Other'

export interface CateringLead {
  id: string
  client_company_name: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  event_date: string | null
  event_time: string | null
  guest_count: number | null
  estimated_amount: number | null
  final_amount: number | null
  status: LeadStatus
  follow_up_date: string | null
  event_type: EventType | null
  source: LeadSource | null
  notes: string | null
  lost_reason: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  note: string
  created_by: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  lead_id: string | null
  action: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  created_by: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  role: string | null
  created_at: string
}

export interface ParsedLeadData {
  intent: 'add_lead' | 'update_lead' | 'mark_booked' | 'mark_lost' | 'add_note' | 'set_follow_up' | 'search_leads'
  confidence: number
  lead_data: Partial<CateringLead>
  missing_fields: string[]
  clarifying_question: string | null
  possible_matches?: Array<{ id: string; contact_name: string | null; client_company_name: string | null; event_date: string | null }>
}
