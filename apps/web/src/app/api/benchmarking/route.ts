import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, regionId: userRegionId } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'DATA_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const regionId = searchParams.get('regionId') ?? (role === 'REGIONAL_DIRECTOR' ? userRegionId : null)
  const type = (searchParams.get('type') ?? 'financial') as 'financial' | 'statistical'

  if (type === 'financial') {
    const facilityWhere: any = { isActive: true }
    if (regionId) facilityWhere.regionId = regionId

    const periodStart = month
      ? { gte: new Date(year, month - 1, 1), lte: new Date(year, month, 0, 23, 59, 59) }
      : { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) }

    const facilities = await prisma.facility.findMany({
      where: facilityWhere,
      select: {
        id: true, name: true, type: true,
        region: { select: { name: true } },
        declarations: {
          where: {
            status: { in: ['SUBMITTED', 'VALIDATED'] },
            periodStart,
          },
          select: { declarationType: true, totalAmount: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    const data = facilities.map((f) => {
      const revenue = f.declarations
        .filter((d) => d.declarationType === 'REVENUE')
        .reduce((s, d) => s + Number(d.totalAmount), 0)
      const expense = f.declarations
        .filter((d) => d.declarationType === 'EXPENSE')
        .reduce((s, d) => s + Number(d.totalAmount), 0)
      const validatedCount = f.declarations.filter((d) => d.status === 'VALIDATED').length
      const submittedCount = f.declarations.filter((d) => d.status === 'SUBMITTED').length

      return {
        id: f.id,
        name: f.name,
        type: f.type,
        region: (f as any).region?.name ?? '',
        totalRevenue: revenue,
        totalExpense: expense,
        netBalance: revenue - expense,
        declarationCount: f.declarations.length,
        validatedCount,
        submittedCount,
      }
    })

    // Compute ranking by revenue
    const ranked = [...data].sort((a, b) => b.totalRevenue - a.totalRevenue)
    const maxRev = ranked[0]?.totalRevenue || 1
    const result = data.map((d) => ({
      ...d,
      rank: ranked.findIndex((r) => r.id === d.id) + 1,
      revenueScore: Math.round((d.totalRevenue / maxRev) * 100),
    }))

    return NextResponse.json({ success: true, data: result, year, month })
  }

  // Statistical comparison (completeness & stat sheets)
  const facilityWhere: any = { isActive: true }
  if (regionId) facilityWhere.regionId = regionId

  const sheetWhere: any = { year }
  if (month) sheetWhere.month = month
  if (regionId) sheetWhere.facility = { regionId }

  const [facilities, sheets] = await Promise.all([
    prisma.facility.findMany({
      where: facilityWhere,
      select: { id: true, name: true, type: true, region: { select: { name: true } } },
      orderBy: { name: 'asc' },
    }),
    prisma.statSheet.findMany({
      where: sheetWhere,
      select: {
        facilityId: true, status: true, completeness: true, month: true,
      },
    }),
  ])

  const sheetsByFacility = new Map<string, typeof sheets>()
  for (const s of sheets) {
    const arr = sheetsByFacility.get(s.facilityId) ?? []
    arr.push(s)
    sheetsByFacility.set(s.facilityId, arr)
  }

  const data = facilities.map((f) => {
    const fSheets = sheetsByFacility.get(f.id) ?? []
    const avgCompleteness = fSheets.length > 0
      ? Math.round(fSheets.reduce((s, sh) => s + Number(sh.completeness ?? 0), 0) / fSheets.length)
      : 0
    const validatedSheets = fSheets.filter((s) => s.status === 'VALIDATED').length

    return {
      id: f.id,
      name: f.name,
      type: f.type,
      region: (f as any).region?.name ?? '',
      sheetCount: fSheets.length,
      validatedSheets,
      avgCompleteness,
      hasData: fSheets.length > 0,
    }
  })

  const ranked = [...data].sort((a, b) => b.avgCompleteness - a.avgCompleteness)
  const result = data.map((d) => ({
    ...d,
    rank: ranked.findIndex((r) => r.id === d.id) + 1,
  }))

  return NextResponse.json({ success: true, data: result, year, month })
}
