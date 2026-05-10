import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const regions = await prisma.region.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { facilities: true } } },
  })

  return NextResponse.json({ success: true, data: regions })
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (!['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { name, code } = body
    if (!name?.trim() || !code?.trim()) {
      return NextResponse.json({ success: false, error: 'Nom et code sont obligatoires' }, { status: 400 })
    }

    // Résoudre l'organizationId : depuis la session, la première org, ou créer si aucune
    let organizationId = session.user.organizationId
    if (!organizationId) {
      let org = await prisma.organization.findFirst()
      if (!org) {
        org = await prisma.organization.create({ data: { name: 'OSEELC' } })
      }
      organizationId = org.id
    }

    const region = await prisma.region.create({
      data: { name: name.trim(), code: code.trim().toUpperCase(), organizationId },
    })
    return NextResponse.json({ success: true, data: region }, { status: 201 })
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Ce code de région existe déjà' }, { status: 409 })
    }
    console.error('POST /api/regions error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
