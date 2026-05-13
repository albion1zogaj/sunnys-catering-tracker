'use client'

import { useState, useRef, useEffect } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase'
import type { CateringLead, ParsedLeadData, LeadStatus, EventType, LeadSource } from '@/lib/types'
import { Send, CheckCircle, XCircle, AlertCircle, Bot, User } from 'lucide-react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parsed?: ParsedLeadData
  savedLeadId?: string
}

const STATUS_OPTIONS: LeadStatus[] = ['New Lead', 'Contacted', 'Proposal Sent', 'Booked', 'Completed', 'Lost']
const EVENT_TYPE_OPTIONS: EventType[] = ['Catering', 'Private Dining Room', 'Party Room', 'Delivery', 'Pickup', 'Other']
const SOURCE_OPTIONS: LeadSource[] = ['Phone', 'Website', 'Instagram', 'Referral', 'Walk-In', 'Existing Guest', 'Other']

const intentLabels: Record<string, string> = {
  add_lead: 'Add New Lead',
  update_lead: 'Update Lead',
  mark_booked: 'Mark as Booked',
  mark_lost: 'Mark as Lost',
  add_note: 'Add Note',
  set_follow_up: 'Set Follow-up',
  search_leads: 'Search Leads',
}

const intentColors: Record<string, string> = {
  add_lead: 'bg-green-100 text-green-700',
  update_lead: 'bg-blue-100 text-blue-700',
  mark_booked: 'bg-emerald-100 text-emerald-700',
  mark_lost: 'bg-red-100 text-red-700',
  add_note: 'bg-yellow-100 text-yellow-700',
  set_follow_up: 'bg-purple-100 text-purple-700',
  search_leads: 'bg-gray-100 text-gray-700',
}

