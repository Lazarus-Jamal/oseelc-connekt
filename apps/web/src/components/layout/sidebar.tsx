'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { Session } from 'next-auth'
import type React from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  TrendingDown,
  BarChart3,
  FileBarChart,
  FileCheck,
  Tag,
  Users,
  Building2,
  Settings,
  Bell,
  X,
  ChevronRight,
  MapPin,
  MessageSquare,
  FlaskConical,
  CalendarClock,
  Shield,
  FileUp,
  Trophy,
  Globe,
} from 'lucide-react'

interface SidebarProps {
  session: Session
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Déclarations', href: '/declarations', icon: FileText, roles: ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER'] },
  { label: 'Dépenses', href: '/expenses', icon: TrendingDown, roles: ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER'] },
  { label: 'Statistiques', href: '/statistics', icon: BarChart3, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'DATA_MANAGER'] },
  { label: 'Import statistiques', href: '/statistics/import', icon: FileUp, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DATA_MANAGER'] },
  { label: 'Rapports', href: '/reports', icon: FileBarChart, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'DATA_MANAGER'] },
  { label: 'Analyse des données', href: '/analytics', icon: FlaskConical, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'DATA_MANAGER'] },
  { label: 'Benchmarking', href: '/benchmarking', icon: Trophy, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Carte géographique', href: '/map', icon: MapPin, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Suivi budgétaire', href: '/budget', icon: FileCheck, roles: ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Catégories', href: '/categories', icon: Tag, roles: ['SUPER_ADMIN', 'DIRECTION', 'FINANCIER'] },
  { label: 'Planning & Agenda', href: '/planning', icon: CalendarClock },
  { label: 'Messagerie', href: '/messages', icon: MessageSquare },
  { label: 'Notifications', href: '/notifications', icon: Bell },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Utilisateurs', href: '/admin/users', icon: Users, roles: ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Régions sanitaires', href: '/admin/regions', icon: MapPin, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Formations sanitaires', href: '/admin/facilities', icon: Building2, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'] },
  { label: 'Indicateurs stat.', href: '/admin/indicators', icon: BarChart3, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION'] },
  { label: 'Délais de promptitude', href: '/admin/deadlines', icon: CalendarClock, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DATA_MANAGER'] },
  { label: 'Journal d\'audit', href: '/admin/audit', icon: Shield, roles: ['SUPER_ADMIN', 'DIRECTION'] },
  { label: 'Intégration DHIS2', href: '/admin/dhis2', icon: Globe, roles: ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION'] },
  { label: 'Configuration', href: '/admin/config', icon: Settings, roles: ['SUPER_ADMIN'] },
]

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'Informaticien',
  DATA_ADMIN: 'Admin Data',
  DIRECTION: 'Direction',
  REGIONAL_DIRECTOR: 'Dir. Régional',
  FACILITY_CHIEF: 'Chef de centre',
  FINANCIER: 'Financier',
  DATA_MANAGER: 'Data Manager',
}

export function Sidebar({ session, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname() || ''

  if (!session) return null

  const role = session.user.role
  const filteredNav = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role))
  const filteredAdmin = ADMIN_ITEMS.filter((item) => !item.roles || item.roles.includes(role))

  const isActivePath = (href: string) => {
    if (!pathname) return false
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-in-out flex flex-col',
        'bg-gradient-to-b from-slate-900 via-slate-900 to-brand-950',
        'lg:static lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0">
            <Image src="/logo.png" alt="OSEELC" width={28} height={28} className="object-contain" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">Oseelc-connekt</p>
            <p className="text-[10px] text-brand-400 font-medium">Gestion sanitaire</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 text-slate-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {filteredNav.map((item) => {
          const isActive = isActivePath(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive ? 'bg-brand-500/20 text-brand-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
              )}
            >
              <item.icon className={cn('w-4 h-4', isActive ? 'text-brand-400' : 'text-slate-500')} />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          )
        })}

        {filteredAdmin.length > 0 && (
          <>
            <div className="pt-6 pb-2 px-3">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Admin</p>
            </div>
            {filteredAdmin.map((item) => {
              const isActive = isActivePath(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                    isActive ? 'bg-brand-500/20 text-brand-200' : 'text-slate-500 hover:bg-white/5 hover:text-slate-100'
                  )}
                >
                  <item.icon className={cn('w-4 h-4', isActive ? 'text-brand-400' : 'text-slate-600')} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-white/5">
        <Link href="/profile" onClick={onClose} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-bold uppercase">
            {session.user.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{session.user.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{ROLE_BADGE[role] || role}</p>
          </div>
          <ChevronRight className="w-3 h-3 text-slate-600" />
        </Link>
      </div>
    </aside>
  )
}
