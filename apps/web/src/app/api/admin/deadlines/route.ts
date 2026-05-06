import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  dueDay:     z.coerce.number().int().min(1).max(28),
  alertDays:  z.coerce.number().int().min(1).max(30).default(3),
  month:      z.coerce.number().int().min(1).max(12).optional().nullable().transform(v => v || undefined),
  year:       z.coerce.number().int().min(2020).optional().nullable().transform(v => v || undefined),
  regionId:   z.string().min(1).optional().nullable().transform(v => v || undefined),
  facilityId: z.string().min(1).optional().nullable().transform(v => v || undefined),
  note:       z.string().optional().nullable().transform(v => v || undefined),
})

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'DATA_ADMIN'
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, regionId: userRegionId } = session.user

  const where: any = {}
  if (role === 'DATA_MANAGER' && userRegionId) where.regionId = userRegionId

  try {
    const deadlines = await prisma.statDeadline.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'asc' }],
      include: {
        region:    { select: { id: true, name: true } },
        facility:  { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json({ success: true, data: deadlines })
  } catch (e: any) {
    console.error('[GET /api/admin/deadlines]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId } = session.user
  if (!isAdmin(role)) {
    return NextResponse.json({ success: false, error: 'Réservé aux administrateurs' }, { status: 403 })
  }

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Corps de requête invalide (JSON attendu)' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    const firstField = Object.keys(details)[0]
    const firstMsg = firstField ? `${firstField}: ${details[firstField]?.[0]}` : 'Données invalides'
    return NextResponse.json({ success: false, error: firstMsg, details }, { status: 400 })
  }

  try {
    const deadline = await prisma.statDeadline.create({
      data: { ...parsed.data, createdById: userId },
      include: { region: { select: { name: true } }, facility: { select: { name: true } } },
    })
    return NextResponse.json({ success: true, data: deadline }, { status: 201 })
  } catch (e: any) {
    console.error('[POST /api/admin/deadlines]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
