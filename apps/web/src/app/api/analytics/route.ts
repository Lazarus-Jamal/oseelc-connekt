import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ALLOWED = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'DATA_MANAGER']

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
    if (!ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const view      = searchParams.get('view') || 'overview'
    const year      = searchParams.get('year')  ? Number(searchParams.get('year'))  : new Date().getFullYear()
    const month     = searchParams.get('month') ? Number(searchParams.get('month')) : null
    const regionId  = searchParams.get('regionId')  || null
    const facilityId = searchParams.get('facilityId') || null

    // ── Scope restriction for REGIONAL_DIRECTOR ───────────────────────────
    const scopeRegionId = session.user.role === 'REGIONAL_DIRECTOR'
      ? (session.user as any).regionId
      : regionId

    // ── OVERVIEW ─────────────────────────────────────────────────────────
    if (view === 'overview') {
      const [regions, facilities, allSheets] = await Promise.all([
        prisma.region.findMany({ include: { facilities: { where: { isActive: true } } } }),
        prisma.facility.findMany({ where: { isActive: true } }),
        prisma.statSheet.findMany({
          where: {
            year,
            ...(month ? { month } : {}),
            status: { in: ['SUBMITTED', 'VALIDATED'] },
          },
          include: {
            facility: { select: { id: true, name: true, regionId: true } },
            values: { include: { indicator: { select: { code: true, category: true } } } },
          },
        }),
      ])

      const totalFacilities = facilities.length
      const reportingFacilityIds = new Set(allSheets.map((s) => s.facilityId))
      const coverageRate = totalFacilities > 0 ? Math.round((reportingFacilityIds.size / totalFacilities) * 100) : 0

      // Aggregate by category
      const categoryTotals: Record<string, number> = {}
      for (const sheet of allSheets) {
        for (const val of sheet.values) {
          if (val.value !== null) {
            const cat = val.indicator.category
            categoryTotals[cat] = (categoryTotals[cat] || 0) + val.value
          }
        }
      }

      // Top diseases from Maladies notifiables
      const diseaseTotals: Record<string, number> = {}
      for (const sheet of allSheets) {
        for (const val of sheet.values) {
          if (val.value !== null && val.indicator.category === 'Maladies notifiables') {
            const disease = val.indicator.code.replace(/^MAL_/, '').replace(/_ENF$|_ADO$|_ADU$|_AGE$/, '')
            diseaseTotals[disease] = (diseaseTotals[disease] || 0) + val.value
          }
        }
      }
      const topDiseases = Object.entries(diseaseTotals)
        .map(([code, total]) => ({ code, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)

      // Coverage by region
      const regionStats = regions.map((r) => {
        const facilityIds = r.facilities.map((f) => f.id)
        const reporting = allSheets.filter((s) => facilityIds.includes(s.facilityId)).length
        return {
          id: r.id, name: r.name, code: r.code,
          total: facilityIds.length,
          reporting,
          coverage: facilityIds.length > 0 ? Math.round((reporting / facilityIds.length) * 100) : 0,
        }
      })

      // Monthly trend for consultations (last 12 months)
      const monthlyTrends = await prisma.statSheet.groupBy({
        by: ['year', 'month'],
        where: {
          status: { in: ['SUBMITTED', 'VALIDATED'] },
          year: { gte: year - 1 },
        },
        _count: { id: true },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      })

      return NextResponse.json({
        success: true,
        data: {
          totalFacilities, reportingFacilities: reportingFacilityIds.size,
          coverageRate, totalSheets: allSheets.length,
          categoryTotals, topDiseases, regionStats, monthlyTrends,
        },
      })
    }

    // ── REGION ───────────────────────────────────────────────────────────
    if (view === 'region') {
      if (!scopeRegionId) return NextResponse.json({ success: false, error: 'regionId requis' }, { status: 400 })

      const region = await prisma.region.findUnique({
        where: { id: scopeRegionId },
        include: { facilities: { where: { isActive: true } } },
      })
      if (!region) return NextResponse.json({ success: false, error: 'Région introuvable' }, { status: 404 })

      const facilityIds = region.facilities.map((f) => f.id)
      const sheets = await prisma.statSheet.findMany({
        where: {
          facilityId: { in: facilityIds },
          year,
          ...(month ? { month } : {}),
          status: { in: ['SUBMITTED', 'VALIDATED'] },
        },
        include: {
          facility: { select: { id: true, name: true, code: true, type: true } },
          values: { include: { indicator: { select: { id: true, code: true, label: true, category: true, unit: true } } } },
        },
      })

      // Aggregate indicator values across all facilities in region
      const indicatorAgg: Record<string, { label: string; category: string; unit: string | null; total: number; count: number }> = {}
      for (const sheet of sheets) {
        for (const val of sheet.values) {
          if (val.value !== null) {
            const k = val.indicator.code
            if (!indicatorAgg[k]) {
              indicatorAgg[k] = { label: val.indicator.label, category: val.indicator.category, unit: val.indicator.unit, total: 0, count: 0 }
            }
            indicatorAgg[k].total += val.value
            indicatorAgg[k].count++
          }
        }
      }

      // Per-facility summary
      const facilitySummary = region.facilities.map((f) => {
        const sheet = sheets.find((s) => s.facilityId === f.id)
        const totalValues = sheet ? sheet.values.filter((v) => v.value !== null).length : 0
        return {
          id: f.id, name: f.name, code: f.code, type: f.type,
          hasSheet: !!sheet, completeness: sheet?.completeness ?? 0, totalValues,
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          region: { id: region.id, name: region.name },
          totalFacilities: facilityIds.length,
          reportingFacilities: sheets.length,
          indicatorAgg, facilitySummary,
        },
      })
    }

    // ── FACILITY ─────────────────────────────────────────────────────────
    if (view === 'facility') {
      if (!facilityId) return NextResponse.json({ success: false, error: 'facilityId requis' }, { status: 400 })

      const facility = await prisma.facility.findUnique({
        where: { id: facilityId },
        include: { region: { select: { id: true, name: true } } },
      })
      if (!facility) return NextResponse.json({ success: false, error: 'Centre introuvable' }, { status: 404 })

      // All sheets for this facility (last 2 years)
      const sheets = await prisma.statSheet.findMany({
        where: {
          facilityId,
          year: { gte: year - 1 },
          status: { in: ['SUBMITTED', 'VALIDATED'] },
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
        include: {
          values: { include: { indicator: { select: { id: true, code: true, label: true, category: true, unit: true } } } },
        },
      })

      // Build time series per indicator for trend charts
      const timeSeries: Record<string, Array<{ year: number; month: number; value: number }>> = {}
      for (const sheet of sheets) {
        for (const val of sheet.values) {
          if (val.value !== null) {
            if (!timeSeries[val.indicator.code]) timeSeries[val.indicator.code] = []
            timeSeries[val.indicator.code].push({ year: sheet.year, month: sheet.month, value: val.value })
          }
        }
      }

      // Current period sheet
      const currentSheet = month
        ? sheets.find((s) => s.year === year && s.month === month)
        : sheets.filter((s) => s.year === year).sort((a, b) => b.month - a.month)[0]

      return NextResponse.json({
        success: true,
        data: { facility: { id: facility.id, name: facility.name, region: facility.region }, sheets: sheets.map((s) => ({ id: s.id, year: s.year, month: s.month, completeness: s.completeness, status: s.status })), currentSheet, timeSeries },
      })
    }

    // ── INFERENCES ────────────────────────────────────────────────────────
    if (view === 'inferences') {
      const sheetWhere: any = {
        year,
        ...(month ? { month } : {}),
        status: { in: ['SUBMITTED', 'VALIDATED'] },
      }
      if (scopeRegionId) sheetWhere.facility = { regionId: scopeRegionId }

      const [facilities, sheets] = await Promise.all([
        prisma.facility.findMany({ where: { isActive: true, ...(scopeRegionId ? { regionId: scopeRegionId } : {}) } }),
        prisma.statSheet.findMany({
          where: sheetWhere,
          include: {
            facility: { select: { id: true, name: true, regionId: true } },
            values: { include: { indicator: { select: { code: true, label: true, category: true } } } },
          },
        }),
      ])

      const reportingIds = new Set(sheets.map((s) => s.facilityId))
      const notReporting = facilities.filter((f) => !reportingIds.has(f.id)).map((f) => f.name)
      const lowCompleteness = sheets.filter((s) => (s.completeness ?? 0) < 50).map((s) => ({ name: s.facility.name, completeness: Math.round(s.completeness ?? 0) }))

      // Disease totals for inference
      const diseaseTotals: Record<string, number> = {}
      let totalConsultations = 0
      let totalDeaths = 0
      let totalBirths = 0
      let totalCesareans = 0
      let totalPEV = 0

      for (const sheet of sheets) {
        for (const val of sheet.values) {
          if (val.value === null) continue
          const code = val.indicator.code
          if (val.indicator.category === 'Maladies notifiables') {
            const disease = code.replace(/^MAL_/, '').replace(/_ENF$|_ADO$|_ADU$|_AGE$/, '')
            diseaseTotals[disease] = (diseaseTotals[disease] || 0) + val.value
          }
          if (code.startsWith('CONS_')) totalConsultations += val.value
          if (code.startsWith('HOSP_DECES_')) totalDeaths += val.value
          if (code === 'PGM_ACCOU') totalBirths += val.value
          if (code === 'PGM_CESAR') totalCesareans += val.value
          if (code === 'PGM_PEV') totalPEV += val.value
        }
      }

      const topDiseases = Object.entries(diseaseTotals)
        .map(([code, total]) => ({ code, total, pct: totalConsultations > 0 ? Math.round((total / totalConsultations) * 100) : 0 }))
        .sort((a, b) => b.total - a.total).slice(0, 5)

      const cesareanRate = totalBirths > 0 ? Math.round((totalCesareans / totalBirths) * 100) : 0
      const hospitalMortalityRate = totalConsultations > 0 ? Math.round((totalDeaths / totalConsultations) * 1000) / 10 : 0

      return NextResponse.json({
        success: true,
        data: {
          coverage: { total: facilities.length, reporting: reportingIds.size, rate: facilities.length > 0 ? Math.round((reportingIds.size / facilities.length) * 100) : 0 },
          alerts: { notReporting: notReporting.slice(0, 10), lowCompleteness: lowCompleteness.slice(0, 10) },
          topDiseases, totalConsultations, totalDeaths, totalBirths, totalCesareans,
          cesareanRate, hospitalMortalityRate, totalPEV,
        },
      })
    }

    // ── INDICATOR EXPLORER ────────────────────────────────────────────────
    if (view === 'indicator') {
      const code = searchParams.get('code')
      if (!code) return NextResponse.json({ success: false, error: 'code requis' }, { status: 400 })

      const indicator = await prisma.statIndicator.findUnique({ where: { code } })
      if (!indicator) return NextResponse.json({ success: false, error: 'Indicateur introuvable' }, { status: 404 })

      const regions = await prisma.region.findMany({ orderBy: { name: 'asc' } })

      const sheetWhere: any = { year, ...(month ? { month } : {}), status: { in: ['SUBMITTED', 'VALIDATED'] } }
      if (scopeRegionId) sheetWhere.facility = { regionId: scopeRegionId }
      const prevSheetWhere: any = { year: year - 1, ...(month ? { month } : {}), status: { in: ['SUBMITTED', 'VALIDATED'] } }
      if (scopeRegionId) prevSheetWhere.facility = { regionId: scopeRegionId }

      const [currentValues, prevValues] = await Promise.all([
        prisma.statValue.findMany({
          where: { indicator: { code }, statSheet: sheetWhere },
          include: { statSheet: { include: { facility: { select: { regionId: true } } } } },
        }),
        prisma.statValue.findMany({
          where: { indicator: { code }, statSheet: prevSheetWhere },
          include: { statSheet: { include: { facility: { select: { regionId: true } } } } },
        }),
      ])

      const byRegion = regions
        .filter((r) => !scopeRegionId || r.id === scopeRegionId)
        .map((r) => {
          const curr = currentValues.filter((v) => v.statSheet.facility.regionId === r.id)
          const prev = prevValues.filter((v) => v.statSheet.facility.regionId === r.id)
          const total = Math.round(curr.reduce((s, v) => s + (v.value ?? 0), 0))
          const prevTotal = Math.round(prev.reduce((s, v) => s + (v.value ?? 0), 0))
          const evolution = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null
          return { regionId: r.id, regionName: r.name, total, prevTotal, evolution, count: curr.length }
        })

      const trendValues = await prisma.statValue.findMany({
        where: {
          indicator: { code },
          statSheet: {
            year: { gte: year - 1 }, status: { in: ['SUBMITTED', 'VALIDATED'] },
            ...(scopeRegionId ? { facility: { regionId: scopeRegionId } } : {}),
          },
        },
        include: { statSheet: { select: { year: true, month: true } } },
      })
      const trendMap: Record<string, number> = {}
      for (const v of trendValues) {
        const key = `${v.statSheet.year}-${String(v.statSheet.month).padStart(2, '0')}`
        trendMap[key] = (trendMap[key] || 0) + (v.value ?? 0)
      }
      const nationalTrend = Object.entries(trendMap)
        .map(([k, total]) => { const [y, m] = k.split('-').map(Number); return { year: y, month: m, total: Math.round(total) } })
        .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)

      return NextResponse.json({ success: true, data: { indicator, byRegion, nationalTrend } })
    }

    // ── PYRAMID ───────────────────────────────────────────────────────────
    if (view === 'pyramid') {
      const sheetWhere: any = { year, ...(month ? { month } : {}), status: { in: ['SUBMITTED', 'VALIDATED'] } }
      if (scopeRegionId) sheetWhere.facility = { regionId: scopeRegionId }

      const values = await prisma.statValue.findMany({
        where: {
          statSheet: sheetWhere,
          indicator: {
            category: { in: ['Consultations', 'Hospitalisations'] },
            OR: [{ code: { endsWith: '_M' } }, { code: { endsWith: '_F' } }],
          },
        },
        include: { indicator: { select: { code: true, category: true } } },
      })

      const AGE_GROUPS = ['ENF', 'ADO', 'ADU', 'AGE']
      const AGE_LABELS: Record<string, string> = { ENF: 'Enfants (0-14)', ADO: 'Adolescents (15-19)', ADU: 'Adultes (20-59)', AGE: 'Âgés (60+)' }
      const sum = (cat: string, grp: string, sex: string) =>
        Math.round(values.filter((v) => v.indicator.category === cat && v.indicator.code.includes(`_${grp}_`) && v.indicator.code.endsWith(`_${sex}`)).reduce((s, v) => s + (v.value ?? 0), 0))

      const consultations   = AGE_GROUPS.map((g) => ({ group: AGE_LABELS[g], M: sum('Consultations',   g, 'M'), F: sum('Consultations',   g, 'F') }))
      const hospitalizations = AGE_GROUPS.map((g) => ({ group: AGE_LABELS[g], M: sum('Hospitalisations', g, 'M'), F: sum('Hospitalisations', g, 'F') }))

      return NextResponse.json({ success: true, data: { consultations, hospitalizations } })
    }

    return NextResponse.json({ success: false, error: 'Vue inconnue' }, { status: 400 })
  } catch (e: any) {
    console.error('[GET /api/analytics]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
