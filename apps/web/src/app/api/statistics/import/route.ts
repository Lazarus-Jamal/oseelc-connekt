import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateReference } from '@care-connekt/shared'

// Expected Excel columns (row 1 = headers, row 2+ = data):
// A: facilityCode  B: month (1-12)  C: year (YYYY)
// D+: one column per indicator code, value in cell

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  const { role, id: userId } = session.user
  if (!['DATA_MANAGER', 'DATA_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Action non autorisée' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Fichier manquant' }, { status: 400 })

  const allowed = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'Format non supporté. Utilisez .xlsx ou .xls' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) {
    return NextResponse.json({ success: false, error: 'Fichier vide ou sans données' }, { status: 400 })
  }

  const headers = rows[0] as string[]
  // Columns 0=facilityCode 1=month 2=year, 3+ = indicator codes
  const indicatorCodes = headers.slice(3).map((h) => String(h).trim()).filter(Boolean)
  if (indicatorCodes.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucun indicateur trouvé dans les colonnes D+' }, { status: 400 })
  }

  // Pre-load indicators and facilities to avoid N+1 queries
  const [indicators, allFacilities] = await Promise.all([
    prisma.statIndicator.findMany({ where: { code: { in: indicatorCodes }, isActive: true } }),
    prisma.facility.findMany({ select: { id: true, code: true } }),
  ])

  const indicatorMap = new Map(indicators.map((i) => [i.code, i]))
  const facilityMap = new Map(allFacilities.map((f) => [f.code, f.id]))

  const results = { created: 0, updated: 0, skipped: 0, errors: [] as string[] }
  const dataRows = rows.slice(1).filter((r) => r[0]) as unknown[][]

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx] as unknown[]
    const facilityCode = String(row[0] ?? '').trim()
    const month = Number(row[1])
    const year = Number(row[2])
    const lineLabel = `Ligne ${rowIdx + 2}`

    if (!facilityCode || !month || !year || month < 1 || month > 12 || year < 2000) {
      results.errors.push(`${lineLabel}: code établissement, mois ou année invalide`)
      continue
    }

    const facilityId = facilityMap.get(facilityCode)
    if (!facilityId) {
      results.errors.push(`${lineLabel}: établissement "${facilityCode}" introuvable`)
      continue
    }

    const values: { indicatorId: string; value: number; note?: string }[] = []
    for (let col = 3; col < headers.length; col++) {
      const code = String(headers[col] ?? '').trim()
      if (!code) continue
      const indicator = indicatorMap.get(code)
      if (!indicator) continue
      const raw = row[col]
      const num = Number(raw)
      if (raw !== '' && raw !== null && raw !== undefined && !isNaN(num) && num >= 0) {
        values.push({ indicatorId: indicator.id, value: num })
      }
    }

    try {
      const existing = await prisma.statSheet.findUnique({
        where: { facilityId_month_year: { facilityId, month, year } },
      })

      const allIndicators = await prisma.statIndicator.findMany({ where: { isActive: true, isRequired: true } })
      const filledRequired = values.filter((v) => allIndicators.some((i) => i.id === v.indicatorId)).length
      const completeness = allIndicators.length > 0 ? (filledRequired / allIndicators.length) * 100 : 0

      if (existing) {
        await prisma.$transaction([
          prisma.statValue.deleteMany({ where: { statSheetId: existing.id } }),
          prisma.statSheet.update({
            where: { id: existing.id },
            data: { completeness, values: { create: values } },
          }),
        ])
        results.updated++
      } else {
        const count = await prisma.statSheet.count({ where: { facilityId } })
        const reference = generateReference('STAT', count + 1)
        await prisma.statSheet.create({
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
        })
        results.created++
      }
    } catch (e: any) {
      results.errors.push(`${lineLabel}: ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Import terminé : ${results.created} créée(s), ${results.updated} mise(s) à jour${results.errors.length > 0 ? `, ${results.errors.length} erreur(s)` : ''}`,
    data: results,
  })
}

// Download blank template
export async function GET() {
  const indicators = await prisma.statIndicator.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: { code: true, label: true, category: true },
  })

  const XLSX = await import('xlsx')
  const headers = ['Code établissement', 'Mois (1-12)', 'Année', ...indicators.map((i) => i.code)]
  const example = ['FS-001', 1, 2025, ...indicators.map(() => '')]

  const ws = XLSX.utils.aoa_to_sheet([headers, example])
  ws['!cols'] = headers.map((_, i) => ({ wch: i < 3 ? 20 : 14 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Données statistiques')

  // Indicators legend sheet
  const legendHeaders = ['Code indicateur', 'Libellé', 'Catégorie']
  const legendRows = indicators.map((i) => [i.code, i.label, i.category])
  const wsLegend = XLSX.utils.aoa_to_sheet([legendHeaders, ...legendRows])
  wsLegend['!cols'] = [{ wch: 20 }, { wch: 50 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsLegend, 'Liste des indicateurs')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' })

  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modele-import-statistiques.xlsx"',
    },
  })
}
