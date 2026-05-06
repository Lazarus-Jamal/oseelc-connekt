export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface ApiError {
  success: false
  error: string
  details?: Record<string, string[]>
}

export interface PaginationQuery {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DeclarationQuery extends PaginationQuery {
  facilityId?: string
  regionId?: string
  status?: string
  periodType?: string
  from?: string
  to?: string
}

export interface StatQuery extends PaginationQuery {
  facilityId?: string
  regionId?: string
  status?: string
  month?: number
  year?: number
}
