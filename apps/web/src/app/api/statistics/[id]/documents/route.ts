import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'statistics')
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]
const MAX_SIZE = 10 * 1024 * 1024

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const sheet = await prisma.statSheet.findUnique({ where: { id } })
  if (!sheet) return NextResponse.json({ success: false, error: 'Fiche introuvable' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Aucun fichier' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'Type non autorisé' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'Fichier trop volumineux' }, { status: 400 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = extname(file.name)
  const filename = `${randomUUID()}${ext}`
  const filePath = join(UPLOAD_DIR, filename)
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()))

  const doc = await prisma.statDocument.create({
    data: {
      statSheetId: id,
      filename,
      originalName: file.name,
      filePath: `/uploads/statistics/${filename}`,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  return NextResponse.json({ success: true, data: doc }, { status: 201 })
}
