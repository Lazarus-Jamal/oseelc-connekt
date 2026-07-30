import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateReference } from '@care-connekt/shared'
import { DeclarationStatus, Prisma } from '@care-connekt/db'

const creditSchema = z.object({
  debtor: z.string().min(1),
  amount: z.number().nonnegative(),
})

const createSchema = z.object({
  facilityId: z.string(),
  declarationType: z.enum(['REVENUE', 'EXPENSE']).default('REVENUE'),
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      label: z.string().min(1),
      category: z.string().min(1),
      amount: z.number().nonnegative(),
      quantity: z.number().int().optional(),
      unitPrice: z.number().nonnegative().optional(),
      note: z.string().optional(),
    })
  ).min(1),
  credits: z.array(creditSchema).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') || 1)
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
  const status = searchParams.get('status') as DeclarationStatus | null
  const declarationType = searchParams.get('declarationType') as 'REVENUE' | 'EXPENSE' | null
  const facilityId = searchParams.get('facilityId')
  const regionId = searchParams.get('regionId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const { role, id: userId, facilityId: userFacilityId, regionId: userRegionId } = session.user

  const where: Prisma.DeclarationWhereInput = {}

  // Scope géographique selon le rôle — non contournable par les params URL
  if (['FINANCIER', 'FACILITY_CHIEF', 'CAISSIER'].includes(role)) {
    where.facilityId = userFacilityId || undefined
    // facilityId/regionId URL params ignorés : scope verrouillé sur leur FOSA
  } else if (['REGIONAL_DIRECTOR', 'CONTROLEUR_REGIONAL'].includes(role)) {
    where.facility = { regionId: userRegionId || undefined }
    // Narrowing possible vers une FOSA de leur région (AND condition sûre)
    if (facilityId) where.facilityId = facilityId
    // regionId param ignoré : ne peuvent pas changer de région
  } else if (role === 'DATA_MANAGER') {
    if (userFacilityId) {
      where.facilityId = userFacilityId
      // Scope FOSA verrouillé
    } else if (userRegionId) {
      where.facility = { regionId: userRegionId }
      if (facilityId) where.facilityId = facilityId // narrowing dans leur région
    } else {
      // DM national (ni facilityId ni regionId) : peut filtrer librement
      if (facilityId) where.facilityId = facilityId
      if (regionId) where.facility = { regionId }
    }
  } else {
    // DIRECTION, SUPER_ADMIN, CONTROLEUR, DATA_ADMIN : voient tout, peuvent filtrer
    if (facilityId) where.facilityId = facilityId
    if (regionId) where.facility = { regionId }
  }

  // Les brouillons sont privés : seul le soumettant voit les siens
  // Sauf les rôles d'administration qui voient tout
  if (!['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION'].includes(role)) {
    where.OR = [
      { status: { not: 'DRAFT' as DeclarationStatus } },
      { submittedById: userId },
    ]
  }

  if (declarationType) where.declarationType = declarationType
  if (status) where.status = status
  if (from || to) {
    where.periodStart = {}
    if (from) where.periodStart.gte = new Date(from)
    if (to) where.periodStart.lte = new Date(to)
  }

  const [total, declarations] = await Promise.all([
    prisma.declaration.count({ where }),
    prisma.declaration.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        facility: { select: { id: true, name: true, code: true, type: true, region: { select: { id: true, name: true } } } },
        submittedBy: { select: { id: true, name: true } },
        _count: { select: { items: true, documents: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: declarations,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId, facilityId: userFacilityId } = session.user

  if (!['FINANCIER', 'FACILITY_CHIEF', 'REGIONAL_DIRECTOR', 'DATA_MANAGER', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { facilityId, declarationType, periodType, periodStart, periodEnd, notes, items, credits } = parsed.data
  const { regionId: userRegionId } = session.user

  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  if (new Date(periodStart) > endOfToday || new Date(periodEnd) > endOfToday) {
    return NextResponse.json({ success: false, error: 'Les dates de la période ne peuvent pas être dans le futur' }, { status: 400 })
  }

  // Financier et chef de centre : seulement leur propre centre
  if (['FINANCIER', 'FACILITY_CHIEF'].includes(role) && facilityId !== userFacilityId) {
    return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
  }

  // Directeur régional : seulement les centres de sa région
  if (role === 'REGIONAL_DIRECTOR') {
    const fac = await prisma.facility.findUnique({ where: { id: facilityId }, select: { regionId: true } })
    if (!fac || fac.regionId !== userRegionId) {
      return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
    }
  }

  // Responsable Data : scope selon son niveau (centre, région ou national)
  if (role === 'DATA_MANAGER') {
    if (userFacilityId && facilityId !== userFacilityId) {
      return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
    } else if (!userFacilityId && userRegionId) {
      const fac = await prisma.facility.findUnique({ where: { id: facilityId }, select: { regionId: true } })
      if (!fac || fac.regionId !== userRegionId) {
        return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
      }
    }
    // DM national (aucun scope) : autorisé partout
  }

  const prefix = declarationType === 'EXPENSE' ? 'DEP' : 'DEC'
  const year = new Date().getFullYear()
  const lastDeclaration = await prisma.declaration.findFirst({
    where: { reference: { startsWith: `${prefix}-${year}-` } },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  })
  const seq = lastDeclaration ? parseInt(lastDeclaration.reference.split('-')[2], 10) + 1 : 1
  const reference = `${prefix}-${year}-${String(seq).padStart(4, '0')}`
  const totalAmount = items.reduce((s, i) => s + i.amount, 0)

  const declaration = await prisma.declaration.create({
    data: {
      reference,
      declarationType,
      facilityId,
      submittedById: userId,
      periodType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalAmount,
      status: 'DRAFT',
      ...(notes && { comment: notes }),
      items: { create: items },
      ...(declarationType === 'REVENUE' && credits?.length
        ? { credits: { create: credits } }
        : {}),
    },
    include: {
      items: true,
      credits: true,
      facility: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: declaration }, { status: 201 })
}
