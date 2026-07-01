import type { Session } from 'next-auth'

type Role = string

// ── Page-level permission system ─────────────────────────────────────────────

export const ALL_ROLES = [
  'SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR',
  'FACILITY_CHIEF', 'FINANCIER', 'DATA_MANAGER',
  'CONTROLEUR', 'CONTROLEUR_REGIONAL', 'CAISSIER',
] as const

export type AppRole = typeof ALL_ROLES[number]

export interface PageDef {
  key: string
  label: string
  group: 'main' | 'admin' | 'analytics' | 'care2x'
  defaultRoles: AppRole[] | 'all'
}

export const PAGE_DEFS: PageDef[] = [
  // Menu principal
  { key: 'dashboard',          label: 'Tableau de bord',       group: 'main',  defaultRoles: 'all' },
  { key: 'declarations',       label: 'Déclarations',          group: 'main',  defaultRoles: ['SUPER_ADMIN','DIRECTION','REGIONAL_DIRECTOR','FACILITY_CHIEF','FINANCIER','CONTROLEUR','CONTROLEUR_REGIONAL','CAISSIER'] },
  { key: 'expenses',           label: 'Dépenses',              group: 'main',  defaultRoles: ['SUPER_ADMIN','DIRECTION','REGIONAL_DIRECTOR','FACILITY_CHIEF','FINANCIER'] },
  { key: 'statistics',         label: 'Statistiques',          group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','FACILITY_CHIEF','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'statistics.import',  label: 'Import statistiques',   group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DATA_MANAGER'] },
  { key: 'reports',            label: 'Rapports',              group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','FACILITY_CHIEF','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics',          label: 'Analyse des données',   group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'benchmarking',       label: 'Benchmarking',          group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR'] },
  { key: 'map',                label: 'Carte géographique',    group: 'main',  defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR'] },
  { key: 'budget',             label: 'Suivi budgétaire',      group: 'main',  defaultRoles: ['SUPER_ADMIN','DIRECTION','REGIONAL_DIRECTOR','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'categories',         label: 'Catégories',            group: 'main',  defaultRoles: ['SUPER_ADMIN','DIRECTION','FINANCIER'] },
  { key: 'planning',           label: 'Planning & Agenda',     group: 'main',  defaultRoles: 'all' },
  { key: 'messages',           label: 'Messagerie',            group: 'main',  defaultRoles: 'all' },
  { key: 'notifications',      label: 'Notifications',         group: 'main',  defaultRoles: 'all' },
  // Administration
  { key: 'admin.users',        label: 'Utilisateurs',          group: 'admin', defaultRoles: ['SUPER_ADMIN','DIRECTION','REGIONAL_DIRECTOR'] },
  { key: 'admin.regions',      label: 'Régions sanitaires',    group: 'admin', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR'] },
  { key: 'admin.facilities',   label: 'Formations sanitaires', group: 'admin', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR'] },
  { key: 'admin.indicators',   label: 'Indicateurs stat.',     group: 'admin', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION'] },
  { key: 'admin.deadlines',    label: 'Délais de promptitude', group: 'admin', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DATA_MANAGER'] },
  { key: 'admin.audit',        label: "Journal d'audit",       group: 'admin', defaultRoles: ['SUPER_ADMIN','DIRECTION'] },
  { key: 'admin.dhis2',        label: 'Intégration DHIS2',     group: 'admin', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION'] },
  { key: 'admin.config',       label: 'Configuration',         group: 'admin', defaultRoles: ['SUPER_ADMIN'] },
  { key: 'admin.care2x',       label: 'Clés API Care2x',       group: 'admin', defaultRoles: ['SUPER_ADMIN'] },
  { key: 'admin.permissions',  label: 'Gestion des droits',    group: 'admin', defaultRoles: ['SUPER_ADMIN'] },
  // Onglets Analytics
  { key: 'analytics.overview',   label: 'Aperçu national', group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics.regions',    label: 'Par région',      group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics.facilities', label: 'Par centre',      group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics.explorer',   label: 'Explorateur',     group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics.inferences', label: 'Inférences',      group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  { key: 'analytics.report',     label: 'Rapport',         group: 'analytics', defaultRoles: ['SUPER_ADMIN','DATA_ADMIN','DIRECTION','REGIONAL_DIRECTOR','DATA_MANAGER','CONTROLEUR','CONTROLEUR_REGIONAL'] },
  // Onglets Care2x
  { key: 'care2x.overview',  label: "Vue d'ensemble",  group: 'care2x', defaultRoles: ['SUPER_ADMIN'] },
  { key: 'care2x.keys',      label: 'Clés API',        group: 'care2x', defaultRoles: ['SUPER_ADMIN'] },
  { key: 'care2x.syncs',     label: 'Historique syncs',group: 'care2x', defaultRoles: ['SUPER_ADMIN'] },
  { key: 'care2x.versions',  label: 'Versions',        group: 'care2x', defaultRoles: ['SUPER_ADMIN'] },
]

export const GROUP_LABELS: Record<PageDef['group'], string> = {
  main:      'Menu principal',
  admin:     'Administration',
  analytics: 'Onglets — Analyse des données',
  care2x:    'Onglets — Care2x',
}

export function defaultGranted(pageKey: string, role: AppRole): boolean {
  if (role === 'SUPER_ADMIN') return true
  const def = PAGE_DEFS.find((p) => p.key === pageKey)
  if (!def) return false
  if (def.defaultRoles === 'all') return true
  return (def.defaultRoles as AppRole[]).includes(role)
}

export function buildPermissions(
  role: AppRole,
  dbRows: { pageKey: string; granted: boolean }[],
): Record<string, boolean> {
  if (role === 'SUPER_ADMIN') {
    return Object.fromEntries(PAGE_DEFS.map((p) => [p.key, true]))
  }
  const overrides = Object.fromEntries(dbRows.map((r) => [r.pageKey, r.granted]))
  return Object.fromEntries(
    PAGE_DEFS.map((def) => [
      def.key,
      def.key in overrides ? overrides[def.key] : defaultGranted(def.key, role),
    ])
  )
}

// ── Legacy action-level helpers (used in API routes) ─────────────────────────

export function can(session: Session | null, permission: string): boolean {
  if (!session?.user?.role) return false
  const role = session.user.role as Role

  if (role === 'SUPER_ADMIN') return true

  const permMap: Record<Role, string[]> = {
    DIRECTION: ['declaration:read', 'declaration:validate', 'stat:read', 'stat:validate', 'report:read', 'user:read', 'admin:read'],
    REGIONAL_DIRECTOR: ['declaration:read', 'declaration:review', 'stat:read', 'stat:review', 'report:read'],
    FACILITY_CHIEF: ['declaration:read', 'declaration:review', 'stat:read', 'report:read'],
    FINANCIER: ['declaration:read', 'declaration:create', 'declaration:submit'],
    DATA_MANAGER: ['stat:read', 'stat:create', 'stat:submit'],
  }

  const perms = permMap[role] || []
  return perms.some((p) => permission.startsWith(p) || p.startsWith(permission))
}

export function requireRole(session: Session | null, roles: Role[]): boolean {
  if (!session?.user?.role) return false
  return roles.includes(session.user.role as Role)
}

export function isAdmin(session: Session | null): boolean {
  return requireRole(session, ['SUPER_ADMIN'])
}

export function canManageDeclarations(session: Session | null): boolean {
  return requireRole(session, ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER'])
}

export function canValidate(session: Session | null): boolean {
  return requireRole(session, ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'])
}
