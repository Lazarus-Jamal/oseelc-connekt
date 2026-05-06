import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'declarations')
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const declaration = await prisma.declaration.findUnique({ where: { id } })
  if (!declaration) {
    return NextResponse.json({ success: false, error: 'Déclaration introuvable' }, { status: 404 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Aucun fichier fourni' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'Type de fichier non autorisé (JPEG, PNG, WebP, PDF)' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'Fichier trop volumineux (max 10MB)' }, { status: 400 })
  }

  await mkdir(UPLOAD_DIR, { recursive: true })

  const ext = extname(file.name)
  const filename = `${randomUUID()}${ext}`
  const filePath = join(UPLOAD_DIR, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  const doc = await prisma.declarationDocument.create({
    data: {
      declarationId: id,
      filename,
      originalName: file.name,
      filePath: `/uploads/declarations/${filename}`,
      fileType: file.type,
      fileSize: file.size,
    },
  })

  return NextResponse.json({ success: true, data: doc }, { status: 201 })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const docs = await prisma.declarationDocument.findMany({
    where: { declarationId: id },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json({ success: true, data: docs })
}
