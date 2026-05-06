import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CAN_SEND = ['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF']

const createSchema = z.object({
  title: z.string().min(2).max(150),
  content: z.string().min(1),
  category: z.enum(['CIRCULAIRE', 'BULLETIN_PAIE', 'PIECE_COMPTABLE', 'NOTE_SERVICE', 'RAPPORT', 'AUTRE']).default('AUTRE'),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  isSensitive: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  targetRoles: z.array(z.string()).default([]),
  targetFacilityIds: z.array(z.string()).default([]),
  targetRegionIds: z.array(z.string()).default([]),
  targetUserIds: z.array(z.string()).default([]),
  targetAll: z.boolean().default(false),
})

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    const { id: userId } = session.user
    const box = req.nextUrl.searchParams.get('box') || 'inbox'
    const page = Number(req.nextUrl.searchParams.get('page') || 1)
    const limit = 20

    if (box === 'sent') {
      const [total, messages] = await Promise.all([
        prisma.adminMessage.count({ where: { senderId: userId } }),
        prisma.adminMessage.findMany({
          where: { senderId: userId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            _count: { select: { recipients: true, documents: true } },
            recipients: { select: { isRead: true } },
          },
        }),
      ])
      const data = messages.map((m) => ({
        ...m,
        recipientCount: m._count.recipients,
        readCount: m.recipients.filter((r) => r.isRead).length,
        documentCount: m._count.documents,
        recipients: undefined,
      }))
      return NextResponse.json({ success: true, data, pagination: { page, total, totalPages: Math.ceil(total / limit) } })
    }

    // Inbox
    const [total, recipients] = await Promise.all([
      prisma.adminMessageRecipient.count({ where: { userId } }),
      prisma.adminMessageRecipient.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          message: {
            include: {
              sender: { select: { id: true, name: true, role: true } },
              _count: { select: { documents: true } },
            },
          },
        },
      }),
    ])

    const unreadCount = await prisma.adminMessageRecipient.count({ where: { userId, isRead: false } })

    const data = recipients.map((r) => ({
      id: r.message.id,
      title: r.message.title,
      category: r.message.category,
      priority: r.message.priority,
      isSensitive: r.message.isSensitive,
      createdAt: r.message.createdAt,
      sender: r.message.sender,
      documentCount: r.message._count.documents,
      isRead: r.isRead,
      readAt: r.readAt,
    }))

    return NextResponse.json({ success: true, data, unreadCount, pagination: { page, total, totalPages: Math.ceil(total / limit) } })
  } catch (e: any) {
    console.error('[GET /api/messages]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (!CAN_SEND.includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Données invalides' }, { status: 400 })
    }

    const { title, content, category, priority, isSensitive, expiresAt,
      targetRoles, targetFacilityIds, targetRegionIds, targetUserIds, targetAll } = parsed.data

    const where: any = { isActive: true, id: { not: session.user.id } }

    if (!targetAll) {
      const orConditions: any[] = []
      if (targetRoles.length > 0) orConditions.push({ role: { in: targetRoles } })
      if (targetFacilityIds.length > 0) orConditions.push({ facilityId: { in: targetFacilityIds } })
      if (targetRegionIds.length > 0) orConditions.push({ regionId: { in: targetRegionIds } })
      if (targetUserIds.length > 0) orConditions.push({ id: { in: targetUserIds } })
      if (orConditions.length === 0) {
        return NextResponse.json({ success: false, error: 'Aucun destinataire sélectionné' }, { status: 400 })
      }
      where.OR = orConditions
    }

    const users = await prisma.user.findMany({ where, select: { id: true } })
    if (users.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun destinataire trouvé' }, { status: 400 })
    }

    const message = await prisma.adminMessage.create({
      data: {
        title, content, category, priority, isSensitive,
        senderId: session.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        recipients: {
          create: users.map((u) => ({ userId: u.id })),
        },
      },
      include: { _count: { select: { recipients: true } } },
    })

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e: any) {
    console.error('[POST /api/messages]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
