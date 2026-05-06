// ─── KPIs communs ─────────────────────────────────────────────────────────────

export interface KpiCard {
  label: string
  value: number | string
  unit?: string
  trend?: number       // % de variation vs période précédente
  trendLabel?: string
  color?: 'green' | 'red' | 'orange' | 'blue' | 'purple'
}

export interface ChartDataPoint {
  label: string
  value: number
  value2?: number
  color?: string
}

// ─── Dashboard Financier ──────────────────────────────────────────────────────

export interface FinancierDashboard {
  facility: {
    id: string
    name: string
    type: string
  }
  currentPeriod: {
    label: string
    status: string
    deadline: string
    isOverdue: boolean
  }
  kpis: {
    totalRevenue: KpiCard
    pendingDeclarations: KpiCard
    lastDeclarationDate: KpiCard
    monthlyTarget?: KpiCard
  }
  recentDeclarations: Array<{
    id: string
    reference: string
    periodLabel: string
    amount: number
    status: string
    submittedAt?: string | null
  }>
  revenueChart: ChartDataPoint[]  // 6 dernières périodes
}

// ─── Dashboard Chef de Centre ──────────────────────────────────────────────────

export interface FacilityChiefDashboard {
  facility: {
    id: string
    name: string
    type: string
  }
  kpis: {
    totalRevenueMTD: KpiCard       // Month-to-date
    totalRevenueYTD: KpiCard       // Year-to-date
    declarationsCompliance: KpiCard  // % soumis dans les délais
    statCompleteness: KpiCard
  }
  declarationsOverview: {
    submitted: number
    reviewed: number
    validated: number
    rejected: number
    pending: number
  }
  revenueByCategory: ChartDataPoint[]
  revenueTrend: ChartDataPoint[]
  statStatus: {
    month: number
    year: number
    status: string
    completeness: number
  }
}

// ─── Dashboard Directeur Régional ─────────────────────────────────────────────

export interface RegionalDashboard {
  region: {
    id: string
    name: string
    code: string
  }
  kpis: {
    totalRegionalRevenue: KpiCard
    facilitiesCount: KpiCard
    declarationComplianceRate: KpiCard
    statPromptnessRate: KpiCard
  }
  facilitiesStatus: Array<{
    facilityId: string
    facilityName: string
    facilityType: string
    lastDeclaration?: {
      reference: string
      amount: number
      status: string
      date: string
    } | null
    pendingReview: number
    complianceRate: number
    statStatus?: string | null
  }>
  revenueComparison: ChartDataPoint[]  // par centre
  monthlyTrend: ChartDataPoint[]
  pendingReviews: number
}

// ─── Dashboard Direction ──────────────────────────────────────────────────────

export interface DirectionDashboard {
  kpis: {
    totalNationalRevenue: KpiCard
    totalFacilities: KpiCard
    globalDeclarationRate: KpiCard
    globalStatPromptnessRate: KpiCard
  }
  regionsOverview: Array<{
    regionId: string
    regionName: string
    totalRevenue: number
    facilitiesCount: number
    declarationRate: number
    statRate: number
    pendingValidations: number
  }>
  nationalRevenueTrend: ChartDataPoint[]
  revenueByRegion: ChartDataPoint[]
  pendingValidations: number
  alertCount: number
}
