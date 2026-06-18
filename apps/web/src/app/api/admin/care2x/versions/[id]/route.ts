import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import fs from 'fs'

// DELETE — supprimer une version (et son fichier)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const record = await prisma.care2xVersion.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: 'Version introuvable' }, { status: 404 })

  // Supprimer le fichier physique
  if (fs.existsSync(record.filePath)) {
    fs.unlinkSync(record.filePath)
  }

  await prisma.care2xVersion.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// PATCH — activer une version spécifique
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  await prisma.care2xVersion.updateMany({ where: {}, data: { isActive: false } })
  await prisma.care2xVersion.update({ where: { id }, data: { isActive: true } })

  return NextResponse.json({ success: true })
}
