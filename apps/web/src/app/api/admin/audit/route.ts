import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!['SUPER_ADMIN', 'DIRECTION'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
  const action = searchParams.get('action') ?? undefined
  const entityType = searchParams.get('entityType') ?? undefined
  const userId = searchParams.get('userId') ?? undefined
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (userId) where.userId = userId
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59Z') } : {}),
    }
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: logs,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  })
}
