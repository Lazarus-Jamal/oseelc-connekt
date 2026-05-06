import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, facilityId, regionId } = session.user
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // ── FINANCIER ────────────────────────────────────────────────────────────────
  if (role === 'FINANCIER') {
    const baseWhere = { facilityId: facilityId!, periodStart: { gte: startOfMonth }, status: 'VALIDATED' as const }
    const [revenueAgg, expenseAgg, submitted, validated, rejected, recentDecls, recentExpenses] = await Promise.all([
      prisma.declaration.aggregate({ where: { ...baseWhere, declarationType: 'REVENUE' }, _sum: { totalAmount: true } }),
      prisma.declaration.aggregate({ where: { ...baseWhere, declarationType: 'EXPENSE' }, _sum: { totalAmount: true } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'SUBMITTED', declarationType: 'REVENUE' } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'VALIDATED', declarationType: 'REVENUE' } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'REJECTED', declarationType: 'REVENUE' } }),
      prisma.declaration.findMany({
        where: { facilityId: facilityId!, declarationType: 'REVENUE' },
        take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, periodStart: true, totalAmount: true, status: true },
      }),
      prisma.declaration.findMany({
        where: { facilityId: facilityId!, declarationType: 'EXPENSE' },
        take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, periodStart: true, totalAmount: true, status: true },
      }),
    ])
    const totalRevenue = Number(revenueAgg._sum?.totalAmount || 0)
    const totalExpense = Number(expenseAgg._sum?.totalAmount || 0)
    return NextResponse.json({ success: true, data: {
      totalRevenueMTD: totalRevenue, totalExpenseMTD: totalExpense,
      netBalance: totalRevenue - totalExpense,
      pendingDeclarations: submitted, validatedDeclarations: validated, rejectedDeclarations: rejected,
      recentDeclarations: recentDecls, recentExpenses,
    }})
  }

  // ── FACILITY_CHIEF ───────────────────────────────────────────────────────────
  if (role === 'FACILITY_CHIEF') {
    const baseWhere = { facilityId: facilityId!, periodStart: { gte: startOfMonth }, status: 'VALIDATED' as const }
    const [revenueAgg, expenseAgg, submitted, validated, rejected, recentDecls] = await Promise.all([
      prisma.declaration.aggregate({ where: { ...baseWhere, declarationType: 'REVENUE' }, _sum: { totalAmount: true } }),
      prisma.declaration.aggregate({ where: { ...baseWhere, declarationType: 'EXPENSE' }, _sum: { totalAmount: true } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'SUBMITTED' } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'VALIDATED' } }),
      prisma.declaration.count({ where: { facilityId: facilityId!, status: 'REJECTED' } }),
      prisma.declaration.findMany({
        where: { facilityId: facilityId! }, take: 5, orderBy: { createdAt: 'desc' },
        select: { id: true, reference: true, periodStart: true, totalAmount: true, status: true, declarationType: true },
      }),
    ])
    const totalRevenue = Number(revenueAgg._sum?.totalAmount || 0)
    const totalExpense = Number(expenseAgg._sum?.totalAmount || 0)
    return NextResponse.json({ success: true, data: {
      totalRevenueMTD: totalRevenue, totalExpenseMTD: totalExpense,
      netBalance: totalRevenue - totalExpense,
      pendingDeclarations: submitted, validatedDeclarations: validated, rejectedDeclarations: rejected,
      recentDeclarations: recentDecls,
    }})
  }

  // ── REGIONAL_DIRECTOR ────────────────────────────────────────────────────────
  if (role === 'REGIONAL_DIRECTOR') {
    const facilityWhere = { regionId: regionId! }
    const [facilities, revenueAgg, expenseAgg, pendingReview, facilitiesStatus, monthlyTrend] = await Promise.all([
      prisma.facility.count({ where: facilityWhere }),
      prisma.declaration.aggregate({ where: { facility: facilityWhere, periodStart: { gte: startOfMonth }, declarationType: 'REVENUE', status: 'VALIDATED' }, _sum: { totalAmount: true } }),
      prisma.declaration.aggregate({ where: { facility: facilityWhere, periodStart: { gte: startOfMonth }, declarationType: 'EXPENSE', status: 'VALIDATED' }, _sum: { totalAmount: true } }),
      prisma.declaration.count({ where: { facility: facilityWhere, status: 'SUBMITTED' } }),
      prisma.facility.findMany({
        where: facilityWhere,
        select: {
          id: true, name: true, type: true, isActive: true,
          declarations: {
            take: 1, orderBy: { createdAt: 'desc' },
            select: { reference: true, totalAmount: true, status: true, submittedAt: true, declarationType: true },
          },
          _count: { select: { declarations: { where: { status: 'SUBMITTED' } } } },
        },
      }),
      prisma.facility.findMany({
        where: facilityWhere,
        select: {
          id: true, name: true, type: true,
          declarations: {
            where: { periodStart: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) }, declarationType: 'REVENUE', status: 'VALIDATED' },
            select: { totalAmount: true, periodStart: true, status: true },
          },
        },
      }),
    ])
    const totalRevenue = Number(revenueAgg._sum?.totalAmount || 0)
    const totalExpense = Number(expenseAgg._sum?.totalAmount || 0)
    const facilitiesRevExp = await Promise.all(
      facilitiesStatus.map(async (f) => {
        const [rev, exp] = await Promise.all([
          prisma.declaration.aggregate({ where: { facilityId: f.id, periodStart: { gte: startOfMonth }, declarationType: 'REVENUE', status: 'VALIDATED' }, _sum: { totalAmount: true } }),
          prisma.declaration.aggregate({ where: { facilityId: f.id, periodStart: { gte: startOfMonth }, declarationType: 'EXPENSE', status: 'VALIDATED' }, _sum: { totalAmount: true } }),
        ])
        return { ...f, revenue: Number(rev._sum.totalAmount || 0), expense: Number(exp._sum.totalAmount || 0) }
      })
    )
    const totalDeclarations = await prisma.declaration.count({ where: { facility: facilityWhere, periodStart: { gte: startOfMonth }, status: { not: 'DRAFT' } } })
    const onTimeDeclarations = await prisma.declaration.count({ where: { facility: facilityWhere, periodStart: { gte: startOfMonth }, status: { in: ['SUBMITTED', 'REVIEWED', 'VALIDATED'] } } })
    return NextResponse.json({ success: true, data: {
      facilitiesCount: facilities,
      totalRegionalRevenue: totalRevenue, totalRegionalExpense: totalExpense,
      netBalance: totalRevenue - totalExpense,
      pendingReview,
      complianceRate: totalDeclarations > 0 ? Math.round((onTimeDeclarations / totalDeclarations) * 100) : 0,
      facilitiesStatus: facilitiesRevExp, monthlyTrend,
    }})
  }

  // ── DIRECTION / SUPER_ADMIN ──────────────────────────────────────────────────
  if (role === 'DIRECTION' || role === 'SUPER_ADMIN') {
    const { searchParams } = req.nextUrl
    const period    = searchParams.get('period') || 'monthly'
    const customFrom = searchParams.get('from')
    const customTo   = searchParams.get('to')

    // Calcul de la plage de dates selon la période
    let startDate: Date
    let endDate: Date | undefined

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === 'annual') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else if (period === 'custom' && customFrom) {
      startDate = new Date(customFrom)
      endDate   = customTo ? new Date(new Date(customTo).setHours(23, 59, 59, 999)) : undefined
    } else {
      // monthly (défaut)
      startDate = startOfMonth
    }

    const periodFilter: any = endDate
      ? { gte: startDate, lte: endDate }
      : { gte: startDate }

    // Inclure SUBMITTED + VALIDATED pour une vue complète
    const statusFilter = { in: ['SUBMITTED', 'VALIDATED'] as string[] } as any

    const [totalFacilities, revenueAgg, expenseAgg, pendingValidations, regionsOverview] = await Promise.all([
      prisma.facility.count({ where: { isActive: true } }),
      prisma.declaration.aggregate({
        where: { periodStart: periodFilter, declarationType: 'REVENUE', status: statusFilter },
        _sum: { totalAmount: true },
      }),
      prisma.declaration.aggregate({
        where: { periodStart: periodFilter, declarationType: 'EXPENSE', status: statusFilter },
        _sum: { totalAmount: true },
      }),
      prisma.declaration.count({ where: { status: { in: ['SUBMITTED', 'REVIEWED'] } } }),
      prisma.region.findMany({
        select: {
          id: true, name: true,
          _count: { select: { facilities: true } },
          facilities: {
            select: {
              id: true,
              declarations: {
                where: { periodStart: periodFilter, status: statusFilter },
                select: { totalAmount: true, status: true, declarationType: true },
              },
            },
          },
        },
      }) as Promise<any[]>,
    ])

    const totalRevenue = Number(revenueAgg._sum?.totalAmount || 0)
    const totalExpense = Number(expenseAgg._sum?.totalAmount || 0)

    const regionsData = regionsOverview.map((r) => {
      const allDecls = r.facilities.flatMap((f: any) => f.declarations)
      const revenues = allDecls.filter((d: any) => d.declarationType === 'REVENUE' && ['SUBMITTED', 'VALIDATED'].includes(d.status))
      const expenses = allDecls.filter((d: any) => d.declarationType === 'EXPENSE' && ['SUBMITTED', 'VALIDATED'].includes(d.status))
      const totalRev = revenues.reduce((s: number, d: any) => s + Number(d.totalAmount), 0)
      const totalExp = expenses.reduce((s: number, d: any) => s + Number(d.totalAmount), 0)
      const submitted = allDecls.filter((d: any) => ['SUBMITTED', 'REVIEWED', 'VALIDATED'].includes(d.status)).length
      return {
        regionId: r.id, regionName: r.name,
        totalRevenue: totalRev, totalExpense: totalExp,
        netBalance: totalRev - totalExp,
        facilitiesCount: r._count.facilities,
        declarationRate: allDecls.length > 0 ? Math.round((submitted / allDecls.length) * 100) : 0,
      }
    })

    const topFacilities: any[] = await prisma.facility.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, type: true,
        region: { select: { name: true } },
        declarations: {
          where: { periodStart: periodFilter, declarationType: 'REVENUE', status: statusFilter },
          select: { totalAmount: true },
        },
      },
    })
    const facilitiesPerf = topFacilities
      .map((f) => ({
        id: f.id, name: f.name, type: f.type, region: f.region?.name ?? '',
        totalRevenue: f.declarations.reduce((s: number, d: any) => s + Number(d.totalAmount), 0),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    return NextResponse.json({ success: true, data: {
      totalFacilities, totalNationalRevenue: totalRevenue, totalNationalExpense: totalExpense,
      netBalance: totalRevenue - totalExpense,
      pendingValidations, regionsOverview: regionsData, facilitiesPerf,
    }})
  }

  // ── DATA_MANAGER / DATA_ADMIN ─────────────────────────────────────────────────
  if (role === 'DATA_MANAGER' || role === 'DATA_ADMIN') {
    const [totalFacilities, pendingValidations, pendingStats] = await Promise.all([
      prisma.facility.count({ where: { isActive: true } }),
      prisma.declaration.count({ where: { status: { in: ['SUBMITTED', 'REVIEWED'] } } }),
      prisma.statSheet.count({ where: { status: 'SUBMITTED' } }),
    ])
    return NextResponse.json({ success: true, data: { totalFacilities, pendingValidations, pendingStats } })
  }

  return NextResponse.json({ success: true, data: {} })
}
