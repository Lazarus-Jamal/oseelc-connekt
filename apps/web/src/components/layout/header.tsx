'use client'

import { signOut } from 'next-auth/react'
import type { Session } from 'next-auth'
import Link from 'next/link'
import { Bell, LogOut, Menu, Moon, Sun, Mail } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { ROLES_LABELS } from '@care-connekt/shared'
import { PushManager } from '@/components/push-manager'

interface HeaderProps {
  session: Session
  onMenuClick: () => void
}

export function Header({ session, onMenuClick }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    const fetchUnread = () => {
      fetch('/api/messages?box=inbox')
        .then((r) => r.json())
        .then((d) => { if (d.unreadCount !== undefined) setUnreadMessages(d.unreadCount) })
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-100 dark:border-white/8 px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-slate-400 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-100 dark:border-brand-500/20">
            {ROLES_LABELS[session.user.role] || session.user.role}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Push notifications toggle */}
        <div className="hidden sm:block">
          <PushManager />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Messages */}
        <Link
          href="/messages"
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
        >
          <Mail className="w-4 h-4" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <Link
          href="/notifications"
          className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
        </Link>

        {/* User menu */}
        <div className="relative group">
          <button className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {session.user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-slate-300 max-w-[120px] truncate">
              {session.user.name}
            </span>
          </button>

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl shadow-black/8 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
            <div className="p-3 border-b border-gray-100 dark:border-white/8">
              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{session.user.name}</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 truncate mt-0.5">{session.user.email}</p>
            </div>
            <div className="p-1.5">
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
