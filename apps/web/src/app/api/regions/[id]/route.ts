import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const region = await prisma.region.findUnique({
    where: { id },
    include: {
      facilities: { orderBy: { name: 'asc' }, select: { id: true, name: true, code: true, type: true, isActive: true } },
      _count: { select: { facilities: true } },
    },
  })

  if (!region) return NextResponse.json({ success: false, error: 'Région introuvable' }, { status: 404 })
  return NextResponse.json({ success: true, data: region })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const { name, code } = body

  if (!name && !code) {
    return NextResponse.json({ success: false, error: 'Aucun champ à modifier' }, { status: 400 })
  }

  if (code) {
    const existing = await prisma.region.findFirst({ where: { code: code.toUpperCase(), NOT: { id } } })
    if (existing) return NextResponse.json({ success: false, error: 'Ce code est déjà utilisé' }, { status: 409 })
  }

  const updated = await prisma.region.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(code && { code: code.toUpperCase() }),
    },
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

  const count = await prisma.facility.count({ where: { regionId: id } })
  if (count > 0) {
    return NextResponse.json({
      success: false,
      error: `Impossible de supprimer : ${count} formation(s) sanitaire(s) rattachée(s) à cette région`,
    }, { status: 400 })
  }

  await prisma.region.delete({ where: { id } })
  return NextResponse.json({ success: true, message: 'Région supprimée' })
}
