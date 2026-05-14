import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const upsertSchema = z.object({
  facilityId: z.string(),
  declarationType: z.enum(['REVENUE', 'EXPENSE']).default('EXPENSE'),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12).nullable().optional(),
  category: z.string().min(1),
  planned: z.number().nonnegative(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const facilityId = searchParams.get('facilityId')
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : new Date().getFullYear()
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : null
  const declarationType = searchParams.get('declarationType') as 'REVENUE' | 'EXPENSE' | null

  const { role, facilityId: userFacilityId } = session.user
  const viewRoles = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'CONTROLEUR', 'CONTROLEUR_REGIONAL', 'FINANCIER', 'FACILITY_CHIEF']
  if (!viewRoles.includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
  }

  const where: any = { year }
  if (declarationType) where.declarationType = declarationType
  if (month !== null) where.month = month
  if (facilityId) {
    where.facilityId = facilityId
  } else if (role === 'FINANCIER' || role === 'FACILITY_CHIEF') {
    where.facilityId = userFacilityId
  }

  const budgets = await prisma.budget.findMany({
    where,
    include: { facility: { select: { id: true, name: true, type: true } } },
    orderBy: [{ category: 'asc' }],
  })

  // Also fetch actuals for comparison
  const actualWhere: any = {
    periodStart: { gte: new Date(year, month ? month - 1 : 0, 1) },
    status: 'VALIDATED',
  }
  if (declarationType) actualWhere.declarationType = declarationType
  if (where.facilityId) actualWhere.facilityId = where.facilityId

  const actuals = await prisma.declarationItem.findMany({
    where: {
      declaration: actualWhere,
    },
    select: { category: true, amount: true, declaration: { select: { facilityId: true, declarationType: true } } },
  })

  const actualsByCategory: Record<string, number> = {}
  for (const item of actuals) {
    actualsByCategory[item.category] = (actualsByCategory[item.category] || 0) + Number(item.amount)
  }

  const enriched = budgets.map((b) => ({
    ...b,
    planned: Number(b.planned),
    actual: actualsByCategory[b.category] || 0,
    variance: (actualsByCategory[b.category] || 0) - Number(b.planned),
    rate: Number(b.planned) > 0 ? Math.round(((actualsByCategory[b.category] || 0) / Number(b.planned)) * 100) : null,
  }))

  return NextResponse.json({ success: true, data: enriched })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { facilityId, declarationType, year, month, category, planned, notes } = parsed.data

  const budget = await prisma.budget.upsert({
    where: { facilityId_declarationType_year_month_category: { facilityId, declarationType, year, month: (month ?? null) as number, category } },
    create: { facilityId, declarationType, year, month: month ?? null, category, planned, notes },
    update: { planned, notes },
  })

  return NextResponse.json({ success: true, data: budget }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 })

  await prisma.budget.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
