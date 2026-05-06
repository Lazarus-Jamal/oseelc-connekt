import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Colonnes attendues dans le fichier Excel :
// A: code, B: label, C: category, D: unit, E: isRequired (oui/non), F: description, G: sortOrder

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })

  if (session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Réservé à l\'administrateur' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ success: false, error: 'Fichier manquant' }, { status: 400 })

  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ success: false, error: 'Format non supporté. Utilisez .xlsx ou .xls' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  if (rows.length < 2) {
    return NextResponse.json({ success: false, error: 'Fichier vide ou sans données' }, { status: 400 })
  }

  // Ignorer la ligne d'en-tête (row 0)
  const dataRows = rows.slice(1).filter((row: any[]) => row[0] && row[1] && row[2])

  const results = { created: 0, updated: 0, errors: [] as string[] }

  for (const row of dataRows) {
    const [code, label, category, unit, isRequiredRaw, description, sortOrderRaw] = row

    if (!code || !label || !category) {
      results.errors.push(`Ligne ignorée : code="${code}" manque label ou catégorie`)
      continue
    }

    const isRequired = String(isRequiredRaw).toLowerCase() === 'oui' || isRequiredRaw === true || isRequiredRaw === 1
    const sortOrder = Number(sortOrderRaw) || 0

    try {
      const existing = await prisma.statIndicator.findUnique({ where: { code: String(code) } })
      if (existing) {
        await prisma.statIndicator.update({
          where: { code: String(code) },
          data: { label: String(label), category: String(category), unit: unit ? String(unit) : null, isRequired, description: description ? String(description) : null, sortOrder },
        })
        results.updated++
      } else {
        await prisma.statIndicator.create({
          data: { code: String(code), label: String(label), category: String(category), unit: unit ? String(unit) : null, isRequired, description: description ? String(description) : null, sortOrder },
        })
        results.created++
      }
    } catch (e: any) {
      results.errors.push(`Erreur sur "${code}": ${e.message}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Import terminé : ${results.created} créés, ${results.updated} mis à jour${results.errors.length > 0 ? `, ${results.errors.length} erreur(s)` : ''}`,
    data: results,
  })
}
