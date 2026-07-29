import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, facilityId: userFacilityId, regionId: userRegionId } = session.user
  const { searchParams } = req.nextUrl

  const reportType  = searchParams.get('type') || 'category'
  const category    = searchParams.get('category') || ''
  const month       = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
  const yearFrom    = Number(searchParams.get('yearFrom')  || new Date().getFullYear())
  const yearTo      = Number(searchParams.get('yearTo')    || yearFrom)
  const monthFrom   = Number(searchParams.get('monthFrom') || 1)
  const monthTo     = Number(searchParams.get('monthTo')   || 12)
  const facilityId  = searchParams.get('facilityId') || undefined
  const regionId    = searchParams.get('regionId')   || undefined

  // Scope géographique
  const facilityWhere: any = { isActive: true }
  if (['FINANCIER', 'FACILITY_CHIEF', 'CAISSIER'].includes(role) ||
      (role === 'DATA_MANAGER' && userFacilityId)) {
    // FOSA-level roles, or DATA_MANAGER rattaché à une FOSA précise
    facilityWhere.id = userFacilityId
  } else if (['REGIONAL_DIRECTOR', 'CONTROLEUR_REGIONAL'].includes(role) ||
             (role === 'DATA_MANAGER' && userRegionId)) {
    // Rôles régionaux, ou DATA_MANAGER régional (sans facilityId)
    facilityWhere.regionId = userRegionId
  } else {
    if (facilityId) facilityWhere.id = facilityId
    else if (regionId) facilityWhere.regionId = regionId
  }

  // ── Rapport 1 : Par catégorie ──────────────────────────────────────────────
  if (reportType === 'category') {
    if (!category) return NextResponse.json({ success: false, error: 'Catégorie requise' }, { status: 400 })

    const indicators = await prisma.statIndicator.findMany({
      where: { category, isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    const facilities = await prisma.facility.findMany({
      where: facilityWhere,
      select: { id: true, name: true, code: true, type: true, region: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    const sheets = await prisma.statSheet.findMany({
      where: {
        facilityId: { in: facilities.map((f) => f.id) },
        status: { in: ['SUBMITTED', 'VALIDATED'] },
        OR: Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i).flatMap((y) => {
          const mFrom = y === yearFrom ? monthFrom : 1
          const mTo   = y === yearTo   ? monthTo   : 12
          return Array.from({ length: mTo - mFrom + 1 }, (_, j) => ({ year: y, month: mFrom + j }))
        }),
      },
      include: {
        values: {
          where: { indicatorId: { in: indicators.map((i) => i.id) } },
          include: { indicator: { select: { id: true, code: true } } },
        },
      },
    })

    const table = indicators.map((ind) => {
      const row: Record<string, any> = {
        id: ind.id, code: ind.code, label: ind.label,
        unit: ind.unit, isRequired: ind.isRequired,
      }
      for (const fac of facilities) {
        const facSheets = sheets.filter((s) => s.facilityId === fac.id)
        const vals = facSheets.flatMap((s) => s.values.filter((v) => v.indicatorId === ind.id && v.value !== null))
        row[fac.id] = vals.length > 0 ? vals.reduce((sum, v) => sum + (v.value ?? 0), 0) : null
      }
      return row
    })

    return NextResponse.json({
      success: true,
      data: { type: 'category', category, indicators, facilities, table },
    })
  }

  // ── Rapport 2 : Fiche consolidée FOSA ─────────────────────────────────────
  if (reportType === 'consolidated') {
    if (!facilityId) return NextResponse.json({ success: false, error: 'FOSA requise' }, { status: 400 })
    if (!month)      return NextResponse.json({ success: false, error: 'Mois requis' }, { status: 400 })

    // Utiliser facilityWhere pour valider que l'utilisateur a accès à cette FOSA
    const facility = await prisma.facility.findFirst({
      where: { ...facilityWhere, id: facilityId },
      select: { id: true, name: true, code: true, type: true, region: { select: { name: true } } },
    })
    if (!facility) return NextResponse.json({ success: false, error: 'FOSA introuvable ou accès non autorisé' }, { status: 404 })

    const sheet = await prisma.statSheet.findUnique({
      where: { facilityId_month_year: { facilityId, month, year: yearFrom } },
      include: {
        values: {
          include: { indicator: { select: { id: true, code: true, label: true, category: true, unit: true, sortOrder: true } } },
        },
        dataManager: { select: { name: true } },
      },
    })

    const categories = await prisma.statIndicator.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { category: 'asc' },
    })

    const allIndicators = await prisma.statIndicator.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    const valueMap: Record<string, number | null> = {}
    if (sheet) {
      for (const v of sheet.values) {
        valueMap[v.indicatorId] = v.value ?? null
      }
    }

    const byCategory = categories.map((cat) => ({
      category: cat.category,
      indicators: allIndicators
        .filter((i) => i.category === cat.category)
        .map((i) => ({ ...i, value: valueMap[i.id] ?? null })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        type: 'consolidated',
        facility,
        period: { month, year: yearFrom },
        sheet: sheet ? { reference: sheet.reference, status: sheet.status, completeness: sheet.completeness, dataManager: sheet.dataManager?.name } : null,
        byCategory,
      },
    })
  }

  // ── Rapport 3 : Comparaison inter-annuelle ─────────────────────────────────
  if (reportType === 'comparison') {
    if (!category) return NextResponse.json({ success: false, error: 'Catégorie requise' }, { status: 400 })

    const yearsParam = searchParams.get('years') || `${new Date().getFullYear() - 1},${new Date().getFullYear()}`
    const years = yearsParam.split(',').map(Number).filter((y) => y > 2000 && y < 2100).slice(0, 5)
    if (years.length < 1) return NextResponse.json({ success: false, error: 'Années invalides' }, { status: 400 })

    const indicators = await prisma.statIndicator.findMany({
      where: { category, isActive: true },
      orderBy: { sortOrder: 'asc' },
    })

    const facilities = await prisma.facility.findMany({
      where: facilityWhere,
      select: { id: true, name: true, code: true, type: true, region: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })

    // Fetch all sheets for all requested years within the month range
    const sheets = await prisma.statSheet.findMany({
      where: {
        facilityId: { in: facilities.map((f) => f.id) },
        status: { in: ['SUBMITTED', 'VALIDATED'] },
        OR: years.flatMap((y) =>
          Array.from({ length: monthTo - monthFrom + 1 }, (_, j) => ({ year: y, month: monthFrom + j }))
        ),
      },
      include: {
        values: {
          where: { indicatorId: { in: indicators.map((i) => i.id) } },
        },
      },
    })

    // Table: per indicator, per year total across all facilities and months
    const table = indicators.map((ind) => {
      const row: Record<string, any> = {
        id: ind.id, code: ind.code, label: ind.label,
        unit: ind.unit, isRequired: ind.isRequired,
      }
      for (const y of years) {
        const yearSheets = sheets.filter((s) => s.year === y)
        const vals = yearSheets.flatMap((s) => s.values.filter((v) => v.indicatorId === ind.id && v.value !== null))
        row[String(y)] = vals.length > 0 ? vals.reduce((sum, v) => sum + (v.value ?? 0), 0) : null
      }
      // Trend: % change between first and last year with data
      const withData = years.filter((y) => row[String(y)] !== null)
      if (withData.length >= 2) {
        const first = row[String(withData[0])] as number
        const last  = row[String(withData[withData.length - 1])] as number
        row.trend = first > 0 ? Math.round(((last - first) / first) * 100) : null
      } else {
        row.trend = null
      }
      return row
    })

    // Monthly: for each month in range, sum ALL indicator values per year (for line chart)
    const monthly = Array.from({ length: monthTo - monthFrom + 1 }, (_, i) => {
      const m = monthFrom + i
      const point: Record<string, any> = { month: m, label: MONTHS_FR[m - 1] }
      for (const y of years) {
        const monthSheets = sheets.filter((s) => s.year === y && s.month === m)
        const total = monthSheets.reduce((sum, s) => {
          return sum + s.values.reduce((vs, v) => vs + (v.value ?? 0), 0)
        }, 0)
        point[String(y)] = total || null
      }
      return point
    })

    // Facility comparison: per facility, per year total (for grouped bar chart)
    const byFacility = facilities.slice(0, 20).map((fac) => {
      const row: Record<string, any> = { id: fac.id, name: fac.name, code: fac.code }
      for (const y of years) {
        const facYearSheets = sheets.filter((s) => s.facilityId === fac.id && s.year === y)
        const total = facYearSheets.reduce((sum, s) => sum + s.values.reduce((vs, v) => vs + (v.value ?? 0), 0), 0)
        row[String(y)] = total || null
      }
      return row
    })

    return NextResponse.json({
      success: true,
      data: { type: 'comparison', category, years, indicators, facilities, table, monthly, byFacility },
    })
  }

  return NextResponse.json({ success: false, error: 'Type de rapport inconnu' }, { status: 400 })
}
