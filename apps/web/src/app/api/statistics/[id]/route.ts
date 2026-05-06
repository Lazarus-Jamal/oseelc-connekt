import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const sheet = await prisma.statSheet.findUnique({
    where: { id },
    include: {
      facility: { select: { id: true, name: true, code: true, type: true, region: { select: { id: true, name: true } } } },
      dataManager: { select: { id: true, name: true, email: true } },
      values: { include: { indicator: true }, orderBy: { indicator: { sortOrder: 'asc' } } },
      documents: true,
    },
  })

  if (!sheet) return NextResponse.json({ success: false, error: 'Fiche introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, data: sheet })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId } = session.user
  const body = await req.json()
  const action = body.action as string

  const sheet = await prisma.statSheet.findUnique({ where: { id } })
  if (!sheet) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 })

  let updateData: Record<string, unknown> = {}

  if (action === 'submit') {
    if (!['DATA_MANAGER', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    updateData = { status: 'SUBMITTED', submittedAt: new Date() }
  } else if (action === 'validate') {
    if (!['REGIONAL_DIRECTOR', 'DIRECTION', 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }
    updateData = { status: 'VALIDATED', validatedAt: new Date() }
  } else if (action === 'reject') {
    if (!body.comment) {
      return NextResponse.json({ success: false, error: 'Commentaire requis' }, { status: 400 })
    }
    updateData = { status: 'REJECTED', comment: body.comment }
  } else if (action === 'update' && body.values) {
    if (sheet.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Seul un brouillon peut être modifié' }, { status: 400 })
    }
    // Recalcul completeness
    const indicators = await prisma.statIndicator.findMany({ where: { isActive: true, isRequired: true } })
    const filledRequired = (body.values as any[]).filter((v: any) => {
      const ind = indicators.find((i: { id: string }) => i.id === v.indicatorId)
      return ind && v.value !== undefined && v.value !== null
    }).length
    const completeness = indicators.length > 0 ? (filledRequired / indicators.length) * 100 : 0

    await prisma.statValue.deleteMany({ where: { statSheetId: id } })
    updateData = { completeness, values: { create: body.values } }
  }

  const updated = await prisma.statSheet.update({ where: { id }, data: updateData })
  return NextResponse.json({ success: true, data: updated })
}
