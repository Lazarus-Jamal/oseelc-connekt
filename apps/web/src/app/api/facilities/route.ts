import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).toUpperCase(),
  type: z.enum(['HOSPITAL', 'HEALTH_CENTER']),
  regionId: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const regionId   = searchParams.get('regionId')
  const facilityId = searchParams.get('facilityId')
  const type       = searchParams.get('type')
  const search     = searchParams.get('search') || ''

  const where: any = {}
  if (facilityId) where.id = facilityId
  if (regionId)   where.regionId = regionId
  if (type)       where.type = type
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { code: { contains: search, mode: 'insensitive' } },
  ]

  const facilities = await prisma.facility.findMany({
    where,
    orderBy: { name: 'asc' },
    include: {
      region: { select: { id: true, name: true, code: true } },
      _count: { select: { users: true, declarations: true } },
    },
  })

  return NextResponse.json({ success: true, data: facilities })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const existing = await prisma.facility.findUnique({ where: { code: parsed.data.code } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'Ce code est déjà utilisé' }, { status: 409 })
  }

  const facility = await prisma.facility.create({
    data: parsed.data,
    include: { region: { select: { id: true, name: true } } },
  })

  return NextResponse.json({ success: true, data: facility }, { status: 201 })
}
