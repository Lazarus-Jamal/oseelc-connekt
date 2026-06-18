import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import crypto from 'crypto'

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// GET — statut de la clé API d'une facility
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const apiKey = await prisma.facilityApiKey.findUnique({
    where: { facilityId: id },
    select: { id: true, keyPreview: true, isActive: true, createdAt: true, lastUsedAt: true },
  })

  return NextResponse.json({ success: true, data: apiKey })
}

// POST — générer (ou remplacer) la clé API d'une facility
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const facility = await prisma.facility.findUnique({ where: { id } })
  if (!facility) return NextResponse.json({ error: 'Facility introuvable' }, { status: 404 })

  const rawKey = `c2x_${crypto.randomBytes(24).toString('hex')}`
  const keyHash = hashKey(rawKey)
  const keyPreview = rawKey.slice(0, 12) + '...'

  await prisma.facilityApiKey.upsert({
    where: { facilityId: id },
    create: { facilityId: id, keyHash, keyPreview, isActive: true },
    update: { keyHash, keyPreview, isActive: true, lastUsedAt: null },
  })

  // La clé brute n'est retournée qu'une seule fois — ne jamais la stocker en clair
  return NextResponse.json({ success: true, key: rawKey, keyPreview })
}

// DELETE — révoquer la clé API d'une facility
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  await prisma.facilityApiKey.updateMany({
    where: { facilityId: id },
    data: { isActive: false },
  })

  return NextResponse.json({ success: true })
}
