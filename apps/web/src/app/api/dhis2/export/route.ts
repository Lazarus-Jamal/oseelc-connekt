import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// DHIS2 Data Value Set format (simplified)
// https://docs.dhis2.org/en/develop/using-the-api/dhis-core-version-master/data.html

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!['SUPER_ADMIN', 'DATA_ADMIN', 'DIRECTION'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const facilityId = searchParams.get('facilityId')
  const format = searchParams.get('format') ?? 'json' // json | xml | adx

  const where: any = { year, status: { in: ['SUBMITTED', 'VALIDATED'] } }
  if (month) where.month = month
  if (facilityId) where.facilityId = facilityId

  const sheets = await prisma.statSheet.findMany({
    where,
    include: {
      facility: { select: { id: true, name: true, code: true } },
      values: {
        include: {
          indicator: { select: { code: true, label: true, category: true } },
        },
      },
    },
  })

  // Build DHIS2 dataValueSet
  const dataValues: any[] = []

  for (const sheet of sheets) {
    const period = month
      ? `${year}${String(sheet.month).padStart(2, '0')}`
      : `${year}`

    for (const val of sheet.values) {
      if (val.value === null || val.value === undefined) continue
      dataValues.push({
        dataElement: val.indicator.code,
        period,
        orgUnit: sheet.facility.code,
        value: String(val.value),
        comment: val.note ?? undefined,
      })
    }
  }

  const dataValueSet = {
    dataSet: 'OSEELC_STATS',
    completeDate: new Date().toISOString().split('T')[0],
    period: month ? `${year}${String(month).padStart(2, '0')}` : `${year}`,
    orgUnit: facilityId ? sheets[0]?.facility?.code : 'OU_NATIONAL',
    dataValues,
  }

  if (format === 'xml') {
    const xmlLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<dataValueSet xmlns="http://dhis2.org/schema/dxf/2.0" dataSet="${dataValueSet.dataSet}" completeDate="${dataValueSet.completeDate}" period="${dataValueSet.period}" orgUnit="${dataValueSet.orgUnit}">`,
      ...dataValues.map((dv) =>
        `  <dataValue dataElement="${dv.dataElement}" period="${dv.period}" orgUnit="${dv.orgUnit}" value="${dv.value}"${dv.comment ? ` comment="${dv.comment}"` : ''}/>`
      ),
      '</dataValueSet>',
    ]
    return new NextResponse(xmlLines.join('\n'), {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="dhis2-export-${year}${month ? '-' + month : ''}.xml"`,
      },
    })
  }

  if (format === 'adx') {
    // ADX format for DHIS2 aggregate data exchange
    const adxLines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<adx xmlns="urn:ihe:qrph:adx:2015" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" exported="${new Date().toISOString()}">`,
      `  <group dataSet="${dataValueSet.dataSet}" period="${dataValueSet.period}" orgUnit="${dataValueSet.orgUnit}" completeDate="${dataValueSet.completeDate}">`,
      ...dataValues.map((dv) =>
        `    <dataValue dataElement="${dv.dataElement}" value="${dv.value}"/>`
      ),
      '  </group>',
      '</adx>',
    ]
    return new NextResponse(adxLines.join('\n'), {
      headers: {
        'Content-Type': 'application/adx+xml',
        'Content-Disposition': `attachment; filename="dhis2-adx-${year}${month ? '-' + month : ''}.xml"`,
      },
    })
  }

  // Default: JSON
  return new NextResponse(JSON.stringify(dataValueSet, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="dhis2-export-${year}${month ? '-' + month : ''}.json"`,
    },
  })
}

// POST: Push directly to a DHIS2 instance
export async function POST(req: NextRequest): Promise<NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role } = session.user
  if (!['SUPER_ADMIN', 'DATA_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json()
  const { dhis2Url, username, password, year, month } = body

  if (!dhis2Url || !username || !password) {
    return NextResponse.json({ success: false, error: 'URL DHIS2, nom d\'utilisateur et mot de passe requis' }, { status: 400 })
  }

  // Fetch the data
  const params = new URLSearchParams({ year: String(year ?? new Date().getFullYear()), format: 'json' })
  if (month) params.set('month', String(month))

  const internalRes = await fetch(`${process.env.NEXTAUTH_URL}/api/dhis2/export?${params}`, {
    headers: { Cookie: req.headers.get('cookie') ?? '' },
  })
  const dataValueSet = await internalRes.json()

  // Push to DHIS2
  const auth = Buffer.from(`${username}:${password}`).toString('base64')
  try {
    const dhis2Res = await fetch(`${dhis2Url}/api/dataValueSets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(dataValueSet),
    })

    if (!dhis2Res.ok) {
      const err = await dhis2Res.text()
      return NextResponse.json({ success: false, error: `Erreur DHIS2 (${dhis2Res.status}): ${err}` }, { status: 502 })
    }

    const result = await dhis2Res.json()
    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: `Impossible de joindre DHIS2: ${e.message}` }, { status: 502 })
  }
}
