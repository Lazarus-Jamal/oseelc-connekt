import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().optional(),
  isRequired: z.boolean().default(false),
  description: z.string().optional(),
  sortOrder: z.number().int().default(0),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const indicators = await prisma.statIndicator.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
  })

  return NextResponse.json({ success: true, data: indicators })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides' }, { status: 400 })
  }

  const existing = await prisma.statIndicator.findUnique({ where: { code: parsed.data.code } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'Code déjà utilisé' }, { status: 409 })
  }

  const indicator = await prisma.statIndicator.create({ data: parsed.data })
  return NextResponse.json({ success: true, data: indicator }, { status: 201 })
}
