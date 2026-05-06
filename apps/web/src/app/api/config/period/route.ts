import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  periodType: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
  isGlobal: z.boolean(),
  regionId: z.string().optional(),
  facilityId: z.string().optional(),
  deadline: z.number().int().min(1).max(30),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const configs = await prisma.declarationPeriodConfig.findMany({
    include: {
      region: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: configs })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
  }

  const config = await prisma.declarationPeriodConfig.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: config }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const body = await req.json()
  const { id, ...data } = body

  const config = await prisma.declarationPeriodConfig.update({ where: { id }, data })
  return NextResponse.json({ success: true, data: config })
}
