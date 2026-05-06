import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { generateReference } from '@care-connekt/shared'
import { Prisma } from '@care-connekt/db'
import { recordAudit, getClientInfo } from '@/lib/audit'

const createSchema = z.object({
  facilityId: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
  values: z.array(
    z.object({
      indicatorId: z.string(),
      value: z.number().nonnegative('Les valeurs ne peuvent pas être négatives').optional(),
      note: z.string().optional(),
    })
  ),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') || 1)
  const limit = Math.min(Number(searchParams.get('limit') || 20), 100)
  const month = searchParams.get('month') ? Number(searchParams.get('month')) : undefined
  const year = searchParams.get('year') ? Number(searchParams.get('year')) : undefined
  const status = searchParams.get('status')
  const facilityId = searchParams.get('facilityId')

  const { role, facilityId: userFacilityId, regionId: userRegionId } = session.user

  const where: Prisma.StatSheetWhereInput = {}

  if (role === 'FACILITY_CHIEF') {
    where.facilityId = userFacilityId || undefined
  } else if (role === 'REGIONAL_DIRECTOR') {
    where.facility = { regionId: userRegionId || undefined }
  } else if (role === 'DATA_MANAGER') {
    if (userFacilityId) where.facilityId = userFacilityId          // facility DM
    else if (userRegionId) where.facility = { regionId: userRegionId } // regional DM
    // national DM (no facilityId, no regionId) sees all
  }

  if (facilityId) where.facilityId = facilityId
  if (status) where.status = status as any
  if (month) where.month = month
  if (year) where.year = year

  const [total, sheets] = await Promise.all([
    prisma.statSheet.count({ where }),
    prisma.statSheet.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        facility: { select: { id: true, name: true, code: true, type: true } },
        dataManager: { select: { id: true, name: true } },
      },
    }),
  ])

  return NextResponse.json({
    success: true,
    data: sheets,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId, regionId: userRegionId, facilityId: userFacilityId } = session.user

  if (!['DATA_MANAGER', 'DATA_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Données invalides', details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { facilityId, month, year, values } = parsed.data

  // Scope check for DATA_MANAGER based on level
  if (role === 'DATA_MANAGER') {
    if (userFacilityId && facilityId !== userFacilityId) {
      return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
    } else if (!userFacilityId && userRegionId) {
      const facility = await prisma.facility.findUnique({ where: { id: facilityId }, select: { regionId: true } })
      if (!facility || facility.regionId !== userRegionId) {
        return NextResponse.json({ success: false, error: 'Non autorisé pour ce centre' }, { status: 403 })
      }
    }
    // national DM (neither set): allowed everywhere
  }

  const existing = await prisma.statSheet.findUnique({ where: { facilityId_month_year: { facilityId, month, year } } })
  if (existing) {
    return NextResponse.json({ success: false, error: 'Une fiche existe déjà pour cette période' }, { status: 409 })
  }

  // Calcul completeness
  const indicators = await prisma.statIndicator.findMany({ where: { isActive: true, isRequired: true } })
  const filledRequired = values.filter((v) => {
    const ind = indicators.find((i: { id: string }) => i.id === v.indicatorId)
    return ind && v.value !== undefined && v.value !== null
  }).length
  const completeness = indicators.length > 0 ? (filledRequired / indicators.length) * 100 : 0

  const count = await prisma.statSheet.count({ where: { facilityId } })
  const reference = generateReference('STAT', count + 1)

  const sheet = await prisma.statSheet.create({
    data: {
      reference,
      facilityId,
      dataManagerId: userId,
      month,
      year,
      completeness,
      status: 'DRAFT',
      values: { create: values },
    },
    include: {
      values: { include: { indicator: true } },
      facility: { select: { id: true, name: true } },
    },
  })

  const { ipAddress, userAgent } = getClientInfo(req)
  recordAudit({
    userId,
    action: 'CREATE',
    entityType: 'statSheet',
    entityId: sheet.id,
    newValues: { reference: sheet.reference, facilityId, month, year },
    ipAddress,
    userAgent,
  }).catch(() => {})

  return NextResponse.json({ success: true, data: sheet }, { status: 201 })
}
