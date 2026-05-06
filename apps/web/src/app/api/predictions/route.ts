import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Simple linear regression helper
function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length
  if (n < 2) return null
  const sumX = points.reduce((s, p) => s + p.x, 0)
  const sumY = points.reduce((s, p) => s + p.y, 0)
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept, predict: (x: number) => slope * x + intercept }
}

// Z-score anomaly detection
function detectAnomalies(values: number[], threshold = 2.5) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length
  const std = Math.sqrt(variance)
  if (std === 0) return values.map(() => false)
  return values.map((v) => Math.abs((v - mean) / std) > threshold)
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, facilityId: userFacilityId, regionId: userRegionId } = session.user
  if (!['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'DATA_MANAGER', 'FACILITY_CHIEF'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'revenue' // revenue | expense | completeness
  const facilityId = searchParams.get('facilityId') ?? (role === 'FACILITY_CHIEF' ? userFacilityId : null)
  const monthsAhead = Math.min(6, parseInt(searchParams.get('monthsAhead') ?? '3'))

  let historicalData: { period: number; value: number; month: number; year: number }[] = []

  if (type === 'completeness') {
    const where: any = {}
    if (facilityId) where.facilityId = facilityId
    else if (role === 'REGIONAL_DIRECTOR' && userRegionId) where.facility = { regionId: userRegionId }
    else if (role === 'FACILITY_CHIEF' && userFacilityId) where.facilityId = userFacilityId

    const sheets = await prisma.statSheet.findMany({
      where,
      select: { month: true, year: true, completeness: true },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    })

    // Group by month/year, average completeness
    const grouped = new Map<string, number[]>()
    for (const s of sheets) {
      const key = `${s.year}-${s.month}`
      const arr = grouped.get(key) ?? []
      arr.push(Number(s.completeness ?? 0))
      grouped.set(key, arr)
    }
    let idx = 0
    for (const [key, vals] of grouped) {
      const [year, month] = key.split('-').map(Number)
      historicalData.push({ period: idx++, value: vals.reduce((s, v) => s + v, 0) / vals.length, month, year })
    }
  } else {
    const decType = type === 'revenue' ? 'REVENUE' : 'EXPENSE'
    const where: any = { declarationType: decType, status: { in: ['SUBMITTED', 'VALIDATED'] } }
    if (facilityId) where.facilityId = facilityId
    else if (role === 'REGIONAL_DIRECTOR' && userRegionId) where.facility = { regionId: userRegionId }
    else if (role === 'FACILITY_CHIEF' && userFacilityId) where.facilityId = userFacilityId

    const declarations = await prisma.declaration.groupBy({
      by: ['periodStart'],
      where,
      _sum: { totalAmount: true },
      orderBy: { periodStart: 'asc' },
    })

    let idx = 0
    for (const d of declarations) {
      const date = new Date(d.periodStart)
      historicalData.push({
        period: idx++,
        value: Number(d._sum.totalAmount ?? 0),
        month: date.getMonth() + 1,
        year: date.getFullYear(),
      })
    }
  }

  if (historicalData.length < 2) {
    return NextResponse.json({ success: true, data: { historical: historicalData, predictions: [], anomalies: [], trend: null, message: 'Données insuffisantes (minimum 2 points)' } })
  }

  const points = historicalData.map((d) => ({ x: d.period, y: d.value }))
  const regression = linearRegression(points)

  // Generate predictions
  const lastPeriod = historicalData[historicalData.length - 1]
  const predictions: { period: number; value: number; month: number; year: number }[] = []
  for (let i = 1; i <= monthsAhead; i++) {
    const period = lastPeriod.period + i
    const nextMonth = ((lastPeriod.month - 1 + i) % 12) + 1
    const yearOffset = Math.floor((lastPeriod.month - 1 + i) / 12)
    predictions.push({
      period,
      value: Math.max(0, regression!.predict(period)),
      month: nextMonth,
      year: lastPeriod.year + yearOffset,
    })
  }

  // Anomaly detection
  const values = historicalData.map((d) => d.value)
  const anomalyFlags = detectAnomalies(values)
  const anomalies = historicalData.filter((_, i) => anomalyFlags[i])

  // Trend summary
  const slope = regression!.slope
  const trendPct = values.length > 1 && values[0] > 0
    ? (slope / (values.reduce((s, v) => s + v, 0) / values.length)) * 100
    : 0

  return NextResponse.json({
    success: true,
    data: {
      historical: historicalData,
      predictions,
      anomalies,
      trend: {
        slope,
        direction: slope > 0 ? 'up' : slope < 0 ? 'down' : 'flat',
        percentPerMonth: Math.round(trendPct * 10) / 10,
      },
      type,
    },
  })
}
