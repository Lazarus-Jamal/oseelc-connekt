import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isAdmin(role: string) {
  return role === 'SUPER_ADMIN' || role === 'DATA_ADMIN'
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!isAdmin(role)) return NextResponse.json({ success: false, error: 'Réservé aux administrateurs' }, { status: 403 })

  const { id } = await params
  await prisma.statDeadline.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
