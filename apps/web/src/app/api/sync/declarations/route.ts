import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { z } from 'zod'

const entrySchema = z.object({
  localId:      z.string(),
  montant:      z.number().positive(),
  date:         z.string().datetime({ offset: true }).or(z.string().min(10)),
  typePaiement: z.string().min(1),
})

const bodySchema = z.object({
  facilityCode: z.string().min(1),
  batchRef:     z.string().min(1),
  declarations: z.array(entrySchema).min(1).max(200),
})

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function POST(req: NextRequest) {
  // Auth par clé API dans le header
  const rawKey = req.headers.get('x-api-key')
  if (!rawKey) return NextResponse.json({ error: 'Clé API manquante' }, { status: 401 })

  const keyHash = hashKey(rawKey)
  const apiKeyRecord = await prisma.facilityApiKey.findUnique({
    where: { keyHash },
    include: { facility: { select: { id: true, code: true, isActive: true } } },
  })

  if (!apiKeyRecord || !apiKeyRecord.isActive) {
    return NextResponse.json({ error: 'Clé API invalide ou révoquée' }, { status: 401 })
  }
  if (!apiKeyRecord.facility.isActive) {
    return NextResponse.json({ error: 'Facility désactivée' }, { status: 403 })
  }

  // Parse et validation du body
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { facilityCode, batchRef, declarations } = parsed.data

  // Vérification que le facilityCode correspond à la clé
  if (apiKeyRecord.facility.code !== facilityCode) {
    return NextResponse.json({ error: 'facility_code ne correspond pas à la clé API' }, { status: 403 })
  }

  // Idempotence : ignorer si ce batchRef existe déjà
  const existing = await prisma.care2xSync.findUnique({ where: { batchRef } })
  if (existing) {
    return NextResponse.json({ success: true, received: declarations.length, status: 'already_received' })
  }

  const totalAmount = declarations.reduce((sum, d) => sum + d.montant, 0)
  const dates = declarations.map(d => new Date(d.date)).sort((a, b) => a.getTime() - b.getTime())

  const sync = await prisma.care2xSync.create({
    data: {
      facilityId:   apiKeyRecord.facility.id,
      apiKeyId:     apiKeyRecord.id,
      batchRef,
      entriesCount: declarations.length,
      totalAmount,
      periodStart:  dates[0],
      periodEnd:    dates[dates.length - 1],
      entries: {
        create: declarations.map(d => ({
          localId:      d.localId,
          montant:      d.montant,
          date:         new Date(d.date),
          typePaiement: d.typePaiement,
        })),
      },
    },
  })

  // Mise à jour lastUsedAt de la clé
  await prisma.facilityApiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  })

  return NextResponse.json({ success: true, syncId: sync.id, received: declarations.length })
}
