import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Returns deadlines that are approaching or missed for the current user's scope
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, regionId, facilityId } = session.user

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear  = now.getFullYear()

  // Find deadlines that apply to this user
  const where: any = {
    OR: [
      { month: null },
      { month: currentMonth },
    ],
    AND: [
      { OR: [{ year: null }, { year: currentYear }] },
    ],
  }

  if (role === 'DATA_MANAGER') {
    if (facilityId) {
      where.AND.push({ OR: [{ facilityId }, { facilityId: null }] })
    } else if (regionId) {
      where.AND.push({ OR: [{ regionId }, { regionId: null }] })
      where.AND.push({ facilityId: null })
    }
  }

  const deadlines = await prisma.statDeadline.findMany({ where })

  const alerts = deadlines.map((d: typeof deadlines[number]) => {
    // Due date = dueDay of the month after the stat period
    const dueMonth  = currentMonth === 12 ? 1 : currentMonth + 1
    const dueYear   = currentMonth === 12 ? currentYear + 1 : currentYear
    const dueDate   = new Date(dueYear, dueMonth - 1, d.dueDay)
    const diffDays  = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isMissed  = diffDays < 0
    const isAlert   = diffDays >= 0 && diffDays <= d.alertDays

    return { id: d.id, dueDate, diffDays, isMissed, isAlert, note: d.note }
  }).filter((a: { isMissed: boolean; isAlert: boolean }) => a.isMissed || a.isAlert)

  return NextResponse.json({ success: true, data: alerts })
}
