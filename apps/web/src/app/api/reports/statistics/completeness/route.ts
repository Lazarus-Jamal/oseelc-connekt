export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ALLOWED = ['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'CONTROLEUR', 'CONTROLEUR_REGIONAL']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, regionId: userRegionId } = session.user

  if (!ALLOWED.includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès réservé aux administrateurs' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const month    = Number(searchParams.get('month') || new Date().getMonth() + 1)
  const year     = Number(searchParams.get('year')  || new Date().getFullYear())
  const regionId = searchParams.get('regionId') || undefined

  const facilityWhere: any = { isActive: true }
  if (role === 'REGIONAL_DIRECTOR' || role === 'CONTROLEUR_REGIONAL') {
    facilityWhere.regionId = userRegionId
  } else if (regionId) {
    facilityWhere.regionId = regionId
  }

  const [facilities, sheets, regions] = await Promise.all([
    prisma.facility.findMany({
      where: facilityWhere,
      select: {
        id: true, name: true, code: true, type: true,
        region: { select: { id: true, name: true } },
      },
      orderBy: [{ region: { name: 'asc' } }, { name: 'asc' }],
    }),
    prisma.statSheet.findMany({
      where: {
        month,
        year,
        ...(facilityWhere.regionId ? { facility: { regionId: facilityWhere.regionId } } : {}),
      },
      select: {
        id: true, facilityId: true, status: true, completeness: true,
        submittedAt: true, validatedAt: true,
        dataManager: { select: { name: true } },
      },
    }),
    prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ])

  const sheetMap = new Map(sheets.map((s) => [s.facilityId, s]))

  const rows = facilities.map((fac) => {
    const sheet = sheetMap.get(fac.id)
    return {
      facility: { id: fac.id, name: fac.name, code: fac.code, type: fac.type, region: fac.region },
      submitted:    !!sheet,
      status:       sheet?.status || null,
      completeness: sheet?.completeness ?? null,
      submittedAt:  sheet?.submittedAt  || null,
      validatedAt:  sheet?.validatedAt  || null,
      dataManager:  sheet?.dataManager?.name || null,
    }
  })

  const summary = {
    total:     facilities.length,
    submitted: rows.filter((r) => r.submitted).length,
    validated: rows.filter((r) => r.status === 'VALIDATED').length,
    missing:   rows.filter((r) => !r.submitted).length,
    avgCompleteness: rows.filter((r) => r.completeness !== null).length > 0
      ? Math.round(rows.filter((r) => r.completeness !== null).reduce((s, r) => s + (r.completeness ?? 0), 0) / rows.filter((r) => r.completeness !== null).length)
      : 0,
  }

  return NextResponse.json({ success: true, data: { period: { month, year }, summary, rows, regions } })
}
