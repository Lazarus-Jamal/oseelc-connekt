import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  type: z.enum(['VISIT', 'DEADLINE', 'MEETING', 'TRAINING', 'AUDIT_VISIT', 'OTHER']).default('OTHER'),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional().nullable(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
  facilityId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { id: userId, role, facilityId: userFacilityId, regionId: userRegionId } = session.user
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const mine = searchParams.get('mine') === 'true'

  const where: any = {}
  if (mine) {
    where.createdById = userId
  } else if (role === 'FACILITY_CHIEF' && userFacilityId) {
    where.OR = [{ createdById: userId }, { facilityId: userFacilityId }]
  } else if (role === 'REGIONAL_DIRECTOR' && userRegionId) {
    where.OR = [{ createdById: userId }, { regionId: userRegionId }]
  }

  if (from || to) {
    where.startAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    }
  }

  const events = await (prisma as any).planningEvent.findMany({
    where,
    orderBy: { startAt: 'asc' },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      facility: { select: { id: true, name: true } },
      region: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: events })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
  }

  const { startAt, endAt, ...rest } = parsed.data

  const event = await (prisma as any).planningEvent.create({
    data: {
      ...rest,
      startAt: new Date(startAt),
      endAt: endAt ? new Date(endAt) : null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      facility: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ success: true, data: event }, { status: 201 })
}
