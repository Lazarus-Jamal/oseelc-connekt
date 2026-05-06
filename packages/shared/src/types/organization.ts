export type FacilityType = 'HOSPITAL' | 'HEALTH_CENTER'

export interface Organization {
  id: string
  name: string
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  logoUrl?: string | null
  createdAt: string
  updatedAt: string
}

export interface Region {
  id: string
  name: string
  code: string
  organizationId: string
  createdAt: string
  updatedAt: string
  _count?: {
    facilities: number
  }
}

export interface Facility {
  id: string
  name: string
  code: string
  type: FacilityType
  regionId: string
  address?: string | null
  phone?: string | null
  email?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  region?: Pick<Region, 'id' | 'name' | 'code'>
}

export interface UserSummary {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  phone?: string | null
  avatarUrl?: string | null
  facility?: Pick<Facility, 'id' | 'name' | 'code' | 'type'> | null
  region?: Pick<Region, 'id' | 'name' | 'code'> | null
  lastLoginAt?: string | null
  createdAt: string
}

export interface CreateUserRequest {
  email: string
  name: string
  role: string
  phone?: string
  facilityId?: string
  regionId?: string
  organizationId?: string
}

export interface CreateFacilityRequest {
  name: string
  code: string
  type: FacilityType
  regionId: string
  address?: string
  phone?: string
  email?: string
}
