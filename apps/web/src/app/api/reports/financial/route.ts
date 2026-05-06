import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const facilityId = searchParams.get('facilityId')
  const regionId = searchParams.get('regionId')
  const type = searchParams.get('type') // REVENUE | EXPENSE | null = both

  const { role, facilityId: userFacilityId, regionId: userRegionId } = session.user

  const baseWhere: any = { status: 'VALIDATED' }
  if (role === 'FINANCIER' || role === 'FACILITY_CHIEF') baseWhere.facilityId = userFacilityId
  else if (role === 'REGIONAL_DIRECTOR') baseWhere.facility = { regionId: userRegionId }
  if (facilityId) baseWhere.facilityId = facilityId
  if (regionId) baseWhere.facility = { regionId }
  if (from || to) {
    baseWhere.periodStart = {}
    if (from) baseWhere.periodStart.gte = new Date(from)
    if (to) baseWhere.periodStart.lte = new Date(to)
  }

  const revenueWhere = { ...baseWhere, declarationType: 'REVENUE' }
  const expenseWhere = { ...baseWhere, declarationType: 'EXPENSE' }

  const [revenues, expenses] = await Promise.all([
    type !== 'EXPENSE' ? prisma.declaration.findMany({
      where: revenueWhere,
      include: {
        items: true,
        facility: { select: { id: true, name: true, code: true, type: true, region: { select: { id: true, name: true } } } },
      },
      orderBy: { periodStart: 'asc' },
    }) : Promise.resolve([]),
    type !== 'REVENUE' ? prisma.declaration.findMany({
      where: expenseWhere,
      include: {
        items: true,
        facility: { select: { id: true, name: true, code: true, type: true, region: { select: { id: true, name: true } } } },
      },
      orderBy: { periodStart: 'asc' },
    }) : Promise.resolve([]),
  ])

  const aggregate = (decls: any[]) => {
    const byMonth: Record<string, { period: string; label: string; total: number; count: number }> = {}
    const byCategory: Record<string, number> = {}
    const byFacility: Record<string, { facilityId: string; name: string; type: string; total: number; count: number }> = {}

    for (const decl of decls) {
      const month = decl.periodStart.getMonth()
      const year = decl.periodStart.getFullYear()
      const key = `${year}-${String(month + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { period: key, label: `${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][month]} ${year}`, total: 0, count: 0 }
      byMonth[key].total += Number(decl.totalAmount)
      byMonth[key].count++

      for (const item of decl.items) {
        byCategory[item.category] = (byCategory[item.category] || 0) + Number(item.amount)
      }

      const fk = decl.facilityId
      if (!byFacility[fk]) byFacility[fk] = { facilityId: fk, name: decl.facility.name, type: decl.facility.type, total: 0, count: 0 }
      byFacility[fk].total += Number(decl.totalAmount)
      byFacility[fk].count++
    }

    return {
      total: decls.reduce((s, d) => s + Number(d.totalAmount), 0),
      count: decls.length,
      byMonth: Object.values(byMonth).sort((a, b) => a.period.localeCompare(b.period)),
      byCategory: Object.entries(byCategory).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total),
      byFacility: Object.values(byFacility).sort((a, b) => b.total - a.total),
    }
  }

  const revenueData = aggregate(revenues)
  const expenseData = aggregate(expenses)

  // Fusion par mois pour le graphique comparatif
  const allMonths = new Set([
    ...revenueData.byMonth.map((m) => m.period),
    ...expenseData.byMonth.map((m) => m.period),
  ])
  const comparison = Array.from(allMonths).sort().map((period) => {
    const r = revenueData.byMonth.find((m) => m.period === period)
    const e = expenseData.byMonth.find((m) => m.period === period)
    const label = r?.label || e?.label || period
    return { period, label, revenue: r?.total || 0, expense: e?.total || 0, net: (r?.total || 0) - (e?.total || 0) }
  })

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        totalRevenue: revenueData.total,
        totalExpense: expenseData.total,
        netBalance: revenueData.total - expenseData.total,
        revenueCount: revenueData.count,
        expenseCount: expenseData.count,
      },
      revenue: revenueData,
      expense: expenseData,
      comparison,
    },
  })
}
