import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params

    // Mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    })

    return NextResponse.json({
      success: true,
      data: { tempPassword },
      message: `Mot de passe réinitialisé. Nouveau mot de passe temporaire: ${tempPassword}`,
    })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
