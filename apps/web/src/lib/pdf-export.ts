// Utilitaire d'export PDF réutilisable (jsPDF + autoTable)
import type { UserOptions } from 'jspdf-autotable'

interface PdfSection {
  title: string
  head: string[][]
  body: (string | number)[][]
}

export async function exportPDF({
  filename,
  title,
  subtitle,
  sections,
  summary,
}: {
  filename: string
  title: string
  subtitle?: string
  sections: PdfSection[]
  summary?: { label: string; value: string }[]
}) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const now = new Date()

  // ── En-tête ────────────────────────────────────────────────────────────────
  doc.setFillColor(15, 118, 110)
  doc.rect(0, 0, pageW, 28, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text("L'Oeuvre de Santé — Oseelc-connekt", 14, 11)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(title, 14, 19)

  doc.setFontSize(8)
  doc.text(
    `Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    pageW - 14, 19, { align: 'right' }
  )

  let y = 36

  // ── Sous-titre ─────────────────────────────────────────────────────────────
  if (subtitle) {
    doc.setTextColor(100, 116, 139)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text(subtitle, 14, y)
    y += 8
  }

  // ── Résumé KPIs ────────────────────────────────────────────────────────────
  if (summary && summary.length > 0) {
    const boxW = (pageW - 28 - (summary.length - 1) * 4) / summary.length
    summary.forEach((item, i) => {
      const x = 14 + i * (boxW + 4)
      doc.setFillColor(240, 253, 250)
      doc.roundedRect(x, y, boxW, 16, 2, 2, 'F')
      doc.setDrawColor(20, 184, 166)
      doc.roundedRect(x, y, boxW, 16, 2, 2, 'S')

      doc.setTextColor(100, 116, 139)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(item.label, x + boxW / 2, y + 5, { align: 'center' })

      doc.setTextColor(15, 118, 110)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(item.value, x + boxW / 2, y + 12, { align: 'center' })
    })
    y += 22
  }

  // ── Sections / tableaux ────────────────────────────────────────────────────
  for (const section of sections) {
    if (section.body.length === 0) continue

    doc.setTextColor(30, 41, 59)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(section.title, 14, y)
    y += 4

    autoTable(doc, {
      startY: y,
      head: section.head,
      body: section.body,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    } as UserOptions)

    y = (doc as any).lastAutoTable.finalY + 8

    // Nouvelle page si nécessaire
    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  // ── Pied de page sur chaque page ───────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(148, 163, 184)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Oseelc-connekt — Document confidentiel`, 14, 292)
    doc.text(`Page ${i} / ${pageCount}`, pageW - 14, 292, { align: 'right' })
  }

  doc.save(filename)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exportDeclarationPDF(declaration: any) {
  const type = declaration.declarationType === 'REVENUE' ? 'Recettes' : 'Dépenses'
  const period = declaration.periodStart
    ? `${new Date(declaration.periodStart).toLocaleDateString('fr-FR')} — ${new Date(declaration.periodEnd).toLocaleDateString('fr-FR')}`
    : ''

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Brouillon', SUBMITTED: 'Soumis', REVIEWED: 'En revue', VALIDATED: 'Validé', REJECTED: 'Rejeté',
  }

  await exportPDF({
    filename: `declaration-${declaration.reference ?? 'export'}.pdf`,
    title: `Déclaration ${type} — ${declaration.reference ?? ''}`,
    subtitle: `${declaration.facility?.name ?? ''} | ${period}`,
    summary: [
      { label: 'Référence', value: declaration.reference ?? '-' },
      { label: 'Type', value: type },
      { label: 'Statut', value: STATUS_LABELS[declaration.status] ?? declaration.status },
      { label: 'Montant total', value: new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(Number(declaration.totalAmount ?? 0)) },
    ],
    sections: [
      {
        title: 'Détail des lignes',
        head: [['Libellé', 'Catégorie', 'Qté', 'Prix unitaire', 'Montant', 'Note']],
        body: (declaration.items ?? []).map((item: any) => [
          item.label,
          item.category,
          item.quantity ?? '-',
          item.unitPrice ? new Intl.NumberFormat('fr-FR').format(Number(item.unitPrice)) : '-',
          new Intl.NumberFormat('fr-FR').format(Number(item.amount)),
          item.note ?? '',
        ]),
      },
      {
        title: 'Historique des statuts',
        head: [['Date', 'De', 'Vers', 'Par', 'Commentaire']],
        body: (declaration.history ?? []).map((h: any) => [
          new Date(h.changedAt).toLocaleDateString('fr-FR'),
          STATUS_LABELS[h.fromStatus] ?? h.fromStatus,
          STATUS_LABELS[h.toStatus] ?? h.toStatus,
          h.changedBy?.name ?? '-',
          h.comment ?? '',
        ]),
      },
    ],
  })
}
