export type Role =
  | 'SUPER_ADMIN'
  | 'DIRECTION'
  | 'REGIONAL_DIRECTOR'
  | 'FACILITY_CHIEF'
  | 'FINANCIER'
  | 'DATA_MANAGER'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  organizationId?: string | null
  regionId?: string | null
  facilityId?: string | null
  avatarUrl?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: AuthUser
  token: string
  expiresAt: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

// Permissions par rôle
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'],
  DIRECTION: [
    'declaration:read:all',
    'declaration:validate',
    'stat:read:all',
    'stat:validate',
    'report:read:all',
    'user:read',
    'dashboard:direction',
  ],
  REGIONAL_DIRECTOR: [
    'declaration:read:region',
    'declaration:review',
    'stat:read:region',
    'stat:review',
    'report:read:region',
    'dashboard:region',
  ],
  FACILITY_CHIEF: [
    'declaration:read:facility',
    'declaration:review',
    'stat:read:facility',
    'dashboard:facility',
  ],
  FINANCIER: [
    'declaration:read:facility',
    'declaration:create',
    'declaration:update:draft',
    'declaration:submit',
    'dashboard:financier',
  ],
  DATA_MANAGER: [
    'stat:read:facility',
    'stat:create',
    'stat:update:draft',
    'stat:submit',
    'dashboard:data',
  ],
}
