export type DeclarationPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY'
export type DeclarationStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'VALIDATED' | 'REJECTED'

export interface DeclarationItem {
  id: string
  declarationId: string
  label: string
  category: string
  amount: number
  quantity?: number | null
  unitPrice?: number | null
  note?: string | null
}

export interface DeclarationDocument {
  id: string
  declarationId: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

export interface DeclarationHistory {
  id: string
  declarationId: string
  fromStatus: DeclarationStatus
  toStatus: DeclarationStatus
  changedById: string
  changedByName?: string
  comment?: string | null
  changedAt: string
}

export interface Declaration {
  id: string
  reference: string
  facilityId: string
  facilityName?: string
  submittedById: string
  submittedByName?: string
  reviewedById?: string | null
  reviewedByName?: string | null
  periodType: DeclarationPeriodType
  periodStart: string
  periodEnd: string
  totalAmount: number
  status: DeclarationStatus
  comment?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  validatedAt?: string | null
  createdAt: string
  updatedAt: string
  items?: DeclarationItem[]
  documents?: DeclarationDocument[]
  history?: DeclarationHistory[]
}

export interface CreateDeclarationRequest {
  facilityId: string
  periodType: DeclarationPeriodType
  periodStart: string
  periodEnd: string
  items: Omit<DeclarationItem, 'id' | 'declarationId'>[]
}

export interface UpdateDeclarationRequest {
  items?: Omit<DeclarationItem, 'id' | 'declarationId'>[]
  comment?: string
}

export interface ReviewDeclarationRequest {
  status: 'REVIEWED' | 'VALIDATED' | 'REJECTED'
  comment?: string
}

export interface DeclarationPeriodConfig {
  id: string
  periodType: DeclarationPeriodType
  isGlobal: boolean
  regionId?: string | null
  facilityId?: string | null
  deadline: number
}

export const DECLARATION_CATEGORIES = [
  'Consultations externes',
  'Hospitalisations',
  'Maternité',
  'Chirurgie',
  'Pharmacie',
  'Examens de laboratoire',
  'Imagerie médicale',
  'Autres prestations',
] as const

export type DeclarationCategory = (typeof DECLARATION_CATEGORIES)[number]
