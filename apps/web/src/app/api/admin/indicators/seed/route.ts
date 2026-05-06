import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { INDICATORS_DATA } from '@/lib/indicators-data'

export async function POST(): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Réservé à l\'administrateur' }, { status: 403 })
    }

    let created = 0
    let updated = 0
    let deactivated = 0

    const activeCodes = new Set(INDICATORS_DATA.map((i) => i.code))

    for (const ind of INDICATORS_DATA) {
      const existing = await prisma.statIndicator.findUnique({ where: { code: ind.code } })
      if (existing) {
        await prisma.statIndicator.update({
          where: { code: ind.code },
          data: { label: ind.label, sortOrder: ind.sortOrder, unit: ind.unit ?? null, isRequired: ind.isRequired, isActive: true },
        })
        updated++
      } else {
        await prisma.statIndicator.create({ data: { ...ind, isActive: true } })
        created++
      }
    }

    // Deactivate indicators no longer in the canonical list
    const deactivateResult = await prisma.statIndicator.updateMany({
      where: { code: { notIn: [...activeCodes] }, isActive: true },
      data: { isActive: false },
    })
    deactivated = deactivateResult.count

    return NextResponse.json({
      success: true,
      data: { created, updated, deactivated, total: INDICATORS_DATA.length },
    })
  } catch (e: any) {
    console.error('[POST /api/admin/indicators/seed]', e)
    return NextResponse.json({ success: false, error: e.message || 'Erreur serveur' }, { status: 500 })
  }
}
