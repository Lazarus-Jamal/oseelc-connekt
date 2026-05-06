import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyDeclarationWorkflow } from '@/lib/notifications'
import { recordAudit, getClientInfo } from '@/lib/audit'
import { z } from 'zod'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const declaration = await prisma.declaration.findUnique({
    where: { id },
    include: {
      facility: { select: { id: true, name: true, code: true, type: true, region: { select: { id: true, name: true } } } },
      submittedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true, email: true } },
      items: true,
      documents: true,
      history: { orderBy: { changedAt: 'desc' } },
    },
  })

  if (!declaration) {
    return NextResponse.json({ success: false, error: 'Déclaration introuvable' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: declaration })
}

const updateSchema = z.object({
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().optional(),
  items: z.array(z.object({
    label: z.string().min(1),
    category: z.string().min(1),
    amount: z.number().nonnegative(),
    quantity: z.number().int().optional(),
    unitPrice: z.number().nonnegative().optional(),
    note: z.string().optional(),
  })).min(1),
})

const submitSchema = z.object({ action: z.enum(['submit', 'review', 'validate', 'reject']) })
const reviewSchema = z.object({ action: z.literal('review'), comment: z.string().optional() })
const rejectSchema = z.object({ action: z.literal('reject'), comment: z.string().min(1) })

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { id: userId, role } = session.user

  const declaration = await prisma.declaration.findUnique({ where: { id } })
  if (!declaration) {
    return NextResponse.json({ success: false, error: 'Déclaration introuvable' }, { status: 404 })
  }
  if (declaration.status !== 'DRAFT') {
    return NextResponse.json({ success: false, error: 'Seul un brouillon peut être modifié' }, { status: 400 })
  }
  if (declaration.submittedById !== userId && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { periodType, periodStart, periodEnd, notes, items } = parsed.data

  const now = new Date()
  if (new Date(periodStart) > now || new Date(periodEnd) > now) {
    return NextResponse.json({ success: false, error: 'Les dates de la période ne peuvent pas être dans le futur' }, { status: 400 })
  }

  const totalAmount = items.reduce((s, i) => s + i.amount, 0)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.declarationItem.deleteMany({ where: { declarationId: id } })
    return tx.declaration.update({
      where: { id },
      data: {
        periodType,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        totalAmount,
        comment: notes ?? null,
        items: { create: items },
      },
      include: { items: true },
    })
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId } = session.user
  const body = await req.json()

  const declaration = await prisma.declaration.findUnique({ where: { id } })
  if (!declaration) {
    return NextResponse.json({ success: false, error: 'Déclaration introuvable' }, { status: 404 })
  }

  const action = body.action as string
  let newStatus = declaration.status
  let updateData: Record<string, unknown> = {}

  if (action === 'submit') {
    if (!['FINANCIER', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    if (declaration.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Déclaration déjà soumise' }, { status: 400 })
    }
    newStatus = 'SUBMITTED'
    updateData = { status: newStatus, submittedAt: new Date() }
  } else if (action === 'review') {
    if (!['FACILITY_CHIEF', 'REGIONAL_DIRECTOR', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    newStatus = 'REVIEWED'
    updateData = { status: newStatus, reviewedById: userId, reviewedAt: new Date(), comment: body.comment }
  } else if (action === 'validate') {
    if (!['REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    newStatus = 'VALIDATED'
    updateData = { status: newStatus, validatedAt: new Date(), reviewedById: userId }
  } else if (action === 'reject') {
    if (!['FACILITY_CHIEF', 'REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    if (!body.comment) {
      return NextResponse.json({ success: false, error: 'Un commentaire est requis pour le rejet' }, { status: 400 })
    }
    newStatus = 'REJECTED'
    updateData = { status: newStatus, comment: body.comment, reviewedById: userId }
  } else {
    return NextResponse.json({ success: false, error: 'Action invalide' }, { status: 400 })
  }

  const [updated] = await prisma.$transaction([
    prisma.declaration.update({ where: { id }, data: updateData }),
    prisma.declarationHistory.create({
      data: {
        declarationId: id,
        fromStatus: declaration.status,
        toStatus: newStatus,
        changedById: userId,
        comment: body.comment,
      },
    }),
  ])

  // Audit trail
  const { ipAddress, userAgent } = getClientInfo(req)
  recordAudit({
    userId,
    action: 'UPDATE',
    entityType: 'declaration',
    entityId: id,
    oldValues: { status: declaration.status },
    newValues: { status: newStatus, action },
    ipAddress,
    userAgent,
  }).catch(() => {})

  // Send notifications asynchronously (don't block the response)
  notifyDeclarationWorkflow(action as any, {
    id,
    reference: declaration.reference,
    facilityId: declaration.facilityId,
    submittedById: declaration.submittedById,
    declarationType: declaration.declarationType,
  }, session.user.name).catch(() => {})

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const declaration = await prisma.declaration.findUnique({ where: { id } })
  if (!declaration) {
    return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 })
  }
  if (declaration.status !== 'DRAFT') {
    return NextResponse.json({ success: false, error: 'Seul un brouillon peut être supprimé' }, { status: 400 })
  }

  await prisma.declaration.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Déclaration supprimée' })
}
