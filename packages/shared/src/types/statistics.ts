export type StatSheetStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'REJECTED'

export interface StatIndicator {
  id: string
  code: string
  label: string
  category: string
  unit?: string | null
  isRequired: boolean
  description?: string | null
  sortOrder: number
  isActive: boolean
}

export interface StatValue {
  id: string
  statSheetId: string
  indicatorId: string
  indicator?: StatIndicator
  value?: number | null
  note?: string | null
}

export interface StatDocument {
  id: string
  statSheetId: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export interface StatSheet {
  id: string
  reference: string
  facilityId: string
  facilityName?: string
  dataManagerId: string
  dataManagerName?: string
  month: number
  year: number
  status: StatSheetStatus
  comment?: string | null
  submittedAt?: string | null
  validatedAt?: string | null
  completeness?: number | null  // 0-100
  createdAt: string
  updatedAt: string
  values?: StatValue[]
  documents?: StatDocument[]
}

export interface CreateStatSheetRequest {
  facilityId: string
  month: number
  year: number
  values: { indicatorId: string; value?: number; note?: string }[]
}

export interface UpdateStatSheetRequest {
  values: { indicatorId: string; value?: number; note?: string }[]
}

// Indicateurs de performance
export interface CompletenessIndicator {
  facilityId: string
  facilityName: string
  month: number
  year: number
  completeness: number  // % de champs remplis
  isSubmitted: boolean
  isOnTime: boolean
}

export interface PromptnessReport {
  period: string  // "2024-01"
  totalFacilities: number
  submittedOnTime: number
  submittedLate: number
  notSubmitted: number
  promptnessRate: number  // %
}
