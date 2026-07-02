import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { z } from 'zod'

function hashKey(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex')
}

const bodySchema = z.object({
  facilityCode: z.string().min(1),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format attendu : YYYY-MM-DD'),
  parGroupe:    z.array(z.object({ groupe: z.string(), total: z.number(), quantite: z.number() })),
  parPaiement:  z.array(z.object({ mode: z.string(), total: z.number() })),
  parAvance:    z.array(z.object({ mode: z.string(), total: z.number() })),
  rembParMode:  z.array(z.object({ mode: z.string(), total: z.number() })),
  totRow:       z.object({
    nb:               z.number(),
    total_facture:    z.number(),
    total_encaisse:   z.number(),
    total_remise:     z.number(),
    total_assurance:  z.number(),
  }),
  openRow:      z.object({
    nb:             z.number(),
    total_avance:   z.number(),
    total_restant:  z.number(),
    total_facture:  z.number(),
  }),
  credits:      z.array(z.object({ assurance: z.string(), total: z.number() })),
  rembRow:      z.object({ total_rembourse: z.number(), nb_remboursements: z.number() }),
  caissiers:    z.array(z.string()),
})

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

  const { facilityCode, date, ...reportData } = parsed.data

  if (apiKeyRecord.facility.code !== facilityCode) {
    return NextResponse.json({ error: 'facility_code ne correspond pas à la clé API' }, { status: 403 })
  }

  // Normalise la date en début de journée UTC
  const dateUtc = new Date(date + 'T00:00:00.000Z')

  // Upsert idempotent — même rapport renvoyé = on met à jour
  await prisma.care2xRapportJournalier.upsert({
    where: { facilityId_date: { facilityId: apiKeyRecord.facility.id, date: dateUtc } },
    update: {
      ...reportData,
      receivedAt: new Date(),
      apiKeyId:   apiKeyRecord.id,
    },
    create: {
      facilityId:  apiKeyRecord.facility.id,
      apiKeyId:    apiKeyRecord.id,
      date:        dateUtc,
      ...reportData,
    },
  })

  await prisma.facilityApiKey.update({
    where: { id: apiKeyRecord.id },
    data:  { lastUsedAt: new Date() },
  })

  return NextResponse.json({ success: true, date })
}
