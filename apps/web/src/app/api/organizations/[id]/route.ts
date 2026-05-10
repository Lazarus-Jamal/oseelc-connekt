import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, address, phone, email } = body
    if (!name?.trim()) {
      return NextResponse.json({ success: false, error: 'Le nom est obligatoire' }, { status: 400 })
    }

    const org = await prisma.organization.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      },
    })
    return NextResponse.json({ success: true, data: org })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Organisation introuvable' }, { status: 404 })
    }
    console.error('PATCH /api/organizations/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 403 })
    }

    await prisma.organization.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ success: false, error: 'Organisation introuvable' }, { status: 404 })
    }
    if (error?.code === 'P2003') {
      return NextResponse.json({ success: false, error: 'Impossible de supprimer : des régions ou utilisateurs y sont rattachés' }, { status: 409 })
    }
    console.error('DELETE /api/organizations/[id] error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
