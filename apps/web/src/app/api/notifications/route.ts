import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const unreadOnly = searchParams.get('unread') === 'true'
  const page = Number(searchParams.get('page') || 1)
  const limit = Math.min(Number(searchParams.get('limit') || 20), 50)

  const where: any = { userId: session.user.id }
  if (unreadOnly) where.isRead = false

  const [total, notifications] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, isRead: false } })

  return NextResponse.json({
    success: true,
    data: notifications,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    unreadCount,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true, message: 'Toutes les notifications marquées comme lues' })
  }

  if (body.id) {
    await prisma.notification.update({
      where: { id: body.id, userId: session.user.id },
      data: { isRead: true },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ success: false, error: 'Paramètre manquant' }, { status: 400 })
}
