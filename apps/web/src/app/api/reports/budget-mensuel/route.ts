import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, facilityId: userFacilityId, regionId: userRegionId } = session.user
  const { searchParams } = req.nextUrl

  const month      = Number(searchParams.get('month') || new Date().getMonth() + 1)
  const year       = Number(searchParams.get('year')  || new Date().getFullYear())
  const facilityId = searchParams.get('facilityId') || null
  const regionId   = searchParams.get('regionId')   || null

  // Scope géographique selon le rôle
  let facilityWhere: any = { isActive: true }
  if (role === 'FINANCIER' || role === 'FACILITY_CHIEF' || role === 'CAISSIER') {
    facilityWhere.id = userFacilityId
  } else if (role === 'REGIONAL_DIRECTOR' || role === 'CONTROLEUR_REGIONAL') {
    facilityWhere.regionId = userRegionId
  } else if (facilityId) {
    facilityWhere.id = facilityId
  } else if (regionId) {
    facilityWhere.regionId = regionId
  }

  // Plage de dates pour le mois demandé
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd   = new Date(year, month, 0, 23, 59, 59, 999)

  // Récupérer toutes les FOSA concernées
  const facilities = await prisma.facility.findMany({
    where: facilityWhere,
    select: { id: true, name: true, code: true, type: true, region: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })

  const reports = await Promise.all(facilities.map(async (facility) => {
    // Déclarations validées du mois pour cette FOSA
    const declarations = await prisma.declaration.findMany({
      where: {
        facilityId: facility.id,
        status: 'VALIDATED',
        periodStart: { gte: periodStart, lte: periodEnd },
      },
      include: { items: true },
    })

    const revDecls = declarations.filter((d) => d.declarationType === 'REVENUE')
    const expDecls = declarations.filter((d) => d.declarationType === 'EXPENSE')

    // Agréger réalisation par catégorie
    const aggregateByCategory = (decls: typeof declarations) => {
      const map: Record<string, number> = {}
      for (const decl of decls) {
        for (const item of decl.items) {
          map[item.category] = (map[item.category] || 0) + Number(item.amount)
        }
      }
      return map
    }

    const revRealisation = aggregateByCategory(revDecls)
    const expRealisation = aggregateByCategory(expDecls)

    // Budgets du mois pour cette FOSA
    const budgets = await prisma.budget.findMany({
      where: { facilityId: facility.id, year, month },
    })

    const revBudget: Record<string, number> = {}
    const expBudget: Record<string, number> = {}
    for (const b of budgets) {
      if (b.declarationType === 'REVENUE') revBudget[b.category] = Number(b.planned)
      else expBudget[b.category] = Number(b.planned)
    }

    // Fusionner toutes les catégories connues
    const buildLines = (budget: Record<string, number>, realisation: Record<string, number>) => {
      const categories = new Set([...Object.keys(budget), ...Object.keys(realisation)])
      return Array.from(categories).sort().map((cat) => {
        const bud = budget[cat] || 0
        const real = realisation[cat] || 0
        const pct  = bud > 0 ? Math.round((real / bud) * 100) : null
        return { category: cat, budget: bud, realisation: real, pct }
      })
    }

    const revLines = buildLines(revBudget, revRealisation)
    const expLines = buildLines(expBudget, expRealisation)

    const totalRevBudget = revLines.reduce((s, l) => s + l.budget, 0)
    const totalRevReal   = revLines.reduce((s, l) => s + l.realisation, 0)
    const totalExpBudget = expLines.reduce((s, l) => s + l.budget, 0)
    const totalExpReal   = expLines.reduce((s, l) => s + l.realisation, 0)

    return {
      facility: { id: facility.id, name: facility.name, code: facility.code, type: facility.type, region: facility.region.name },
      period: { month, year },
      revenue: {
        lines: revLines,
        total: {
          budget: totalRevBudget,
          realisation: totalRevReal,
          pct: totalRevBudget > 0 ? Math.round((totalRevReal / totalRevBudget) * 100) : null,
        },
      },
      expense: {
        lines: expLines,
        total: {
          budget: totalExpBudget,
          realisation: totalExpReal,
          pct: totalExpBudget > 0 ? Math.round((totalExpReal / totalExpBudget) * 100) : null,
        },
      },
      tresorerieFinale: totalRevReal - totalExpReal,
    }
  }))

  return NextResponse.json({ success: true, data: reports })
}