function formatFieldName(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm the Catering Intake Assistant. Tell me about a new lead, or ask me to update an existing one. For example: \"John Smith called from Acme Corp, they want catering for 50 people on July 15th, budget around $2500.\"",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingParsed, setEditingParsed] = useState<Record<string, Partial<CateringLead>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: existingLeads } = await supabase
        .from('catering_leads')
        .select('id, contact_name, client_company_name, event_date')
        .order('created_at', { ascending: false })
        .limit(50)

      const response = await fetch('/api/ai/parse-catering-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          existing_leads: existingLeads || [],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to process message')
      }

      const parsed: ParsedLeadData = await response.json()

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsed.clarifying_question || `I extracted the following information. Please review and confirm:`,
        parsed,
      }

      setMessages(prev => [...prev, assistantMsg])
      setEditingParsed(prev => ({
        ...prev,
        [assistantMsg.id]: { ...parsed.lead_data },
      }))
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I had trouble processing that message. Please try again.',
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFieldChange = (msgId: string, field: string, value: string | number | null) => {
    setEditingParsed(prev => ({
      ...prev,
      [msgId]: {
        ...prev[msgId],
        [field]: value,
      },
    }))
  }

  const handleConfirm = async (msgId: string, parsed: ParsedLeadData) => {
    setSavingId(msgId)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const leadData = editingParsed[msgId] || parsed.lead_data

    try {
      if (parsed.intent === 'add_lead') {
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...leadData,
            status: leadData.status || 'New Lead',
          }),
        })

        if (!response.ok) throw new Error('Failed to save lead')
        const saved = await response.json()

        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, savedLeadId: saved.id } : m
        ))
      } else if (['update_lead', 'mark_booked', 'mark_lost', 'set_follow_up'].includes(parsed.intent)) {
        const targetId = selectedMatchId[msgId] || parsed.possible_matches?.[0]?.id
        if (!targetId) {
          alert('Please select a lead to update.')
          setSavingId(null)
          return
        }

        const updatePayload: Partial<CateringLead> = { ...leadData }
        if (parsed.intent === 'mark_booked') updatePayload.status = 'Booked'
        if (parsed.intent === 'mark_lost') updatePayload.status = 'Lost'

        const response = await fetch(`/api/leads/${targetId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        })

        if (!response.ok) throw new Error('Failed to update lead')
        const saved = await response.json()

        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, savedLeadId: saved.id } : m
        ))
      } else if (parsed.intent === 'add_note') {
        const targetId = selectedMatchId[msgId] || parsed.possible_matches?.[0]?.id
        if (!targetId || !leadData.notes) {
          alert('Could not find lead or note text to save.')
          setSavingId(null)
          return
        }

        const response = await fetch(`/api/leads/${targetId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: leadData.notes }),
        })

        if (!response.ok) throw new Error('Failed to save note')

        setMessages(prev => prev.map(m =>
          m.id === msgId ? { ...m, savedLeadId: targetId } : m
        ))
      }
    } catch (err) {
      alert('Failed to save. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCancel = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setEditingParsed(prev => {
      const next = { ...prev }
      delete next[msgId]
      return next
    })
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-screen max-h-screen">
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <h1 className="text-xl font-bold text-gray-900">Chat Intake</h1>
          <p className="text-sm text-gray-500">Describe a catering lead or update in natural language</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id}>
              <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  {msg.role === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`max-w-xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-amber-500 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
                    {msg.content}
                  </div>

                  {/* Confirmation Card */}
                  {msg.parsed && !msg.savedLeadId && (
                    <ConfirmationCard
                      msgId={msg.id}
                      parsed={msg.parsed}
                      editData={editingParsed[msg.id] || msg.parsed.lead_data}
                      saving={savingId === msg.id}
                      selectedMatchId={selectedMatchId[msg.id]}
                      onFieldChange={handleFieldChange}
                      onMatchSelect={(id) => setSelectedMatchId(prev => ({ ...prev, [msg.id]: id }))}
                      onConfirm={() => handleConfirm(msg.id, msg.parsed!)}
                      onCancel={() => handleCancel(msg.id)}
                    />
                  )}

                  {msg.savedLeadId && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                      <CheckCircle className="w-4 h-4" />
                      Saved successfully!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex gap-3 items-end">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe a lead or update... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="flex-1 resize-none px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white p-3 rounded-xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

interface ConfirmationCardProps {
  msgId: string
  parsed: ParsedLeadData
  editData: Partial<CateringLead>
  saving: boolean
  selectedMatchId?: string
  onFieldChange: (msgId: string, field: string, value: string | number | null) => void
  onMatchSelect: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmationCard({
  msgId,
  parsed,
  editData,
  saving,
  selectedMatchId,
  onFieldChange,
  onMatchSelect,
  onConfirm,
  onCancel,
}: ConfirmationCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 w-full max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${intentColors[parsed.intent] || 'bg-gray-100 text-gray-700'}`}>
          {intentLabels[parsed.intent] || parsed.intent}
        </span>
        <span className="text-xs text-gray-500">
          Confidence: {Math.round(parsed.confidence * 100)}%
        </span>
      </div>

      {/* Possible matches for update intents */}
      {parsed.possible_matches && parsed.possible_matches.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs font-medium text-blue-700 mb-2">Which lead should be updated?</p>
          <div className="space-y-1">
            {parsed.possible_matches.map(match => (
              <label key={match.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={`match-${msgId}`}
                  value={match.id}
                  checked={selectedMatchId === match.id}
                  onChange={() => onMatchSelect(match.id)}
                  className="text-amber-500"
                />
                <span className="text-sm text-gray-700">
                  {match.contact_name || match.client_company_name || 'Unknown'}
                  {match.event_date ? ` — ${match.event_date}` : ''}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Missing fields warning */}
      {parsed.missing_fields && parsed.missing_fields.length > 0 && (
        <div className="mb-4 flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-yellow-700">Missing fields:</p>
            <p className="text-xs text-yellow-600">{parsed.missing_fields.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Fields grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <EditableField
          label="Contact Name"
          value={editData.contact_name ?? ''}
          type="text"
          onChange={v => onFieldChange(msgId, 'contact_name', v || null)}
        />
        <EditableField
          label="Company"
          value={editData.client_company_name ?? ''}
          type="text"
          onChange={v => onFieldChange(msgId, 'client_company_name', v || null)}
        />
        <EditableField
          label="Phone"
          value={editData.phone ?? ''}
          type="text"
          onChange={v => onFieldChange(msgId, 'phone', v || null)}
        />
        <EditableField
          label="Email"
          value={editData.email ?? ''}
          type="email"
          onChange={v => onFieldChange(msgId, 'email', v || null)}
        />
        <EditableField
          label="Event Date"
          value={editData.event_date ?? ''}
          type="date"
          onChange={v => onFieldChange(msgId, 'event_date', v || null)}
        />
        <EditableField
          label="Event Time"
          value={editData.event_time ?? ''}
          type="text"
          onChange={v => onFieldChange(msgId, 'event_time', v || null)}
        />
        <EditableField
          label="Guest Count"
          value={editData.guest_count != null ? String(editData.guest_count) : ''}
          type="number"
          onChange={v => onFieldChange(msgId, 'guest_count', v ? Number(v) : null)}
        />
        <EditableField
          label="Est. Amount ($)"
          value={editData.estimated_amount != null ? String(editData.estimated_amount) : ''}
          type="number"
          onChange={v => onFieldChange(msgId, 'estimated_amount', v ? Number(v) : null)}
        />
        <EditableField
          label="Follow-up Date"
          value={editData.follow_up_date ?? ''}
          type="date"
          onChange={v => onFieldChange(msgId, 'follow_up_date', v || null)}
        />

        {/* Status select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={editData.status ?? ''}
            onChange={e => onFieldChange(msgId, 'status', e.target.value || null)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
          >
            <option value="">—</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Event type select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Event Type</label>
          <select
            value={editData.event_type ?? ''}
            onChange={e => onFieldChange(msgId, 'event_type', e.target.value || null)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
          >
            <option value="">—</option>
            {EVENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Source select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Source</label>
          <select
            value={editData.source ?? ''}
            onChange={e => onFieldChange(msgId, 'source', e.target.value || null)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
          >
            <option value="">—</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
        <textarea
          value={editData.notes ?? ''}
          onChange={e => onFieldChange(msgId, 'notes', e.target.value || null)}
          rows={2}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Saving...' : 'Confirm & Save'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  )
}

function EditableField({
  label,
  value,
  type,
  onChange,
}: {
  label: string
  value: string
  type: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-gray-900"
      />
    </div>
  )
}
