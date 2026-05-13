'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase'
import type { CateringLead, LeadStatus, EventType, LeadSource } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Search, Plus, ChevronUp, ChevronDown, X } from 'lucide-react'

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

type SortField = keyof CateringLead
type SortDir = 'asc' | 'desc'

const emptyForm: Partial<CateringLead> = {
  contact_name: '',
  client_company_name: '',
  phone: '',
  email: '',
  event_date: '',
  event_time: '',
  guest_count: null,
  estimated_amount: null,
  final_amount: null,
  status: 'New Lead',
  follow_up_date: '',
  event_type: null,
  source: null,
  notes: '',
}

export default function PipelinePage() {
  const router = useRouter()
  const [leads, setLeads] = useState<CateringLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editLead, setEditLead] = useState<CateringLead | null>(null)
  const [formData, setFormData] = useState<Partial<CateringLead>>(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchLeads = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('catering_leads').select('*').limit(100)

    if (statusFilter) query = query.eq('status', statusFilter)

    const { data } = await query
    setLeads(data || [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const filteredLeads = leads
    .filter(lead => {
      if (!search) return true
      const s = search.toLowerCase()
      return (
        lead.contact_name?.toLowerCase().includes(s) ||
        lead.client_company_name?.toLowerCase().includes(s) ||
        lead.email?.toLowerCase().includes(s) ||
        lead.phone?.toLowerCase().includes(s)
      )
    })
    .sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal))
      return sortDir === 'asc' ? cmp : -cmp
    })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="w-3 h-3 opacity-30" />
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  const openAdd = () => {
    setFormData(emptyForm)
    setEditLead(null)
    setShowAddModal(true)
  }

  const openEdit = (lead: CateringLead, e: React.MouseEvent) => {
    e.stopPropagation()
    setFormData({ ...lead })
    setEditLead(lead)
    setShowAddModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editLead) {
        await fetch(`/api/leads/${editLead.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setShowAddModal(false)
      setEditLead(null)
      await fetchLeads()
    } finally {
      setSaving(false)
    }
  }

  const setField = (field: string, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value === '' ? null : value }))
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
            <p className="text-gray-500 text-sm mt-1">{filteredLeads.length} leads</p>
          </div>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, company, email, phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {[
                    { label: 'Client/Company', field: 'client_company_name' as SortField },
                    { label: 'Contact', field: 'contact_name' as SortField },
                    { label: 'Phone', field: 'phone' as SortField },
                    { label: 'Email', field: 'email' as SortField },
                    { label: 'Event Date', field: 'event_date' as SortField },
                    { label: 'Time', field: 'event_time' as SortField },
                    { label: 'Guests', field: 'guest_count' as SortField },
                    { label: 'Est. Amount', field: 'estimated_amount' as SortField },
                    { label: 'Final Amount', field: 'final_amount' as SortField },
                    { label: 'Status', field: 'status' as SortField },
                    { label: 'Follow-up', field: 'follow_up_date' as SortField },
                    { label: 'Type', field: 'event_type' as SortField },
                    { label: 'Source', field: 'source' as SortField },
                  ].map(({ label, field }) => (
                    <th
                      key={field}
                      onClick={() => handleSort(field)}
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                    >
                      <span className="flex items-center gap-1">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Loading...
                      </div>
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-4 py-12 text-center text-gray-400">No leads found</td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => (
                    <tr
                      key={lead.id}
                      onClick={() => router.push(`/leads/${lead.id}`)}
                      className="hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{lead.client_company_name || '—'}</td>
                      <td className="px-3 py-3 text-amber-600 font-medium whitespace-nowrap">{lead.contact_name || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{lead.phone || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{lead.email || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        {lead.event_date ? format(parseISO(lead.event_date), 'MMM d, yyyy') : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{lead.event_time || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 text-center">{lead.guest_count ?? '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatCurrency(lead.estimated_amount)}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatCurrency(lead.final_amount)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">
                        {lead.follow_up_date ? format(parseISO(lead.follow_up_date), 'MMM d') : '—'}
                      </td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{lead.event_type || '—'}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{lead.source || '—'}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={e => openEdit(lead, e)}
                          className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-medium transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editLead ? 'Edit Lead' : 'Add New Lead'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <FormField label="Contact Name" value={String(formData.contact_name ?? '')} onChange={v => setField('contact_name', v)} />
              <FormField label="Company" value={String(formData.client_company_name ?? '')} onChange={v => setField('client_company_name', v)} />
              <FormField label="Phone" value={String(formData.phone ?? '')} onChange={v => setField('phone', v)} />
              <FormField label="Email" type="email" value={String(formData.email ?? '')} onChange={v => setField('email', v)} />
              <FormField label="Event Date" type="date" value={String(formData.event_date ?? '')} onChange={v => setField('event_date', v)} />
              <FormField label="Event Time" value={String(formData.event_time ?? '')} onChange={v => setField('event_time', v)} />
              <FormField label="Guest Count" type="number" value={formData.guest_count != null ? String(formData.guest_count) : ''} onChange={v => setField('guest_count', v ? Number(v) : null)} />
              <FormField label="Estimated Amount ($)" type="number" value={formData.estimated_amount != null ? String(formData.estimated_amount) : ''} onChange={v => setField('estimated_amount', v ? Number(v) : null)} />
              <FormField label="Final Amount ($)" type="number" value={formData.final_amount != null ? String(formData.final_amount) : ''} onChange={v => setField('final_amount', v ? Number(v) : null)} />
              <FormField label="Follow-up Date" type="date" value={String(formData.follow_up_date ?? '')} onChange={v => setField('follow_up_date', v)} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status ?? 'New Lead'}
                  onChange={e => setField('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                <select
                  value={formData.event_type ?? ''}
                  onChange={e => setField('event_type', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                >
                  <option value="">—</option>
                  {EVENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={formData.source ?? ''}
                  onChange={e => setField('source', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                >
                  <option value="">—</option>
                  {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={String(formData.notes ?? '')}
                  onChange={e => setField('notes', e.target.value || null)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 resize-none"
                />
              </div>

              {formData.status === 'Lost' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lost Reason</label>
                  <input
                    type="text"
                    value={String(formData.lost_reason ?? '')}
                    onChange={e => setField('lost_reason', e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {saving ? 'Saving...' : editLead ? 'Save Changes' : 'Add Lead'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
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

function FormField({
  label,
  value,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  type?: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
      />
    </div>
  )
}
