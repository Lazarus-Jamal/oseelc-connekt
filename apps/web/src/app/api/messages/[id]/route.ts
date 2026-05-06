import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(2).max(150).optional(),
  content: z.string().min(1).optional(),
  category: z.enum(['CIRCULAIRE', 'BULLETIN_PAIE', 'PIECE_COMPTABLE', 'NOTE_SERVICE', 'RAPPORT', 'AUTRE']).optional(),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
  isSensitive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
})

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const { id: userId } = session.user

    const message = await prisma.adminMessage.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, role: true, email: true } },
        documents: true,
        recipients: {
          include: { user: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!message) return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })

    const isRecipient = message.recipients.some((r) => r.userId === userId)
    const isSender = message.senderId === userId
    if (!isRecipient && !isSender) {
      return NextResponse.json({ success: false, error: 'Accès non autorisé' }, { status: 403 })
    }

    if (isRecipient) {
      await prisma.adminMessageRecipient.updateMany({
        where: { messageId: id, userId, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
    }

    const recipients = message.recipients.map((r) => ({
      userId: r.userId,
      name: (r.user as any).name,
      role: (r.user as any).role,
      isRead: r.isRead,
      readAt: r.readAt,
    }))

    return NextResponse.json({
      success: true,
      data: { ...message, recipients, isSender, isRecipient },
    })
  } catch (e: any) {
    console.error('[GET /api/messages/[id]]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const message = await prisma.adminMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })
    if (message.senderId !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Seul l\'expéditeur peut modifier ce message' }, { status: 403 })
    }
    const ageMinutes = (Date.now() - new Date(message.createdAt).getTime()) / 60_000
    if (ageMinutes > 15) {
      return NextResponse.json({ success: false, error: 'Le délai de modification (15 min) est dépassé' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Données invalides' }, { status: 400 })
    }

    const { expiresAt, ...rest } = parsed.data
    const updated = await prisma.adminMessage.update({
      where: { id },
      data: {
        ...rest,
        ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (e: any) {
    console.error('[PATCH /api/messages/[id]]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const message = await prisma.adminMessage.findUnique({ where: { id } })
    if (!message) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 })

    const canDelete = message.senderId === session.user.id || ['SUPER_ADMIN', 'DIRECTION'].includes(session.user.role)
    if (!canDelete) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })

    await prisma.adminMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[DELETE /api/messages/[id]]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
