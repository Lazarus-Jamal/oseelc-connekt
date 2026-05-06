import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export async function GET(): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
      facility: { select: { id: true, name: true, type: true, region: { select: { name: true } } } },
      region: { select: { id: true, name: true } },
      organization: { select: { id: true, name: true } },
    },
  })

  if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })

  return NextResponse.json({ success: true, data: user })
}

const updateSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  phone: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').optional(),
  confirmPassword: z.string().optional(),
}).refine((d) => {
  if (d.newPassword && !d.currentPassword) return false
  return true
}, { message: 'Le mot de passe actuel est requis', path: ['currentPassword'] })
.refine((d) => {
  if (d.newPassword && d.newPassword !== d.confirmPassword) return false
  return true
}, { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] })

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message || 'Données invalides' }, { status: 400 })
  }

  const { name, phone, currentPassword, newPassword } = parsed.data
  const updateData: Record<string, unknown> = {}

  if (name) updateData.name = name
  if (phone !== undefined) updateData.phone = phone

  if (newPassword && currentPassword) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } })
    if (!user) return NextResponse.json({ success: false, error: 'Utilisateur introuvable' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ success: false, error: 'Mot de passe actuel incorrect' }, { status: 400 })

    updateData.passwordHash = await bcrypt.hash(newPassword, 12)
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ success: false, error: 'Aucune modification détectée' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, email: true, phone: true, role: true, avatarUrl: true },
  })

  return NextResponse.json({ success: true, data: updated })
}
