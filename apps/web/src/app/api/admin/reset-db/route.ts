import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (session.user.role !== 'SUPER_ADMIN')
    return NextResponse.json({ error: 'Réservé au Super Admin' }, { status: 403 })

  const { password, scope } = await req.json()

  const expectedPwd = process.env.RESET_DB_PASSWORD
  if (!expectedPwd) return NextResponse.json({ error: 'RESET_DB_PASSWORD non configuré sur le serveur' }, { status: 500 })
  if (password !== expectedPwd) return NextResponse.json({ error: 'Mot de passe incorrect' }, { status: 403 })

  if (!['care2x', 'data', 'all'].includes(scope))
    return NextResponse.json({ error: 'Périmètre invalide' }, { status: 400 })

  const counts: Record<string, number> = {}

  try {
    // ── Care2x (dans les 3 scopes) ──────────────────────────────────────────
    const syncEntries = await prisma.care2xSyncEntry.deleteMany({})
    counts['Entrées sync Care2x'] = syncEntries.count

    const syncs = await prisma.care2xSync.deleteMany({})
    counts['Syncs Care2x'] = syncs.count

    const recouv = await prisma.care2xRecouvrementSync.deleteMany({})
    counts['Sync recouvrement'] = recouv.count

    const rapports = await prisma.care2xRapportJournalier.deleteMany({})
    counts['Rapports journaliers'] = rapports.count

    if (scope === 'data' || scope === 'all') {
      // ── Déclarations ─────────────────────────────────────────────────────
      const declDocs = await prisma.declarationDocument.deleteMany({})
      counts['Documents déclarations'] = declDocs.count

      const declHist = await prisma.declarationHistory.deleteMany({})
      counts['Historique déclarations'] = declHist.count

      const declItems = await prisma.declarationItem.deleteMany({})
      counts['Items déclarations'] = declItems.count

      const decls = await prisma.declaration.deleteMany({})
      counts['Déclarations'] = decls.count

      // ── Budget ───────────────────────────────────────────────────────────
      const budgets = await prisma.budget.deleteMany({})
      counts['Budgets'] = budgets.count

      // ── Statistiques ─────────────────────────────────────────────────────
      const statVals = await prisma.statValue.deleteMany({})
      counts['Valeurs statistiques'] = statVals.count

      const statDocs = await prisma.statDocument.deleteMany({})
      counts['Documents stat'] = statDocs.count

      const statDeadlines = await prisma.statDeadline.deleteMany({})
      counts['Deadlines stat'] = statDeadlines.count

      const statInds = await prisma.statIndicator.deleteMany({})
      counts['Indicateurs'] = statInds.count

      const statSheets = await prisma.statSheet.deleteMany({})
      counts['Feuilles statistiques'] = statSheets.count

      // ── Messagerie ───────────────────────────────────────────────────────
      const msgDocs = await prisma.adminMessageDocument.deleteMany({})
      counts['Pièces jointes messages'] = msgDocs.count

      const msgRecips = await prisma.adminMessageRecipient.deleteMany({})
      counts['Destinataires messages'] = msgRecips.count

      const msgs = await prisma.adminMessage.deleteMany({})
      counts['Messages'] = msgs.count

      // ── Notifications ────────────────────────────────────────────────────
      const notifs = await prisma.notification.deleteMany({})
      counts['Notifications'] = notifs.count

      // ── Planning ─────────────────────────────────────────────────────────
      const plannings = await prisma.planningEvent.deleteMany({})
      counts['Événements planning'] = plannings.count

      // ── Logs ─────────────────────────────────────────────────────────────
      const logs = await prisma.auditLog.deleteMany({})
      counts['Logs d\'audit'] = logs.count
    }

    const totalDeleted = Object.values(counts).reduce((a, b) => a + b, 0)

    return NextResponse.json({
      success: true,
      scope,
      totalDeleted,
      counts,
    })
  } catch (err: any) {
    console.error('[reset-db]', err)
    return NextResponse.json({ error: err?.message ?? 'Erreur serveur' }, { status: 500 })
  }
}
