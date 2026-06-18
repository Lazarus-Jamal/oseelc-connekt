import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { z } from 'zod'

const rapportItemSchema = z.object({
  structure:       z.string(),
  type:            z.string(),
  total_facture:   z.number(),
  total_recouvre:  z.number(),
  solde:           z.number(),
})

const bodySchema = z.object({
  facilityCode:     z.string().min(1),
  batchRef:         z.string().min(1),
  rapport:          z.array(rapportItemSchema),
  recouvrement_ids: z.array(z.number()).optional(),
  generated_at:     z.string().optional(),
})

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export async function POST(req: NextRequest) {
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

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Données invalides', details: parsed.error.flatten() }, { status: 400 })
  }

  const { facilityCode, batchRef, rapport } = parsed.data

  if (apiKeyRecord.facility.code !== facilityCode) {
    return NextResponse.json({ error: 'facility_code ne correspond pas à la clé API' }, { status: 403 })
  }

  // Idempotence
  const existing = await prisma.care2xRecouvrementSync.findUnique({ where: { batchRef } })
  if (existing) {
    return NextResponse.json({ success: true, syncId: existing.id, status: 'already_received' })
  }

  const totalFacture  = rapport.reduce((s, r) => s + r.total_facture,  0)
  const totalRecouvre = rapport.reduce((s, r) => s + r.total_recouvre, 0)

  const sync = await prisma.care2xRecouvrementSync.create({
    data: {
      facilityId:    apiKeyRecord.facility.id,
      apiKeyId:      apiKeyRecord.id,
      batchRef,
      totalFacture,
      totalRecouvre,
      rapport:       rapport as any,
    },
  })

  await prisma.facilityApiKey.update({
    where: { id: apiKeyRecord.id },
    data:  { lastUsedAt: new Date() },
  })

  return NextResponse.json({ success: true, syncId: sync.id, received: rapport.length })
}
