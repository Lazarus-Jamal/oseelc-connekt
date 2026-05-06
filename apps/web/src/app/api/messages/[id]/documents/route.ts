import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'messages')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const message = await prisma.adminMessage.findUnique({ where: { id } })
  if (!message) return NextResponse.json({ success: false, error: 'Message introuvable' }, { status: 404 })
  if (message.senderId !== session.user.id) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Aucun fichier fourni' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'Type de fichier non autorisé' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'Fichier trop volumineux (max 20 Mo)' }, { status: 400 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = extname(file.name)
  const filename = `${randomUUID()}${ext}`
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()))

  const doc = await prisma.adminMessageDocument.create({
    data: {
      messageId: id,
      filename,
      originalName: file.name,
      filePath: `/uploads/messages/${filename}`,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  return NextResponse.json({ success: true, data: doc }, { status: 201 })
}
