import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma } from '@care-connekt/db'

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER', 'DATA_MANAGER', 'CONTROLEUR', 'CONTROLEUR_REGIONAL', 'CAISSIER']),
  phone: z.string().optional(),
  facilityId: z.string().optional(),
  regionId: z.string().optional(),
  organizationId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role: userRole } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(userRole)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') || 1)
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
  const search = searchParams.get('search') || ''

  const where: Prisma.UserWhereInput = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        phone: true,
        lastLoginAt: true,
        createdAt: true,
        facility: { select: { id: true, name: true, code: true } },
        region: { select: { id: true, name: true, code: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}


export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email déjà utilisé' }, { status: 409 })
    }

    // Mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    const user = await prisma.user.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone,
        facilityId: parsed.data.facilityId || null,
        regionId: parsed.data.regionId || null,
        organizationId: parsed.data.organizationId || null,
        passwordHash,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    return NextResponse.json({
      success: true,
      data: { ...user, tempPassword },
      message: `Utilisateur créé. Mot de passe temporaire: ${tempPassword}`,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating user:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

