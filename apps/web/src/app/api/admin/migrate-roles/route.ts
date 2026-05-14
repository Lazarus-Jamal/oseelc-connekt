import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// TEMPORARY ROUTE — delete after running once on production
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const results: string[] = []

  for (const value of ['CAISSIER', 'CONTROLEUR', 'CONTROLEUR_REGIONAL']) {
    try {
      await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${value}'`)
      results.push(`✓ ${value} ajouté`)
    } catch (e: any) {
      results.push(`✗ ${value}: ${e.message}`)
    }
  }

  return NextResponse.json({ results })
}
