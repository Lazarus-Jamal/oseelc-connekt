import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? 'mailto:admin@oseelc.org',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  const { prisma } = await import('@/lib/db')
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  if (subs.length === 0) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/notifications',
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      )
    )
  )

  // Remove expired/invalid subscriptions (410 Gone)
  const expired: string[] = []
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      const err = r.reason as any
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        expired.push(subs[i].endpoint)
      }
    }
  })
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: expired } } })
  }
}

export async function sendPushToMany(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
) {
  await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, payload)))
}
