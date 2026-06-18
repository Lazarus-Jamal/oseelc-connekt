import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'care2x-updates')
const MAX_SIZE = 300 * 1024 * 1024 // 300 MB

// GET — liste des versions enregistrées
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const versions = await prisma.care2xVersion.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ success: true, data: versions })
}

// POST — upload d'une nouvelle version
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Données de formulaire invalides' }, { status: 400 })
  }

  const version      = (formData.get('version') as string)?.trim()
  const releaseNotes = (formData.get('releaseNotes') as string)?.trim() || null
  const file         = formData.get('file') as File | null

  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    return NextResponse.json({ error: 'Version invalide (format: X.Y.Z)' }, { status: 400 })
  }
  if (!file || !file.name.endsWith('.exe')) {
    return NextResponse.json({ error: 'Fichier .exe requis' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Fichier trop volumineux (max 300 Mo)' }, { status: 400 })
  }

  // Vérifier si la version existe déjà
  const existing = await prisma.care2xVersion.findUnique({ where: { version } })
  if (existing) {
    return NextResponse.json({ error: `La version ${version} existe déjà` }, { status: 409 })
  }

  // Sauvegarder le fichier
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

  const filename = `Care2x-${version}-Setup.exe`
  const filePath = path.join(UPLOAD_DIR, filename)
  const buffer   = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filePath, buffer)

  const downloadUrl = `/care2x-updates/${filename}`

  // Désactiver les anciennes versions
  await prisma.care2xVersion.updateMany({ where: {}, data: { isActive: false } })

  const record = await prisma.care2xVersion.create({
    data: {
      version,
      releaseNotes,
      filename,
      filePath,
      fileSize: file.size,
      downloadUrl,
      isActive: true,
    },
  })

  return NextResponse.json({ success: true, data: record })
}
