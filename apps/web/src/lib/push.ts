import webpush from 'web-push'
import { prisma } from '@/lib/db'

export interface PushPayload {
  title: string
  body: string
  url?: string
}

function getWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL || 'mailto:admin@oseelc.org'
  if (!publicKey || !privateKey) return null
  webpush.setVapidDetails(email, publicKey, privateKey)
  return webpush
}

export async function sendPushToMany(userIds: string[], payload: PushPayload) {
  const wp = getWebPush()
  if (!wp) {
    console.warn('[push] VAPID keys not configured — skipping push notifications')
    return { sent: 0, total: 0 }
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      wp.sendNotification(
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
