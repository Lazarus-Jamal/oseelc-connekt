import { prisma } from '@/lib/db'
import { sendPushToMany } from '@/lib/push'

type NotifType =
  | 'DECLARATION_SUBMITTED'
  | 'DECLARATION_REVIEWED'
  | 'DECLARATION_VALIDATED'
  | 'DECLARATION_REJECTED'
  | 'STAT_SUBMITTED'
  | 'STAT_VALIDATED'
  | 'STAT_REJECTED'
  | 'DEADLINE_APPROACHING'
  | 'DEADLINE_MISSED'

interface CreateNotifOptions {
  userIds: string[]
  type: NotifType
  title: string
  message: string
  relatedEntityId?: string
  relatedEntityType?: string
}

export async function createNotifications({ userIds, type, title, message, relatedEntityId, relatedEntityType }: CreateNotifOptions) {
  if (userIds.length === 0) return
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      relatedEntityId,
      relatedEntityType,
    })),
    skipDuplicates: true,
  })
  // Also send Web Push (fire-and-forget)
  sendPushToMany(userIds, {
    title,
    body: message,
    url: relatedEntityId ? `/declarations/${relatedEntityId}` : '/notifications',
  }).catch(() => {})
}

export async function notifyDeclarationWorkflow(
  action: 'submit' | 'review' | 'validate' | 'reject',
  declaration: { id: string; reference: string; facilityId: string; submittedById: string; declarationType: string },
  actorName: string,
) {
  const isExpense = declaration.declarationType === 'EXPENSE'
  const typeLabel = isExpense ? 'dépense' : 'déclaration de recettes'

  if (action === 'submit') {
    // Notify: facility chiefs of this facility + regional directors of its region
    const facility = await prisma.facility.findUnique({
      where: { id: declaration.facilityId },
      select: { name: true, regionId: true },
    })
    if (!facility) return

    const chiefs = await prisma.user.findMany({
      where: { facilityId: declaration.facilityId, role: 'FACILITY_CHIEF', isActive: true },
      select: { id: true },
    })
    const directors = await prisma.user.findMany({
      where: { regionId: facility.regionId || undefined, role: 'REGIONAL_DIRECTOR', isActive: true },
      select: { id: true },
    })
    const admins = await prisma.user.findMany({
      where: { role: { in: ['DIRECTION', 'SUPER_ADMIN'] }, isActive: true },
      select: { id: true },
    })

    const recipientIds = [...new Set([
      ...chiefs.map((u) => u.id),
      ...directors.map((u) => u.id),
      ...admins.map((u) => u.id),
    ])]

    await createNotifications({
      userIds: recipientIds,
      type: 'DECLARATION_SUBMITTED',
      title: `Nouvelle ${typeLabel} soumise`,
      message: `${declaration.reference} de ${facility.name} soumise par ${actorName}`,
      relatedEntityId: declaration.id,
      relatedEntityType: isExpense ? 'expense' : 'declaration',
    })
  } else if (action === 'review') {
    await createNotifications({
      userIds: [declaration.submittedById],
      type: 'DECLARATION_REVIEWED',
      title: `${isExpense ? 'Dépense' : 'Déclaration'} examinée`,
      message: `Votre ${typeLabel} ${declaration.reference} a été examinée par ${actorName}`,
      relatedEntityId: declaration.id,
      relatedEntityType: isExpense ? 'expense' : 'declaration',
    })
  } else if (action === 'validate') {
    await createNotifications({
      userIds: [declaration.submittedById],
      type: 'DECLARATION_VALIDATED',
      title: `${isExpense ? 'Dépense' : 'Déclaration'} validée ✓`,
      message: `Votre ${typeLabel} ${declaration.reference} a été validée par ${actorName}`,
      relatedEntityId: declaration.id,
      relatedEntityType: isExpense ? 'expense' : 'declaration',
    })
  } else if (action === 'reject') {
    await createNotifications({
      userIds: [declaration.submittedById],
      type: 'DECLARATION_REJECTED',
      title: `${isExpense ? 'Dépense' : 'Déclaration'} rejetée`,
      message: `Votre ${typeLabel} ${declaration.reference} a été rejetée par ${actorName}`,
      relatedEntityId: declaration.id,
      relatedEntityType: isExpense ? 'expense' : 'declaration',
    })
  }
}
