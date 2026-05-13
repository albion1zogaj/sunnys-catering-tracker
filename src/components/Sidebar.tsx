'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  LayoutDashboard,
  MessageSquare,
  GitBranch,
  Settings,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react'

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat Intake', icon: MessageSquare },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/admin', label: 'Admin', icon: Settings },
]

interface SidebarProps {
  userEmail?: string | null
  userFullName?: string | null
}

export default function Sidebar({ userEmail, userFullName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <aside className="w-64 min-h-screen bg-slate-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 bg-amber-500 rounded-lg flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-amber-400 font-bold text-lg leading-none">Sunny&apos;s</div>
            <div className="text-slate-300 text-xs font-medium">Catering Tracker</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navLinks.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-amber-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className="px-3 py-4 border-t border-slate-700">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">
            {userFullName || 'User'}
          </p>
          <p className="text-slate-400 text-xs truncate">{userEmail || ''}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-150"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
