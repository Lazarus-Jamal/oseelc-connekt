import webpush from 'web-push'
import { prisma } from '@/lib/db'

webpush.setVapidDetails(
  'mailto:admin@oseelc.org',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export async function sendPushToMany(userIds: string[], payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ).catch(async (err: any) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await prisma.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } })
        }
        throw err
      })
    )
  )

  return {
    sent: results.filter((r) => r.status === 'fulfilled').length,
    total: subs.length,
  }
}

export { sendPushToMany as sendPushToUsers }
