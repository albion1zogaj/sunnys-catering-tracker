'use client'

import { useEffect, useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { createClient } from '@/lib/supabase'
import type { ActivityLog, Profile } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Download, Users, Clock } from 'lucide-react'

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: activityData } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      setProfiles(profilesData || [])
      setActivity(activityData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `catering-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users, export data, and view activity</p>
        </div>

        {/* Export */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Download className="w-4 h-4 text-amber-500" />
                Export Data
              </h2>
              <p className="text-sm text-gray-500 mt-1">Download all catering leads as a CSV file</p>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Exporting...' : 'Export to CSV'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          </div>
        ) : (
          <>
            {/* Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-amber-500" />
                Team Members ({profiles.length})
              </h2>
              {profiles.length === 0 ? (
                <p className="text-sm text-gray-400">No users found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Name</th>
                        <th className="px-4 py-3 text-left font-medium">Role</th>
                        <th className="px-4 py-3 text-left font-medium">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {profiles.map(profile => (
                        <tr key={profile.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {profile.full_name || 'Unnamed User'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              profile.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {profile.role || 'staff'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {format(parseISO(profile.created_at), 'MMM d, yyyy')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-amber-500" />
                Recent Activity
              </h2>
              {activity.length === 0 ? (
                <p className="text-sm text-gray-400">No activity recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                        <th className="px-4 py-3 text-left font-medium">Action</th>
                        <th className="px-4 py-3 text-left font-medium">Field</th>
                        <th className="px-4 py-3 text-left font-medium">Old Value</th>
                        <th className="px-4 py-3 text-left font-medium">New Value</th>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activity.map(entry => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{entry.action}</td>
                          <td className="px-4 py-3 text-gray-500">{entry.field_changed || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{entry.old_value || '—'}</td>
                          <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{entry.new_value || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                            {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}
