import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { DECLARATION_CATEGORIES, EXPENSE_CATEGORIES } from '@care-connekt/shared'

const DEFAULT_REVENUE = DECLARATION_CATEGORIES as readonly string[]
const DEFAULT_EXPENSE = EXPENSE_CATEGORIES as readonly string[]

const CAN_CREATE = ['SUPER_ADMIN', 'DIRECTION', 'FINANCIER']
const CAN_DELETE  = ['SUPER_ADMIN', 'DIRECTION']

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') as 'REVENUE' | 'EXPENSE' | null

  const where: { isActive: boolean; declarationType?: 'REVENUE' | 'EXPENSE' } = { isActive: true }
  if (type) where.declarationType = type

  const custom = await prisma.category.findMany({ where, orderBy: { createdAt: 'asc' } })

  const buildList = (declType: 'REVENUE' | 'EXPENSE') => {
    const defaults = declType === 'EXPENSE' ? DEFAULT_EXPENSE : DEFAULT_REVENUE
    const customOfType = custom.filter((c) => c.declarationType === declType)
    const customNames = new Set(customOfType.map((c) => c.name))
    return [
      ...defaults.map((name) => ({ id: null, name, declarationType: declType, isDefault: true })),
      ...customOfType.filter((c) => !defaults.includes(c.name)).map((c) => ({ ...c, isDefault: false })),
    ]
  }

  if (type === 'REVENUE') return NextResponse.json({ success: true, data: buildList('REVENUE') })
  if (type === 'EXPENSE') return NextResponse.json({ success: true, data: buildList('EXPENSE') })

  return NextResponse.json({
    success: true,
    data: { REVENUE: buildList('REVENUE'), EXPENSE: buildList('EXPENSE') },
  })
}

const createSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').max(80),
  declarationType: z.enum(['REVENUE', 'EXPENSE']),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!CAN_CREATE.includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Données invalides' }, { status: 400 })
  }

  const { name, declarationType } = parsed.data
  const defaults = declarationType === 'EXPENSE' ? DEFAULT_EXPENSE : DEFAULT_REVENUE

  if (defaults.includes(name)) {
    return NextResponse.json({ success: false, error: 'Cette catégorie existe déjà par défaut' }, { status: 409 })
  }

  try {
    const category = await prisma.category.upsert({
      where: { name_declarationType: { name, declarationType } },
      create: { name, declarationType },
      update: { isActive: true },
    })
    return NextResponse.json({ success: true, data: { ...category, isDefault: false } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Cette catégorie existe déjà' }, { status: 409 })
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (!CAN_DELETE.includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'ID manquant' }, { status: 400 })

  await prisma.category.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
