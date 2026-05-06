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
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const { name, code, organizationId } = body
  if (!name || !code || !organizationId) {
    return NextResponse.json({ success: false, error: 'Champs requis manquants' }, { status: 400 })
  }

  const region = await prisma.region.create({ data: { name, code: code.toUpperCase(), organizationId } })
  return NextResponse.json({ success: true, data: region }, { status: 201 })
}
