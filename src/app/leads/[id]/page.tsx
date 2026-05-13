'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import type { CateringLead, LeadNote, ActivityLog, LeadStatus, EventType, LeadSource } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { ArrowLeft, Edit2, Save, X, CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_OPTIONS: LeadStatus[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Booked', 'Completed', 'Lost']
const EVENT_TYPE_OPTIONS: EventType[] = ['Catering', 'Private Dining Room', 'Party Room', 'Delivery', 'Pickup', 'Other']
const SOURCE_OPTIONS: LeadSource[] = ['Phone', 'Website', 'Instagram', 'Referral', 'Walk-In', 'Existing Guest', 'Other']

const statusColors: Record<string, string> = {
  'New Lead': 'bg-blue-100 text-blue-700',
  'Contacted': 'bg-yellow-100 text-yellow-700',
  'Proposal Sent': 'bg-purple-100 text-purple-700',
  'Booked': 'bg-green-100 text-green-700',
  'Completed': 'bg-gray-100 text-gray-700',
  'Lost': 'bg-red-100 text-red-700',
}

function formatCurrency(value: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [lead, setLead] = useState<CateringLead | null>(null)
  const [notes, setNotes] = useState<LeadNote[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<CateringLead>>({})
  const [saving, setSaving] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showLostModal, setShowLostModal] = useState(false)
  const [lostReason, setLostReason] = useState('')

  const fetchLead = async () => {
    const res = await fetch(`/api/leads/${id}`)
    if (!res.ok) {
      setLoading(false)
      return
    }
    const data = await res.json()
    setLead(data.lead)
    setEditData({ ...data.lead })
    setNotes(data.notes || [])
    setActivity(data.activity || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchLead()
  }, [id])

  const handleSave = async () => {
    if (!lead) return
    setSaving(true)
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData),
    })
    await fetchLead()
    setEditMode(false)
    setSaving(false)
  }

  const handleMarkBooked = async () => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Booked' }),
    })
    await fetchLead()
  }

  const handleMarkCompleted = async () => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Completed' }),
    })
    await fetchLead()
  }

  const handleMarkLost = async () => {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Lost', lost_reason: lostReason }),
    })
    setShowLostModal(false)
    await fetchLead()
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setAddingNote(true)
    await fetch(`/api/leads/${id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: newNote }),
    })
    setNewNote('')
    await fetchLead()
    setAddingNote(false)
  }

  const setField = (field: string, value: string | number | null) => {
    setEditData(prev => ({ ...prev, [field]: value === '' ? null : value }))
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading lead...
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!lead) {
    return (
      <AppLayout>
        <div className="p-6">
          <p className="text-gray-500">Lead not found.</p>
          <button onClick={() => router.push('/pipeline')} className="mt-4 text-amber-600 hover:underline">
            Back to Pipeline
          </button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/pipeline')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pipeline
          </button>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {lead.contact_name || 'Unnamed Contact'}
                {lead.client_company_name && (
                  <span className="text-gray-400 font-normal ml-2">— {lead.client_company_name}</span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                  {lead.status}
                </span>
                <span className="text-gray-400 text-sm">
                  Created {format(parseISO(lead.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {lead.status !== 'Booked' && lead.status !== 'Completed' && lead.status !== 'Lost' && (
                <button
                  onClick={handleMarkBooked}
                  className="flex items-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Booked
                </button>
              )}
              {lead.status === 'Booked' && (
                <button
                  onClick={handleMarkCompleted}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Completed
                </button>
              )}
              {lead.status !== 'Lost' && lead.status !== 'Completed' && (
                <button
                  onClick={() => setShowLostModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Mark Lost
                </button>
              )}
              {editMode ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditMode(false); setEditData({ ...lead }) }}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Lead Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lead Fields */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Lead Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  label="Contact Name"
                  value={lead.contact_name}
                  editValue={String(editData.contact_name ?? '')}
                  editing={editMode}
                  onChange={v => setField('contact_name', v)}
                />
                <DetailField
                  label="Company"
                  value={lead.client_company_name}
                  editValue={String(editData.client_company_name ?? '')}
                  editing={editMode}
                  onChange={v => setField('client_company_name', v)}
                />
                <DetailField
                  label="Phone"
                  value={lead.phone}
                  editValue={String(editData.phone ?? '')}
                  editing={editMode}
                  onChange={v => setField('phone', v)}
                />
                <DetailField
                  label="Email"
                  value={lead.email}
                  editValue={String(editData.email ?? '')}
                  editing={editMode}
                  type="email"
                  onChange={v => setField('email', v)}
                />
                <DetailField
                  label="Event Date"
                  value={lead.event_date ? format(parseISO(lead.event_date), 'MMM d, yyyy') : null}
                  editValue={String(editData.event_date ?? '')}
                  editing={editMode}
                  type="date"
                  onChange={v => setField('event_date', v)}
                />
                <DetailField
                  label="Event Time"
                  value={lead.event_time}
                  editValue={String(editData.event_time ?? '')}
                  editing={editMode}
                  onChange={v => setField('event_time', v)}
                />
                <DetailField
                  label="Guest Count"
                  value={lead.guest_count != null ? String(lead.guest_count) : null}
                  editValue={editData.guest_count != null ? String(editData.guest_count) : ''}
                  editing={editMode}
                  type="number"
                  onChange={v => setField('guest_count', v ? Number(v) : null)}
                />
                <DetailField
                  label="Estimated Amount"
                  value={formatCurrency(lead.estimated_amount)}
                  editValue={editData.estimated_amount != null ? String(editData.estimated_amount) : ''}
                  editing={editMode}
                  type="number"
                  onChange={v => setField('estimated_amount', v ? Number(v) : null)}
                />
                <DetailField
                  label="Final Amount"
                  value={formatCurrency(lead.final_amount)}
                  editValue={editData.final_amount != null ? String(editData.final_amount) : ''}
                  editing={editMode}
                  type="number"
                  onChange={v => setField('final_amount', v ? Number(v) : null)}
                />
                <DetailField
                  label="Follow-up Date"
                  value={lead.follow_up_date ? format(parseISO(lead.follow_up_date), 'MMM d, yyyy') : null}
                  editValue={String(editData.follow_up_date ?? '')}
                  editing={editMode}
                  type="date"
                  onChange={v => setField('follow_up_date', v)}
                />

                {editMode ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                      <select
                        value={editData.status ?? lead.status}
                        onChange={e => setField('status', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
                      <select
                        value={editData.event_type ?? ''}
                        onChange={e => setField('event_type', e.target.value || null)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                      >
                        <option value="">—</option>
                        {EVENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
                      <select
                        value={editData.source ?? ''}
                        onChange={e => setField('source', e.target.value || null)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                      >
                        <option value="">—</option>
                        {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Event Type</p>
                      <p className="text-sm text-gray-900">{lead.event_type || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Source</p>
                      <p className="text-sm text-gray-900">{lead.source || '—'}</p>
                    </div>
                  </>
                )}

                <div className="col-span-2">
                  {editMode ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
                      <textarea
                        value={String(editData.notes ?? '')}
                        onChange={e => setField('notes', e.target.value || null)}
                        rows={3}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 resize-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
                      <p className="text-sm text-gray-900">{lead.notes || '—'}</p>
                    </div>
                  )}
                </div>

                {lead.lost_reason && (
                  <div className="col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Lost Reason</p>
                    <p className="text-sm text-red-600">{lead.lost_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Notes</h2>

              <div className="mb-4">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 resize-none"
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNote.trim()}
                  className="mt-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {addingNote ? 'Adding...' : 'Add Note'}
                </button>
              </div>

              {notes.length === 0 ? (
                <p className="text-sm text-gray-400">No notes yet.</p>
              ) : (
                <div className="space-y-3">
                  {notes.map(note => (
                    <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">{note.note}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Activity Timeline */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Activity Log</h2>

              {activity.length === 0 ? (
                <p className="text-sm text-gray-400">No activity yet.</p>
              ) : (
                <div className="space-y-3">
                  {activity.map(entry => (
                    <div key={entry.id} className="flex gap-3">
                      <div className="flex-shrink-0 w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                        {entry.field_changed && (
                          <p className="text-xs text-gray-500">
                            {entry.field_changed}: {entry.old_value || '—'} → {entry.new_value || '—'}
                          </p>
                        )}
                        {entry.new_value && !entry.field_changed && (
                          <p className="text-xs text-gray-500 truncate">{entry.new_value}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {format(parseISO(entry.created_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lost Reason Modal */}
      {showLostModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Mark as Lost</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <textarea
                value={lostReason}
                onChange={e => setLostReason(e.target.value)}
                placeholder="Why was this lead lost?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleMarkLost}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Mark as Lost
              </button>
              <button
                onClick={() => setShowLostModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

function DetailField({
  label,
  value,
  editValue,
  editing,
  type = 'text',
  onChange,
}: {
  label: string
  value: string | null | undefined
  editValue: string
  editing: boolean
  type?: string
  onChange: (v: string) => void
}) {
  if (editing) {
    return (
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          type={type}
          value={editValue}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
        />
      </div>
    )
  }
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-sm text-gray-900">{value || '—'}</p>
    </div>
  )
}
