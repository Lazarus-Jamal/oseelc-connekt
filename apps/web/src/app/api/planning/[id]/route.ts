import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional().nullable(),
  type: z.enum(['VISIT', 'DEADLINE', 'MEETING', 'TRAINING', 'AUDIT_VISIT', 'OTHER']).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional().nullable(),
  allDay: z.boolean().optional(),
  location: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  isCompleted: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const event: any = await (prisma as any).planningEvent.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ success: false, error: 'Événement introuvable' }, { status: 404 })
  if (event.createdById !== session.user.id && !['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })

  const { startAt, endAt, ...rest } = parsed.data
  const updated = await (prisma as any).planningEvent.update({
    where: { id },
    data: {
      ...rest,
      ...(startAt ? { startAt: new Date(startAt) } : {}),
      ...(endAt !== undefined ? { endAt: endAt ? new Date(endAt) : null } : {}),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const event: any = await (prisma as any).planningEvent.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 })
  if (event.createdById !== session.user.id && !['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  await (prisma as any).planningEvent.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
