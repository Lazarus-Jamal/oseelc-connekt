import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const facility = await prisma.facility.findUnique({
    where: { id },
    include: {
      region: { select: { id: true, name: true, code: true } },
      _count: { select: { users: true, declarations: true } },
    },
  })

  if (!facility) return NextResponse.json({ success: false, error: 'Formation introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, data: facility })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const { name, code, type, regionId, address, phone, email, isActive } = body

  if (code) {
    const existing = await prisma.facility.findFirst({ where: { code: code.toUpperCase(), NOT: { id } } })
    if (existing) return NextResponse.json({ success: false, error: 'Ce code est déjà utilisé' }, { status: 409 })
  }

  const updated = await prisma.facility.update({
    where: { id },
    data: {
      ...(name !== undefined     && { name }),
      ...(code !== undefined     && { code: code.toUpperCase() }),
      ...(type !== undefined     && { type }),
      ...(regionId !== undefined && { regionId }),
      ...(address !== undefined  && { address }),
      ...(phone !== undefined    && { phone }),
      ...(email !== undefined    && { email }),
      ...(isActive !== undefined && { isActive }),
    },
    include: { region: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!['SUPER_ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const facility = await prisma.facility.findUnique({
    where: { id },
    include: { _count: { select: { users: true, declarations: true } } },
  })
  if (!facility) return NextResponse.json({ success: false, error: 'Formation introuvable' }, { status: 404 })

  if (facility._count.declarations > 0) {
    return NextResponse.json({
      success: false,
      error: `Impossible de supprimer : ${facility._count.declarations} déclaration(s) associée(s). Désactivez plutôt cette formation.`,
    }, { status: 400 })
  }

  await prisma.facility.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Formation sanitaire supprimée' })
}
