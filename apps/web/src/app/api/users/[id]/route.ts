import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  role: z.enum(['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR', 'FACILITY_CHIEF', 'FINANCIER', 'DATA_MANAGER', 'CONTROLEUR', 'CAISSIER']),
  phone: z.string().optional().nullable(),
  facilityId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  organizationId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (!['SUPER_ADMIN', 'DIRECTION', 'REGIONAL_DIRECTOR'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    // Vérifier si l'email est déjà pris par un AUTRE utilisateur
    const existing = await prisma.user.findFirst({
      where: { email: parsed.data.email, NOT: { id } }
    })
    if (existing) {
      return NextResponse.json({ success: false, error: 'Cet email est déjà utilisé' }, { status: 409 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        phone: parsed.data.phone,
        facilityId: parsed.data.facilityId,
        regionId: parsed.data.regionId,
        organizationId: parsed.data.organizationId,
        isActive: parsed.data.isActive,
      },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    })

    return NextResponse.json({ success: true, data: user })
  } catch (error: any) {
    console.error('Error updating user:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès réservé au Super Admin' }, { status: 403 })
    }

    const { id } = await params
    
    // Au lieu de supprimer physiquement, on peut juste désactiver
    // Mais si l'utilisateur veut vraiment supprimer :
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Utilisateur supprimé' })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Impossible de supprimer cet utilisateur' }, { status: 500 })
  }
}
