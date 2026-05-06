import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, regionId: userRegionId } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'DATA_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const facilityId = searchParams.get('facilityId')
  const regionId = searchParams.get('regionId') ?? (role === 'REGIONAL_DIRECTOR' ? userRegionId : null)

  const where: any = {
    status: { in: ['SUBMITTED', 'VALIDATED'] },
    periodStart: {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    },
  }
  if (facilityId) where.facilityId = facilityId
  else if (regionId) where.facility = { regionId }

  const declarations = await prisma.declaration.findMany({
    where,
    select: { declarationType: true, totalAmount: true, periodStart: true },
  })

  // Aggregate by month
  const byMonth: Record<number, { revenue: number; expense: number }> = {}
  for (let m = 1; m <= 12; m++) byMonth[m] = { revenue: 0, expense: 0 }

  for (const d of declarations) {
    const m = new Date(d.periodStart).getMonth() + 1
    if (d.declarationType === 'REVENUE') byMonth[m].revenue += Number(d.totalAmount)
    else byMonth[m].expense += Number(d.totalAmount)
  }

  const data = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const { revenue, expense } = byMonth[m]
    return {
      month: m,
      label: MONTH_LABELS[i],
      revenue,
      expense,
      net: revenue - expense,
    }
  })

  return NextResponse.json({ success: true, data, year })
}
