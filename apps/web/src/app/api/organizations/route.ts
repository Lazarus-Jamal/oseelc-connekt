import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  try {
    const orgs = await prisma.organization.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json({ success: true, data: orgs })
  } catch (error) {
    console.error('GET /api/organizations error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const org = await prisma.organization.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
      },
    })
    return NextResponse.json({ success: true, data: org }, { status: 201 })
  } catch (error) {
    console.error('POST /api/organizations error:', error)
    return NextResponse.json({ success: false, error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
