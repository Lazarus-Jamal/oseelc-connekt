import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Endpoint public — pas d'auth — Care2x interroge cet endpoint au démarrage
export async function GET(req: NextRequest) {
  const latest = await prisma.care2xVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    select: { version: true, releaseNotes: true, downloadUrl: true, fileSize: true, createdAt: true },
  })

  if (!latest) {
    return NextResponse.json({ available: false })
  }

  // Construire l'URL absolue de téléchargement à partir du host de la requête
  const host = req.headers.get('host') || ''
  const protocol = req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')
  const absoluteDownloadUrl = `${protocol}://${host}${latest.downloadUrl}`

  return NextResponse.json({
    available:    true,
    version:      latest.version,
    releaseNotes: latest.releaseNotes,
    downloadUrl:  absoluteDownloadUrl,
    fileSize:     latest.fileSize,
    releasedAt:   latest.createdAt,
  })
}
