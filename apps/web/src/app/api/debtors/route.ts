import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { DEFAULT_DEBTORS } from '@care-connekt/shared'

const CAN_CREATE = ['SUPER_ADMIN', 'DIRECTION', 'FINANCIER', 'FACILITY_CHIEF']
const CAN_DELETE = ['SUPER_ADMIN', 'DIRECTION']

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const custom = await prisma.debtor.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } })
  const customNames = new Set(custom.map((d) => d.name))

  const list = [
    ...(DEFAULT_DEBTORS as readonly string[]).map((name) => ({ id: null, name, isDefault: true })),
    ...custom.filter((d) => !(DEFAULT_DEBTORS as readonly string[]).includes(d.name)).map((d) => ({ ...d, isDefault: false })),
  ]

  return NextResponse.json({ success: true, data: list })
}

const createSchema = z.object({ name: z.string().min(2).max(80) })

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

  const { name } = parsed.data

  if ((DEFAULT_DEBTORS as readonly string[]).includes(name)) {
    return NextResponse.json({ success: false, error: 'Ce débiteur existe déjà par défaut' }, { status: 409 })
  }

  try {
    const debtor = await prisma.debtor.upsert({
      where: { name },
      create: { name },
      update: { isActive: true },
    })
    return NextResponse.json({ success: true, data: { ...debtor, isDefault: false } }, { status: 201 })
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Ce débiteur existe déjà' }, { status: 409 })
    }
    console.error('[debtors] POST error:', e)
    return NextResponse.json({ success: false, error: 'Erreur serveur: ' + (e?.message || 'inconnue') }, { status: 500 })
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

  await prisma.debtor.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}
