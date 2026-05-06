import type { Session } from 'next-auth'

type Role = string

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
