'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase'
import type { CateringLead } from '@/lib/types'
import { format, isToday, isPast, isFuture, parseISO } from 'date-fns'
import Link from 'next/link'

interface DashboardStats {
  openLeads: number
  bookedRevenue: number
  pipelineValue: number
  conversionRate: number
  followUpsDueToday: number
  overdueFollowUps: number
  averageBookedValue: number
}

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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<CateringLead[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CateringLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: leads } = await supabase
        .from('catering_leads')
        .select('*')
        .order('created_at', { ascending: false })

      if (!leads) {
        setLoading(false)
        return
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const openLeads = leads.filter(l => !['Completed', 'Lost'].includes(l.status)).length

      const bookedLeads = leads.filter(l => l.status === 'Booked')
      const bookedRevenue = bookedLeads.reduce((sum, l) => sum + (l.final_amount || 0), 0)

      const pipelineLeads = leads.filter(l => !['Lost', 'Completed'].includes(l.status))
      const pipelineValue = pipelineLeads.reduce((sum, l) => sum + (l.estimated_amount || 0), 0)

      const totalLeads = leads.length
      const conversionRate = totalLeads > 0 ? (bookedLeads.length / totalLeads) * 100 : 0

      const followUpsDueToday = leads.filter(l => {
        if (!l.follow_up_date) return false
        const d = parseISO(l.follow_up_date)
        return isToday(d)
      }).length

      const overdueFollowUps = leads.filter(l => {
        if (!l.follow_up_date) return false
        const d = parseISO(l.follow_up_date)
        return isPast(d) && !isToday(d) && !['Completed', 'Lost', 'Booked'].includes(l.status)
      }).length

      const averageBookedValue =
        bookedLeads.length > 0
          ? bookedLeads.reduce((sum, l) => sum + (l.final_amount || l.estimated_amount || 0), 0) / bookedLeads.length
          : 0

      setStats({
        openLeads,
        bookedRevenue,
        pipelineValue,
        conversionRate,
        followUpsDueToday,
        overdueFollowUps,
        averageBookedValue,
      })

      setRecentLeads(leads.slice(0, 10))

      const upcoming = leads
        .filter(l => l.status === 'Booked' && l.event_date && isFuture(parseISO(l.event_date)))
        .sort((a, b) => (a.event_date || '').localeCompare(b.event_date || ''))
        .slice(0, 10)
      setUpcomingEvents(upcoming)

      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of your catering pipeline</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading dashboard...
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Open Leads"
                value={String(stats?.openLeads ?? 0)}
                color="amber"
              />
              <StatCard
                label="Booked Revenue"
                value={formatCurrency(stats?.bookedRevenue ?? 0)}
                color="green"
              />
              <StatCard
                label="Pipeline Value"
                value={formatCurrency(stats?.pipelineValue ?? 0)}
                color="blue"
              />
              <StatCard
                label="Conversion Rate"
                value={`${(stats?.conversionRate ?? 0).toFixed(1)}%`}
                color="purple"
              />
              <StatCard
                label="Follow-ups Today"
                value={String(stats?.followUpsDueToday ?? 0)}
                color="amber"
              />
              <StatCard
                label="Overdue Follow-ups"
                value={String(stats?.overdueFollowUps ?? 0)}
                color="red"
              />
              <StatCard
                label="Avg Booked Value"
                value={formatCurrency(stats?.averageBookedValue ?? 0)}
                color="green"
              />
            </div>

            {/* Recent Leads */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Recent Leads</h2>
                <Link href="/pipeline" className="text-sm text-amber-600 hover:text-amber-700 font-medium">
                  View all →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Company</th>
                      <th className="px-4 py-3 text-left font-medium">Event Date</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Est. Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentLeads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No leads yet</td>
                      </tr>
                    ) : (
                      recentLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Link href={`/leads/${lead.id}`} className="text-amber-600 hover:underline font-medium">
                              {lead.contact_name || '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{lead.client_company_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {lead.event_date ? format(parseISO(lead.event_date), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lead.status] || 'bg-gray-100 text-gray-700'}`}>
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(lead.estimated_amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Upcoming Booked Events</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left font-medium">Event Date</th>
                      <th className="px-4 py-3 text-left font-medium">Contact</th>
                      <th className="px-4 py-3 text-left font-medium">Company</th>
                      <th className="px-4 py-3 text-left font-medium">Guests</th>
                      <th className="px-4 py-3 text-left font-medium">Final Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {upcomingEvents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No upcoming booked events</td>
                      </tr>
                    ) : (
                      upcomingEvents.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {lead.event_date ? format(parseISO(lead.event_date), 'MMM d, yyyy') : '—'}
                            {lead.event_time ? <span className="text-gray-400 ml-1 text-xs">{lead.event_time}</span> : null}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/leads/${lead.id}`} className="text-amber-600 hover:underline">
                              {lead.contact_name || '—'}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{lead.client_company_name || '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{lead.guest_count ?? '—'}</td>
                          <td className="px-4 py-3 text-gray-600">{formatCurrency(lead.final_amount)}</td>
                          <td className="px-4 py-3 text-gray-600">{lead.event_type || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    amber: 'border-l-amber-500 bg-amber-50',
    green: 'border-l-green-500 bg-green-50',
    blue: 'border-l-blue-500 bg-blue-50',
    purple: 'border-l-purple-500 bg-purple-50',
    red: 'border-l-red-500 bg-red-50',
  }
  const textMap: Record<string, string> = {
    amber: 'text-amber-700',
    green: 'text-green-700',
    blue: 'text-blue-700',
    purple: 'text-purple-700',
    red: 'text-red-700',
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${colorMap[color] || 'border-l-gray-400'} p-5`}>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textMap[color] || 'text-gray-700'}`}>{value}</p>
    </div>
  )
}
